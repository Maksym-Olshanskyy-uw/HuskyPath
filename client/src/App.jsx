import { useEffect, useState } from 'react'
import ConstraintInput from './components/ConstraintInput'
import ScheduleResults from './components/ScheduleResults'
import AboutModal from './components/AboutModal'
import { planSchedules } from './api'
import './App.css'

function App() {
  const [phase, setPhase] = useState('input') // 'input' | 'loading' | 'results'
  const [schedules, setSchedules] = useState([])
  const [query, setQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('huskypath-theme') === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('huskypath-theme', theme)
  }, [theme])

  const handleSubmit = async (inputText) => {
    setQuery(inputText)
    setErrorMsg(null)
    setPhase('loading')

    try {
      // Hit the unified /api/plan endpoint — returns ranked schedules
      // already shaped for the UI components.
      const ranked = await planSchedules(inputText, { topN: 3 })
      if (ranked.length === 0) {
        setSchedules(MOCK_SCHEDULES)
        setErrorMsg('No conflict-free schedules found — showing example data instead.')
      } else {
        setSchedules(ranked)
      }
      setPhase('results')
    } catch (err) {
      // Backend unreachable — fall back to mock so the demo never dies.
      await new Promise((r) => setTimeout(r, 600))
      setSchedules(MOCK_SCHEDULES)
      setErrorMsg(
        'Backend unreachable — showing example data. ' +
          'Live mode kicks in once the API is online.'
      )
      setPhase('results')
      // eslint-disable-next-line no-console
      console.warn('planSchedules failed:', err.message)
    }
  }

  const handleReset = () => {
    setPhase('input')
    setSchedules([])
    setQuery('')
    setErrorMsg(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <img src="/uw_husky_logo.png" className="brand-mark" alt="HuskyPath logo" />
            <span className="brand-name">HuskyPath</span>
          </div>
          <p className="brand-tagline">AI-powered schedule planner for UW students</p>
          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setAboutOpen(true)}
              aria-label="Open About dialog"
            >
              <span className="theme-toggle-icon" aria-hidden="true">ⓘ</span>
              <span>About</span>
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === 'dark' ? '☀' : '☾'}
              </span>
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {phase === 'input' && (
          <ConstraintInput onSubmit={handleSubmit} />
        )}
        {phase === 'loading' && (
          <div className="loading-state">
            <div className="loading-ring">
              <span />
              <span />
              <span />
            </div>
            <p className="loading-label">Parsing your preferences…</p>
            <p className="loading-sub">Finding conflict-free schedules for you</p>
          </div>
        )}
        {phase === 'results' && (
          <>
            {errorMsg && (
              <div className="banner-warning" role="status">
                {errorMsg}
              </div>
            )}
            <ScheduleResults
              schedules={schedules}
              query={query}
              onReset={handleReset}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>HuskyPath &middot; DYOP Final Project &middot; University of Washington</p>
      </footer>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}

// ─── MOCK DATA (used when server returns 501) ─────────────────────────────────
const MOCK_SCHEDULES = [
  {
    id: 1,
    rank: 1,
    score: 91,
    label: 'Light mornings, open Friday',
    explanation:
      'All classes start at 10am or later, your Friday is completely free, and lecture blocks are separated by at least one hour.',
    courses: [
      {
        code: 'CSE 311',
        title: 'Foundations of Computing I',
        credits: 4,
        instructor: 'BEAME, P',
        days: ['Mon', 'Wed', 'Fri'],
        startTime: '10:30',
        endTime: '11:20',
        building: 'EEB',
        room: '105',
        color: '#5b8af5',
      },
      {
        code: 'MATH 307',
        title: 'Introduction to Differential Equations',
        credits: 3,
        instructor: 'LOVELESS, A',
        days: ['Tue', 'Thu'],
        startTime: '11:30',
        endTime: '12:50',
        building: 'SMI',
        room: '304',
        color: '#f5a623',
      },
      {
        code: 'ENGL 202',
        title: 'Critical Practice: Argument',
        credits: 5,
        instructor: 'DANIELS, R',
        days: ['Mon', 'Wed'],
        startTime: '13:30',
        endTime: '14:50',
        building: 'SAV',
        room: '131',
        color: '#50c878',
      },
    ],
  },
  {
    id: 2,
    rank: 2,
    score: 84,
    label: 'Compact Tuesday–Thursday',
    explanation:
      'Heavy T/Th load keeps Mon, Wed, Fri light. All classes cluster between 10am–3pm with no dead gaps over 90 minutes.',
    courses: [
      {
        code: 'CSE 311',
        title: 'Foundations of Computing I',
        credits: 4,
        instructor: 'BEAME, P',
        days: ['Mon', 'Wed', 'Fri'],
        startTime: '10:30',
        endTime: '11:20',
        building: 'EEB',
        room: '105',
        color: '#5b8af5',
      },
      {
        code: 'MATH 307',
        title: 'Introduction to Differential Equations',
        credits: 3,
        instructor: 'LOVELESS, A',
        days: ['Tue', 'Thu'],
        startTime: '10:00',
        endTime: '11:20',
        building: 'SMI',
        room: '304',
        color: '#f5a623',
      },
      {
        code: 'ENGL 202',
        title: 'Critical Practice: Argument',
        credits: 5,
        instructor: 'DANIELS, R',
        days: ['Tue', 'Thu'],
        startTime: '13:00',
        endTime: '14:20',
        building: 'SAV',
        room: '131',
        color: '#50c878',
      },
    ],
  },
  {
    id: 3,
    rank: 3,
    score: 76,
    label: 'Balanced spread',
    explanation:
      'Credits distributed evenly M–F. No day exceeds 3 hours of class. Slightly earlier start on Mon to leave late afternoons free.',
    courses: [
      {
        code: 'CSE 311',
        title: 'Foundations of Computing I',
        credits: 4,
        instructor: 'BEAME, P',
        days: ['Mon', 'Wed', 'Fri'],
        startTime: '09:30',
        endTime: '10:20',
        building: 'EEB',
        room: '105',
        color: '#5b8af5',
      },
      {
        code: 'MATH 307',
        title: 'Introduction to Differential Equations',
        credits: 3,
        instructor: 'LOVELESS, A',
        days: ['Mon', 'Wed'],
        startTime: '12:00',
        endTime: '13:20',
        building: 'SMI',
        room: '304',
        color: '#f5a623',
      },
      {
        code: 'ENGL 202',
        title: 'Critical Practice: Argument',
        credits: 5,
        instructor: 'DANIELS, R',
        days: ['Tue', 'Thu'],
        startTime: '11:30',
        endTime: '12:50',
        building: 'SAV',
        room: '131',
        color: '#50c878',
      },
    ],
  },
]

export default App
