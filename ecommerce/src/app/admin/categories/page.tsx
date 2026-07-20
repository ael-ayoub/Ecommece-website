"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { CategoryDto } from "@/types/product";
import {
  AdminActionMenu,
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminInput,
  AdminLoadingState,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUI";

type PendingAction =
  | { type: "create" }
  | { type: "update"; id: number }
  | { type: "delete"; id: number }
  | null;

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<{ categories: CategoryDto[] }>("/api/categories"),
  });

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CategoryDto | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setPending({ type: "create" });
    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      await invalidate();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to create category.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleUpdate(id: number) {
    setError(null);
    if (!editingName.trim()) {
      setError("Category name is required.");
      return;
    }
    setPending({ type: "update", id });
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingName }),
      });
      setEditingId(null);
      await invalidate();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to update category.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleDelete(category: CategoryDto) {
    setError(null);
    setPending({ type: "delete", id: category.id });
    try {
      await apiFetch(`/api/categories/${category.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await invalidate();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to delete category.",
      );
    } finally {
      setPending(null);
    }
  }

  const categories = data?.categories ?? [];
  const creating = pending?.type === "create";

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Catalog structure"
        title="Categories"
        description="Organize Products without changing their inventory or lifecycle."
      />

      {error ? (
        <AdminAlert
          action={
            <AdminButton onClick={() => setError(null)}>Dismiss</AdminButton>
          }
        >
          {error}
        </AdminAlert>
      ) : null}

      <AdminCard>
        {isLoading ? (
          <AdminLoadingState label="Loading Categories" />
        ) : isError ? (
          <AdminEmptyState
            icon={<FolderTree aria-hidden="true" />}
            title="Categories could not be loaded"
            description="Try the request again. No Category data was changed."
            action={<AdminButton onClick={() => refetch()}>Retry</AdminButton>}
          />
        ) : categories.length === 0 ? (
          <AdminEmptyState
            icon={<FolderTree aria-hidden="true" />}
            title="No Categories yet"
            description="Create a Category below to begin organizing the Product catalog."
          />
        ) : (
          <AdminTable label="Categories">
            <thead>
              <tr>
                <th scope="col">Category name</th>
                <th scope="col">Products</th>
                <th scope="col" className="admin-table-actions-heading">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const count = category._count?.products ?? 0;
                const editing = editingId === category.id;
                const updating =
                  pending?.type === "update" && pending.id === category.id;
                return (
                  <tr key={category.id} className={editing ? "is-editing" : ""}>
                    <td>
                      {editing ? (
                        <AdminInput
                          label="Category name"
                          className="admin-table-edit-field"
                          value={editingName}
                          maxLength={100}
                          autoFocus
                          disabled={updating}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setEditingId(null);
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleUpdate(category.id);
                            }
                          }}
                        />
                      ) : (
                        <span className="admin-table-primary">
                          {category.name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="admin-count">
                        {count} Product{count === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      {editing ? (
                        <div className="admin-row-actions">
                          <AdminButton
                            variant="secondary"
                            disabled={updating}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </AdminButton>
                          <AdminButton
                            disabled={updating || !editingName.trim()}
                            onClick={() => handleUpdate(category.id)}
                          >
                            {updating ? "Saving…" : "Save"}
                          </AdminButton>
                        </div>
                      ) : (
                        <AdminActionMenu
                          label={`Actions for ${category.name}`}
                          items={[
                            {
                              label: "Edit Category",
                              icon: <Pencil aria-hidden="true" />,
                              onSelect: () => {
                                setEditingId(category.id);
                                setEditingName(category.name);
                                setError(null);
                              },
                            },
                            {
                              label: "Delete Category",
                              icon: <Trash2 aria-hidden="true" />,
                              tone: "danger",
                              disabled: count > 0,
                              title:
                                count > 0
                                  ? "Move Products before deleting this Category."
                                  : undefined,
                              onSelect: () => setDeleteTarget(category),
                            },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard className="admin-form-card">
        <div className="admin-card-heading">
          <div>
            <h2>Create Category</h2>
            <p>Add a reusable catalog grouping for Products.</p>
          </div>
        </div>
        <form className="admin-inline-form" onSubmit={handleCreate}>
          <AdminInput
            label="New Category name"
            value={name}
            maxLength={100}
            disabled={creating}
            error={
              !name.trim() && error === "Category name is required."
                ? error
                : undefined
            }
            onChange={(event) => {
              setName(event.target.value);
              if (error === "Category name is required.") setError(null);
            }}
          />
          <AdminButton type="submit" disabled={creating || !name.trim()}>
            <Plus aria-hidden="true" />
            {creating ? "Creating…" : "Create Category"}
          </AdminButton>
        </form>
      </AdminCard>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete “${deleteTarget?.name ?? ""}”?`}
        description={
          <>
            <p>
              This permanently deletes the Category and cannot be undone.
              Categories containing Products remain protected.
            </p>
            <p>
              Current Products:{" "}
              <strong>{deleteTarget?._count?.products ?? 0}</strong>
            </p>
          </>
        }
        confirmLabel="Delete Category"
        busy={pending?.type === "delete" && pending.id === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
