/**
 * Schedule Candidate Generator
 * -------------------------------------------------------------------
 * Given a list of courses (each with one or more sections) and a set
 * of user constraints, produce conflict-free candidate schedules
 * suitable for scoring.
 *
 * Algorithm
 *   Recursive backtracking: pick one section per course, prune any
 *   pick that conflicts in time with an already-chosen section or
 *   that violates a hard constraint. To keep the search bounded on
 *   large inputs we cap the number of candidates explored.
 *
 * Public API
 *   timeToMinutes(hhmm)                       -> number
 *   sectionsConflict(a, b)                    -> boolean
 *   generateCandidates(courses, constraints,  -> Candidate[]
 *                      { maxCandidates })
 *
 * Candidate shape
 *   { sections: Section[] }
 *
 * Constraints honored as HARD filters (cause pruning):
 *   - no_before:        "HH:MM"   reject sections starting before this
 *   - no_after:         "HH:MM"   reject sections ending after this
 *   - excluded_days:    string[]  reject any section meeting on these days
 *                                 (accepts "F" / "Th" or "Friday" / "Thursday")
 *   - avoid_days:       string[]  ALIAS for excluded_days — accepted so the
 *                                 current NLP parser's output isn't silently
 *                                 dropped during the field-rename window
 *   - excluded_courses: string[]  drop these course codes entirely
 *   - required_courses: string[]  if a required course has no eligible
 *                                 sections, return [] (caller decides
 *                                 how to surface the failure)
 *
 * Constraints honored as SOFT preferences (left to the scorer):
 *   - light_days, preferred_times, avoid_consecutive, ...
 */

'use strict';

/**
 * Convert "HH:MM" (24-hour) to minutes since midnight.
 * @param {string} hhmm
 * @returns {number}
 */
function timeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return NaN;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Do two sections overlap in time on at least one shared day?
 * Treats start/end as inclusive-start, exclusive-end (standard).
 */
function sectionsConflict(a, b) {
  const sharedDay = a.days.some((d) => b.days.includes(d));
  if (!sharedDay) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

// Accept either short codes ("F", "Th") or full names ("Friday") from
// the NLP parser. Map names to codes for uniform comparison.
const DAY_NAME_TO_CODE = {
  monday: 'M', tuesday: 'T', wednesday: 'W', thursday: 'Th', friday: 'F',
  saturday: 'S', sunday: 'U',
};

function normalizeDayList(list) {
  if (!Array.isArray(list)) return new Set();
  return new Set(
    list
      .map((d) => (typeof d === 'string' ? d.trim() : ''))
      .map((d) => DAY_NAME_TO_CODE[d.toLowerCase()] || d)
      .filter(Boolean)
  );
}

/**
 * Hard-filter a course's sections by the constraint object before
 * we ever consider them in the search. Returns the filtered list.
 */
function eligibleSections(course, constraints = {}) {
  const noBefore = constraints.no_before
    ? timeToMinutes(constraints.no_before)
    : null;
  const noAfter = constraints.no_after
    ? timeToMinutes(constraints.no_after)
    : null;
  // Merge excluded_days (canonical) with avoid_days (NLP parser's current
  // field name) so neither shape silently no-ops.
  const excludedDays = new Set([
    ...normalizeDayList(constraints.excluded_days),
    ...normalizeDayList(constraints.avoid_days),
  ]);

  return course.sections.filter((s) => {
    if (noBefore != null && timeToMinutes(s.startTime) < noBefore) return false;
    if (noAfter != null && timeToMinutes(s.endTime) > noAfter) return false;
    if (excludedDays.size && s.days.some((d) => excludedDays.has(d))) return false;
    // Closed sections are still candidates — UW students often plan
    // around waitlists — but we tag them so the scorer can penalize.
    return true;
  });
}

/**
 * Generate conflict-free candidate schedules.
 *
 * @param {Course[]} courses
 * @param {object}   constraints
 * @param {object}   [opts]
 * @param {number}   [opts.maxCandidates=200]
 * @returns {{sections: Section[]}[]}
 */
function generateCandidates(courses, constraints = {}, opts = {}) {
  const maxCandidates = opts.maxCandidates ?? 200;

  const excluded = new Set(constraints.excluded_courses || []);
  const required = new Set(constraints.required_courses || []);

  // Drop excluded courses up front.
  const pool = courses
    .filter((c) => !excluded.has(c.code))
    .map((c) => ({ ...c, sections: eligibleSections(c, constraints) }));

  // Required courses with no eligible sections = unsatisfiable.
  for (const code of required) {
    const c = pool.find((x) => x.code === code);
    if (!c || c.sections.length === 0) return [];
  }

  // Sort courses: Required first, then by fewest sections to reduce branching.
  pool.sort((a, b) => {
    const aReq = required.has(a.code);
    const bReq = required.has(b.code);
    if (aReq && !bReq) return -1;
    if (!aReq && bReq) return 1;
    return a.sections.length - b.sections.length;
  });

  // NEW: Read the target constraint, default to pool.length if missing
  const targetCourses = constraints.target_courses || pool.length;
  const candidates = [];

  function backtrack(idx, chosen) {
    if (candidates.length >= maxCandidates) return;
    
    // NEW BASE CASE 1: We hit our target number of courses!
    if (chosen.length === targetCourses) {
      candidates.push({ sections: chosen.slice() });
      return;
    }

    // BASE CASE 2: We ran out of courses in the pool before hitting the target
    if (idx === pool.length) {
      // If no target was explicitly specified, we accept whatever we managed to pick
      if (!constraints.target_courses) {
         candidates.push({ sections: chosen.slice() });
      }
      return;
    }

    const course = pool[idx];
    const isRequired = required.has(course.code);

    // NEW BRANCH 1: Skip this course entirely (only allowed if NOT required)
    // This allows us to pick 3 courses out of a pool of 6.
    if (!isRequired) {
      backtrack(idx + 1, chosen);
    }

    // BRANCH 2: Pick a valid section from this course
    if (course.sections.length > 0) {
      for (const section of course.sections) {
        const sectionWithCourse = {
          ...section,
          courseCode: course.code,
          courseTitle: course.title,
        };
        const conflicts = chosen.some((c) => sectionsConflict(c, sectionWithCourse));
        if (conflicts) continue;
        
        chosen.push(sectionWithCourse);
        backtrack(idx + 1, chosen);
        chosen.pop();
        
        if (candidates.length >= maxCandidates) return;
      }
    }
  }

  backtrack(0, []);
  return candidates;
}

module.exports = {
  generateCandidates,
  sectionsConflict,
  timeToMinutes,
  normalizeDayList,
  // exported for tests
  _internal: { eligibleSections },
};
