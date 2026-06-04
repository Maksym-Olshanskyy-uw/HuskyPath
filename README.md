# HuskyPath

AI-powered course & schedule planner for the University of Washington.

Ryan Locquiao · Kieran Moynihan · Max Olshanskyy — DYOP Final Project

- Repo:  https://github.com/ryanlocquiao/huskypath
- Live:  https://husky-path.vercel.app

## What it does

UW students describe their preferences in plain English — *"no classes before 10am, light Friday, avoid back-to-back lectures"* — and HuskyPath returns three ranked, conflict-free schedules built from live UW Time Schedule data, each with a plain-language explanation of why it scored well.

## Architecture

```
User input ──► Gemini API (NLP parser) ──► Structured constraints
                                                    │
   UW Time Schedule scraper ──► Course DB ──► Candidate generator
                                                    │
                                            Scoring model
                                                    │
                                            Top-3 schedules ──► React calendar UI
```

| Layer    | Stack                                                                       |
| -------- | --------------------------------------------------------------------------- |
| Frontend | React 19 + Vite, deployed on Vercel                                         |
| Backend  | Node.js 18+ with Express 5, deployable on Render                            |
| AI       | Google Gemini API — NLP constraint parser + LLM-generated explanations      |
| Data     | UW Time Schedule (scraped HTML), Rate My Professor + grade data (planned)   |

## Repo layout

```
client/          React + Vite frontend
server/
  index.js                       Express entry point
  routes/
    courses.js                   /api/courses
    parse.js                     /api/parse-constraints (Gemini NLP)
    schedules.js                 /api/schedules        (generator + scorer)
    plan.js                      /api/plan             (one-shot pipeline)
  services/
    uwScraper.js                 UW Time Schedule HTML parser
    constraintParser.js          NLP → structured constraints
    scheduler.js                 conflict-free candidate generation
    scorer.js                    4-dim weighted scoring + explanations
    explainer.js                 LLM-generated schedule explanations
  scripts/scrape.js              CLI: scrape a department to JSON
  data/                          Cached / sample course data
  test/                          Node built-in test runner specs
  .env.example                   Environment template
render.yaml                      Render deployment config (backend)
```

## Quickstart

```bash
# Backend
cd server
npm install
cp .env.example .env
npm run dev          # starts API on http://localhost:3001

# Frontend (separate terminal)
cd client
npm install
cp .env.example .env
npm run dev          # Vite on http://localhost:5173
```

Health check: `curl http://localhost:3001/api/health`

## Deployment

The frontend is on Vercel (`husky-path.vercel.app`); the backend deploys
to Render's free tier using the included `render.yaml`.

**Backend (Render):**
1. New → Web Service → connect this repo
2. Render auto-detects `render.yaml`
3. In Settings → Environment, add `GEMINI_API_KEY` (don't commit it)
4. Wait for the first deploy; note the URL (e.g. `https://huskypath-api.onrender.com`)

**Frontend (Vercel):**
1. In Vercel project settings → Environment Variables, set
   `VITE_API_BASE` to the Render URL from above
2. Redeploy

The frontend gracefully falls back to mock data if the backend is
unreachable, so the demo never dies on a cold-started Render instance.

## UW Time Schedule scraper

The scraper turns the legacy `<pre>`-formatted Time Schedule pages into structured JSON the rest of the pipeline can reason about.

```bash
cd server
node scripts/scrape.js cse --quarter=AUT2026
# → wrote data/cse-aut2026.json   (84 courses, 312 sections)
```

It also lives behind an API endpoint:

```bash
curl http://localhost:3001/api/courses                        # cached sample
curl http://localhost:3001/api/courses/cse?quarter=AUT2026    # live
```

Output shape (one section):

```json
{
  "code": "CSE 142",
  "title": "Computer Programming I",
  "sections": [{
    "sln": "12345",
    "sectionId": "A",
    "credits": "4",
    "days": ["M", "W", "F"],
    "startTime": "09:30",
    "endTime": "10:20",
    "building": "KNE",
    "room": "210",
    "instructor": "REGES, S",
    "status": "Open",
    "enrolled": 280,
    "capacity": 300
  }]
}
```

## One-shot `/api/plan` endpoint

Frontends should call `POST /api/plan` instead of orchestrating the three lower-level endpoints themselves. It takes natural-language text and returns ranked schedules in a single round trip.

```bash
curl -X POST http://localhost:3001/api/plan \
  -H 'content-type: application/json' \
  -d '{
    "text": "no classes before 10am, no Fridays, prefer afternoons",
    "courseCodes": ["CSE 142", "MATH 124", "ENGL 131"],
    "topN": 3
  }'
```

Response shape:

```json
{
  "constraints": { "no_before": "10:00", "excluded_days": ["F"], "preferred_times": ["afternoon"] },
  "candidatesEvaluated": 12,
  "schedules": [
    {
      "sections": [ ... ],
      "score": 0.84,
      "breakdown": { "workload_balance": 0.9, "time_gap_efficiency": 0.8, "difficulty_curve": 0.7, "constraint_satisfaction": 1.0 },
      "explanation": "This schedule minimizes dead time between classes and respects the preferences you listed."
    }
  ]
}
```

Lower-level endpoints (`/api/parse-constraints`, `/api/courses`, `/api/schedules`) remain available for debugging and partial integrations.

## Tests

```bash
cd server
node --test test/*.test.js
```

No third-party test framework — Node 18+ built-in runner only.

## Roadmap

- [x] Repo, React frontend on Vercel, Express + PG backend
- [x] **UW Time Schedule scraper + `/api/courses` endpoint**
- [x] **NLP constraint parser (Gemini API)**
- [x] **Candidate-schedule generator (conflict-free search)**
- [x] **Multi-dimensional scoring model + ranker**
- [x] **One-shot `/api/plan` integration endpoint**
- [x] React calendar UI wired to live `/api/plan`
- [x] **LLM-generated schedule explanations (Gemini)**
- [x] iCal / PDF export
- [ ] Live UW scraper verified against real Time Schedule pages
- [ ] RateMyProfessor + UW grade-distribution integration for difficulty scoring
