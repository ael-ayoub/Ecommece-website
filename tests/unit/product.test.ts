import assert from "node:assert/strict";
import test from "node:test";
import {
  combinationKey,
  effectivePrice,
  generateOptionCombinations,
  normalizeOptionText,
  normalizeSku,
} from "../../src/domain/product";

test("SKU normalization is uppercase and trimmed", () => {
  assert.equal(normalizeSku(" mouse-red_1 "), "MOUSE-RED_1");
});

test("option combinations form a deterministic cartesian product", () => {
  const combinations = generateOptionCombinations([
    { name: "Color", values: ["Red", "Blue"] },
    { name: "Size", values: ["S", "M"] },
  ]);
  assert.deepEqual(combinations, [
    { Color: "Red", Size: "S" },
    { Color: "Red", Size: "M" },
    { Color: "Blue", Size: "S" },
    { Color: "Blue", Size: "M" },
  ]);
  assert.equal(combinationKey(combinations[0], ["Color", "Size"]), "Color=Red|Size=S");
});

test("effective price uses override and otherwise base price", () => {
  assert.equal(effectivePrice("100.00", null), 100);
  assert.equal(effectivePrice("100.00", "110.00"), 110);
});

test("option text normalization preserves meaning while collapsing whitespace", () => {
  assert.equal(normalizeOptionText("  Dark   Blue "), "Dark Blue");
});
