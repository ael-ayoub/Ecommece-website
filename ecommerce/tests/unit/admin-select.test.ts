import assert from "node:assert/strict";
import test from "node:test";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "../../src/domain/admin-select";

const options = [
  { disabled: false },
  { disabled: true },
  { disabled: false },
  { disabled: false },
];

test("admin select navigation finds the first and last enabled options", () => {
  assert.equal(firstEnabledIndex(options), 0);
  assert.equal(lastEnabledIndex(options), 3);
});

test("admin select navigation skips disabled options in both directions", () => {
  assert.equal(nextEnabledIndex(options, 0, 1), 2);
  assert.equal(nextEnabledIndex(options, 2, -1), 0);
});

test("admin select navigation wraps and handles all-disabled lists", () => {
  assert.equal(nextEnabledIndex(options, 3, 1), 0);
  assert.equal(nextEnabledIndex([{ disabled: true }], 0, 1), -1);
});
