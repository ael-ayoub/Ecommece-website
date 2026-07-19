import type { OrderDto } from "@/types/order";

export interface ClientListItemDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  lastOrderDate: string | null;
}

export interface ClientDetailDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  orders: OrderDto[];
}
