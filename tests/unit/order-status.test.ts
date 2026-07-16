import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionOrder,
  ORDER_TRANSITIONS,
  transitionRestoresStock,
} from "../../src/domain/order-status";

const allowed = [
  ["PENDING", "CONFIRMED"],
  ["PENDING", "CANCELLED"],
  ["CONFIRMED", "SHIPPED"],
  ["CONFIRMED", "CANCELLED"],
  ["SHIPPED", "DELIVERED"],
  ["SHIPPED", "RETURNED"],
  ["DELIVERED", "RETURNED"],
] as const;

test("canonical order transitions allow only the lifecycle matrix", () => {
  for (const [from, to] of allowed) assert.equal(canTransitionOrder(from, to), true);
  for (const from of Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[]) {
    for (const to of Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[]) {
      if (!allowed.some((pair) => pair[0] === from && pair[1] === to)) {
        assert.equal(canTransitionOrder(from, to), false, `${from} -> ${to}`);
      }
    }
  }
});

test("terminal states cannot reopen", () => {
  assert.deepEqual(ORDER_TRANSITIONS.CANCELLED, []);
  assert.deepEqual(ORDER_TRANSITIONS.RETURNED, []);
});

test("only cancellation and return transitions restore stock", () => {
  assert.equal(transitionRestoresStock("PENDING", "CANCELLED"), true);
  assert.equal(transitionRestoresStock("CONFIRMED", "CANCELLED"), true);
  assert.equal(transitionRestoresStock("SHIPPED", "RETURNED"), true);
  assert.equal(transitionRestoresStock("DELIVERED", "RETURNED"), true);
  assert.equal(transitionRestoresStock("PENDING", "CONFIRMED"), false);
});
