import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Product catalog --------------------------------------------------------

const skuCodeSchema = z
  .string()
  .trim()
  .min(1, "SKU is required")
  .max(64, "SKU must be 64 characters or fewer")
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z0-9][A-Z0-9_-]*$/.test(value), {
    message: "SKU may contain only letters, numbers, hyphens, and underscores",
  });

const productBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  basePrice: z.coerce.number().positive("Price must be greater than 0"),
  categoryId: z.coerce.number().int().positive("Category is required"),
  images: z.array(z.string().url()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const simpleProductCreateSchema = productBaseSchema.extend({
  productType: z.literal("SIMPLE"),
  sku: z.object({
    code: skuCodeSchema,
    stockQuantity: z.coerce.number().int().min(0),
    isActive: z.boolean().default(true),
  }),
});

const configurableProductCreateSchema = productBaseSchema
  .extend({
    productType: z.literal("CONFIGURABLE"),
    options: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(50),
          values: z.array(z.string().trim().min(1).max(100)).min(1),
        }),
      )
      .min(1),
    variants: z
      .array(
        z.object({
          sku: skuCodeSchema,
          optionValues: z.record(z.string(), z.string().trim().min(1)),
          price: z.coerce.number().positive().nullable().optional(),
          stockQuantity: z.coerce.number().int().min(0),
          isActive: z.boolean().default(true),
        }),
      )
      .min(1),
  })
  .superRefine((input, ctx) => {
    const optionNames = input.options.map((option) => option.name.toLowerCase());
    if (new Set(optionNames).size !== optionNames.length) {
      ctx.addIssue({ code: "custom", message: "Option names must be unique", path: ["options"] });
    }
    input.options.forEach((option, index) => {
      const values = option.values.map((value) => value.toLowerCase());
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: "custom",
          message: "Option values must be unique",
          path: ["options", index, "values"],
        });
      }
    });
    const skus = input.variants.map((variant) => variant.sku);
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({ code: "custom", message: "SKU codes must be unique", path: ["variants"] });
    }
  });

export const productCreateSchema = z.discriminatedUnion("productType", [
  simpleProductCreateSchema,
  configurableProductCreateSchema,
]);
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productBaseSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const variantCreateSchema = z.object({
  sku: skuCodeSchema,
  variantLabel: z.string().trim().min(1, "Variant label is required"),
  price: z.coerce.number().positive().optional(),
  stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative").default(0),
  isActive: z.boolean().optional().default(true),
});
export type VariantCreateInput = z.infer<typeof variantCreateSchema>;

export const variantUpdateSchema = z.object({
  sku: skuCodeSchema.optional(),
  variantLabel: z.string().trim().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative").optional(),
  isActive: z.boolean().optional(),
});
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// --- Checkout / Orders (Phase 5) --------------------------------------------

export const orderCreateSchema = z.object({
  contactName: z.string().trim().min(1, "Full name is required"),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
  contactPhone: z.string().trim().min(6, "Enter a valid phone number"),
  shippingAddress: z.string().trim().min(1, "Delivery address is required"),
  items: z
    .array(
      z.object({
        variantId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(1000),
      }),
    )
    .min(1, "Your cart is empty"),
});
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

// --- Admin order management (Phase 6) ---------------------------------------

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"]),
});
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
