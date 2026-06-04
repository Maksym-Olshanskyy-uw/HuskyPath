import { useEffect, useState } from 'react'
import './AboutModal.css'

/**
 * About / How it works modal.
 * Satisfies the DYOP rubric requirement that the deployed site clearly
 * explains the "why" and "how" of the project (Project Overview,
 * Technical Documentation, User Guide).
 */
export default function AboutModal({ open, onClose }) {
  const [tab, setTab] = useState('overview') // 'overview' | 'tech' | 'guide'

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="about-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      onClick={onClose}
    >
      <div
        className="about-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="about-header">
          <h2 id="about-title">About HuskyPath</h2>
          <button className="about-close" onClick={onClose} aria-label="Close About">
            ✕
          </button>
        </div>

        <div className="about-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'overview'}
            className={tab === 'overview' ? 'active' : ''}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button
            role="tab"
            aria-selected={tab === 'tech'}
            className={tab === 'tech' ? 'active' : ''}
            onClick={() => setTab('tech')}
          >
            How it works
          </button>
          <button
            role="tab"
            aria-selected={tab === 'guide'}
            className={tab === 'guide' ? 'active' : ''}
            onClick={() => setTab('guide')}
          >
            User guide
          </button>
        </div>

        <div className="about-body">
          {tab === 'overview' && (
            <section>
              <h3>What is HuskyPath?</h3>
              <p>
                HuskyPath is an AI-powered course planner built for the
                University of Washington community. Students describe their
                ideal week in plain English — <em>"no classes before 10am,
                light Friday, avoid back-to-back lectures"</em> — and HuskyPath
                returns three ranked, conflict-free schedules drawn from
                the live UW Time Schedule, each with a plain-language
                explanation of why it scored well.
              </p>
              <h3>Why this matters</h3>
              <p>
                UW enrolls more than 50,000 students each year, including
                roughly 4,000 incoming transfer students who have to build
                their first quarter from scratch. Existing tools like MyPlan
                show raw data but offer no intelligent guidance. Students
                end up cross-referencing course difficulty, time conflicts,
                graduation requirements, and personal preferences across
                multiple systems. HuskyPath collapses that workflow into a
                single natural-language request.
              </p>
            </section>
          )}

          {tab === 'tech' && (
            <section>
              <h3>Architecture</h3>
              <pre className="about-arch">{`
   ┌──────────────────────────────────────────────┐
   │   "no classes before 10am, light Friday"     │ ← user input
   └──────────────────────┬───────────────────────┘
                          ▼
              ┌───────────────────────┐
              │   NLP parser (LLM)    │ ← Google Gemini
              │   text → constraints  │
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │   UW Time Schedule    │ ← live scrape +
              │   course catalog      │   cached samples
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │   Candidate generator │ ← backtracking
              │   (conflict-free)     │   search
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │   4-dimension scorer  │ ← workload, gaps,
              │   + explanation gen   │   difficulty,
              └──────────┬────────────┘   constraints
                         ▼
              ┌───────────────────────┐
              │   Top-3 schedules     │ → React calendar UI
              └───────────────────────┘
`}</pre>
              <h3>Tech stack</h3>
              <ul>
                <li><strong>Frontend:</strong> React 19 + Vite, deployed on Vercel</li>
                <li><strong>Backend:</strong> Node.js 18+ with Express 5, deployable on Render</li>
                <li><strong>AI:</strong> Google Gemini for natural-language constraint extraction; rule-based scoring with optional LLM-generated explanations</li>
                <li><strong>Data:</strong> UW Time Schedule HTML scraper (zero external deps)</li>
                <li><strong>Tests:</strong> Node's built-in test runner — 30+ tests covering parser, scheduler, scorer, integration, and the scraper</li>
              </ul>
              <h3>One-shot API</h3>
              <p>
                The backend exposes <code>POST /api/plan</code>, which runs the
                entire pipeline (text → constraints → courses → ranked
                schedules) in a single request — so the frontend never has to
                orchestrate three separate calls.
              </p>
            </section>
          )}

          {tab === 'guide' && (
            <section>
              <h3>How to use HuskyPath</h3>
              <ol>
                <li>
                  <strong>Describe your ideal week.</strong> Use plain
                  English. Examples: <em>"no classes before 10am"</em>,
                  {' '}<em>"avoid Fridays"</em>, <em>"prefer afternoons"</em>,
                  {' '}<em>"no back-to-back lectures"</em>.
                </li>
                <li>
                  <strong>Submit.</strong> HuskyPath parses your sentence
                  with an LLM, pulls live course data, and searches the
                  conflict-free combinations.
                </li>
                <li>
                  <strong>Review the top schedules.</strong> Each one is
                  scored across four dimensions and comes with a plain-language
                  explanation of why it ranks where it does.
                </li>
                <li>
                  <strong>Compare side-by-side.</strong> Switch between
                  card and calendar views, and click between the top
                  candidates to see how each lays out across your week.
                </li>
                <li>
                  <strong>Export.</strong> Download the schedule you like
                  as an <code>.ics</code> file and import it into Google
                  Calendar, Apple Calendar, or Outlook.
                </li>
              </ol>
              <h3>What HuskyPath can interpret</h3>
              <ul>
                <li>Earliest start time (<em>"not before 10am"</em>)</li>
                <li>Latest end time (<em>"nothing after 5pm"</em>)</li>
                <li>Days to avoid entirely (<em>"no Fridays"</em>)</li>
                <li>Light vs. heavy days (<em>"light Wednesday"</em>)</li>
                <li>Time-of-day preference (<em>"prefer afternoons"</em>)</li>
                <li>Required courses (<em>"include CSE 142"</em>)</li>
                <li>Excluded courses (<em>"no PSYCH"</em>)</li>
                <li>Back-to-back tolerance</li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
