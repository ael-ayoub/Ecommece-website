import { z } from "zod";

export const dateRangeQuerySchema = z.object({
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});
