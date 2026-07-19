import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../../src/lib/db";
import {
  batchUpdateVariants,
  createProduct,
  getProductById,
  updateProduct,
} from "../../src/services/product.service";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

test(
  "simple and configurable products persist SKU inventory atomically",
  { skip: !enabled },
  async () => {
    const category = await db.category.create({
      data: { name: "SKU Integration", slug: `sku-integration-${Date.now()}` },
    });
    const suffix = String(category.id);

    const simple = await createProduct({
      productType: "SIMPLE",
      name: "Simple Mouse",
      description: "Simple product integration test",
      categoryId: category.id,
      basePrice: 25,
      images: [],
      isActive: true,
      showExactStock: false,
      sku: { code: ` test-mouse-${suffix} `, stockQuantity: 7, isActive: true },
    });
    assert.equal(simple.productType, "SIMPLE");
    assert.equal(simple.variants.length, 1);
    assert.equal(simple.variants[0].sku, `TEST-MOUSE-${suffix}`);
    assert.equal(simple.variants[0].isDefault, true);
    assert.equal(simple.totalStock, 7);

    const configurable = await createProduct({
      productType: "CONFIGURABLE",
      name: "Configurable Shirt",
      description: "Configurable product integration test",
      categoryId: category.id,
      basePrice: 100,
      images: [],
      isActive: true,
      showExactStock: false,
      options: [
        { name: "Color", values: ["Red", "Blue"] },
        { name: "Size", values: ["Small", "Large"] },
      ],
      variants: [
        {
          sku: `SHIRT-RED-S-${suffix}`,
          optionValues: { Color: "Red", Size: "Small" },
          variantLabel: "Red / Small",
          price: null,
          stockQuantity: 2,
          isActive: true,
        },
        {
          sku: `SHIRT-BLUE-L-${suffix}`,
          optionValues: { Color: "Blue", Size: "Large" },
          variantLabel: "Blue / Extra Large",
          price: 110,
          stockQuantity: 3,
          isActive: true,
        },
      ],
    });
    assert.equal(configurable.options.length, 2);
    assert.equal(configurable.variants.length, 2);
    assert.equal(
      await db.productVariant.count({ where: { productId: configurable.id } }),
      2,
      "missing Cartesian combinations must not be created",
    );
    assert.equal(configurable.variants[1].variantLabel, "Blue / Extra Large");
    assert.equal(configurable.totalStock, 5);
    assert.equal(configurable.minPrice, "100.00");
    assert.equal(configurable.maxPrice, "110.00");

    await updateProduct(configurable.id, { basePrice: 105 });
    const repriced = await getProductById(configurable.id, { includeInactive: true });
    assert.equal(repriced.minPrice, "105.00");
    assert.equal(repriced.maxPrice, "110.00");

    const first = repriced.variants.find((variant) => variant.price === null)!;
    const second = repriced.variants.find((variant) => variant.price !== null)!;
    await batchUpdateVariants(configurable.id, {
      updates: [
        {
          id: first.id,
          variantLabel: "Red / Petite",
          stockQuantity: 4,
          price: null,
        },
        { id: second.id, price: 115 },
      ],
    });
    const edited = await getProductById(configurable.id, { includeInactive: true });
    assert.equal(edited.totalStock, 7);
    assert.equal(
      edited.variants.find((variant) => variant.id === first.id)?.variantLabel,
      "Red / Petite",
    );
    assert.equal(
      edited.variants.find((variant) => variant.id === first.id)?.optionCombinationKey,
      first.optionCombinationKey,
    );

    await assert.rejects(() =>
      batchUpdateVariants(configurable.id, {
        updates: [
          { id: first.id, sku: `DUPLICATE-${suffix}` },
          { id: second.id, sku: `DUPLICATE-${suffix}` },
        ],
      }),
    );
    const rolledBack = await getProductById(configurable.id, { includeInactive: true });
    assert.notEqual(
      rolledBack.variants.find((variant) => variant.id === first.id)?.sku,
      `DUPLICATE-${suffix}`,
    );

    await assert.rejects(
      db.productVariant.create({
        data: {
          productId: simple.id,
          sku: `NEGATIVE-STOCK-${suffix}`,
          variantLabel: "Invalid",
          stockQuantity: -1,
        },
      }),
    );

    const manyOptions = [
      ["Color", "Red"],
      ["Size", "M"],
      ["Material", "Cotton"],
      ["Style", "Regular"],
      ["Pack", "2"],
    ].map(([optionName, value]) => ({ name: optionName, values: [value] }));
    const manySelection = Object.fromEntries(
      manyOptions.map((option) => [option.name, option.values[0]]),
    );
    const manyOptionProduct = await createProduct({
      productType: "CONFIGURABLE",
      name: `Five Option Product ${suffix}`,
      description: "No arbitrary Product-option limit",
      categoryId: category.id,
      basePrice: 10,
      images: [],
      isActive: true,
      showExactStock: false,
      options: manyOptions,
      variants: [
        {
          sku: `FIVE-OPTION-${suffix}`,
          optionValues: manySelection,
          variantLabel: "Red / M / Cotton / Regular / 2",
          price: null,
          stockQuantity: 1,
          isActive: true,
        },
      ],
    });
    assert.equal(manyOptionProduct.options.length, 5);
    assert.equal(
      manyOptionProduct.variants[0].optionCombinationKey,
      "Color=Red|Size=M|Material=Cotton|Style=Regular|Pack=2",
    );

    await assert.rejects(() =>
      createProduct({
        productType: "CONFIGURABLE",
        name: `Invalid Unknown Option ${suffix}`,
        description: "Unknown option must fail",
        categoryId: category.id,
        basePrice: 10,
        images: [],
        isActive: true,
        showExactStock: false,
        options: manyOptions,
        variants: [
          {
            sku: `UNKNOWN-OPTION-${suffix}`,
            optionValues: { ...manySelection, Unknown: "Value" },
            variantLabel: "Invalid",
            price: null,
            stockQuantity: 1,
            isActive: true,
          },
        ],
      }),
    );
    await assert.rejects(
      db.productVariant.create({
        data: {
          productId: simple.id,
          sku: `SECOND-DEFAULT-${suffix}`,
          variantLabel: "Default 2",
          isDefault: true,
          stockQuantity: 0,
        },
      }),
    );
  },
);
