import type { Product, Order, OrderItem } from "../generated/prisma/client.js";

/** Full admin view — includes cost_price/stock_real, which the customer-facing serializer strips out. */
export function serializeAdminProduct(product: Product) {
  return {
    id: product.id,
    category_id: product.category_id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    cost_price: Number(product.cost_price),
    stock_real: product.stock_real,
    stock_reserved: product.stock_reserved,
    stock_display: product.stock_display,
    is_enabled: product.is_enabled,
    is_deleted: product.is_deleted,
    images: product.images as string[],
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

/** Customer-facing view — cost_price and stock_real must NEVER be exposed here. */
export function serializePublicProduct(product: Product) {
  return {
    id: product.id,
    category_id: product.category_id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    stock_display: product.stock_display,
    in_stock: product.stock_display > 0,
    images: product.images as string[],
  };
}

export function serializeOrder(order: Order & { items: OrderItem[] }) {
  return {
    id: order.id,
    user_id: order.user_id,
    guest_id: order.guest_id,
    guest_name: order.guest_name,
    guest_phone_home: order.guest_phone_home,
    guest_phone_personal: order.guest_phone_personal,
    guest_address: order.guest_address,
    guest_email: order.guest_email,
    status: order.status,
    delivery_cost: Number(order.delivery_cost),
    total_amount: Number(order.total_amount),
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: order.items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      unit_cost_price: Number(item.unit_cost_price),
    })),
  };
}
