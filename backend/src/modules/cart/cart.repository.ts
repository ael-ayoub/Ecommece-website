import { prisma } from "../../lib/prisma-client.js";

export interface CartIdentity {
  userId?: string;
  guestId?: string;
}

const cartInclude = { items: { include: { product: true } } } as const;

export const cartRepository = {
  async findCart(identity: CartIdentity) {
    if (identity.userId) {
      return prisma.cart.findFirst({ where: { user_id: identity.userId }, include: cartInclude });
    }
    if (identity.guestId) {
      return prisma.cart.findFirst({ where: { guest_id: identity.guestId, user_id: null }, include: cartInclude });
    }
    return null;
  },

  async getOrCreateCart(identity: CartIdentity) {
    const existing = await cartRepository.findCart(identity);
    if (existing) return existing;

    return prisma.cart.create({
      data: { user_id: identity.userId, guest_id: identity.userId ? undefined : identity.guestId },
      include: cartInclude,
    });
  },

  findItem(cartId: string, productId: string) {
    return prisma.cartItem.findFirst({ where: { cart_id: cartId, product_id: productId } });
  },

  findItemById(itemId: string) {
    return prisma.cartItem.findUnique({ where: { id: itemId } });
  },

  addItem(cartId: string, productId: string, quantity: number) {
    return prisma.cartItem.create({ data: { cart_id: cartId, product_id: productId, quantity } });
  },

  setItemQuantity(itemId: string, quantity: number) {
    return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  },

  removeItem(itemId: string) {
    return prisma.cartItem.delete({ where: { id: itemId } });
  },

  clearCart(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cart_id: cartId } });
  },

  /** Merges a guest cart into the user's cart on login/register, then deletes the guest cart. */
  async mergeGuestCartIntoUser(guestId: string, userId: string) {
    const guestCart = await prisma.cart.findFirst({ where: { guest_id: guestId, user_id: null }, include: { items: true } });
    if (!guestCart || guestCart.items.length === 0) {
      if (guestCart) await prisma.cart.delete({ where: { id: guestCart.id } });
      return;
    }

    const userCart = await cartRepository.getOrCreateCart({ userId });

    for (const guestItem of guestCart.items) {
      const existing = await prisma.cartItem.findFirst({ where: { cart_id: userCart.id, product_id: guestItem.product_id } });
      if (existing) {
        await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + guestItem.quantity } });
      } else {
        await prisma.cartItem.create({ data: { cart_id: userCart.id, product_id: guestItem.product_id, quantity: guestItem.quantity } });
      }
    }

    await prisma.cart.delete({ where: { id: guestCart.id } });
  },
};
