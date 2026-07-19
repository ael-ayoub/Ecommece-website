"use client";

import { useState, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryDto } from "@/types/product";

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<{ categories: CategoryDto[] }>("/api/categories"),
  });

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      invalidate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category.",
      );
    }
  }

  async function handleUpdate(id: number) {
    setError(null);
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingName }),
      });
      setEditingId(null);
      invalidate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category.",
      );
    }
  }

  async function handleDelete(category: CategoryDto) {
    const count = category._count?.products ?? 0;
    if (
      !confirm(
        `Permanently delete "${category.name}"?\n\nThis cannot be undone. Categories containing Products cannot be deleted.\n\nCurrent Products: ${count}`,
      )
    )
      return;
    setError(null);
    try {
      await apiFetch(`/api/categories/${category.id}`, { method: "DELETE" });
      invalidate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category.",
      );
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-bold">Categories</h1>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Name</th>
              <th>Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.categories.map((c) => (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="py-2">
                  {editingId === c.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-40"
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td>{c._count?.products ?? 0}</td>
                <td className="space-x-3 py-2 text-right">
                  {editingId === c.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(c.id)}
                        className="underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditingName(c.name);
                        }}
                        className="underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-red-600 underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleCreate} className="mt-6 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">
            New category name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48"
          />
        </div>
        <Button type="submit">+ Create Category</Button>
      </form>
    </div>
  );
}
