/**
 * Integration tests for POST /api/plan.
 * Mocks the NLP parser so the end-to-end pipeline can be exercised
 * without a live Gemini API key.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');

// Stub out constraintParser BEFORE the route module is loaded.
const ORIGINAL_RESOLVE = Module._resolveFilename;
const ORIGINAL_LOAD = Module._load;
const PARSER_PATH = path.join(__dirname, '..', 'services', 'constraintParser.js');

let mockedConstraints = {};
let mockedThrows = null;

Module._load = function patched(request, parent, ...rest) {
  const resolved = (() => {
    try { return Module._resolveFilename(request, parent); } catch { return null; }
  })();
  if (resolved === PARSER_PATH) {
    return {
      parseConstraints: async () => {
        if (mockedThrows) throw mockedThrows;
        return mockedConstraints;
      },
    };
  }
  return ORIGINAL_LOAD.call(this, request, parent, ...rest);
};

// Now safe to require the app.
const app = require('../index');

function start() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function postPlan(body) {
  const server = await start();
  try {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  } finally {
    server.close();
  }
}

test('POST /api/plan returns 400 when text is missing', async () => {
  const { status, json } = await postPlan({});
  assert.equal(status, 400);
  assert.match(json.error, /Missing 'text'/);
});

test('POST /api/plan runs end-to-end with mocked NLP + sample courses', async () => {
  mockedConstraints = {
    no_before: '10:00',
    excluded_days: ['Friday'],
    avoid_consecutive: true,
  };
  mockedThrows = null;

  const { status, json } = await postPlan({
    text: 'no class before 10am and no Fridays',
    topN: 2,
  });

  assert.equal(status, 200);
  assert.deepEqual(json.constraints, mockedConstraints);
  assert.ok(Array.isArray(json.schedules));
  assert.ok(json.candidatesEvaluated >= 1, 'should evaluate at least one candidate');
  for (const s of json.schedules) {
    assert.ok(s.sections.length > 0, 'each schedule must have at least one section');
    assert.ok(s.score >= 0 && s.score <= 1, 'score in [0,1]');
    assert.ok(typeof s.explanation === 'string');
    // none of the picked sections should meet on Friday
    for (const sec of s.sections) {
      assert.ok(!sec.days.includes('F'), 'Friday should be filtered out by excluded_days');
    }
  }
});

test('POST /api/plan accepts avoid_days as alias for excluded_days', async () => {
  // Simulate Max's CURRENT parser output shape (avoid_days, not excluded_days).
  mockedConstraints = { avoid_days: ['Friday'] };
  mockedThrows = null;

  const { status, json } = await postPlan({
    text: 'no Fridays please',
  });

  assert.equal(status, 200);
  for (const s of json.schedules) {
    for (const sec of s.sections) {
      assert.ok(!sec.days.includes('F'), 'avoid_days should also filter Friday');
    }
  }
});

test('POST /api/plan filters to the courseCodes subset', async () => {
  mockedConstraints = {};
  mockedThrows = null;

  const { status, json } = await postPlan({
    text: 'whatever',
    courseCodes: ['CSE 142'],
  });

  assert.equal(status, 200);
  for (const s of json.schedules) {
    const codes = s.sections.map((sec) => sec.courseCode);
    for (const c of codes) {
      assert.equal(c, 'CSE 142', 'only CSE 142 should appear when filtered');
    }
  }
});

test('POST /api/plan surfaces NLP failures as 502', async () => {
  mockedConstraints = {};
  mockedThrows = new Error('Gemini exploded');

  const { status, json } = await postPlan({ text: 'anything' });
  assert.equal(status, 502);
  assert.match(json.error, /Constraint parsing failed/);
  assert.match(json.detail, /Gemini exploded/);
});

test.after(() => {
  Module._load = ORIGINAL_LOAD;
  Module._resolveFilename = ORIGINAL_RESOLVE;
});
