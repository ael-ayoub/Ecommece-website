import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../../src/lib/db";
import {
  createCategory,
  deleteCategory,
} from "../../src/services/category.service";
import { createProduct } from "../../src/services/product.service";
import {
  permanentlyDeleteClient,
  updateClient,
} from "../../src/services/user.service";
import {
  cancelOrderAsOwner,
  createOrder,
  getOrderById,
} from "../../src/services/order.service";
import { ConflictError, UnauthorizedError } from "../../src/lib/errors";
import { hashPassword } from "../../src/lib/password";
import { loginUser } from "../../src/services/auth.service";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

test(
  "category and customer management preserve business history",
  { skip: !enabled },
  async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const emptyCategory = await createCategory({
      name: `Empty Category ${suffix}`,
    });
    await deleteCategory(emptyCategory.id);
    assert.equal(
      await db.category.findUnique({ where: { id: emptyCategory.id } }),
      null,
    );

    const category = await createCategory({
      name: `Managed Category ${suffix}`,
    });
    const product = await createProduct({
      productType: "SIMPLE",
      name: `Managed Product ${suffix}`,
      description: "Admin management integration Product",
      categoryId: category.id,
      basePrice: 30,
      images: [],
      isActive: true,
      showExactStock: false,
      sku: { code: `MANAGED-${suffix}`, stockQuantity: 20, isActive: true },
    });
    await assert.rejects(
      () => deleteCategory(category.id),
      (error: unknown) =>
        error instanceof ConflictError &&
        error.message.includes("1 product") &&
        error.message.includes("before deleting"),
    );

    const password = "CustomerPassword123!";
    const passwordHash = await hashPassword(password);
    const editable = await db.user.create({
      data: {
        name: `Editable ${suffix}`,
        email: `editable-${suffix}@example.com`,
        phone: "123456",
        passwordHash,
      },
    });
    const edited = await updateClient(editable.id, {
      name: `Edited ${suffix}`,
      phone: "654321",
      isActive: false,
    });
    assert.equal(edited.name, `Edited ${suffix}`);
    assert.equal(edited.phone, "654321");
    assert.equal(edited.isActive, false);
    await assert.rejects(
      () => loginUser({ email: editable.email, password }),
      (error: unknown) => error instanceof UnauthorizedError,
    );
    await updateClient(editable.id, { isActive: true });
    assert.equal(
      (await loginUser({ email: editable.email, password })).user.isActive,
      true,
    );
    await permanentlyDeleteClient(editable.id);
    assert.equal(
      await db.user.findUnique({ where: { id: editable.id } }),
      null,
    );

    const activeCustomer = await db.user.create({
      data: {
        name: `Active Order ${suffix}`,
        email: `active-${suffix}@example.com`,
        phone: "123456",
        passwordHash,
      },
    });
    const activeOrder = await createOrder(
      {
        contactName: "Active Snapshot",
        contactEmail: `active-snapshot-${suffix}@example.com`,
        contactPhone: "123456",
        shippingAddress: "Active Street",
        items: [{ variantId: product.variants[0].id, quantity: 1 }],
      },
      activeCustomer.id,
      `active-customer-${suffix}`,
    );
    await assert.rejects(
      () => permanentlyDeleteClient(activeCustomer.id),
      (error: unknown) =>
        error instanceof ConflictError &&
        error.message.includes("1 active order") &&
        error.message.includes("before deleting"),
    );
    assert.ok(await db.user.findUnique({ where: { id: activeCustomer.id } }));

    await cancelOrderAsOwner(activeOrder.order.id, activeCustomer.id);
    await permanentlyDeleteClient(activeCustomer.id);
    assert.equal(
      await db.user.findUnique({ where: { id: activeCustomer.id } }),
      null,
    );
    const historicalOrder = await getOrderById(activeOrder.order.id);
    assert.equal(historicalOrder.userId, null);
    assert.equal(historicalOrder.user, null);
    assert.equal(historicalOrder.customerAccountIdSnapshot, activeCustomer.id);
    assert.equal(historicalOrder.contactName, "Active Snapshot");
    assert.equal(
      historicalOrder.contactEmail,
      `active-snapshot-${suffix}@example.com`,
    );
    assert.equal(historicalOrder.contactPhone, "123456");
    assert.equal(historicalOrder.shippingAddress, "Active Street");
    assert.equal(historicalOrder.items[0].productNameSnapshot, product.name);
    assert.equal(
      historicalOrder.items[0].variant?.unitPriceSnapshot.toString(),
      "30",
    );
    assert.equal(historicalOrder.items[0].variant?.quantity, 1);
  },
);
