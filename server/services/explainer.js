/**
 * LLM-generated schedule explanations
 * -------------------------------------------------------------------
 * Optionally upgrades the templated explanation produced by scorer.js
 * to a richer, plain-language summary written by Gemini. This is the
 * second meaningful AI surface area in the product (the first being
 * the natural-language constraint parser).
 *
 * Behavior
 *   - If GEMINI_API_KEY is set, call Gemini to rewrite each
 *     schedule's explanation in natural prose grounded in the
 *     score breakdown and the actual sections picked.
 *   - If no key is set OR the call fails, fall back silently to
 *     the templated explanation already on the schedule. This
 *     keeps the endpoint working in any environment.
 *
 * Public API
 *   explainSchedules(schedules, constraints) -> Promise<schedules[]>
 */

'use strict';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_NAME = 'gemini-2.5-flash';
const TIMEOUT_MS = 6000;

function summarizeSections(sections) {
  // Compact textual summary so the prompt stays small.
  return sections
    .map((s) => {
      const days = (s.days || []).join('');
      return `${s.courseCode} ${s.sectionId} ${days} ${s.startTime}-${s.endTime}`;
    })
    .join('; ');
}

function buildPrompt(schedule, constraints) {
  const { breakdown = {}, sections = [] } = schedule;
  const constraintLines = Object.entries(constraints || {})
    .filter(([, v]) => v != null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ');

  return `You are explaining a course schedule to a UW student in two to three short, friendly sentences. Do NOT mention scores or percentages. Do NOT use bullet points. Refer to days by full name.

User's stated preferences: ${constraintLines || '(none specified)'}.

Score breakdown (0..1, higher is better):
- workload_balance: ${breakdown.workload_balance ?? 'n/a'}
- time_gap_efficiency: ${breakdown.time_gap_efficiency ?? 'n/a'}
- difficulty_curve: ${breakdown.difficulty_curve ?? 'n/a'}
- constraint_satisfaction: ${breakdown.constraint_satisfaction ?? 'n/a'}

Sections in this schedule: ${summarizeSections(sections)}.

Write the explanation now:`;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('no api key');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const url = `${API_BASE}/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 180 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('')
      .trim();
    if (!text) throw new Error('Gemini returned empty text');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upgrade the explanation field of every schedule in the list.
 * Falls back silently to the existing explanation on any failure.
 *
 * @param {object[]} schedules
 * @param {object}   constraints
 * @returns {Promise<object[]>}  the same array (mutated) with upgraded explanations
 */
async function explainSchedules(schedules, constraints) {
  if (!process.env.GEMINI_API_KEY) return schedules; // fast no-op

  await Promise.all(
    schedules.map(async (s) => {
      try {
        const prompt = buildPrompt(s, constraints);
        const llmText = await callGemini(prompt);
        // Strip leading/trailing quotes the model sometimes adds.
        s.explanation = llmText.replace(/^["']|["']$/g, '');
        s.explanation_source = 'llm';
      } catch (_err) {
        // Keep the templated explanation.
        s.explanation_source = 'templated';
      }
    })
  );

  return schedules;
}

module.exports = {
  explainSchedules,
  // exported for tests
  _internal: { buildPrompt, summarizeSections },
};
