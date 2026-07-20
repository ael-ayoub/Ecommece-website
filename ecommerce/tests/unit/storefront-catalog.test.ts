import assert from "node:assert/strict";
import test from "node:test";
import type { ProductDto } from "../../src/types/product";
import { getCataloguePresentation } from "../../src/domain/catalog-presentation";

function product(
  overrides: Partial<
    Pick<
      ProductDto,
      "productType" | "availability" | "variants" | "minPrice" | "maxPrice"
    >
  > = {},
): ProductDto {
  return {
    id: 1,
    categoryId: 1,
    category: {
      id: 1,
      name: "Clothing",
      slug: "clothing",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    name: "A long but readable Product name",
    description: "",
    basePrice: "40.00",
    productType: "SIMPLE",
    images: [],
    imageRecords: [],
    isActive: true,
    showExactStock: false,
    variants: [
      {
        id: 1,
        productId: 1,
        variantLabel: "Default",
        sku: "SIMPLE-001",
        isDefault: true,
        price: null,
        stockQuantity: 3,
        isActive: true,
      },
    ],
    options: [],
    totalStock: 3,
    skuCount: 1,
    availability: "AVAILABLE",
    minPrice: "40.00",
    maxPrice: "40.00",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("an available Simple Product with one SKU can be added directly", () => {
  const presentation = getCataloguePresentation(product());
  assert.equal(presentation.action, "ADD_TO_CART");
  assert.equal(presentation.singleVariant?.sku, "SIMPLE-001");
  assert.equal(presentation.availabilityLabel, "Available");
});

test("a Configurable Product always requires option selection", () => {
  const presentation = getCataloguePresentation(
    product({ productType: "CONFIGURABLE" }),
  );
  assert.equal(presentation.action, "CHOOSE_OPTIONS");
  assert.equal(presentation.singleVariant, null);
});

test("out-of-stock and unavailable Products never expose a cart action", () => {
  for (const availability of ["OUT_OF_STOCK", "UNAVAILABLE"] as const) {
    const presentation = getCataloguePresentation(
      product({ availability, variants: [] }),
    );
    assert.equal(presentation.action, "UNAVAILABLE");
    assert.equal(
      presentation.availabilityLabel,
      availability === "OUT_OF_STOCK" ? "Out of stock" : "Unavailable",
    );
  }
});

test("price-range presentation is derived from effective Product prices", () => {
  assert.equal(
    getCataloguePresentation(product({ minPrice: "40.00", maxPrice: "55.00" }))
      .hasPriceRange,
    true,
  );
  assert.equal(getCataloguePresentation(product()).hasPriceRange, false);
});
