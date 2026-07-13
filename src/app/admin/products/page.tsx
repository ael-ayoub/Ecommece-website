"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { ProductListResponse } from "@/types/product";

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => apiFetch<ProductListResponse>("/api/products?all=1&pageSize=100"),
  });

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    await apiFetch(`/api/products/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <Link href="/admin/products/new">
          <Button>+ Create Product</Button>
        </Link>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : !data || data.products.length === 0 ? (
        <p className="text-gray-500">No products yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Variants</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="py-2">{p.name}</td>
                <td>{p.category.name}</td>
                <td>{formatCurrency(p.basePrice)}</td>
                <td>{p.variants.length} variants</td>
                <td>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="space-x-3 py-2 text-right">
                  <Link href={`/admin/products/${p.id}`} className="underline">
                    Edit
                  </Link>
                  <Link href={`/admin/products/${p.id}/variants`} className="underline">
                    Manage Variants
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="text-red-600 underline"
                  >
                    Delete
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
