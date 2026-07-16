"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import type { CategoryDto, ProductDto } from "@/types/product";
import { generateOptionCombinations } from "@/domain/product";

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
  const [productType, setProductType] = useState<"SIMPLE" | "CONFIGURABLE">(
    product?.productType ?? "SIMPLE",
  );
  const [sku, setSku] = useState(product?.variants[0]?.sku ?? "");
  const [stock, setStock] = useState(String(product?.variants[0]?.stockQuantity ?? 0));
  const [optionRows, setOptionRows] = useState([
    { name: "Color", values: "Red, Blue" },
    { name: "Size", values: "Small, Medium" },
  ]);
  const options = optionRows
    .map((row) => ({
      name: row.name.trim(),
      values: row.values
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    }))
    .filter((option) => option.name && option.values.length);
  const combinations = generateOptionCombinations(options);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!description.trim()) next.description = "Description is required";
    if (!basePrice || Number(basePrice) <= 0) next.basePrice = "Price must be greater than 0";
    if (!categoryId) next.categoryId = "Category is required";
    if (!isEdit && productType === "SIMPLE" && !sku.trim()) next.sku = "SKU is required";
    if (!isEdit && productType === "CONFIGURABLE" && combinations.length === 0) {
      next.options = "At least one option and value is required";
    }
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
        const createPayload =
          productType === "SIMPLE"
            ? {
                ...payload,
                productType,
                sku: { code: sku, stockQuantity: Number(stock), isActive: true },
              }
            : {
                ...payload,
                productType,
                options,
                variants: combinations.map((optionValues, index) => ({
                  sku: `${name}-${Object.values(optionValues).join("-")}`
                    .replace(/[^a-z0-9-]/gi, "-")
                    .toUpperCase(),
                  optionValues,
                  price: null,
                  stockQuantity: 0,
                  isActive: true,
                  _row: index,
                })),
              };
        await apiFetch("/api/products", { method: "POST", body: JSON.stringify(createPayload) });
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

      {!isEdit && (
        <div>
          <p className="mb-2 text-sm font-medium">Inventory type *</p>
          <label className="mr-4 text-sm">
            <input
              type="radio"
              checked={productType === "SIMPLE"}
              onChange={() => setProductType("SIMPLE")}
            />{" "}
            Simple product
          </label>
          <label className="text-sm">
            <input
              type="radio"
              checked={productType === "CONFIGURABLE"}
              onChange={() => setProductType("CONFIGURABLE")}
            />{" "}
            Product with variants
          </label>
        </div>
      )}

      {!isEdit && productType === "SIMPLE" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">SKU code *</label>
            <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} />
            <FieldError message={errors.sku} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Stock quantity *</label>
            <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </>
      )}

      {!isEdit && productType === "CONFIGURABLE" && (
        <div className="space-y-3 rounded border border-gray-200 p-3">
          <p className="text-sm font-medium">Options and SKU combinations</p>
          {optionRows.map((row, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <Input
                value={row.name}
                placeholder="Option name"
                onChange={(e) =>
                  setOptionRows((rows) =>
                    rows.map((item, rowIndex) =>
                      rowIndex === index ? { ...item, name: e.target.value } : item,
                    ),
                  )
                }
              />
              <Input
                value={row.values}
                placeholder="Comma-separated values"
                onChange={(e) =>
                  setOptionRows((rows) =>
                    rows.map((item, rowIndex) =>
                      rowIndex === index ? { ...item, values: e.target.value } : item,
                    ),
                  )
                }
              />
            </div>
          ))}
          <Button
            type="button"
            onClick={() => setOptionRows((rows) => [...rows, { name: "", values: "" }])}
          >
            + Add option
          </Button>
          <p className="text-xs text-gray-500">
            {combinations.length} combinations will be generated with editable SKU inventory on the
            Manage Variants page after creation.
          </p>
          <FieldError message={errors.options} />
        </div>
      )}

      {isEdit && (
        <p className="text-xs text-gray-500">
          Product type is immutable in v1. Manage SKU codes and stock from the inventory page.
        </p>
      )}

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
