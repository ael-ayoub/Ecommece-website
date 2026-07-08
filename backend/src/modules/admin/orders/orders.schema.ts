import { z } from "zod";
import { ORDER_STATUSES } from "../../../config/constants.js";

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export const updateOrderStatusBodySchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
