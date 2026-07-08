import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as productsApi from "../../api/products";
import * as categoriesApi from "../../api/categories";
import { ApiError } from "../../api/client";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { Switch } from "../../components/Switch";
import { Button } from "../../components/Button";
import { Skeleton } from "../../components/Skeleton";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { Pagination } from "../../components/Pagination";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ProductFormModal } from "./ProductFormModal";
import { StockQuickEdit } from "./StockQuickEdit";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<productsApi.Product | "new" | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<productsApi.Product | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["admin", "categories"], queryFn: () => categoriesApi.listCategories() });

  const productsQuery = useQuery({
    queryKey: ["admin", "products", { page, q: debouncedSearch, category_id: categoryId }],
    queryFn: () =>
      productsApi.listProducts({
        page,
        pageSize: 20,
        q: debouncedSearch || undefined,
        category_id: categoryId || undefined,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) => productsApi.toggleProductEnabled(id, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Couldn't update product"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Product deleted");
      setDeletingProduct(null);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Couldn't delete product"),
  });

  const categoryNameById = new Map((categoriesQuery.data?.items ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 gap-3">
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          >
            <option value="">All categories</option>
            {categoriesQuery.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => setEditingProduct("new")}>+ Add product</Button>
      </div>

      <Card className="overflow-hidden rounded-xl !p-0">
        {productsQuery.isLoading ? (
          <div className="space-y-4 p-stack-lg">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : productsQuery.isError ? (
          <ErrorState message="Couldn't load products." />
        ) : productsQuery.data!.items.length === 0 ? (
          <EmptyState icon="inventory_2" message="No products found." />
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Product</th>
                  <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Category</th>
                  <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Price</th>
                  <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Displayed stock</th>
                  <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Real stock</th>
                  <th className="px-stack-lg py-3 font-label-md text-label-md text-on-surface-variant">Enabled</th>
                  <th className="px-stack-lg py-3 text-right font-label-md text-label-md text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {productsQuery.data!.items.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-surface-container-lowest">
                    <td className="px-stack-lg py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
                          {product.images[0] && (
                            <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <span className="font-body-md text-body-md text-on-surface">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-stack-lg py-3 font-body-md text-body-md text-on-surface-variant">
                      {categoryNameById.get(product.category_id) ?? "—"}
                    </td>
                    <td className="px-stack-lg py-3 font-body-md text-body-md font-semibold">{formatMoney(product.price)}</td>
                    <td className="px-stack-lg py-3 font-body-md text-body-md">
                      <StockQuickEdit productId={product.id} field="stock_display" value={product.stock_display} />
                    </td>
                    <td className="px-stack-lg py-3 font-body-md text-body-md">
                      <StockQuickEdit productId={product.id} field="stock_real" value={product.stock_real} />
                    </td>
                    <td className="px-stack-lg py-3">
                      <Switch
                        checked={product.is_enabled}
                        onChange={(checked) => toggleMutation.mutate({ id: product.id, isEnabled: checked })}
                        disabled={toggleMutation.isPending}
                      />
                    </td>
                    <td className="px-stack-lg py-3 text-right">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => setDeletingProduct(product)}
                        className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container hover:text-error"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={productsQuery.data!.meta.totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>

      {editingProduct && (
        <ProductFormModal
          product={editingProduct === "new" ? undefined : editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {deletingProduct && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete "${deletingProduct.name}"? This can't be undone — past orders that reference it are kept.`}
          confirmLabel="Delete"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deletingProduct.id)}
          onCancel={() => setDeletingProduct(null)}
        />
      )}
    </div>
  );
}
