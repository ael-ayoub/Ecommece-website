import assert from "node:assert/strict";
import test from "node:test";
import {
  safeReturnPath,
  validateLoginFields,
  validateRegisterFields,
} from "../../src/domain/auth-navigation";

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

test("login validation associates errors with invalid fields", () => {
  assert.deepEqual(validateLoginFields("invalid", ""), {
    email: "Enter a valid email address.",
    password: "Enter your password.",
  });
  assert.deepEqual(validateLoginFields("client@example.com", "secret"), {});
});

test("registration validation follows the server field requirements", () => {
  assert.deepEqual(
    validateRegisterFields({
      name: "",
      email: "invalid",
      phone: "123",
      password: "short",
    }),
    {
      name: "Enter your full name.",
      email: "Enter a valid email address.",
      phone: "Enter a valid phone number.",
      password: "Use at least 8 characters.",
    },
  );
});
