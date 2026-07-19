CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'CONFIGURABLE');

ALTER TABLE "Product" ADD COLUMN "productType" "ProductType";
ALTER TABLE "ProductVariant"
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "optionCombinationKey" TEXT;
ALTER TABLE "OrderItemVariant" ADD COLUMN "skuSnapshot" TEXT;

-- Preserve all existing IDs, prices, stock, and active states. Only an
-- unmistakable single "Default" variant is classified as SIMPLE.
UPDATE "Product" p
SET "productType" = CASE
  WHEN (
    SELECT COUNT(*) FROM "ProductVariant" v WHERE v."productId" = p.id
  ) = 1 AND EXISTS (
    SELECT 1 FROM "ProductVariant" v
    WHERE v."productId" = p.id AND lower(trim(v."variantLabel")) = 'default'
  ) THEN 'SIMPLE'::"ProductType"
  ELSE 'CONFIGURABLE'::"ProductType"
END;

-- Products with no variants become simple products with zero-stock default SKUs.
INSERT INTO "ProductVariant"
  ("productId", "variantLabel", "sku", "isDefault", price, "stockQuantity", "isActive", "createdAt", "updatedAt")
SELECT id, 'Default', 'LEGACY-PRODUCT-' || id, true, NULL, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" p
WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id);

UPDATE "Product" p SET "productType" = 'SIMPLE'
WHERE EXISTS (
  SELECT 1 FROM "ProductVariant" v
  WHERE v."productId" = p.id AND v.sku = 'LEGACY-PRODUCT-' || p.id
);

UPDATE "ProductVariant"
SET sku = 'LEGACY-PRODUCT-' || "productId" || '-VARIANT-' || id
WHERE sku IS NULL;

UPDATE "ProductVariant" v
SET "isDefault" = true
FROM "Product" p
WHERE p.id = v."productId"
  AND p."productType" = 'SIMPLE'
  AND lower(trim(v."variantLabel")) = 'default';

UPDATE "OrderItemVariant" oiv
SET "skuSnapshot" = COALESCE(v.sku, 'LEGACY-VARIANT-' || COALESCE(oiv."productVariantId"::text, oiv.id::text))
FROM "ProductVariant" v
WHERE v.id = oiv."productVariantId";
UPDATE "OrderItemVariant"
SET "skuSnapshot" = 'LEGACY-ORDER-ITEM-VARIANT-' || id
WHERE "skuSnapshot" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "productType" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN sku SET NOT NULL;
ALTER TABLE "OrderItemVariant" ALTER COLUMN "skuSnapshot" SET NOT NULL;

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"(sku);
CREATE UNIQUE INDEX "ProductVariant_productId_optionCombinationKey_key"
  ON "ProductVariant"("productId", "optionCombinationKey");
CREATE UNIQUE INDEX "product_variant_one_default_per_product"
  ON "ProductVariant"("productId") WHERE "isDefault" = true;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "product_variant_sku_non_empty"
  CHECK (length(trim(sku)) > 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "product_variant_sku_length"
  CHECK (length(sku) <= 64);

CREATE TABLE "ProductOption" (
  id SERIAL NOT NULL,
  "productId" INTEGER NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOption_pkey" PRIMARY KEY (id)
);
CREATE TABLE "ProductOptionValue" (
  id SERIAL NOT NULL,
  "optionId" INTEGER NOT NULL,
  value TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY (id)
);
CREATE TABLE "ProductVariantOptionValue" (
  "variantId" INTEGER NOT NULL,
  "optionValueId" INTEGER NOT NULL,
  CONSTRAINT "ProductVariantOptionValue_pkey" PRIMARY KEY ("variantId", "optionValueId")
);

CREATE UNIQUE INDEX "ProductOption_productId_name_key" ON "ProductOption"("productId", name);
CREATE INDEX "ProductOption_productId_position_idx" ON "ProductOption"("productId", position);
CREATE UNIQUE INDEX "ProductOptionValue_optionId_value_key" ON "ProductOptionValue"("optionId", value);
CREATE INDEX "ProductOptionValue_optionId_position_idx" ON "ProductOptionValue"("optionId", position);
CREATE INDEX "ProductVariantOptionValue_optionValueId_idx" ON "ProductVariantOptionValue"("optionValueId");

ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "ProductOption"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVariantOptionValue" ADD CONSTRAINT "ProductVariantOptionValue_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVariantOptionValue" ADD CONSTRAINT "ProductVariantOptionValue_optionValueId_fkey"
  FOREIGN KEY ("optionValueId") REFERENCES "ProductOptionValue"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
