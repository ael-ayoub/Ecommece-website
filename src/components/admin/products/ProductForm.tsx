"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import type { CategoryDto, ProductDto } from "@/types/product";

interface Props {
  product?: ProductDto;
}

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const isEdit = !!product;

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<{ categories: CategoryDto[] }>("/api/categories"),
  });

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [basePrice, setBasePrice] = useState(product?.basePrice.toString() ?? "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ? String(product.categoryId) : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!description.trim()) next.description = "Description is required";
    if (!basePrice || Number(basePrice) <= 0) next.basePrice = "Price must be greater than 0";
    if (!categoryId) next.categoryId = "Category is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        basePrice: Number(basePrice),
        categoryId: Number(categoryId),
      };

      if (isEdit) {
        await apiFetch(`/api/products/${product!.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/products", { method: "POST", body: JSON.stringify(payload) });
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      {formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
        <FieldError message={errors.name} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          rows={4}
          required
        />
        <FieldError message={errors.description} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Price *</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          required
        />
        <FieldError message={errors.basePrice} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Category *</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          required
        >
          <option value="">Select a category</option>
          {categoriesData?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId} />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
