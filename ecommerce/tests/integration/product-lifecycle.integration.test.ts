import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../../src/lib/db";
import {
  archiveProduct,
  batchUpdateVariants,
  createProduct,
  getProductById,
  listProducts,
  permanentlyDeleteProduct,
  restoreProduct,
  updateProduct,
} from "../../src/services/product.service";
import {
  cancelOrderAsOwner,
  createOrder,
  getOrderForUser,
} from "../../src/services/order.service";
import { ConflictError } from "../../src/lib/errors";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

test(
  "archive, restore, safe deletion, snapshots, and inventory lifecycle",
  { skip: !enabled },
  async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const category = await db.category.create({
      data: { name: `Lifecycle ${suffix}`, slug: `lifecycle-${suffix}` },
    });

    const disposable = await createProduct({
      productType: "SIMPLE",
      name: `Disposable ${suffix}`,
      description: "Never ordered and safe to delete",
      categoryId: category.id,
      basePrice: 12,
      images: [],
      isActive: true,
      showExactStock: false,
      sku: { code: `DISPOSABLE-${suffix}`, stockQuantity: 7, isActive: true },
    });
    const disposableVariantId = disposable.variants[0].id;

    await archiveProduct(disposable.id);
    const archived = await getProductById(disposable.id, {
      includeInactive: true,
    });
    assert.equal(archived.isActive, false);
    assert.equal(
      archived.variants[0].stockQuantity,
      7,
      "archive must not change stock",
    );
    await assert.rejects(() => getProductById(disposable.id));
    const publicList = await listProducts({
      search: disposable.name,
      pageSize: 100,
    });
    assert.equal(
      publicList.products.length,
      0,
      "archived Product must be hidden publicly",
    );

    await restoreProduct(disposable.id);
    assert.equal((await getProductById(disposable.id)).isActive, true);
    await permanentlyDeleteProduct(disposable.id);
    assert.equal(
      await db.product.findUnique({ where: { id: disposable.id } }),
      null,
    );
    assert.equal(
      await db.productVariant.findUnique({
        where: { id: disposableVariantId },
      }),
      null,
    );

    const ordered = await createProduct({
      productType: "SIMPLE",
      name: `Historical Product ${suffix}`,
      description: "Ordered Product retained for inventory restoration",
      categoryId: category.id,
      basePrice: 25,
      images: ["https://example.invalid/original.jpg"],
      isActive: true,
      showExactStock: false,
      sku: { code: `HISTORICAL-${suffix}`, stockQuantity: 10, isActive: true },
    });
    const orderedVariant = ordered.variants[0];
    const user = await db.user.create({
      data: {
        name: `Lifecycle Buyer ${suffix}`,
        email: `lifecycle-${suffix}@example.com`,
        phone: "123456",
        passwordHash: "test-only",
      },
    });

    const checkout = await createOrder(
      {
        contactName: "Snapshot Buyer",
        contactEmail: `snapshot-${suffix}@example.com`,
        contactPhone: "123456",
        shippingAddress: "Snapshot Street",
        items: [{ variantId: orderedVariant.id, quantity: 2 }],
      },
      user.id,
      `lifecycle-${suffix}`,
    );
    const originalItem = checkout.order.items[0];
    assert.equal(originalItem.productNameSnapshot, ordered.name);
    assert.equal(
      originalItem.imageSnapshot,
      "https://example.invalid/original.jpg",
    );
    assert.equal(originalItem.variant?.skuSnapshot, orderedVariant.sku);
    assert.equal(
      originalItem.variant?.variantLabelSnapshot,
      orderedVariant.variantLabel,
    );
    assert.equal(originalItem.variant?.unitPriceSnapshot.toString(), "25");
    assert.equal(originalItem.variant?.quantity, 2);

    await updateProduct(ordered.id, {
      name: `Renamed ${suffix}`,
      basePrice: 40,
    });
    await batchUpdateVariants(ordered.id, {
      updates: [
        {
          id: orderedVariant.id,
          sku: `RENAMED-${suffix}`,
          variantLabel: "Renamed live SKU",
          price: 45,
        },
      ],
    });
    const stockBeforeArchive = (
      await db.productVariant.findUniqueOrThrow({
        where: { id: orderedVariant.id },
      })
    ).stockQuantity;
    await archiveProduct(ordered.id);
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: orderedVariant.id },
        })
      ).stockQuantity,
      stockBeforeArchive,
      "archive must not alter ordered SKU inventory",
    );
    await assert.rejects(
      () =>
        createOrder(
          {
            contactName: "Archived Cart Buyer",
            contactEmail: `archived-${suffix}@example.com`,
            contactPhone: "123456",
            shippingAddress: "Archived Street",
            items: [{ variantId: orderedVariant.id, quantity: 1 }],
          },
          user.id,
          `archived-checkout-${suffix}`,
        ),
      (error: unknown) =>
        error instanceof ConflictError &&
        error.message.includes("no longer available"),
    );
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: orderedVariant.id },
        })
      ).stockQuantity,
      stockBeforeArchive,
      "rejected archived checkout must not decrement stock",
    );

    const historical = await getOrderForUser(checkout.order.id, user.id);
    assert.equal(historical.items[0].productNameSnapshot, ordered.name);
    assert.equal(
      historical.items[0].imageSnapshot,
      "https://example.invalid/original.jpg",
    );
    assert.equal(historical.items[0].variant?.skuSnapshot, orderedVariant.sku);
    assert.equal(
      historical.items[0].variant?.variantLabelSnapshot,
      orderedVariant.variantLabel,
    );
    assert.equal(
      historical.items[0].variant?.unitPriceSnapshot.toString(),
      "25",
    );

    await assert.rejects(
      () => permanentlyDeleteProduct(ordered.id),
      (error: unknown) =>
        error instanceof ConflictError &&
        error.message.includes("order history") &&
        error.message.includes("Archive"),
    );
    assert.ok(await db.product.findUnique({ where: { id: ordered.id } }));

    await cancelOrderAsOwner(checkout.order.id, user.id);
    assert.equal(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: orderedVariant.id },
        })
      ).stockQuantity,
      10,
      "cancellation must still restore stock after archive and live catalog edits",
    );
  },
);
