"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { ProductListResponse } from "@/types/product";

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () =>
      apiFetch<ProductListResponse>("/api/products?all=1&pageSize=100"),
  });

  async function runLifecycleAction(
    id: number,
    action: () => Promise<unknown>,
  ) {
    setActionError(null);
    setBusyProductId(id);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Product action failed.",
      );
    } finally {
      setBusyProductId(null);
    }
  }

  function handleUnpublish(id: number, name: string) {
    if (
      !confirm(
        `Unpublish "${name}"? It will disappear from the storefront but can be published again.`,
      )
    )
      return;
    void runLifecycleAction(id, () =>
      apiFetch(`/api/products/${id}/unpublish`, { method: "POST" }),
    );
  }

  function handlePublish(id: number) {
    void runLifecycleAction(id, () =>
      apiFetch(`/api/products/${id}/publish`, { method: "POST" }),
    );
  }

  function handlePermanentDelete(id: number, name: string) {
    const confirmation = prompt(
      `Permanently delete "${name}"?\n\nThis removes the Product and all of its SKUs and cannot be undone. Products referenced by active orders cannot be deleted. Completed order history will retain immutable purchase snapshots.\n\nType the Product name to confirm:`,
    );
    if (confirmation !== name) return;
    void runLifecycleAction(id, () =>
      apiFetch(`/api/products/${id}`, { method: "DELETE" }),
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <Link href="/admin/products/new">
          <Button>+ Create Product</Button>
        </Link>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700"
        >
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <p>Loading…</p>
      ) : !data || data.products.length === 0 ? (
        <p className="text-gray-500">No products yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Name</th>
              <th>Type</th>
              <th>Category</th>
              <th>Price</th>
              <th>SKUs / Stock</th>
              <th>Availability</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="py-2">{p.name}</td>
                <td className="capitalize">{p.productType.toLowerCase()}</td>
                <td>{p.category.name}</td>
                <td>
                  {p.minPrice !== p.maxPrice
                    ? `${formatCurrency(p.minPrice)} – `
                    : ""}
                  {formatCurrency(p.maxPrice)}
                </td>
                <td>
                  {p.skuCount} SKU{p.skuCount === 1 ? "" : "s"} / {p.totalStock}{" "}
                  units
                </td>
                <td>{p.availability.replaceAll("_", " ").toLowerCase()}</td>
                <td>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      p.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.isActive ? "Published" : "Unpublished"}
                  </span>
                </td>
                <td className="space-x-3 py-2 text-right">
                  <Link href={`/admin/products/${p.id}`} className="underline">
                    Edit
                  </Link>
                  <Link
                    href={`/admin/products/${p.id}/variants`}
                    className="underline"
                  >
                    Manage Variants
                  </Link>
                  {p.isActive ? (
                    <button
                      type="button"
                      disabled={busyProductId === p.id}
                      onClick={() => handleUnpublish(p.id, p.name)}
                      className="font-medium text-amber-700 underline disabled:opacity-50"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyProductId === p.id}
                      onClick={() => handlePublish(p.id)}
                      className="font-medium text-green-700 underline disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyProductId === p.id}
                    onClick={() => handlePermanentDelete(p.id, p.name)}
                    className="rounded bg-red-700 px-2 py-1 text-white disabled:opacity-50"
                  >
                    Delete permanently
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
