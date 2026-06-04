/**
 * POST /api/plan
 * --------------
 * One-shot integration endpoint that wires the full HuskyPath pipeline:
 *
 *     natural-language text
 *           │
 *           ▼
 *     parseConstraints()      ← NLP parser (services/constraintParser.js)
 *           │
 *           ▼
 *     filterCourses()         ← uses /api/courses sample data or caller-supplied list
 *           │
 *           ▼
 *     generateCandidates()    ← scheduler
 *           │
 *           ▼
 *     scoreSchedule()         ← scorer
 *           │
 *           ▼
 *     Top-N ranked schedules
 *
 * Frontends can call this single endpoint instead of orchestrating
 * /api/parse-constraints + /api/courses + /api/schedules themselves.
 *
 * Request body
 *   {
 *     "text":         "no classes before 10am, light Friday",
 *     "courseCodes":  ["CSE 142", "MATH 124"],   // optional: filter sample
 *                                                // courses to this subset
 *     "courses":      [...],                     // optional: caller-supplied
 *                                                // course list (overrides sample)
 *     "topN":         3                          // optional, default 3
 *   }
 *
 * Response (200)
 *   {
 *     "constraints": <Constraints>,        // what the NLP parser extracted
 *     "candidatesEvaluated": 12,
 *     "schedules": [ {sections, score, breakdown, explanation}, ... ]
 *   }
 *
 * Errors
 *   400  Missing 'text'
 *   502  Upstream NLP / scraper failure
 */

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');

const { parseConstraints } = require('../services/constraintParser');
const { generateCandidates } = require('../services/scheduler');
const { scoreSchedule } = require('../services/scorer');
const { explainSchedules } = require('../services/explainer');

const router = express.Router();
const SAMPLE_PATH = path.join(__dirname, '..', 'data', 'sample-courses.json');

/**
 * Load the cached sample course list, optionally filtered to a subset
 * of course codes the caller is interested in.
 */
function loadSampleCourses(courseCodes) {
  const raw = fs.readFileSync(SAMPLE_PATH, 'utf8');
  const { courses } = JSON.parse(raw);
  if (!Array.isArray(courseCodes) || courseCodes.length === 0) return courses;
  const wanted = new Set(courseCodes.map((c) => c.trim().toUpperCase()));
  return courses.filter((c) => wanted.has(c.code.toUpperCase()));
}

router.post('/', async (req, res) => {
  const body = req.body || {};
  const text = body.text;
  const topN = Number.isInteger(body.topN) && body.topN > 0 ? body.topN : 3;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: "Missing 'text' in request body",
      expected: { text: 'natural-language preferences (required)' },
    });
  }

  // Step 1 — NLP: text → structured constraints
  let constraints;
  try {
    constraints = await parseConstraints({ text });
  } catch (err) {
    return res.status(502).json({
      error: 'Constraint parsing failed',
      detail: err.message,
    });
  }

  // Step 2 — source the course catalog
  let courses;
  try {
    courses = Array.isArray(body.courses) && body.courses.length > 0
      ? body.courses
      : loadSampleCourses(body.courseCodes);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to load course catalog',
      detail: err.message,
    });
  }

  if (!Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({
      error: 'No courses available for scheduling',
      hint: 'Provide "courses" or "courseCodes" matching the sample catalog',
    });
  }

  // Step 3 — generate + score
  const candidates = generateCandidates(courses, constraints);
  const schedules = candidates
    .map((c) => ({ ...c, ...scoreSchedule(c, constraints) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  // Step 4 (optional) — upgrade templated explanations to LLM-written prose
  // when GEMINI_API_KEY is configured. Silent no-op otherwise so dev/test
  // environments don't require an API key.
  await explainSchedules(schedules, constraints);

  res.json({
    constraints,
    candidatesEvaluated: candidates.length,
    schedules,
  });
});

module.exports = router;
