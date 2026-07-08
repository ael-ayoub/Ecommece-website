import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as productsApi from "../../api/products";
import * as categoriesApi from "../../api/categories";
import { ApiError } from "../../api/client";
import { Modal } from "../../components/Modal";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { Switch } from "../../components/Switch";
import { Button } from "../../components/Button";

// Mirrors backend/src/modules/admin/products/products.schema.ts (createProductBodySchema)
const productFormSchema = z.object({
  category_id: z.string().uuid("Choose a category"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative("Must be 0 or more"),
  cost_price: z.coerce.number().nonnegative("Must be 0 or more"),
  stock_real: z.coerce.number().int().nonnegative("Must be 0 or more"),
  stock_display: z.coerce.number().int().nonnegative("Must be 0 or more"),
  is_enabled: z.boolean(),
  images: z.array(z.object({ url: z.string().url("Enter a valid URL") })),
});
type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormModalProps {
  product?: productsApi.Product;
  onClose: () => void;
}

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(product);

  const categoriesQuery = useQuery({ queryKey: ["admin", "categories"], queryFn: () => categoriesApi.listCategories() });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      category_id: product?.category_id ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? 0,
      cost_price: product?.cost_price ?? 0,
      stock_real: product?.stock_real ?? 0,
      stock_display: product?.stock_display ?? 0,
      is_enabled: product?.is_enabled ?? true,
      images: product?.images.map((url) => ({ url })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "images" });

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = { ...values, images: values.images.map((i) => i.url) };
      return isEditing ? productsApi.updateProduct(product!.id, payload) : productsApi.createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(isEditing ? "Product updated" : "Product created");
      onClose();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
      setError("root", { message });
    },
  });

  return (
    <Modal title={isEditing ? "Edit product" : "Add product"} onClose={onClose} widthClassName="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Select label="Category" error={errors.category_id?.message} {...register("category_id")}>
            <option value="">Select a category</option>
            {categoriesQuery.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface-variant">Description</label>
          <textarea
            rows={3}
            className="rounded-lg border border-outline-variant px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary"
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Price" type="number" step="0.01" error={errors.price?.message} {...register("price")} />
          <div>
            <Input
              label="Cost price"
              type="number"
              step="0.01"
              error={errors.cost_price?.message}
              {...register("cost_price")}
            />
            <p className="mt-1 text-[11px] text-on-surface-variant">Admin-only — never shown to customers.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Real stock"
              type="number"
              error={errors.stock_real?.message}
              {...register("stock_real")}
            />
            <p className="mt-1 text-[11px] text-on-surface-variant">Admin-only — actual physical stock.</p>
          </div>
          <div>
            <Input
              label="Displayed stock"
              type="number"
              error={errors.stock_display?.message}
              {...register("stock_display")}
            />
            <p className="mt-1 text-[11px] text-on-surface-variant">What customers see (can be capped below real stock).</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface-variant">Image URLs</label>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <Input
                placeholder="https://…"
                error={errors.images?.[index]?.url?.message}
                {...register(`images.${index}.url` as const)}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-lg border border-outline-variant px-3 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => append({ url: "" })}
            className="self-start text-[13px] text-primary hover:underline"
          >
            + Add image URL
          </button>
        </div>

        <Controller
          control={control}
          name="is_enabled"
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Enabled (visible for sale)" />}
        />

        {errors.root && <p className="text-[12px] text-error">{errors.root.message}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
            {isEditing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
