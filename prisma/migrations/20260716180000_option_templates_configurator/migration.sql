CREATE TYPE "OptionTemplateOwnerType" AS ENUM ('SYSTEM', 'USER');
CREATE TYPE "OptionInputType" AS ENUM ('TEXT', 'COLOR', 'NUMBER');

ALTER TABLE "Product" ADD COLUMN "showExactStock" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "OptionTemplate" (
  id SERIAL NOT NULL,
  "ownerType" "OptionTemplateOwnerType" NOT NULL,
  "ownerUserId" INTEGER,
  name TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "inputType" "OptionInputType" NOT NULL DEFAULT 'TEXT',
  description TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OptionTemplate_pkey" PRIMARY KEY (id),
  CONSTRAINT "option_template_owner_consistent" CHECK (
    ("ownerType" = 'SYSTEM' AND "ownerUserId" IS NULL) OR
    ("ownerType" = 'USER' AND "ownerUserId" IS NOT NULL)
  ),
  CONSTRAINT "option_template_name_non_empty" CHECK (length(trim(name)) > 0),
  CONSTRAINT "option_template_name_length" CHECK (length(name) <= 80)
);

CREATE TABLE "OptionTemplateValue" (
  id SERIAL NOT NULL,
  "templateId" INTEGER NOT NULL,
  value TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  metadata JSONB,
  position INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OptionTemplateValue_pkey" PRIMARY KEY (id),
  CONSTRAINT "option_template_value_non_empty" CHECK (length(trim(value)) > 0),
  CONSTRAINT "option_template_value_length" CHECK (length(value) <= 100)
);

CREATE TABLE "OptionTemplateCategory" (
  "templateId" INTEGER NOT NULL,
  "categoryId" INTEGER NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OptionTemplateCategory_pkey" PRIMARY KEY ("templateId", "categoryId")
);

CREATE TABLE "UserOptionTemplatePreference" (
  "userId" INTEGER NOT NULL,
  "templateId" INTEGER NOT NULL,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserOptionTemplatePreference_pkey" PRIMARY KEY ("userId", "templateId"),
  CONSTRAINT "option_template_usage_non_negative" CHECK ("usageCount" >= 0)
);

CREATE UNIQUE INDEX "option_template_system_name_unique"
  ON "OptionTemplate"("normalizedName") WHERE "ownerType" = 'SYSTEM';
CREATE UNIQUE INDEX "option_template_user_name_unique"
  ON "OptionTemplate"("ownerUserId", "normalizedName") WHERE "ownerType" = 'USER';
CREATE INDEX "OptionTemplate_ownerType_ownerUserId_isActive_idx"
  ON "OptionTemplate"("ownerType", "ownerUserId", "isActive");
CREATE INDEX "OptionTemplate_normalizedName_idx" ON "OptionTemplate"("normalizedName");
CREATE UNIQUE INDEX "OptionTemplateValue_templateId_normalizedValue_key"
  ON "OptionTemplateValue"("templateId", "normalizedValue");
CREATE INDEX "OptionTemplateValue_templateId_position_idx"
  ON "OptionTemplateValue"("templateId", position);
CREATE INDEX "OptionTemplateCategory_categoryId_priority_idx"
  ON "OptionTemplateCategory"("categoryId", priority);
CREATE INDEX "UserOptionTemplatePreference_userId_isPinned_lastUsedAt_idx"
  ON "UserOptionTemplatePreference"("userId", "isPinned", "lastUsedAt");
CREATE INDEX "UserOptionTemplatePreference_userId_usageCount_idx"
  ON "UserOptionTemplatePreference"("userId", "usageCount");

ALTER TABLE "OptionTemplate" ADD CONSTRAINT "OptionTemplate_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionTemplateValue" ADD CONSTRAINT "OptionTemplateValue_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "OptionTemplate"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionTemplateCategory" ADD CONSTRAINT "OptionTemplateCategory_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "OptionTemplate"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionTemplateCategory" ADD CONSTRAINT "OptionTemplateCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserOptionTemplatePreference" ADD CONSTRAINT "UserOptionTemplatePreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserOptionTemplatePreference" ADD CONSTRAINT "UserOptionTemplatePreference_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "OptionTemplate"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Idempotent built-in templates. Product options are copied from these;
-- Products never retain a foreign key to a template.
INSERT INTO "OptionTemplate"
  ("ownerType", name, "normalizedName", "inputType", description, "updatedAt")
