// Development seed. This script only upserts the configured admin and catalog
// rows owned by the seed; it never clears customer, order, inventory-history,
// or unrelated catalog data.
// Run with: npm run prisma:seed

import { Prisma, PrismaClient, ProductType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

type SeedVariant = {
  sku: string;
  label: string;
  legacyLabels?: string[];
  selections?: Record<string, string>;
  stock: number;
  price?: string;
  isDefault?: boolean;
};

type SeedProduct = {
  name: string;
  categoryId: number;
  description: string;
  basePrice: string;
  productType: ProductType;
  images: string[];
  options?: Array<{ name: string; values: string[] }>;
  variants: SeedVariant[];
};

function combinationKey(selections: Record<string, string>, optionNames: string[]) {
  return optionNames.map((name) => `${name}=${selections[name] ?? ""}`).join("|");
}

async function findSeedProduct(tx: Prisma.TransactionClient, seed: SeedProduct) {
  const existingVariant = await tx.productVariant.findFirst({
    where: { sku: { in: seed.variants.map((variant) => variant.sku) } },
    select: { productId: true },
  });
  if (existingVariant) return existingVariant.productId;

  const existingProduct = await tx.product.findFirst({
    where: { name: seed.name, categoryId: seed.categoryId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return existingProduct?.id;
}

async function upsertSeedProduct(seed: SeedProduct) {
  return db.$transaction(async (tx) => {
    const existingId = await findSeedProduct(tx, seed);
    const product = existingId
      ? await tx.product.update({
          where: { id: existingId },
          data: {
            categoryId: seed.categoryId,
            name: seed.name,
            description: seed.description,
            basePrice: seed.basePrice,
            productType: seed.productType,
            images: seed.images,
            isActive: true,
          },
        })
      : await tx.product.create({
          data: {
            categoryId: seed.categoryId,
            name: seed.name,
            description: seed.description,
            basePrice: seed.basePrice,
            productType: seed.productType,
            images: seed.images,
            isActive: true,
          },
        });

    const optionNames = (seed.options ?? []).map((option) => option.name);
    const optionValueIds = new Map<string, number>();

    for (const [optionPosition, optionSeed] of Array.from((seed.options ?? []).entries())) {
      const option = await tx.productOption.upsert({
        where: { productId_name: { productId: product.id, name: optionSeed.name } },
        create: { productId: product.id, name: optionSeed.name, position: optionPosition },
        update: { position: optionPosition },
      });

      for (const [valuePosition, value] of Array.from(optionSeed.values.entries())) {
        const optionValue = await tx.productOptionValue.upsert({
          where: { optionId_value: { optionId: option.id, value } },
          create: { optionId: option.id, value, position: valuePosition },
          update: { position: valuePosition },
        });
        optionValueIds.set(`${optionSeed.name}\u0000${value}`, optionValue.id);
      }
    }

    for (const variantSeed of seed.variants) {
      const existingSku = await tx.productVariant.findUnique({
        where: { sku: variantSeed.sku },
        select: { productId: true },
      });
      if (existingSku && existingSku.productId !== product.id) {
        throw new Error(`Seed SKU ${variantSeed.sku} already belongs to another Product.`);
      }

      const selections = variantSeed.selections ?? {};
      const selectedNames = Object.keys(selections);
      if (
        selectedNames.length !== optionNames.length ||
        optionNames.some((name) => !Object.prototype.hasOwnProperty.call(selections, name))
      ) {
        throw new Error(`${variantSeed.sku} must select one value for every Product option.`);
      }

      const selectedValueIds = optionNames.map((name) => {
        const id = optionValueIds.get(`${name}\u0000${selections[name]}`);
        if (!id) throw new Error(`${variantSeed.sku} uses an unknown value for ${name}.`);
        return id;
      });
      const key = optionNames.length ? combinationKey(selections, optionNames) : null;

      const legacyVariant = existingSku
        ? null
        : await tx.productVariant.findFirst({
            where: {
              productId: product.id,
              variantLabel: { in: variantSeed.legacyLabels ?? [variantSeed.label] },
              sku: { startsWith: `LEGACY-PRODUCT-${product.id}-VARIANT-` },
            },
            orderBy: { id: "asc" },
            select: { id: true },
          });
      const variantData = {
        sku: variantSeed.sku,
        variantLabel: variantSeed.label,
        isDefault: variantSeed.isDefault ?? false,
        optionCombinationKey: key,
        price: variantSeed.price ?? null,
        stockQuantity: variantSeed.stock,
        isActive: true,
      };
      const variant = legacyVariant
        ? await tx.productVariant.update({
            where: { id: legacyVariant.id },
            data: variantData,
          })
        : await tx.productVariant.upsert({
            where: { sku: variantSeed.sku },
            create: { productId: product.id, ...variantData },
            update: variantData,
          });

      await tx.productVariantOptionValue.deleteMany({ where: { variantId: variant.id } });
      if (selectedValueIds.length) {
        await tx.productVariantOptionValue.createMany({
          data: selectedValueIds.map((optionValueId) => ({
            variantId: variant.id,
            optionValueId,
          })),
        });
      }
    }

    // Retain obsolete migration-era rows for historical references, but keep
    // them out of purchasable and derived inventory instead of deleting them.
    await tx.productVariant.updateMany({
      where: {
        productId: product.id,
        sku: { startsWith: `LEGACY-PRODUCT-${product.id}-VARIANT-` },
      },
      data: { isActive: false, stockQuantity: 0, isDefault: false },
    });

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: {
        variants: { where: { sku: { in: seed.variants.map((variant) => variant.sku) } } },
      },
    });
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set before running the seed.");
  }
  if (adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  await db.user.upsert({
    where: { email: adminEmail },
    create: {
      name: "Marketplace Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      phone: "000000",
      role: Role.ADMIN,
    },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const [apparel, electronics, homeKitchen] = await Promise.all([
    db.category.upsert({
      where: { slug: "apparel" },
      create: { name: "Apparel", slug: "apparel" },
      update: { name: "Apparel" },
    }),
    db.category.upsert({
      where: { slug: "electronics" },
      create: { name: "Electronics", slug: "electronics" },
      update: { name: "Electronics" },
    }),
    db.category.upsert({
      where: { slug: "home-kitchen" },
      create: { name: "Home & Kitchen", slug: "home-kitchen" },
      update: { name: "Home & Kitchen" },
    }),
  ]);

  const builtInTemplates = await db.optionTemplate.findMany({
    where: { ownerType: "SYSTEM" },
    select: { id: true, normalizedName: true },
  });
  const templateId = new Map(
    builtInTemplates.map((template) => [template.normalizedName, template.id]),
  );
  await db.optionTemplateCategory.createMany({
    data: [
      ["color", apparel.id, 100],
      ["clothing size", apparel.id, 90],
      ["material", apparel.id, 80],
      ["style", apparel.id, 70],
      ["color", electronics.id, 100],
      ["ram", electronics.id, 90],
      ["storage", electronics.id, 80],
    ]
      .filter(([name]) => templateId.has(String(name)))
      .map(([name, categoryId, priority]) => ({
        templateId: templateId.get(String(name))!,
        categoryId: Number(categoryId),
        priority: Number(priority),
      })),
    skipDuplicates: true,
  });

  const products: SeedProduct[] = [
    {
      categoryId: apparel.id,
      name: "Red T-Shirt",
      description: "100% cotton crew-neck T-shirt, machine washable, true to size.",
      basePrice: "15.00",
      productType: ProductType.CONFIGURABLE,
      images: ["https://res.cloudinary.com/demo/image/upload/red-tshirt.jpg"],
      options: [
        { name: "Color", values: ["Red", "Navy"] },
        { name: "Size", values: ["Small", "Medium", "Large"] },
      ],
      variants: [
        {
          sku: "TSHIRT-S",
          label: "Red / Small",
          selections: { Color: "Red", Size: "Small" },
          stock: 12,
        },
        {
          sku: "TSHIRT-M",
          label: "Red / Medium",
          selections: { Color: "Red", Size: "Medium" },
          stock: 8,
        },
        {
          sku: "TSHIRT-L",
          label: "Navy / Large",
          selections: { Color: "Navy", Size: "Large" },
          stock: 4,
          price: "17.00",
        },
      ],
    },
    {
      categoryId: apparel.id,
      name: "Blue Jeans",
      description: "Straight-fit denim jeans with a mid-rise waist.",
      basePrice: "40.00",
      productType: ProductType.CONFIGURABLE,
      images: ["https://res.cloudinary.com/demo/image/upload/blue-jeans.jpg"],
      options: [
        { name: "Color", values: ["Indigo", "Black"] },
        { name: "Waist Size", values: ["30", "32", "34"] },
      ],
      variants: [
        {
          sku: "JEANS-30",
          label: "Indigo / 30",
          selections: { Color: "Indigo", "Waist Size": "30" },
          stock: 6,
        },
        {
          sku: "JEANS-32",
          label: "Indigo / 32",
          selections: { Color: "Indigo", "Waist Size": "32" },
          stock: 9,
        },
        {
          sku: "JEANS-34",
          label: "Black / 34",
          selections: { Color: "Black", "Waist Size": "34" },
          stock: 4,
          price: "43.00",
        },
      ],
    },
    {
      categoryId: electronics.id,
      name: "Wireless Mouse",
      description: "2.4GHz wireless mouse with adjustable DPI and USB receiver.",
      basePrice: "22.50",
      productType: ProductType.CONFIGURABLE,
      images: ["https://res.cloudinary.com/demo/image/upload/wireless-mouse.jpg"],
      options: [{ name: "Color", values: ["Black", "White"] }],
      variants: [
        {
          sku: "MOUSE-BLACK",
          label: "Black",
          legacyLabels: ["Black"],
          selections: { Color: "Black" },
          stock: 25,
        },
        {
          sku: "MOUSE-WHITE",
          label: "White",
          legacyLabels: ["White"],
          selections: { Color: "White" },
          stock: 14,
        },
      ],
    },
    {
      categoryId: electronics.id,
      name: "Nova Smartphone",
      description: "5G smartphone with an OLED display and all-day battery life.",
      basePrice: "499.00",
      productType: ProductType.CONFIGURABLE,
      images: ["https://res.cloudinary.com/demo/image/upload/smartphone.jpg"],
      options: [
        { name: "Color", values: ["Midnight", "Blue"] },
        { name: "RAM", values: ["8 GB", "12 GB"] },
        { name: "Storage", values: ["128 GB", "256 GB"] },
      ],
      variants: [
        {
          sku: "NOVA-MID-8-128",
          label: "Midnight / 8 GB / 128 GB",
          selections: { Color: "Midnight", RAM: "8 GB", Storage: "128 GB" },
          stock: 10,
        },
        {
          sku: "NOVA-BLU-8-256",
          label: "Blue / 8 GB / 256 GB",
          selections: { Color: "Blue", RAM: "8 GB", Storage: "256 GB" },
          stock: 7,
          price: "549.00",
        },
        {
          sku: "NOVA-MID-12-256",
          label: "Midnight / 12 GB / 256 GB",
          selections: { Color: "Midnight", RAM: "12 GB", Storage: "256 GB" },
          stock: 5,
          price: "599.00",
        },
      ],
    },
    {
      categoryId: electronics.id,
      name: "Bluetooth Speaker",
      description: "Portable speaker with 10-hour battery life and water resistance.",
      basePrice: "34.99",
      productType: ProductType.SIMPLE,
      images: ["https://res.cloudinary.com/demo/image/upload/bt-speaker.jpg"],
      variants: [
        {
          sku: "SPEAKER-001",
          label: "Default",
          legacyLabels: ["Standard", "Default"],
          stock: 18,
          isDefault: true,
        },
      ],
    },
    {
      categoryId: homeKitchen.id,
      name: "Blue Mug",
      description: "12oz ceramic mug, dishwasher and microwave safe.",
      basePrice: "8.00",
      productType: ProductType.SIMPLE,
      images: ["https://res.cloudinary.com/demo/image/upload/blue-mug.jpg"],
      variants: [
        {
          sku: "MUG-BLUE-001",
          label: "Default",
          legacyLabels: ["Standard", "Default"],
          stock: 40,
          isDefault: true,
        },
      ],
    },
  ];

  const seeded = [];
  for (const product of products) seeded.push(await upsertSeedProduct(product));

  console.log("Development seed complete (orders and historical data unchanged):");
  console.log("  Admin account: created or updated from environment");
  for (const product of seeded) {
    const totalStock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
    console.log(`  ${product.name}: ${product.variants.length} SKU(s), ${totalStock} total stock`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
