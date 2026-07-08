import { cartRepository, type CartIdentity } from "./cart.repository.js";
import { productsRepository } from "../products/products.repository.js";
import { NotFoundError, OutOfStockError } from "../../lib/errors.js";

function serializeCart(cart: Awaited<ReturnType<typeof cartRepository.getOrCreateCart>>) {
  const items = cart.items.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    name: item.product.name,
    slug: item.product.slug,
    unit_price: Number(item.product.price),
    quantity: item.quantity,
    line_total: Number(item.product.price) * item.quantity,
    images: item.product.images as string[],
    in_stock: item.product.stock_display > 0,
  }));

  return {
    id: cart.id,
    items,
    subtotal: items.reduce((sum, item) => sum + item.line_total, 0),
  };
}

export const cartService = {
  async getCart(identity: CartIdentity) {
    const cart = await cartRepository.getOrCreateCart(identity);
    return serializeCart(cart);
  },

  async addItem(identity: CartIdentity, productId: string, quantity: number) {
    const product = await productsRepository.findVisibleById(productId);
    if (!product) throw new NotFoundError("Product not found");

    const cart = await cartRepository.getOrCreateCart(identity);
    const existing = await cartRepository.findItem(cart.id, productId);
    const desiredQuantity = (existing?.quantity ?? 0) + quantity;

    // Soft check against the customer-facing display cap — checkout re-validates real stock.
    if (product.stock_display > 0 && desiredQuantity > product.stock_display) {
      throw new OutOfStockError(`Only ${product.stock_display} in stock`);
    }

    if (existing) {
      await cartRepository.setItemQuantity(existing.id, desiredQuantity);
    } else {
      await cartRepository.addItem(cart.id, productId, quantity);
    }

    return cartService.getCart(identity);
  },

  async updateItem(identity: CartIdentity, itemId: string, quantity: number) {
    const cart = await cartRepository.getOrCreateCart(identity);
    const item = await cartRepository.findItemById(itemId);
    if (!item || item.cart_id !== cart.id) throw new NotFoundError("Cart item not found");

    await cartRepository.setItemQuantity(itemId, quantity);
    return cartService.getCart(identity);
  },

  async removeItem(identity: CartIdentity, itemId: string) {
    const cart = await cartRepository.getOrCreateCart(identity);
    const item = await cartRepository.findItemById(itemId);
    if (!item || item.cart_id !== cart.id) throw new NotFoundError("Cart item not found");

    await cartRepository.removeItem(itemId);
    return cartService.getCart(identity);
  },

  async clear(identity: CartIdentity) {
    const cart = await cartRepository.getOrCreateCart(identity);
    await cartRepository.clearCart(cart.id);
    return cartService.getCart(identity);
  },
};
