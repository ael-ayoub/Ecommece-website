-- Add customer account state and immutable account identity without changing
-- or deleting existing users, orders, financial data, or purchased snapshots.
ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Order"
ADD COLUMN "customerAccountIdSnapshot" INTEGER;

UPDATE "Order"
SET "customerAccountIdSnapshot" = "userId"
WHERE "userId" IS NOT NULL;

CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
