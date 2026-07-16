import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizedTemplateKey,
  optionValueAvailability,
  rankOptionTemplates,
} from "../../src/domain/option-template";

test("template normalization collapses whitespace and case", () => {
  assert.equal(normalizedTemplateKey("  Clothing   Size "), "clothing size");
  assert.equal(normalizedTemplateKey("RED"), normalizedTemplateKey(" red "));
});

test("template ranking prioritizes pinned, recommended, recent, frequent, then name", () => {
  const ranked = rankOptionTemplates([
    {
      id: 1,
      name: "Frequent",
      isPinned: false,
      recommendedPriority: null,
      usageCount: 9,
      lastUsedAt: null,
    },
    {
      id: 2,
      name: "Recommended",
      isPinned: false,
      recommendedPriority: 10,
      usageCount: 0,
      lastUsedAt: null,
    },
    {
      id: 3,
      name: "Pinned",
      isPinned: true,
      recommendedPriority: null,
      usageCount: 0,
      lastUsedAt: null,
    },
  ]);
  assert.deepEqual(
    ranked.map((template) => template.id),
    [3, 2, 1],
  );
});

test("partial selections distinguish available, out-of-stock, and unavailable values", () => {
  const variants = [
    { isActive: true, stockQuantity: 5, values: { Color: "Red", Size: "S" } },
    { isActive: true, stockQuantity: 0, values: { Color: "Red", Size: "M" } },
    { isActive: false, stockQuantity: 0, values: { Color: "Red", Size: "L" } },
  ];
  assert.equal(optionValueAvailability(variants, { Color: "Red" }, "Size", "S"), "AVAILABLE");
  assert.equal(optionValueAvailability(variants, { Color: "Red" }, "Size", "M"), "OUT_OF_STOCK");
  assert.equal(optionValueAvailability(variants, { Color: "Red" }, "Size", "L"), "UNAVAILABLE");
});
