import type { OrderDto } from "@/types/order";

export interface ClientListItemDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orderCount: number;
  lastOrderDate: string | null;
}

export interface ClientDetailDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orders: OrderDto[];
}
