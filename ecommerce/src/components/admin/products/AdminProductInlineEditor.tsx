"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, Images, Info, LockKeyhole, Save, Undo2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { CategoryDto, ProductDto, ProductImageDto } from "@/types/product";
import { ProductImageManager } from "./ProductImageManager";
import { VariantManager } from "./VariantManager";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminSwitch } from "@/components/admin/AdminSwitch";

interface Props {
  product: ProductDto;
  categories: CategoryDto[];
  onDirtyChange: (dirty: boolean) => void;
}

type Section = "general" | "images" | "inventory";

interface ProductBaseline {
  name: string;
  description: string;
  categoryId: number;
  basePrice: string;
  isActive: boolean;
  showExactStock: boolean;
}

function initialBaseline(product: ProductDto): ProductBaseline {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    basePrice: product.basePrice.toString(),
    isActive: product.isActive,
    showExactStock: product.showExactStock,
  };
}

export function AdminProductInlineEditor({
  product,
  categories,
  onDirtyChange,
}: Props) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [baseline, setBaseline] = useState(() => initialBaseline(product));
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [basePrice, setBasePrice] = useState(product.basePrice.toString());
  const [isActive, setIsActive] = useState(product.isActive);
  const [showExactStock, setShowExactStock] = useState(product.showExactStock);
  const [images, setImages] = useState<ProductImageDto[]>(product.imageRecords);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [variantDirty, setVariantDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const productChanges = useMemo(
    () =>
      [
        name !== baseline.name,
        description !== baseline.description,
        categoryId !== baseline.categoryId,
        basePrice !== baseline.basePrice,
        isActive !== baseline.isActive,
        showExactStock !== baseline.showExactStock,
      ].filter(Boolean).length + pendingFiles.length,
    [
      basePrice,
      baseline,
      categoryId,
      description,
      isActive,
      name,
      pendingFiles.length,
      showExactStock,
    ],
  );
  const productDirty = productChanges > 0;

  useEffect(
    () => onDirtyChange(productDirty || variantDirty),
    [onDirtyChange, productDirty, variantDirty],
  );

  function resetProduct() {
    setName(baseline.name);
    setDescription(baseline.description);
    setCategoryId(baseline.categoryId);
    setBasePrice(baseline.basePrice);
    setIsActive(baseline.isActive);
    setShowExactStock(baseline.showExactStock);
    setPendingFiles([]);
    setNotice(null);
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    if (!productDirty) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiFetch(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          description,
          categoryId,
          basePrice: Number(basePrice),
          isActive,
          showExactStock,
        }),
      });
      if (pendingFiles.length) {
        const formData = new FormData();
        pendingFiles.forEach((file) => formData.append("files", file));
        const response = await fetch(
          `/api/admin/products/${product.id}/images`,
          { method: "POST", body: formData, credentials: "include" },
        );
        const result = (await response.json().catch(() => null)) as {
          error?: string;
          images?: ProductImageDto[];
        } | null;
        if (!response.ok) {
          throw new Error(result?.error ?? "Image upload failed.");
        }
        if (result?.images) setImages(result.images);
        setPendingFiles([]);
      }
      setBaseline({
        name,
        description,
        categoryId,
        basePrice,
        isActive,
        showExactStock,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setNotice({ tone: "success", message: "Product changes saved." });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Product changes could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  const sections: {
    id: Section;
    label: string;
    icon: typeof Info;
    dirty?: boolean;
  }[] = [
    { id: "general", label: "General", icon: Info, dirty: productDirty },
    {
      id: "images",
      label: `Images (${images.length + pendingFiles.length})`,
      icon: Images,
      dirty: pendingFiles.length > 0,
    },
    {
      id: "inventory",
      label: product.productType === "SIMPLE" ? "Inventory SKU" : "Variants",
      icon: Boxes,
      dirty: variantDirty,
    },
  ];

  const productActions = (
    <div className="admin-product-savebar">
      <span aria-live="polite">
        Product changes: <strong>{productChanges}</strong>
      </span>
      <Button
        type="button"
        variant="secondary"
        onClick={resetProduct}
        disabled={!productDirty || saving}
      >
        <Undo2 aria-hidden="true" className="mr-2 size-4" />
        Discard Product Changes
      </Button>
      <Button type="submit" disabled={!productDirty || saving}>
        <Save aria-hidden="true" className="mr-2 size-4" />
        {saving ? "Saving Product…" : "Save Product Changes"}
      </Button>
    </div>
  );

  return (
    <div id={`product-editor-${product.id}`} className="admin-product-editor">
      <nav
        className="admin-editor-tabs"
        role="tablist"
        aria-label="Product editor sections"
      >
        {sections.map(({ id, label, icon: Icon, dirty }) => (
          <button
            key={id}
            id={`product-${product.id}-${id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            aria-controls={`product-${product.id}-${id}-panel`}
            onClick={() => setActiveSection(id)}
          >
            <Icon aria-hidden="true" />
            {label}
            {dirty ? <span className="admin-tab-dirty">Unsaved</span> : null}
          </button>
        ))}
      </nav>

      <form onSubmit={saveProduct}>
        <section
          id={`product-${product.id}-general-panel`}
          role="tabpanel"
          aria-labelledby={`product-${product.id}-general-tab`}
          hidden={activeSection !== "general"}
          className="admin-editor-section"
        >
          <div className="admin-section-heading">
            <div>
              <h2>General Product information</h2>
              <p>
                Details, pricing, publication, and storefront stock display.
              </p>
            </div>
          </div>
          <div className="admin-general-grid">
            <label className="admin-field-name">
              Product name
              <input
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="admin-field-category">
              <AdminSelect
                label="Category"
                value={String(categoryId)}
                onChange={(value) => setCategoryId(Number(value))}
                options={categories.map((category) => ({
                  value: String(category.id),
                  label: category.name,
                }))}
                loading={!categories.length}
              />
            </div>
            <label className="admin-field-price">
              Base price
              <input
                required
                min="0.01"
                step="0.01"
                inputMode="decimal"
                type="number"
                value={basePrice}
                onChange={(event) => setBasePrice(event.target.value)}
              />
            </label>
            <div className="admin-field-status">
              <AdminSelect
                label="Publication status"
                value={isActive ? "published" : "unpublished"}
                onChange={(value) => setIsActive(value === "published")}
                options={[
                  { value: "published", label: "Published" },
                  { value: "unpublished", label: "Unpublished" },
                ]}
              />
            </div>
            <div className="admin-product-type-readonly">
              <span>Product type</span>
              <div>
                <strong>
                  {product.productType === "SIMPLE" ? "Simple" : "Configurable"}
                </strong>
                <LockKeyhole aria-hidden="true" />
                <small>Locked after creation</small>
              </div>
            </div>
            <AdminSwitch
              checked={showExactStock}
              onChange={setShowExactStock}
              label="Show exact stock"
              description="Show exact SKU quantities to storefront clients."
              className="admin-field-stock-display"
            />
            <label className="admin-field-description">
              Description
              <textarea
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <small>
                Use clear Product details that help clients buy confidently.
              </small>
            </label>
          </div>
          {notice ? (
            <p
              role={notice.tone === "error" ? "alert" : "status"}
              className={`admin-section-notice is-${notice.tone}`}
            >
              {notice.message}
            </p>
          ) : null}
          {productActions}
        </section>

        <section
          id={`product-${product.id}-images-panel`}
          role="tabpanel"
          aria-labelledby={`product-${product.id}-images-tab`}
          hidden={activeSection !== "images"}
          className="admin-editor-section"
        >
          <div className="admin-section-heading">
            <div>
              <h2>Product images</h2>
              <p>
                Upload, order, describe, and choose the storefront primary
                image.
              </p>
            </div>
          </div>
          <ProductImageManager
            productId={product.id}
            images={images}
            setImages={setImages}
            pendingFiles={pendingFiles}
            setPendingFiles={setPendingFiles}
            maxFileSizeBytes={5 * 1024 * 1024}
            maxImages={8}
            disabled={saving}
          />
          {notice ? (
            <p
              role={notice.tone === "error" ? "alert" : "status"}
              className={`admin-section-notice is-${notice.tone}`}
            >
              {notice.message}
            </p>
          ) : null}
          {productActions}
        </section>
      </form>

      <section
        id={`product-${product.id}-inventory-panel`}
        role="tabpanel"
        aria-labelledby={`product-${product.id}-inventory-tab`}
        hidden={activeSection !== "inventory"}
        className="admin-editor-section"
      >
        <VariantManager
          productId={product.id}
          initialProduct={product}
          onDirtyChange={setVariantDirty}
        />
      </section>
    </div>
  );
}
