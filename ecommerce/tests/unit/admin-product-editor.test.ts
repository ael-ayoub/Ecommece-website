import assert from "node:assert/strict";
import test from "node:test";
import { inventoryPresentation } from "../../src/domain/admin-product-editor";

test("Simple Products always use the single Inventory SKU presentation", () => {
  assert.equal(inventoryPresentation("SIMPLE", 0), "SIMPLE_INVENTORY");
  assert.equal(inventoryPresentation("SIMPLE", 3), "SIMPLE_INVENTORY");
});

test("Configurable Products distinguish structured and legacy inventory", () => {
  assert.equal(inventoryPresentation("CONFIGURABLE", 3), "STRUCTURED_VARIANTS");
  assert.equal(inventoryPresentation("CONFIGURABLE", 0), "LEGACY_VARIANTS");
});
