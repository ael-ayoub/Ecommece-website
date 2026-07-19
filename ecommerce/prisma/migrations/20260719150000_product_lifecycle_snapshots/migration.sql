-- Add immutable commercial snapshots without rewriting or removing existing
-- order rows. Historical rows are backfilled from live catalog data where the
-- optional convenience relations still exist.
ALTER TABLE "OrderItem"
ADD COLUMN "imageSnapshot" TEXT;

ALTER TABLE "OrderItemVariant"
ADD COLUMN "optionValuesSnapshot" JSONB;

UPDATE "OrderItem" AS oi
SET "imageSnapshot" = p.images[1]
FROM "Product" AS p
WHERE oi."productId" = p.id
  AND cardinality(p.images) > 0;

UPDATE "OrderItemVariant" AS oiv
SET "optionValuesSnapshot" = selections.values
FROM (
  SELECT
    pvo."variantId",
    jsonb_object_agg(po.name, pov.value ORDER BY po.position) AS values
  FROM "ProductVariantOptionValue" AS pvo
  JOIN "ProductOptionValue" AS pov ON pov.id = pvo."optionValueId"
  JOIN "ProductOption" AS po ON po.id = pov."optionId"
  GROUP BY pvo."variantId"
) AS selections
WHERE oiv."productVariantId" = selections."variantId";
