import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../../src/lib/db";
import {
  createPersonalOptionTemplate,
  listOptionTemplates,
  setOptionTemplatePinned,
  updatePersonalOptionTemplate,
} from "../../src/services/option-template.service";
import { createProduct } from "../../src/services/product.service";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

test(
  "templates are owned, ranked, copied to Products, and isolated from later edits",
  { skip: !enabled },
  async () => {
    const suffix = String(Date.now());
    const [owner, other] = await Promise.all([
      db.user.create({
        data: {
          name: "Template Owner",
          email: `template-owner-${suffix}@example.com`,
          passwordHash: "not-used",
          phone: "000000",
          role: "ADMIN",
        },
      }),
      db.user.create({
        data: {
          name: "Other Admin",
          email: `template-other-${suffix}@example.com`,
          passwordHash: "not-used",
          phone: "000000",
          role: "ADMIN",
        },
      }),
    ]);
    const category = await db.category.create({
      data: { name: `Template Category ${suffix}`, slug: `template-category-${suffix}` },
    });

    const systems = await db.optionTemplate.count({ where: { ownerType: "SYSTEM" } });
    assert.equal(systems, 9);

    const personal = await createPersonalOptionTemplate(owner.id, {
      name: " Sleeve   Length ",
      inputType: "TEXT",
      values: [
        { value: "Short", isActive: true },
        { value: "Long", isActive: true },
      ],
      categoryIds: [category.id],
    });
    await assert.rejects(() =>
      createPersonalOptionTemplate(owner.id, {
        name: "sleeve length",
        inputType: "TEXT",
        values: [{ value: "Other", isActive: true }],
        categoryIds: [],
      }),
    );
    await assert.rejects(() =>
      updatePersonalOptionTemplate(other.id, personal.id, { name: "Stolen" }),
    );

    await setOptionTemplatePinned(owner.id, personal.id, true);
    const ranked = await listOptionTemplates(owner.id, { categoryId: category.id });
    assert.equal(ranked[0].id, personal.id);

    const product = await createProduct(
      {
        productType: "CONFIGURABLE",
        name: `Template Product ${suffix}`,
        description: "Template copy isolation",
        categoryId: category.id,
        basePrice: 50,
        images: [],
        isActive: true,
        showExactStock: false,
        options: [{ name: "Sleeve Length", values: ["Short", "Long"] }],
        sourceTemplateIds: [personal.id],
        variants: [
          {
            sku: `SLEEVE-SHORT-${suffix}`,
            optionValues: { "Sleeve Length": "Short" },
            variantLabel: "Short",
            price: null,
            stockQuantity: 1,
            isActive: true,
          },
          {
            sku: `SLEEVE-LONG-${suffix}`,
            optionValues: { "Sleeve Length": "Long" },
            variantLabel: "Long",
            price: null,
            stockQuantity: 0,
            isActive: false,
          },
        ],
      },
      owner.id,
    );

    await updatePersonalOptionTemplate(owner.id, personal.id, {
      values: [{ value: "Three-quarter", isActive: true }],
    });
    const unchangedProduct = await db.productOption.findFirst({
      where: { productId: product.id },
      include: { values: { orderBy: { position: "asc" } } },
    });
    assert.deepEqual(
      unchangedProduct?.values.map((value) => value.value),
      ["Short", "Long"],
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    const preference = await db.userOptionTemplatePreference.findUnique({
      where: { userId_templateId: { userId: owner.id, templateId: personal.id } },
    });
    assert.equal(preference?.usageCount, 1);
  },
);
