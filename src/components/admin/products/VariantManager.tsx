"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductDto, ProductVariantDto } from "@/types/product";

interface RowDraft {
  id: number;
  sku: string;
  variantLabel: string;
  stockQuantity: number;
  price: string;
  isActive: boolean;
}

function toDraft(variant: ProductVariantDto): RowDraft {
  return {
    id: variant.id,
    sku: variant.sku,
    variantLabel: variant.variantLabel,
    stockQuantity: variant.stockQuantity,
    price: variant.price?.toString() ?? "",
    isActive: variant.isActive,
  };
}

export function VariantManager({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const { data: product, isLoading } = useQuery({
    queryKey: ["admin", "product", productId, "variants"],
    queryFn: async () => {
      const response = await apiFetch<{ product: ProductDto }>(`/api/products/${productId}`);
      return response.product;
    },
  });
  const [original, setOriginal] = useState<RowDraft[]>([]);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const drafts = product.variants.map(toDraft);
    setOriginal(drafts);
    setRows(drafts);
  }, [product]);

  const dirtyRows = useMemo(
    () =>
      rows.filter((row) => {
        const previous = original.find((item) => item.id === row.id);
        return previous && JSON.stringify(previous) !== JSON.stringify(row);
      }),
    [original, rows],
  );

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!dirtyRows.length) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyRows.length]);

  function updateRow(id: number, patch: Partial<RowDraft>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function saveChanges() {
    if (!dirtyRows.length) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/products/${productId}/variants/batch`, {
        method: "PUT",
        body: JSON.stringify({
          updates: dirtyRows.map((row) => ({
            id: row.id,
            sku: row.sku,
            variantLabel: row.variantLabel,
            stockQuantity: row.stockQuantity,
            price: row.price ? Number(row.price) : null,
            isActive: row.isActive,
          })),
        }),
      });
      setOriginal(rows);
      queryClient.invalidateQueries({ queryKey: ["admin", "product", productId, "variants"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Batch save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addCombination(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    const structured = product.options.length > 0;
    if (structured && product.options.some((option) => !selection[option.name])) {
      setError("Select one value from every Product option.");
      return;
    }
    const automaticLabel = product.options.map((option) => selection[option.name]).join(" / ");
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          sku,
          variantLabel: label.trim() || automaticLabel,
          optionValues: structured ? selection : undefined,
          stockQuantity: Number(stock) || 0,
          price: price ? Number(price) : undefined,
          isActive: false,
        }),
      });
      setSelection({});
      setLabel("");
      setSku("");
      setStock("0");
      setPrice("");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "product", productId, "variants"],
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to add combination.");
    } finally {
      setSaving(false);
    }
  }

  const activeStock = rows
    .filter((row) => row.isActive)
    .reduce((sum, row) => sum + row.stockQuantity, 0);

  if (isLoading || !product) return <p>Loading…</p>;

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between rounded bg-gray-50 p-3 text-sm">
        <span>
          Derived active stock: <strong>{activeStock}</strong>
        </span>
        <span>
          {dirtyRows.length} unsaved change{dirtyRows.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!dirtyRows.length || saving}
            onClick={() => setRows(original)}
          >
            Discard changes
          </Button>
          <Button type="button" disabled={!dirtyRows.length || saving} onClick={saveChanges}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th>Display label</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Price override</th>
              <th>Effective price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dirty = dirtyRows.some((item) => item.id === row.id);
              return (
                <tr key={row.id} className={`border-b ${dirty ? "bg-yellow-50" : ""}`}>
                  <td>
                    <Input
                      value={row.variantLabel}
                      onChange={(event) => updateRow(row.id, { variantLabel: event.target.value })}
                    />
                  </td>
                  <td>
                    <Input
                      value={row.sku}
                      onChange={(event) =>
                        updateRow(row.id, { sku: event.target.value.toUpperCase() })
                      }
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min="0"
                      value={row.stockQuantity}
                      onChange={(event) =>
                        updateRow(row.id, {
                          stockQuantity: Math.max(0, Number(event.target.value)),
                        })
                      }
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.price}
                      placeholder="Uses base"
                      onChange={(event) => updateRow(row.id, { price: event.target.value })}
                    />
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => updateRow(row.id, { price: "" })}
                    >
                      Reset to base
                    </button>
                  </td>
                  <td>{row.price ? row.price : `${product.basePrice} (base)`}</td>
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(event) => updateRow(row.id, { isActive: event.target.checked })}
                      />{" "}
                      {row.isActive ? "Enabled" : "Disabled"}
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={addCombination} className="mt-6 rounded border p-4">
        <h2 className="font-semibold">Add explicit combination</h2>
        {product.options.length === 0 && (
          <p className="text-xs text-amber-700">
            Legacy unstructured Product: combination options are unavailable; use a clear display
            label.
          </p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {product.options.map((option) => (
            <label key={option.id} className="text-sm">
              {option.name}
              <select
                value={selection[option.name] ?? ""}
                onChange={(event) => {
                  const next = { ...selection, [option.name]: event.target.value };
                  setSelection(next);
                  const automatic = product.options
                    .map((item) => next[item.name])
                    .filter(Boolean)
                    .join(" / ");
                  setLabel(automatic);
                  setSku(
                    `${product.name}-${automatic}`
                      .replace(/[^a-z0-9_-]+/gi, "-")
                      .toUpperCase()
                      .slice(0, 64),
                  );
                }}
                className="block w-full rounded border px-2 py-2"
              >
                <option value="">Select</option>
                {option.values.map((value) => (
                  <option key={value.id}>{value.value}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="text-sm">
            Display label
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <label className="text-sm">
            SKU
            <Input value={sku} onChange={(event) => setSku(event.target.value.toUpperCase())} />
          </label>
          <label className="text-sm">
            Stock
            <Input
              type="number"
              min="0"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Price override
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              placeholder={`Base ${product.basePrice}`}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          New combinations start disabled until reviewed. Missing combinations are not created.
        </p>
        <Button type="submit" disabled={saving}>
          Add combination
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
