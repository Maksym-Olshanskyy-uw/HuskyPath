# HuskyPath — Final Presentation Talking Points

Use this as a script outline. Time it: aim for 4–5 minutes total.

## 1. The problem (~30 sec)

> "UW enrolls about 50,000 students every year, including 4,000 incoming
> transfer students who have to build their first quarter from scratch.
> The university gives them MyPlan, which shows raw data — but no
> guidance. Students end up cross-referencing course difficulty, time
> conflicts, graduation requirements, and personal preferences across
> multiple systems. It's friction that nobody has fixed."

## 2. Our solution (~30 sec)

> "HuskyPath lets a student describe their ideal week in plain English —
> 'no classes before 10 AM, light Friday, avoid back-to-back lectures' —
> and we return three ranked, conflict-free schedules built from live
> UW course data, each with a plain-language explanation of why it
> ranks where it does."

## 3. Live demo (~2 minutes — this is the centerpiece)

Open `https://huskypath.vercel.app` in the browser. Then:

1. **Show the input box.** Type a real sentence like
   *"no classes before 10am, no Fridays, prefer afternoons, no back-to-back lectures"*.
2. **Hit submit.** Talk through what's happening while it loads:
   > "Behind the scenes, the sentence is being sent to Google's Gemini API
   > to extract structured constraints — earliest start, days to avoid,
   > preferred times. Then our backtracking generator searches every
   > conflict-free combination of UW course sections that respects those
   > constraints, and our four-dimension scorer ranks them."
3. **Show the results.** Click between the top three. Open the
   weekly calendar view. Point out that Friday is empty, mornings are
   clear, and no two classes touch.
4. **Click "About"** in the header. Walk through the architecture
   diagram for 15 seconds.

## 4. How the AI works (~45 sec)

Two distinct AI surfaces — emphasize this for the rubric.

> "AI shows up in HuskyPath in two places. First, the Gemini-powered
> NLP parser turns natural language into a structured constraint
> object — that's how 'no Fridays' becomes a field the search algorithm
> can act on. Second, Gemini also writes the per-schedule explanation
> you see at the top of each result, grounded in the scoring breakdown
> and the actual sections it picked. Neither of these is a 'side chat'
> — they're embedded as part of the program flow."

## 5. Tech stack lightning round (~30 sec)

> "Frontend is React 19 on Vercel. Backend is Node and Express on
> Render. The scraper, scheduler, and scorer are all home-grown — no
> third-party dependencies — and they're covered by 30+ unit and
> integration tests. The whole pipeline is exposed as a single
> endpoint, `POST /api/plan`, so the frontend just makes one call."

## 6. What's next (~20 sec)

> "Next term, we'd wire in Rate-My-Professor and historical UW grade
> distributions to make the 'difficulty curve' dimension a real
> signal instead of a proxy. And we'd open it up to recurring users
> with saved preferences."

## 7. Questions you should be ready for

- **"How does the scheduler handle conflicts?"** → Backtracking
  search; for each course pick a section, check if it overlaps any
  already-chosen section (same day + time range overlap), prune if it
  does. Sort courses by fewest sections first to keep the branching
  factor low at the top of the tree.
- **"Why is your difficulty score a placeholder?"** → Honest answer:
  we don't yet have a license-clean source for Rate-My-Professor or
  GPA data. Current proxy uses enrollment fullness and total credit
  load. Real data is a one-evening swap when we have it.
- **"What if Gemini is down?"** → The endpoint surfaces a 502 with a
  detail message; the frontend shows a graceful fallback ("backend
  unreachable") so a demo never dies on a flaky API.
- **"What's your test coverage like?"** → 30+ tests in the suite,
  covering the parser, scheduler, scorer, and full end-to-end pipeline
  with the NLP layer mocked so tests don't need an API key.

## Closing line

> "HuskyPath turns a 30-minute schedule-building session into a
> 30-second sentence. We think every UW transfer student and freshman
> should have this on day one."