VALUES
  ('SYSTEM', 'Color', 'color', 'COLOR', 'Common product colors', CURRENT_TIMESTAMP),
  ('SYSTEM', 'Clothing Size', 'clothing size', 'TEXT', 'Common clothing sizes', CURRENT_TIMESTAMP),
  ('SYSTEM', 'EU Shoe Size', 'eu shoe size', 'NUMBER', 'EU-labelled shoe sizes', CURRENT_TIMESTAMP),
  ('SYSTEM', 'Material', 'material', 'TEXT', 'Common product materials', CURRENT_TIMESTAMP),
  ('SYSTEM', 'RAM', 'ram', 'TEXT', 'Memory capacity', CURRENT_TIMESTAMP),
  ('SYSTEM', 'Storage', 'storage', 'TEXT', 'Storage capacity', CURRENT_TIMESTAMP),
  ('SYSTEM', 'Capacity', 'capacity', 'TEXT', 'Editable capacity values with explicit units', CURRENT_TIMESTAMP),
  ('SYSTEM', 'Pack Quantity', 'pack quantity', 'NUMBER', 'Number of items in a pack', CURRENT_TIMESTAMP),
  ('SYSTEM', 'Style', 'style', 'TEXT', 'Editable style values', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "OptionTemplateValue"
  ("templateId", value, "normalizedValue", metadata, position, "updatedAt")
SELECT t.id, v.value, lower(v.value), v.metadata::jsonb, v.position, CURRENT_TIMESTAMP
FROM "OptionTemplate" t
JOIN (VALUES
  ('color','Black','{"hex":"#000000"}',0), ('color','White','{"hex":"#FFFFFF"}',1),
  ('color','Red','{"hex":"#FF0000"}',2), ('color','Blue','{"hex":"#0000FF"}',3),
  ('color','Green','{"hex":"#008000"}',4), ('color','Yellow','{"hex":"#FFFF00"}',5),
  ('color','Gray','{"hex":"#808080"}',6), ('color','Brown','{"hex":"#8B4513"}',7),
  ('color','Beige','{"hex":"#F5F5DC"}',8), ('color','Pink','{"hex":"#FFC0CB"}',9),
  ('color','Purple','{"hex":"#800080"}',10), ('color','Orange','{"hex":"#FFA500"}',11),
  ('clothing size','XXS',NULL,0), ('clothing size','XS',NULL,1), ('clothing size','S',NULL,2),
  ('clothing size','M',NULL,3), ('clothing size','L',NULL,4), ('clothing size','XL',NULL,5),
  ('clothing size','XXL',NULL,6), ('clothing size','3XL',NULL,7),
  ('material','Cotton',NULL,0), ('material','Polyester',NULL,1), ('material','Linen',NULL,2),
  ('material','Wool',NULL,3), ('material','Leather',NULL,4), ('material','Synthetic',NULL,5),
  ('material','Metal',NULL,6), ('material','Plastic',NULL,7), ('material','Wood',NULL,8),
  ('material','Glass',NULL,9),
  ('ram','2 GB',NULL,0), ('ram','4 GB',NULL,1), ('ram','6 GB',NULL,2),
  ('ram','8 GB',NULL,3), ('ram','12 GB',NULL,4), ('ram','16 GB',NULL,5),
  ('ram','24 GB',NULL,6), ('ram','32 GB',NULL,7), ('ram','64 GB',NULL,8),
  ('storage','32 GB',NULL,0), ('storage','64 GB',NULL,1), ('storage','128 GB',NULL,2),
  ('storage','256 GB',NULL,3), ('storage','512 GB',NULL,4), ('storage','1 TB',NULL,5),
  ('storage','2 TB',NULL,6),
  ('pack quantity','1 Pack',NULL,0), ('pack quantity','2 Pack',NULL,1),
  ('pack quantity','3 Pack',NULL,2), ('pack quantity','4 Pack',NULL,3),
  ('pack quantity','6 Pack',NULL,4), ('pack quantity','12 Pack',NULL,5)
) AS v(template_name, value, metadata, position)
  ON t."normalizedName" = v.template_name
ON CONFLICT DO NOTHING;

INSERT INTO "OptionTemplateValue"
  ("templateId", value, "normalizedValue", position, "updatedAt")
SELECT t.id, size::text, size::text, size - 35, CURRENT_TIMESTAMP
FROM "OptionTemplate" t CROSS JOIN generate_series(35,46) size
WHERE t."normalizedName" = 'eu shoe size'
ON CONFLICT DO NOTHING;

-- Deterministic mappings only for obvious existing slugs.
INSERT INTO "OptionTemplateCategory" ("templateId", "categoryId", priority)
SELECT t.id, c.id,
  CASE t."normalizedName"
    WHEN 'color' THEN 100 WHEN 'clothing size' THEN 90 WHEN 'material' THEN 80 ELSE 70
  END
FROM "OptionTemplate" t CROSS JOIN "Category" c
WHERE c.slug IN ('clothing','apparel')
  AND t."normalizedName" IN ('color','clothing size','material','style')
ON CONFLICT DO NOTHING;

INSERT INTO "OptionTemplateCategory" ("templateId", "categoryId", priority)
SELECT t.id, c.id,
  CASE t."normalizedName" WHEN 'color' THEN 100 WHEN 'ram' THEN 90 ELSE 80 END
FROM "OptionTemplate" t CROSS JOIN "Category" c
WHERE c.slug IN ('electronics','phones','smartphones')
  AND t."normalizedName" IN ('color','ram','storage')
ON CONFLICT DO NOTHING;

INSERT INTO "OptionTemplateCategory" ("templateId", "categoryId", priority)
SELECT t.id, c.id,
  CASE t."normalizedName" WHEN 'color' THEN 100 WHEN 'eu shoe size' THEN 90 ELSE 80 END
FROM "OptionTemplate" t CROSS JOIN "Category" c
WHERE c.slug IN ('shoes','footwear')
  AND t."normalizedName" IN ('color','eu shoe size','material')
ON CONFLICT DO NOTHING;
