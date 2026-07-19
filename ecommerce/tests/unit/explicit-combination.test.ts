import assert from "node:assert/strict";
import test from "node:test";
import { productCreateSchema } from "../../src/lib/validators";

const base = {
  productType: "CONFIGURABLE" as const,
  name: "Explicit Shirt",
  description: "Only sold combinations become SKUs",
  basePrice: 120,
  categoryId: 1,
  images: [],
  isActive: true,
  showExactStock: false,
  options: [
    { name: "Color", values: ["Red", "Yellow"] },
    { name: "Size", values: ["S", "M", "L"] },
  ],
};

test("explicit payload accepts only submitted combinations and canonical aliases", () => {
  const parsed = productCreateSchema.parse({
    ...base,
    variants: [
      {
        selection: { Color: "Red", Size: "S" },
        label: "Red / Small",
        sku: "SHIRT-RED-S",
        stockQuantity: 4,
        priceOverride: null,
        isActive: true,
      },
    ],
  });
  assert.equal(parsed.productType, "CONFIGURABLE");
  assert.equal(parsed.variants.length, 1);
  assert.deepEqual(parsed.variants[0].optionValues, { Color: "Red", Size: "S" });
  assert.equal(parsed.variants[0].variantLabel, "Red / Small");
  assert.equal(parsed.variants[0].price, null);
});

test("configurable Product requires at least one explicit combination", () => {
  assert.throws(() => productCreateSchema.parse({ ...base, variants: [] }));
});

test("configurable Product validation accepts more than three option types", () => {
  const options = [
    ["Color", "Red"],
    ["Size", "M"],
    ["Material", "Cotton"],
    ["Style", "Regular"],
    ["Pack", "2"],
  ].map(([name, value]) => ({ name, values: [value] }));
  const selection = Object.fromEntries(options.map((option) => [option.name, option.values[0]]));
  const parsed = productCreateSchema.parse({
    ...base,
    options,
    variants: [
      {
        selection,
        label: "Red / M / Cotton / Regular / 2",
        sku: "FIVE-OPTION-SKU",
        stockQuantity: 1,
        priceOverride: 0,
        isActive: true,
      },
    ],
  });
  assert.equal(parsed.productType, "CONFIGURABLE");
  if (parsed.productType !== "CONFIGURABLE") throw new Error("Expected configurable Product");
  assert.equal(parsed.options.length, 5);
  assert.deepEqual(parsed.variants[0].optionValues, selection);
});
