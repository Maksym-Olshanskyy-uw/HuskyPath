/**
 * HuskyPath API adapter
 * ---------------------------------------------------------------
 * Single source of truth for talking to the backend. Translates
 * between the backend's response shape and the schedule shape the
 * UI components (ScheduleResults, WeeklyCalendar) expect.
 *
 * Use:
 *   import { planSchedules } from './api'
 *   const schedules = await planSchedules(text)
 *
 * Configuration:
 *   VITE_API_BASE   defaults to http://localhost:3001
 *                   Set this in .env or .env.production to point at
 *                   the deployed backend.
 */

// ─── Configuration ─────────────────────────────────────────────────────────
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'http://localhost:3001';

// ─── Shape adapters (backend ↔ frontend) ───────────────────────────────────

// Backend uses short codes; frontend's WeeklyCalendar expects long names.
const DAY_CODE_TO_NAME = {
  M:  'Mon',
  T:  'Tue',
  W:  'Wed',
  Th: 'Thu',
  F:  'Fri',
  S:  'Sat',
  U:  'Sun',
};

// Stable color rotation for course pills on the calendar.
const COURSE_COLORS = [
  '#5b8af5', '#f5a623', '#50c878',
  '#a259ff', '#e91e63', '#00bcd4',
  '#ff7043', '#26a69a',
];

function colorForCourse(code, index) {
  // Deterministic color per course code so the same course gets the same
  // color across schedules. Falls back to rotation if code is missing.
  if (!code) return COURSE_COLORS[index % COURSE_COLORS.length];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) | 0;
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

/**
 * Adapt a single backend `section` into the frontend's `course` shape.
 */
function adaptSection(section, index) {
  return {
    code:        section.courseCode    ?? section.code ?? 'UNKNOWN',
    title:       section.courseTitle   ?? section.title ?? '',
    credits:     Number(section.credits) || 0,
    instructor:  section.instructor    ?? 'STAFF',
    days:        (section.days || []).map((d) => DAY_CODE_TO_NAME[d] ?? d),
    startTime:   section.startTime     ?? '',
    endTime:     section.endTime       ?? '',
    building:    section.building      ?? '',
    room:        section.room          ?? '',
    color:       colorForCourse(section.courseCode ?? section.code, index),
  };
}

/**
 * Adapt a single backend `schedule` into the frontend's expected shape.
 */
function adaptSchedule(schedule, rank) {
  const courses = (schedule.sections || []).map((s, i) => adaptSection(s, i));
  const score100 = Math.round((schedule.score ?? 0) * 100);

  // Synthesize a short human label from the highest-scoring dimension.
  const breakdown = schedule.breakdown || {};
  const topDim = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0]?.[0];
  const LABELS = {
    workload_balance:        'Evenly distributed week',
    time_gap_efficiency:     'Tight, efficient schedule',
    difficulty_curve:        'Balanced difficulty load',
    constraint_satisfaction: 'Matches your preferences',
  };
  const label = LABELS[topDim] ?? 'Conflict-free schedule';

  return {
    id:          rank,
    rank,
    score:       score100,
    label,
    explanation: schedule.explanation ?? '',
    courses,
  };
}

/**
 * Convert the backend's full /api/plan response into an array of
 * frontend-shaped schedules.
 */
function adaptResponse(payload) {
  const schedules = payload?.schedules ?? [];
  return schedules.map((s, i) => adaptSchedule(s, i + 1));
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Call POST /api/plan with the user's natural-language preferences and
 * return ranked schedules already shaped for the UI.
 *
 * @param {string} text    natural-language preferences
 * @param {object} [opts]
 * @param {string[]} [opts.courseCodes]  limit search to this course list
 * @param {number}   [opts.topN]         number of schedules to return
 * @returns {Promise<Array>}  frontend-shaped schedule array
 */
export async function planSchedules(text, opts = {}) {
  const body = { text };
  if (Array.isArray(opts.courseCodes) && opts.courseCodes.length) {
    body.courseCodes = opts.courseCodes;
  }
  if (Number.isInteger(opts.topN) && opts.topN > 0) {
    body.topN = opts.topN;
  }

  const res = await fetch(`${API_BASE}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch { /* ignore */ }
    throw new Error(
      `Plan request failed (${res.status})${detail ? `: ${detail}` : ''}`
    );
  }

  const payload = await res.json();
  return adaptResponse(payload);
}

/**
 * Lightweight health check against the deployed backend. Used by the
 * UI to show "backend unreachable" warnings before submission.
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Exported for tests and for debugging in the browser console.
export const _internal = { adaptSection, adaptSchedule, adaptResponse, API_BASE };
