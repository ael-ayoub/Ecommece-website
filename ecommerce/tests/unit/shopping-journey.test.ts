import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutErrorMessage,
  validateCheckoutDetails,
} from "../../src/domain/shopping-journey";

test("guest checkout accepts all valid delivery fields", () => {
  assert.deepEqual(
    validateCheckoutDetails({
      contactName: "Guest Buyer",
      contactEmail: "guest@example.com",
      contactPhone: "+222 45 67 89 01",
      shippingAddress: "Central district",
    }),
    {},
  );
});

test("checkout validation reports each invalid field without clearing values", () => {
  assert.deepEqual(
    validateCheckoutDetails({
      contactName: "",
      contactEmail: "invalid",
      contactPhone: "123",
      shippingAddress: " ",
    }),
    {
      contactName: "Full name is required",
      contactEmail: "Enter a valid email address",
      contactPhone: "Enter a valid phone number",
      shippingAddress: "Delivery address is required",
    },
  );
});

test("checkout errors distinguish stock conflicts without exposing raw details", () => {
  assert.match(
    checkoutErrorMessage(new Error("Insufficient stock for SECRET-SKU")),
    /no longer available/,
  );
  assert.doesNotMatch(
    checkoutErrorMessage(new Error("database stack trace")),
    /database|stack/i,
  );
});

test("unknown order failures provide a recoverable, non-authoritative message", () => {
  assert.match(checkoutErrorMessage(null), /could not confirm/i);
  assert.match(checkoutErrorMessage(new Error("timeout")), /try again/i);
});
