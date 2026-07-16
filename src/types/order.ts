import type { Prisma } from "@prisma/client";

type Money = string | Prisma.Decimal;
type Timestamp = string | Date;

export type OrderStatusValue =
  "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED";

export interface OrderItemVariantDto {
  id: number;
  variantLabelSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: Money;
  quantity: number;
  productVariant: { id: number; isActive: boolean } | null;
}

export interface OrderItemDto {
  id: number;
  productId: number | null;
  productNameSnapshot: string;
  product: { id: number; name: string; isActive: boolean } | null;
  variant: OrderItemVariantDto | null;
}

export interface OrderDto {
  id: number;
  userId: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingAddress: string;
  status: OrderStatusValue;
  totalAmount: Money;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  items: OrderItemDto[];
}
