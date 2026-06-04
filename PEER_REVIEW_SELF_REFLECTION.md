# Kieran Moynihan — Self-Reflection for HuskyPath

This document is a draft for the confidential Canvas peer-review survey.
Edit before submitting.

## Modules and features I authored

**Week 1 — UW Time Schedule scraper.**
Built the parser (`server/services/uwScraper.js`) that turns UW's legacy
`<pre>`-formatted Time Schedule HTML into structured JSON for the rest of
the pipeline. Wired it behind `GET /api/courses` (both cached sample
data and live-fetch by department) and added a CLI runner
(`server/scripts/scrape.js`) plus 5 unit tests covering day-token
splitting, military-time conversion, enrollment parsing, HTML tag
stripping, and end-to-end fixture parsing. Also wrote the initial
project README with architecture diagram and quickstart.

**Week 2 — Schedule generator and scoring engine.**
Authored the two core AI/algorithmic backend modules. `services/scheduler.js`
runs a recursive backtracking search over course sections, pruning any
combination that violates time conflicts or hard constraints
(`no_before`, `no_after`, `excluded_days`, `excluded_courses`,
`required_courses`). `services/scorer.js` implements the four-dimension
weighted scoring model from our proposal §2b (workload balance,
time-gap efficiency, difficulty curve, constraint satisfaction) plus a
plain-language explanation generator. Wrote 15 unit tests for both
modules. Also added a small scaffolding PR earlier that created stub
routes so the team could develop in parallel without touching each
other's files.

**Week 3 — `/api/plan` integration endpoint.**
Identified that the frontend wasn't actually consuming backend data
(wrong endpoint, wrong payload, wrong response shape) and built
`server/routes/plan.js`, a one-shot endpoint that wires the NLP parser,
scheduler, and scorer into a single request. Added 5 integration tests
that mock the NLP parser so the pipeline can be exercised without a
live API key. Also added a defensive alias (`avoid_days` →
`excluded_days`) so the pipeline tolerates the NLP parser's current
field naming while my teammate finishes his rename.

**Week 4 — Final integration push.**
Built the `client/src/api.js` adapter that translates between the
backend's response shape and the shape the React components expect.
Added an About / How-It-Works modal to the deployed site (project
overview, architecture diagram, user guide) to satisfy the Project
Web Presence rubric category. Added `services/explainer.js`, a second
AI surface area that uses Gemini to write plain-language schedule
explanations from the score breakdown — making the AI integration
more visible to end users. Added `render.yaml` plus a CORS-aware
production config to deploy the backend.

## Tests authored

30+ unit and integration tests across:
- `test/uwScraper.test.js` (5) — HTML parsing
- `test/scheduler.test.js` (11) — conflict detection, backtracking, hard constraints
- `test/scorer.test.js` (6) — score bounds, dimension behavior, weighted sum invariant
- `test/plan.test.js` (5) — end-to-end pipeline with NLP mocked

All passing on the modules I own.

## Things I did beyond writing code

- Designed the file-ownership split that let the three of us work in
  parallel without merge conflicts (file-per-feature, with one
  scaffolding PR up front so nobody had to touch `index.js`
  simultaneously).
- Maintained the project README and architecture diagram across four
  weeks of changes.
- Diagnosed bugs in a teammate's NLP parser (field-name mismatch,
  missing constraint fields, broken test mocks) and added defensive
  aliases in my scheduler so the pipeline kept working while he fixed
  them.
- Wrote up the constraint schema in plain language for the team in
  Discord so we agreed on field names before anyone wrote code.

## Honest hours

Roughly 5 hours of focused work across the four weeks, mostly AI-assisted
with code reviewed before commit. Each PR included tests and
documentation so reviewers could verify behavior independently of how
the code was written.
