import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../../src/lib/db";
import { createProduct } from "../../src/services/product.service";

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
      options: [
        { name: "Color", values: ["Red", "Blue"] },
        { name: "Size", values: ["Small", "Large"] },
      ],
      variants: [
        {
          sku: `SHIRT-RED-S-${suffix}`,
          optionValues: { Color: "Red", Size: "Small" },
          price: null,
          stockQuantity: 2,
          isActive: true,
        },
        {
          sku: `SHIRT-BLUE-L-${suffix}`,
          optionValues: { Color: "Blue", Size: "Large" },
          price: 110,
          stockQuantity: 3,
          isActive: true,
        },
      ],
    });
    assert.equal(configurable.options.length, 2);
    assert.equal(configurable.variants.length, 2);
    assert.equal(configurable.totalStock, 5);
    assert.equal(configurable.minPrice, "100.00");
    assert.equal(configurable.maxPrice, "110.00");

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
