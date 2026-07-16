-- Abort safely if existing data would violate the new constraints.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ProductVariant" WHERE "stockQuantity" < 0) THEN
    RAISE EXCEPTION 'Cannot add stock constraint: negative ProductVariant stock exists';
  END IF;
  IF EXISTS (SELECT 1 FROM "OrderItemVariant" WHERE quantity <= 0) THEN
    RAISE EXCEPTION 'Cannot add quantity constraint: non-positive OrderItemVariant quantity exists';
  END IF;
END $$;

CREATE TYPE "OrderActorType" AS ENUM ('CLIENT', 'ADMIN', 'SYSTEM');

ALTER TABLE "Order"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "idempotencyFingerprint" TEXT;

-- Historical orders predate idempotent checkout. Give them collision-free internal keys.
UPDATE "Order"
SET "idempotencyKey" = 'legacy-' || id::text,
    "idempotencyFingerprint" = 'legacy'
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "Order"
  ALTER COLUMN "idempotencyKey" SET NOT NULL,
  ALTER COLUMN "idempotencyFingerprint" SET NOT NULL;

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

CREATE TABLE "OrderStatusHistory" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "changedByUserId" INTEGER,
  "actorType" "OrderActorType" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
  "id" SERIAL NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "OrderStatusHistory_changedByUserId_idx" ON "OrderStatusHistory"("changedByUserId");
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");

ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey"
  FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "product_variant_stock_non_negative"
  CHECK ("stockQuantity" >= 0);
ALTER TABLE "OrderItemVariant" ADD CONSTRAINT "order_item_variant_quantity_positive"
  CHECK (quantity > 0);
ALTER TABLE "OrderItemVariant" ADD CONSTRAINT "order_item_variant_unit_price_non_negative"
  CHECK ("unitPriceSnapshot" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "order_total_non_negative"
  CHECK ("totalAmount" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "product_base_price_non_negative"
  CHECK ("basePrice" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "product_variant_price_non_negative"
  CHECK (price IS NULL OR price >= 0);
