"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import { ProductImageManager } from "@/components/admin/products/ProductImageManager";
import { combinationKey, effectivePrice } from "@/domain/product";
import { MAX_SKU_COMBINATIONS } from "@/domain/option-template";
import type { CategoryDto, ProductDto, ProductImageDto } from "@/types/product";

interface Props {
  product?: ProductDto;
  mediaLimits: { maxFileSizeBytes: number; maxImages: number };
  initialNotice?: string;
}

interface TemplateDto {
  id: number;
  name: string;
  isPinned: boolean;
  recommendedPriority: number | null;
  values: { value: string }[];
}

interface DraftOption {
  key: string;
  sourceTemplateId?: number;
  name: string;
  availableValues: string[];
  selectedValues: string[];
}

interface ExplicitVariantDraft {
  key: string;
  selection: Record<string, string>;
  label: string;
  sku: string;
  stockQuantity: number;
  priceOverride: string;
  isActive: boolean;
}

function skuSuggestion(
  productName: string,
  selection: Record<string, string>,
  sequence: number,
) {
  const value = `${productName}-${Object.values(selection).join("-")}`
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
  return (value || `SKU-${sequence + 1}`).slice(0, 64);
}

export function ProductForm({ product, mediaLimits, initialNotice }: Props) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [basePrice, setBasePrice] = useState(
    product?.basePrice.toString() ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ? String(product.categoryId) : "",
  );
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [showExactStock, setShowExactStock] = useState(
    product?.showExactStock ?? false,
  );
  const [productType, setProductType] = useState<"SIMPLE" | "CONFIGURABLE">(
    product?.productType ?? "SIMPLE",
  );
  const [simpleSku, setSimpleSku] = useState(product?.variants[0]?.sku ?? "");
  const [simpleStock, setSimpleStock] = useState(
    String(product?.variants[0]?.stockQuantity ?? 0),
  );
  const [simpleEnabled, setSimpleEnabled] = useState(
    product?.variants[0]?.isActive ?? true,
  );
  const [options, setOptions] = useState<DraftOption[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [combinationLabel, setCombinationLabel] = useState("");
  const [combinationStock, setCombinationStock] = useState("0");
  const [combinationPrice, setCombinationPrice] = useState("");
  const [combinationSku, setCombinationSku] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [variants, setVariants] = useState<ExplicitVariantDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [productImages, setProductImages] = useState<ProductImageDto[]>(
    product?.imageRecords ?? [],
  );
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<{ categories: CategoryDto[] }>("/api/categories"),
  });
  const { data: templateData } = useQuery({
    queryKey: ["admin", "option-templates", categoryId],
    queryFn: () =>
      apiFetch<{ templates: TemplateDto[] }>(
        `/api/admin/option-templates${categoryId ? `?categoryId=${categoryId}` : ""}`,
      ),
    enabled: !isEdit && productType === "CONFIGURABLE",
  });

  const productOptions = useMemo(
    () =>
      options.map((option) => ({
        name: option.name.trim(),
        values: option.selectedValues,
      })),
    [options],
  );
  const automaticLabel = options
    .map((option) => selection[option.name])
    .filter(Boolean)
    .join(" / ");
  const totalStock = variants
    .filter((variant) => variant.isActive)
    .reduce((sum, variant) => sum + variant.stockQuantity, 0);
  const prices = variants
    .filter((variant) => variant.isActive)
    .map((variant) =>
      effectivePrice(Number(basePrice) || 0, variant.priceOverride || null),
    );

  function activateTemplate(template: TemplateDto) {
    if (options.some((option) => option.sourceTemplateId === template.id))
      return;
    setOptions((current) => [
      ...current,
      {
        key: `template-${template.id}`,
        sourceTemplateId: template.id,
        name: template.name,
        availableValues: template.values.map((value) => value.value),
        selectedValues: [],
      },
    ]);
  }

  function removeOption(key: string) {
    if (
      variants.length > 0 &&
      !window.confirm(
        "Removing this option will discard every unsaved combination row. Continue?",
      )
    ) {
      return;
    }
    setOptions((current) => current.filter((option) => option.key !== key));
    setVariants([]);
    setSelection({});
  }

  function toggleValue(key: string, value: string) {
    if (variants.length > 0) {
      setFormError(
        "Remove explicit combinations before changing selected option values.",
      );
      return;
    }
    setOptions((current) =>
      current.map((option) =>
        option.key === key
          ? {
              ...option,
              selectedValues: option.selectedValues.includes(value)
                ? option.selectedValues.filter((item) => item !== value)
                : [...option.selectedValues, value],
            }
          : option,
      ),
    );
  }

  function addCustomOption() {
    setOptions((current) => [
      ...current,
      {
        key: `custom-${crypto.randomUUID()}`,
        name: "",
        availableValues: [],
        selectedValues: [],
      },
    ]);
  }

  function addCombination() {
    setFormError(null);
    if (variants.length >= MAX_SKU_COMBINATIONS) {
      setFormError(
        `A Product may have at most ${MAX_SKU_COMBINATIONS} explicit SKUs.`,
      );
      return;
    }
    if (
      options.length === 0 ||
      options.some((option) => !option.name.trim() || !selection[option.name])
    ) {
      setFormError("Select exactly one value from every active option.");
      return;
    }
    const optionNames = options.map((option) => option.name);
    const key = combinationKey(selection, optionNames);
    if (variants.some((variant) => variant.key === key)) {
      setFormError("This option combination has already been added.");
      return;
    }
    const sku = (
      combinationSku || skuSuggestion(name, selection, variants.length)
    )
      .trim()
      .toUpperCase();
    if (variants.some((variant) => variant.sku === sku)) {
      setFormError("Every explicit combination needs a unique SKU.");
      return;
    }
    const label = combinationLabel.trim() || automaticLabel;
    if (!label) {
      setFormError("Display label is required.");
      return;
    }
    setVariants((current) => [
      ...current,
      {
        key,
        selection: { ...selection },
        label,
        sku,
        stockQuantity: Math.max(0, Number.parseInt(combinationStock, 10) || 0),
        priceOverride:
          combinationPrice && Number(combinationPrice) !== Number(basePrice)
            ? combinationPrice
            : "",
        isActive: true,
      },
    ]);
    setSelection({});
    setCombinationLabel("");
    setCombinationStock("0");
    setCombinationPrice("");
    setCombinationSku("");
  }

  function updateVariant(index: number, patch: Partial<ExplicitVariantDraft>) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!description.trim()) next.description = "Description is required";
    if (!basePrice || Number(basePrice) <= 0)
      next.basePrice = "Price must be greater than 0";
    if (!categoryId) next.categoryId = "Category is required";
    if (!isEdit && productType === "SIMPLE" && !simpleSku.trim())
      next.sku = "SKU is required";
    if (!isEdit && productType === "CONFIGURABLE") {
      if (options.length === 0) next.options = "Activate at least one option";
      if (
        options.some(
          (option) => !option.name.trim() || option.selectedValues.length === 0,
        )
      ) {
        next.options =
          "Every option needs a name and at least one selected value";
      }
      if (variants.length === 0 && isActive) {
        next.variants =
          "An active configurable Product requires at least one explicit SKU";
      }
      const skus = variants.map((variant) => variant.sku.trim().toUpperCase());
      if (new Set(skus).size !== skus.length)
        next.sku = "Draft SKU codes must be unique";
      if (variants.some((variant) => !variant.label.trim())) {
        next.variants = "Every SKU requires a display label";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    let savedProductId: number | undefined;
    try {
      const common = {
        name,
        description,
        basePrice: Number(basePrice),
        categoryId: Number(categoryId),
        isActive,
        showExactStock,
      };
      if (isEdit) {
        const response = await apiFetch<{ product: ProductDto }>(
          `/api/products/${product!.id}`,
          {
            method: "PUT",
            body: JSON.stringify(common),
          },
        );
        savedProductId = response.product.id;
      } else if (productType === "SIMPLE") {
        const response = await apiFetch<{ product: ProductDto }>(
          "/api/products",
          {
            method: "POST",
            body: JSON.stringify({
              ...common,
              productType,
              sku: {
                code: simpleSku,
                stockQuantity: Number(simpleStock),
                isActive: simpleEnabled,
              },
            }),
          },
        );
        savedProductId = response.product.id;
      } else {
        const response = await apiFetch<{ product: ProductDto }>(
          "/api/products",
          {
            method: "POST",
            body: JSON.stringify({
              ...common,
              productType,
              options: productOptions,
              sourceTemplateIds: options
                .map((option) => option.sourceTemplateId)
                .filter((id): id is number => Boolean(id)),
              variants: variants.map((variant) => ({
                selection: variant.selection,
                label: variant.label,
                sku: variant.sku,
                stockQuantity: variant.stockQuantity,
                priceOverride: variant.priceOverride
                  ? Number(variant.priceOverride)
                  : null,
                isActive: variant.isActive,
              })),
            }),
          },
        );
        savedProductId = response.product.id;
      }

      if (pendingImageFiles.length > 0 && savedProductId) {
        const formData = new FormData();
        pendingImageFiles.forEach((file) => formData.append("files", file));
        const upload = await fetch(
          `/api/admin/products/${savedProductId}/images`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          },
        );
        const result = await upload.json().catch(() => null);
        if (!upload.ok) {
          throw new Error(
            result?.error ??
              "The Product was saved, but its images could not be uploaded.",
          );
        }
      }
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      if (!isEdit && savedProductId) {
        router.push(`/admin/products/${savedProductId}?imageUpload=failed`);
        router.refresh();
        return;
      }
      setFormError(
        error instanceof Error ? error.message : "Failed to save Product.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-5xl flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </p>
      )}
      {initialNotice && (
        <p
          role="status"
          className="rounded bg-amber-50 p-3 text-sm text-amber-800"
        >
          {initialNotice}
        </p>
      )}

      <section className="grid gap-4 rounded border p-4 md:grid-cols-2">
        <h2 className="col-span-full font-semibold">1. Product information</h2>
        <label className="text-sm">
          Name *
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <FieldError message={errors.name} />
        </label>
        <label className="text-sm">
          Category *
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
          >
            <option value="">Select a Category</option>
            {categoriesData?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.categoryId} />
        </label>
        <label className="text-sm">
          Base price *
          <Input
            type="number"
            min="0"
            step="0.01"
            value={basePrice}
            onChange={(event) => setBasePrice(event.target.value)}
          />
          <FieldError message={errors.basePrice} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />{" "}
          Active / published
        </label>
        <label className="col-span-full text-sm">
          Description *
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border px-3 py-2"
          />
          <FieldError message={errors.description} />
        </label>
      </section>

      {!isEdit && (
        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">2. Inventory type</h2>
          <label className="mr-5 text-sm">
            <input
              type="radio"
              checked={productType === "SIMPLE"}
              onChange={() => setProductType("SIMPLE")}
            />{" "}
            Simple Product
          </label>
          <label className="text-sm">
            <input
              type="radio"
              checked={productType === "CONFIGURABLE"}
              onChange={() => setProductType("CONFIGURABLE")}
            />{" "}
            Product with options
          </label>
        </section>
      )}

      {!isEdit && productType === "SIMPLE" && (
        <section className="grid gap-4 rounded border p-4 md:grid-cols-3">
          <label className="text-sm">
            SKU code *
            <Input
              value={simpleSku}
              onChange={(event) =>
                setSimpleSku(event.target.value.toUpperCase())
              }
            />
            <FieldError message={errors.sku} />
          </label>
          <label className="text-sm">
            Initial stock
            <Input
              type="number"
              min="0"
              value={simpleStock}
              onChange={(event) => setSimpleStock(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={simpleEnabled}
              onChange={(event) => setSimpleEnabled(event.target.checked)}
            />{" "}
            Available for sale
          </label>
        </section>
      )}

      {!isEdit && productType === "CONFIGURABLE" && (
        <>
          <section className="rounded border p-4">
            <h2 className="font-semibold">3. Define options and values</h2>
            <p className="mb-3 text-xs text-gray-500">
              Add the options required to describe this Product. Only
              combinations added below will become purchasable SKUs.
            </p>
            <div className="flex flex-wrap gap-2">
              {templateData?.templates.map((template) => {
                const active = options.some(
                  (option) => option.sourceTemplateId === template.id,
                );
                return (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      active
                        ? removeOption(`template-${template.id}`)
                        : activateTemplate(template)
                    }
                    className={`rounded border px-3 py-2 text-sm ${active ? "bg-green-50" : ""}`}
                  >
                    {active ? "✓" : "+"} {template.name}
                    {template.recommendedPriority !== null
                      ? " · Recommended"
                      : ""}
                    {template.isPinned ? " · Pinned" : ""}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={addCustomOption}
                className="rounded border border-dashed px-3 py-2 text-sm"
              >
                + Custom option
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {options.map((option) => (
                <div key={option.key} className="rounded bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    {option.sourceTemplateId ? (
                      <strong>{option.name}</strong>
                    ) : (
                      <Input
                        value={option.name}
                        placeholder="Option name"
                        onChange={(event) =>
                          setOptions((current) =>
                            current.map((item) =>
                              item.key === option.key
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeOption(option.key)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {option.availableValues.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={option.selectedValues.includes(value)}
                        onClick={() => toggleValue(option.key, value)}
                        className={`rounded border px-2 py-1 text-xs ${option.selectedValues.includes(value) ? "bg-gray-900 text-white" : "bg-white"}`}
                      >
                        {option.selectedValues.includes(value) ? "✓ " : ""}
                        {value}
                      </button>
                    ))}
                    <Input
                      className="w-40"
                      placeholder="+ custom value"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        const value = event.currentTarget.value.trim();
                        if (!value) return;
                        setOptions((current) =>
                          current.map((item) =>
                            item.key === option.key
                              ? {
                                  ...item,
                                  availableValues: [
                                    ...item.availableValues,
                                    value,
                                  ],
                                  selectedValues: [
                                    ...item.selectedValues,
                                    value,
                                  ],
                                }
                              : item,
                          ),
                        );
                        event.currentTarget.value = "";
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <FieldError message={errors.options} />
          </section>

          {options.length > 0 && (
            <section className="rounded border p-4">
              <h2 className="font-semibold">4. Add an explicit combination</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {options.map((option) => (
                  <label key={option.key} className="text-sm">
                    {option.name || "Option"} *
                    <select
                      value={selection[option.name] ?? ""}
                      onChange={(event) => {
                        const next = {
                          ...selection,
                          [option.name]: event.target.value,
                        };
                        setSelection(next);
                        setCombinationLabel(
                          options
                            .map((item) => next[item.name])
                            .filter(Boolean)
                            .join(" / "),
                        );
                        setCombinationSku(
                          skuSuggestion(name, next, variants.length),
                        );
                      }}
                      className="mt-1 block w-full rounded border px-2 py-2"
                    >
                      <option value="">Select</option>
                      {option.selectedValues.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(240px,2fr)_minmax(140px,1fr)_minmax(180px,1fr)]">
                <label className="text-sm">
                  Display label *
                  <Input
                    value={combinationLabel}
                    placeholder={automaticLabel}
                    onChange={(event) =>
                      setCombinationLabel(event.target.value)
                    }
                  />
                </label>
                <label className="text-sm">
                  Stock *
                  <Input
                    type="number"
                    min="0"
                    value={combinationStock}
                    onChange={(event) =>
                      setCombinationStock(event.target.value)
                    }
                  />
                </label>
                <label className="text-sm">
                  Price
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={combinationPrice || basePrice}
                    onChange={(event) =>
                      setCombinationPrice(event.target.value)
                    }
                  />
                  <span className="text-xs text-gray-500">
                    {!combinationPrice ||
                    Number(combinationPrice) === Number(basePrice)
                      ? "Uses base price"
                      : "Custom price"}
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={() => setAdvanced((value) => !value)}
                className="mt-3 text-sm underline"
              >
                {advanced ? "Hide" : "Show"} Advanced SKU
              </button>
              {advanced && (
                <label className="mt-2 block max-w-sm text-sm">
                  SKU suggestion
                  <Input
                    value={combinationSku}
                    onChange={(event) =>
                      setCombinationSku(event.target.value.toUpperCase())
                    }
                  />
                </label>
              )}
              <Button type="button" onClick={addCombination}>
                Add combination
              </Button>
            </section>
          )}

          <section className="rounded border p-4">
            <h2 className="font-semibold">5. Explicit SKU combinations</h2>
            {variants.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No combinations added. Selected values alone do not create SKUs.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th>Options</th>
                      <th>Display label</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th>Available</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant, index) => (
                      <tr key={variant.key} className="border-b">
                        <td>{Object.values(variant.selection).join(" / ")}</td>
                        <td>
                          <Input
                            value={variant.label}
                            onChange={(event) =>
                              updateVariant(index, {
                                label: event.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stockQuantity}
                            onChange={(event) =>
                              updateVariant(index, {
                                stockQuantity: Math.max(
                                  0,
                                  Number(event.target.value),
                                ),
                              })
                            }
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.priceOverride}
                            placeholder={`Base ${basePrice}`}
                            onChange={(event) =>
                              updateVariant(index, {
                                priceOverride: event.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            className="text-xs underline"
                            onClick={() =>
                              updateVariant(index, { priceOverride: "" })
                            }
                          >
                            Reset to base
                          </button>
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={variant.isActive}
                            onChange={(event) =>
                              updateVariant(index, {
                                isActive: event.target.checked,
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="text-red-600"
                            onClick={() =>
                              setVariants((current) =>
                                current.filter((_, row) => row !== index),
                              )
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <FieldError message={errors.variants} />
            <FieldError message={errors.sku} />
            <div className="mt-4 grid gap-2 rounded bg-gray-50 p-3 text-sm md:grid-cols-5">
              <span>
                Total stock: <strong>{totalStock}</strong>
              </span>
              <span>
                Explicit SKUs: <strong>{variants.length}</strong>
              </span>
              <span>
                Lowest price:{" "}
                <strong>{prices.length ? Math.min(...prices) : "—"}</strong>
              </span>
              <span>
                Highest price:{" "}
                <strong>{prices.length ? Math.max(...prices) : "—"}</strong>
              </span>
              <span>
                Out of stock:{" "}
                <strong>
                  {
                    variants.filter(
                      (variant) =>
                        variant.isActive && variant.stockQuantity === 0,
                    ).length
                  }
                </strong>
              </span>
            </div>
          </section>
        </>
      )}

      <ProductImageManager
        productId={product?.id}
        images={productImages}
        setImages={setProductImages}
        pendingFiles={pendingImageFiles}
        setPendingFiles={setPendingImageFiles}
        maxFileSizeBytes={mediaLimits.maxFileSizeBytes}
        maxImages={mediaLimits.maxImages}
        disabled={submitting}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showExactStock}
          onChange={(event) => setShowExactStock(event.target.checked)}
        />{" "}
        Show exact stock quantity to customers
      </label>
      {isEdit && (
        <p className="text-xs text-gray-500">
          Product type and existing combinations are preserved. Use Manage
          Variants for SKU changes.
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save Product"}
      </Button>
    </form>
  );
}
