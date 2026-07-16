import assert from "node:assert/strict";
import test from "node:test";
import { checkoutFingerprint, normalizeCheckoutItems } from "../../src/domain/checkout";

test("duplicate checkout variants are aggregated and sorted", () => {
  assert.deepEqual(
    normalizeCheckoutItems([
      { variantId: 9, quantity: 2 },
      { variantId: 2, quantity: 1 },
      { variantId: 9, quantity: 3 },
    ]),
    [
      { variantId: 2, quantity: 1 },
      { variantId: 9, quantity: 5 },
    ],
  );
});

test("canonical fingerprints are stable across input line order", () => {
  const base = {
    contactName: "Buyer",
    contactEmail: "buyer@example.com",
    contactPhone: "123456",
    shippingAddress: "Street",
  };
  const a = checkoutFingerprint(
    {
      ...base,
      items: normalizeCheckoutItems([
        { variantId: 2, quantity: 2 },
        { variantId: 1, quantity: 1 },
      ]),
    },
    7,
  );
  const b = checkoutFingerprint(
    {
      ...base,
      items: normalizeCheckoutItems([
        { variantId: 1, quantity: 1 },
        { variantId: 2, quantity: 2 },
      ]),
    },
    7,
  );
  assert.equal(a, b);
});

test("excessive aggregate quantity is rejected", () => {
  assert.throws(() =>
    normalizeCheckoutItems([
      { variantId: 1, quantity: 600 },
      { variantId: 1, quantity: 500 },
    ]),
  );
});
