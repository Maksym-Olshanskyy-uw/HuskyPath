/**
 * Smoke tests: route scaffolding wires up correctly.
 * Confirms each new endpoint is mounted and returns the expected stub
 * response. Replace these as the real implementations land.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');

function start() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

// (The POST /api/parse-constraints stub assertion was removed once the
// real Gemini implementation landed; behavior is now covered in
// constraintParser.test.js. The GET /api/courses regression guard
// remains as a smoke test that the app boots and core routes mount.)

test('GET /api/courses still works (regression guard)', async () => {
  const server = await start();
  try {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/courses`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.courses), 'courses[] must be returned');
    assert.ok(body.courses.length > 0, 'sample data should be non-empty');
  } finally {
    server.close();
  }
});
