"use client";

import { useState, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductVariantDto } from "@/types/product";

export function VariantManager({ productId }: { productId: number }) {
  const queryClient = useQueryClient();

  const { data: variants, isLoading } = useQuery({
    queryKey: ["admin", "product", productId, "variants"],
    queryFn: async () => {
      const res = await apiFetch<{ product: { variants: ProductVariantDto[] } }>(
        `/api/products/${productId}`,
      );
      return res.product.variants;
    },
  });

  const [label, setLabel] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "product", productId, "variants"] });
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!label.trim() || !sku.trim()) {
      setError("SKU and variant label are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          variantLabel: label,
          sku,
          stockQuantity: Number(stock) || 0,
          ...(price ? { price: Number(price) } : {}),
        }),
      });
      setLabel("");
      setSku("");
      setStock("0");
      setPrice("");
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add variant.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(variant: ProductVariantDto) {
    await apiFetch(`/api/products/${productId}/variants/${variant.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !variant.isActive }),
    });
    invalidate();
  }

  async function updateStock(variant: ProductVariantDto, newStock: number) {
    await apiFetch(`/api/products/${productId}/variants/${variant.id}`, {
      method: "PUT",
      body: JSON.stringify({ stockQuantity: newStock }),
    });
    invalidate();
  }

  return (
    <div className="max-w-xl">
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Variant</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {variants?.map((v) => (
              <tr key={v.id} className="border-b border-gray-100">
                <td className="py-2">{v.variantLabel}</td>
                <td>{v.sku}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    defaultValue={v.stockQuantity}
                    onBlur={(e) => updateStock(v, Number(e.target.value))}
                    className="w-20 rounded border border-gray-300 px-2 py-1"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={v.isActive}
                    onChange={() => toggleActive(v)}
                    aria-label={`Enable ${v.variantLabel}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">SKU *</label>
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            className="w-36"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Label *</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="w-32" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Stock</label>
          <Input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Price override</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="optional"
            className="w-28"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          + Add Variant
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
