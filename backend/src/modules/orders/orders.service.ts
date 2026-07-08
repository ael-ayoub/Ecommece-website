import { prisma } from "../../lib/prisma-client.js";
import { ordersRepository } from "./orders.repository.js";
import { cartRepository, type CartIdentity } from "../cart/cart.repository.js";
import { adminSettingsRepository } from "../admin/settings/settings.repository.js";
import { reserveStockForOrder, applyStatusTransitionStock } from "../../lib/order-stock.js";
import { claimIdempotencyKey, getIdempotentOrderId, resolveIdempotencyKey, releaseIdempotencyKey } from "../../lib/idempotency.js";
import { serializeOrder } from "../../lib/serializers.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { paginationMeta } from "../../lib/common-schemas.js";
import type { z } from "zod";
import type { createOrderBodySchema } from "./orders.schema.js";

type CreateOrderInput = z.infer<typeof createOrderBodySchema>;

export const ordersService = {
  async checkout(identity: CartIdentity, idempotencyKey: string, input: CreateOrderInput) {
    const existingOrderId = await getIdempotentOrderId(idempotencyKey);
    if (existingOrderId && existingOrderId !== "pending") {
      const order = await ordersRepository.findById(existingOrderId);
      if (order) return serializeOrder(order);
    }

    const claimed = await claimIdempotencyKey(idempotencyKey);
    if (!claimed) {
      throw new ConflictError("This order is already being processed");
    }

    try {
      const cart = await cartRepository.getOrCreateCart(identity);
      if (cart.items.length === 0) throw new BadRequestError("Cart is empty");

      const settings = await adminSettingsRepository.get();
      const deliveryCost = Number(settings.default_delivery_cost);

      const order = await prisma.$transaction(async (tx) => {
        const lineItems = cart.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity }));
        await reserveStockForOrder(tx, lineItems);

        const totalAmount = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

        const created = await ordersRepository.create(tx, {
          user: identity.userId ? { connect: { id: identity.userId } } : undefined,
          guest_id: identity.userId ? undefined : identity.guestId,
          guest_name: input.guest_name,
          guest_email: input.guest_email,
          guest_phone_home: input.guest_phone_home,
          guest_phone_personal: input.guest_phone_personal,
          guest_address: input.guest_address,
          status: "PENDING",
          delivery_cost: deliveryCost,
          total_amount: totalAmount,
          idempotency_key: idempotencyKey,
          items: {
            create: cart.items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.product.price,
              unit_cost_price: item.product.cost_price,
            })),
          },
        });

        await tx.cartItem.deleteMany({ where: { cart_id: cart.id } });

        return created;
      });

      await resolveIdempotencyKey(idempotencyKey, order.id);
      return serializeOrder(order);
    } catch (error) {
      await releaseIdempotencyKey(idempotencyKey);
      throw error;
    }
  },

  async listMine(userId: string, page: number, pageSize: number) {
    const { items, total } = await ordersRepository.listForUser(userId, page, pageSize);
    return { items: items.map(serializeOrder), meta: paginationMeta(page, pageSize, total) };
  },

  async getMineById(userId: string, id: string) {
    const order = await ordersRepository.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    if (order.user_id !== userId) throw new ForbiddenError();
    return serializeOrder(order);
  },

  /** Customers can only cancel while the order hasn't shipped yet. */
  async cancelMine(userId: string, id: string) {
    const order = await ordersRepository.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    if (order.user_id !== userId) throw new ForbiddenError();
    if (!["PENDING", "PROCESSING"].includes(order.status)) {
      throw new ConflictError(`Cannot cancel an order that is already ${order.status.toLowerCase()}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await applyStatusTransitionStock(
        tx,
        order.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        order.status,
        "CANCELLED",
      );
      return ordersRepository.updateStatus(tx, id, "CANCELLED");
    });

    return serializeOrder(updated);
  },
};
