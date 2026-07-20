import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnPath } from "../../src/domain/auth-navigation";

test("safe return paths preserve internal destinations", () => {
  assert.equal(
    safeReturnPath("/orders/42?from=login", "/"),
    "/orders/42?from=login",
  );
});

test("unsafe return paths cannot redirect away from the storefront", () => {
  for (const target of [
    "https://attacker.example",
    "//attacker.example/path",
    "/\\attacker.example",
    "orders",
  ]) {
    assert.equal(safeReturnPath(target, "/products"), "/products");
  }
});

test("missing return paths use the role-aware fallback", () => {
  assert.equal(safeReturnPath(null, "/"), "/");
});
