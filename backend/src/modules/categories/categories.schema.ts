import { z } from "zod";

export const categoryParamsSchema = z.object({
  slug: z.string().min(1),
});
