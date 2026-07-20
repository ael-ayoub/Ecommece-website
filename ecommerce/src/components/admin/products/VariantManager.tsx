"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Save, Undo2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductDto, ProductVariantDto } from "@/types/product";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { formatCurrency } from "@/lib/format";
import { inventoryPresentation } from "@/domain/admin-product-editor";

interface RowDraft {
  id: number;
  sku: string;
  variantLabel: string;
  stockQuantity: number;
  price: string;
  isActive: boolean;
}

interface Props {
  productId: number;
  initialProduct?: ProductDto;
  onDirtyChange?: (dirty: boolean) => void;
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

export function VariantManager({
  productId,
  initialProduct,
  onDirtyChange,
}: Props) {
  const queryClient = useQueryClient();
  const { data: product, isLoading } = useQuery({
    queryKey: ["admin", "product", productId, "variants"],
    queryFn: async () => {
      const response = await apiFetch<{ product: ProductDto }>(
        `/api/products/${productId}`,
      );
      return response.product;
    },
    initialData: initialProduct,
  });
  const [original, setOriginal] = useState<RowDraft[]>([]);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

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

  useEffect(
    () => onDirtyChange?.(dirtyRows.length > 0),
    [dirtyRows.length, onDirtyChange],
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
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setNotice(null);
  }

  async function saveChanges() {
    if (!dirtyRows.length) return;
    setSaving(true);
    setNotice(null);
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
      setNotice({
        tone: "success",
        message:
          product?.productType === "SIMPLE"
            ? "Inventory changes saved."
            : "Variant changes saved.",
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin", "product", productId, "variants"],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
      ]);
    } catch (caught) {
      setNotice({
        tone: "error",
        message:
          caught instanceof Error ? caught.message : "Inventory save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function addCombination(event: FormEvent) {
    event.preventDefault();
    if (!product || product.options.length === 0) return;
    if (product.options.some((option) => !selection[option.name])) {
      setNotice({
        tone: "error",
        message: "Select one value from every Product option.",
      });
      return;
    }
    const automaticLabel = product.options
      .map((option) => selection[option.name])
      .join(" / ");
    setSaving(true);
    setNotice(null);
    try {
      await apiFetch(`/api/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          sku,
          variantLabel: label.trim() || automaticLabel,
          optionValues: selection,
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
      setNotice({
        tone: "success",
        message: "Explicit combination added in Disabled status.",
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin", "product", productId, "variants"],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
      ]);
    } catch (caught) {
      setNotice({
        tone: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "Failed to add combination.",
      });
    } finally {
      setSaving(false);
    }
  }

  const activeStock = rows
    .filter((row) => row.isActive)
    .reduce((sum, row) => sum + row.stockQuantity, 0);

  if (isLoading || !product) {
    return <p className="admin-inventory-loading">Loading inventory…</p>;
  }

  const presentation = inventoryPresentation(
    product.productType,
    product.options.length,
  );
  const isSimple = presentation === "SIMPLE_INVENTORY";
  const isStructured = presentation === "STRUCTURED_VARIANTS";

  const actions = (
    <div className="admin-inventory-actions">
      <span aria-live="polite">
        {isSimple ? "Inventory" : "Variant"} changes:{" "}
        <strong>{dirtyRows.length}</strong>
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={!dirtyRows.length || saving}
        onClick={() => {
          setRows(original);
          setNotice(null);
        }}
      >
        <Undo2 aria-hidden="true" className="mr-2 size-4" />
        Discard {isSimple ? "Inventory" : "Variant"} Changes
      </Button>
      <Button
        type="button"
        disabled={!dirtyRows.length || saving}
        onClick={saveChanges}
      >
        <Save aria-hidden="true" className="mr-2 size-4" />
        {saving
          ? "Saving…"
          : `Save ${isSimple ? "Inventory" : "Variant"} Changes`}
      </Button>
    </div>
  );

  return (
    <div className="admin-inventory-manager">
      <div className="admin-section-heading admin-inventory-heading">
        <div>
          <div className="admin-section-title-line">
            <h2>{isSimple ? "Inventory SKU" : "Options & Variants"}</h2>
            <span>
              {rows.length} SKU{rows.length === 1 ? "" : "s"}
            </span>
          </div>
          <p>
            {activeStock} active unit{activeStock === 1 ? "" : "s"}
            {isSimple
              ? " · This Product has one purchasable inventory SKU."
              : " · Stock and price overrides belong to each SKU."}
          </p>
        </div>
        {isStructured ? (
          <Button
            type="button"
            className="admin-add-combination-button"
            onClick={() =>
              document
                .querySelector(`#add-combination-${productId}`)
                ?.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "auto"
                    : "smooth",
                  block: "center",
                })
            }
          >
            <Plus aria-hidden="true" className="mr-2 size-4" />
            Add Combination
          </Button>
        ) : null}
      </div>

      {presentation === "LEGACY_VARIANTS" ? (
        <div className="admin-legacy-inventory-note" role="note">
          <strong>Legacy configurable inventory</strong>
          <p>
            Existing SKUs remain editable. Structured combinations cannot be
            added because this Product has no structured Product options.
          </p>
        </div>
      ) : null}

      {isSimple ? (
        rows[0] ? (
          <SimpleInventoryCard
            row={rows[0]}
            basePrice={product.basePrice.toString()}
            dirty={dirtyRows.some((item) => item.id === rows[0].id)}
            onChange={(patch) => updateRow(rows[0].id, patch)}
          />
        ) : (
          <p role="alert" className="admin-section-notice is-error">
            This Simple Product is missing its inventory SKU.
          </p>
        )
      ) : (
        <div className="admin-variant-table-wrap">
          <table className="admin-variant-table">
            <thead>
              <tr>
                <th>Option combination</th>
                <th>SKU</th>
                <th>Price override</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ConfigurableVariantRow
                  key={row.id}
                  row={row}
                  product={product}
                  dirty={dirtyRows.some((item) => item.id === row.id)}
                  onChange={(patch) => updateRow(row.id, patch)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`admin-section-notice is-${notice.tone}`}
        >
          {notice.message}
        </p>
      ) : null}
      {actions}

      {isStructured ? (
        <form
          id={`add-combination-${productId}`}
          onSubmit={addCombination}
          className="admin-add-combination"
        >
          <div className="admin-section-heading">
            <div>
              <h3>Add explicit combination</h3>
              <p>
                Only this selected option combination becomes a purchasable SKU.
                New combinations start Disabled.
              </p>
            </div>
          </div>
          <fieldset>
            <legend className="sr-only">Combination option values</legend>
            <div className="admin-combination-options">
              {product.options.map((option) => (
                <AdminSelect
                  key={option.id}
                  label={option.name}
                  value={selection[option.name] ?? ""}
                  onChange={(value) => {
                    const next = { ...selection, [option.name]: value };
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
                  options={[
                    { value: "", label: "Select" },
                    ...option.values.map((value) => ({
                      value: value.value,
                      label: value.value,
                    })),
                  ]}
                />
              ))}
            </div>
          </fieldset>
          <div className="admin-combination-fields">
            <label>
              Display label
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <label>
              SKU
              <Input
                value={sku}
                onChange={(event) => setSku(event.target.value.toUpperCase())}
              />
            </label>
            <label>
              Stock
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              />
            </label>
            <label>
              Price override
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                placeholder={`Base ${product.basePrice}`}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
            <div className="admin-combination-submit">
              <Button type="submit" disabled={saving}>
                <Plus aria-hidden="true" className="mr-2 size-4" />
                {saving ? "Adding…" : "Add Combination"}
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function SimpleInventoryCard({
  row,
  basePrice,
  dirty,
  onChange,
}: {
  row: RowDraft;
  basePrice: string;
  dirty: boolean;
  onChange: (patch: Partial<RowDraft>) => void;
}) {
  return (
    <article className={`admin-simple-inventory ${dirty ? "is-dirty" : ""}`}>
      <div className="admin-simple-inventory-grid">
        <label>
          SKU
          <Input
            value={row.sku}
            onChange={(event) =>
              onChange({ sku: event.target.value.toUpperCase() })
            }
          />
        </label>
        <label>
          Price override
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={row.price}
            placeholder="Uses base price"
            onChange={(event) => onChange({ price: event.target.value })}
          />
          <small>
            {row.price
              ? `Override ${formatCurrency(row.price)} · Base ${formatCurrency(basePrice)}`
              : `Uses base price · Effective ${formatCurrency(basePrice)}`}
          </small>
        </label>
        <label>
          Stock
          <Input
            type="number"
            min="0"
            inputMode="numeric"
            value={row.stockQuantity}
            onChange={(event) =>
              onChange({
                stockQuantity: Math.max(0, Number(event.target.value)),
              })
            }
          />
        </label>
        <div>
          <AdminSelect
            label="Status"
            value={row.isActive ? "active" : "disabled"}
            onChange={(value) => onChange({ isActive: value === "active" })}
            options={[
              { value: "active", label: "Enabled" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
        </div>
      </div>
      <div className="admin-inventory-price-line">
        <strong>
          Effective price: {formatCurrency(row.price || basePrice)}
        </strong>
        {row.price ? (
          <button type="button" onClick={() => onChange({ price: "" })}>
            <RotateCcw aria-hidden="true" />
            Reset to base price
          </button>
        ) : null}
        {dirty ? <span>Unsaved inventory change</span> : null}
      </div>
    </article>
  );
}

function ConfigurableVariantRow({
  row,
  product,
  dirty,
  onChange,
}: {
  row: RowDraft;
  product: ProductDto;
  dirty: boolean;
  onChange: (patch: Partial<RowDraft>) => void;
}) {
  const variant = product.variants.find((item) => item.id === row.id);
  const values = variant?.optionValues ?? [];
  const fullLabel = values
    .map(
      ({ optionValue }) => `${optionValue.option.name}: ${optionValue.value}`,
    )
    .join(", ");
  return (
    <tr className={dirty ? "is-dirty" : ""}>
      <td data-label="Option combination">
        {values.length ? (
          <div
            className="admin-variant-chips"
            title={fullLabel}
            aria-label={fullLabel}
          >
            {values.slice(0, 3).map(({ optionValue }) => (
              <span key={optionValue.id}>
                {optionValue.option.name}: {optionValue.value}
              </span>
            ))}
            {values.length > 3 ? <span>+{values.length - 3} more</span> : null}
          </div>
        ) : (
          <span className="admin-legacy-label">Legacy SKU label</span>
        )}
        <Input
          aria-label={`Display label for ${row.sku}`}
          value={row.variantLabel}
          onChange={(event) => onChange({ variantLabel: event.target.value })}
        />
      </td>
      <td data-label="SKU">
        <Input
          aria-label={`SKU ${row.sku}`}
          value={row.sku}
          onChange={(event) =>
            onChange({ sku: event.target.value.toUpperCase() })
          }
        />
      </td>
      <td data-label="Price override">
        <Input
          aria-label={`Price override for ${row.sku}`}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={row.price}
          placeholder="Uses base"
          onChange={(event) => onChange({ price: event.target.value })}
        />
        <small>
          {row.price
            ? `Override ${formatCurrency(row.price)} · Base ${formatCurrency(product.basePrice)}`
            : `Uses base · Effective ${formatCurrency(product.basePrice)}`}
        </small>
      </td>
      <td data-label="Stock">
        <Input
          aria-label={`Stock for ${row.sku}`}
          type="number"
          min="0"
          inputMode="numeric"
          value={row.stockQuantity}
          onChange={(event) =>
            onChange({
              stockQuantity: Math.max(0, Number(event.target.value)),
            })
          }
        />
      </td>
      <td data-label="Status">
        <AdminSelect
          ariaLabel={`Status for ${row.variantLabel}`}
          value={row.isActive ? "active" : "disabled"}
          onChange={(value) => onChange({ isActive: value === "active" })}
          options={[
            { value: "active", label: "Enabled" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
      </td>
      <td data-label="Actions">
        {row.price ? (
          <button
            type="button"
            className="admin-reset-price"
            onClick={() => onChange({ price: "" })}
          >
            <RotateCcw aria-hidden="true" />
            <span>Reset price</span>
          </button>
        ) : (
          <span className="admin-no-row-action">No override</span>
        )}
      </td>
    </tr>
  );
}
