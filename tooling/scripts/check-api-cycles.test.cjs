// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCycle, compareCycles } = require("./check-api-cycles.cjs");

test("normalizes cycle rotations to one stable key", () => {
  assert.equal(
    normalizeCycle(["b.js", "c.js", "a.js"]),
    normalizeCycle(["a.js", "b.js", "c.js"]),
  );
});

test("reports only cycles absent from the reviewed baseline as new", () => {
  const result = compareCycles(
    [["a.js", "b.js"], ["x.js", "y.js"]],
    [["b.js", "a.js"], ["old.js", "cycle.js"]],
  );
  assert.deepEqual(result.newCycles, ["x.js -> y.js"]);
  assert.deepEqual(result.resolvedCycles, ["cycle.js -> old.js"]);
  assert.equal(result.currentCount, 2);
  assert.equal(result.baselineCount, 2);
});
