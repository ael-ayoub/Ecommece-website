"use client";

import Link from "next/link";
import { ChangeEvent, Fragment, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Filter,
  ImageIcon,
  MoreHorizontal,
  PackagePlus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type {
  CategoryDto,
  ProductDto,
  ProductListResponse,
} from "@/types/product";
import { AdminProductInlineEditor } from "@/components/admin/products/AdminProductInlineEditor";
import {
  AdminSelect,
  announceAdminDropdownOpen,
} from "@/components/admin/AdminSelect";
import {
  MAX_PRODUCT_IMPORT_BYTES,
  parseSimpleProductCsv,
  type SimpleProductImportRow,
} from "@/domain/product-import";

type Column =
  "type" | "category" | "price" | "inventory" | "availability" | "status";
const allColumns: { id: Column; label: string }[] = [
  { id: "type", label: "Type" },
  { id: "category", label: "Category" },
  { id: "price", label: "Price" },
  { id: "inventory", label: "SKU / Stock" },
  { id: "availability", label: "Availability" },
  { id: "status", label: "Status" },
];

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`admin-product-badge admin-product-badge--${tone}`}>
      {children}
    </span>
  );
}

function ProductThumbnail({ product }: { product: ProductDto }) {
  const [broken, setBroken] = useState(false);
  const src =
    product.imageRecords.find((image) => image.isPrimary)?.url ??
    product.images[0];
  return src && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className="admin-product-thumb"
    />
  ) : (
    <span className="admin-product-thumb admin-product-thumb--empty">
      <ImageIcon aria-hidden="true" />
    </span>
  );
}

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        aria-describedby="admin-modal-description"
      >
        <button
          ref={closeRef}
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X aria-hidden="true" />
        </button>
        <h2 id="admin-modal-title">{title}</h2>
        <p id="admin-modal-description">{description}</p>
        {children}
      </section>
    </div>
  );
}

function ImportDialog({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [rows, setRows] = useState<SimpleProductImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSummary(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".csv") ||
      file.size > MAX_PRODUCT_IMPORT_BYTES
    ) {
      setRows([]);
      setError("Choose a CSV file no larger than 256 KB.");
      return;
    }
    try {
      const parsed = parseSimpleProductCsv(await file.text());
      if (!parsed.length) throw new Error("The file has no Product rows.");
      setRows(parsed);
    } catch (reason) {
      setRows([]);
      setError(
        reason instanceof Error ? reason.message : "The CSV could not be read.",
      );
    }
  }
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{
        succeeded: number;
        failed: number;
        results: { row: number; success: boolean; error?: string }[];
      }>("/api/admin/products/import", {
        method: "POST",
        body: JSON.stringify({
          rows: rows.map((row) => ({
            row: row.row,
            name: row.name,
            description: row.description,
            basePrice: row.basePrice,
            category: row.category,
            sku: row.sku,
            stock: row.stock,
            isActive: row.isActive,
          })),
        }),
      });
      setRows((current) =>
        current.map((row) => ({
          ...row,
          error: response.results.find(
            (item) => item.row === row.row && !item.success,
          )?.error,
        })),
      );
      setSummary(`${response.succeeded} imported; ${response.failed} failed.`);
      if (response.succeeded) onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  const invalid = rows.filter((row) => row.error).length;
  const template =
    "name,description,base_price,category,sku,stock,is_active\nExample Product,Product description,29.99,Category Name,EXAMPLE-001,10,false\n";
  return (
    <Modal
      title="Import Simple Products"
      description="Preview a bounded CSV before creating Products. Unknown Categories and duplicate SKUs are rejected."
      onClose={onClose}
    >
      <a
        className="admin-import-template"
        download="simple-products-template.csv"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}
      >
        <Download aria-hidden="true" /> Download CSV template
      </a>
      <label className="admin-import-file">
        CSV file
        <input type="file" accept=".csv,text/csv" onChange={choose} />
      </label>
      {error ? (
        <p role="alert" className="admin-error">
          {error}
        </p>
      ) : null}
      {rows.length ? (
        <div className="admin-import-preview">
          <strong>
            {rows.length - invalid} valid · {invalid} invalid
          </strong>
          {rows.map((row) => (
            <p key={row.row}>
              Row {row.row}: {row.name || "Unnamed"}{" "}
              {row.error ? <span>— {row.error}</span> : "— Ready"}
            </p>
          ))}
        </div>
      ) : null}
      {summary ? <p role="status">{summary}</p> : null}
      <div className="admin-modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button onClick={submit} disabled={!rows.length || invalid > 0 || busy}>
          {busy ? "Importing…" : `Import ${rows.length} Products`}
        </Button>
      </div>
    </Modal>
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingEditor, setPendingEditor] = useState<number | null | undefined>(
    undefined,
  );
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: "delete" | "publish" | "unpublish";
    ids: number[];
    label: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<Column>>(
    new Set(allColumns.map((column) => column.id)),
  );

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest(".admin-toolbar-popover")) {
        setFiltersOpen(false);
        setColumnsOpen(false);
      }
      if (!target.closest(".admin-action-cell")) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  useEffect(() => {
    setFiltersOpen(false);
    setColumnsOpen(false);
    setOpenMenu(null);
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem("admin-product-columns");
    if (saved) setVisibleColumns(new Set(JSON.parse(saved) as Column[]));
  }, []);
  function setParam(name: string, value?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  }
  const apiParams = new URLSearchParams(searchParams.toString());
  apiParams.set("all", "1");
  apiParams.set("pageSize", searchParams.get("pageSize") ?? "10");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "products", apiParams.toString()],
    queryFn: () =>
      apiFetch<ProductListResponse>(`/api/products?${apiParams.toString()}`),
  });
  const { data: categoryData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<{ categories: CategoryDto[] }>("/api/categories"),
  });
  const products = data?.products ?? [];
  const categories = categoryData?.categories ?? [];
  const allSelected =
    products.length > 0 &&
    products.every((product) => selected.has(product.id));
  const someSelected = products.some((product) => selected.has(product.id));

  function toggleColumn(column: Column) {
    const next = new Set(visibleColumns);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    setVisibleColumns(next);
    localStorage.setItem(
      "admin-product-columns",
      JSON.stringify(Array.from(next)),
    );
  }
  function toggleEditor(id: number) {
    if (expanded === id) {
      if (editorDirty) {
        setPendingEditor(null);
        return;
      }
      setExpanded(null);
      return;
    }
    if (editorDirty) {
      setPendingEditor(id);
      return;
    }
    setExpanded(id);
    setOpenMenu(null);
    setNotice(null);
  }
  async function perform(
    action: "delete" | "publish" | "unpublish",
    ids: number[],
  ) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await apiFetch<{
        succeeded: number;
        failed: number;
        results: { productId: number; success: boolean; error?: string }[];
      }>("/api/admin/products/bulk", {
        method: "POST",
        body: JSON.stringify({ action, productIds: ids }),
      });
      const failures = response.results.filter((result) => !result.success);
      setNotice(
        `${response.succeeded} Product${response.succeeded === 1 ? "" : "s"} updated.${failures.length ? ` ${failures.length} failed: ${failures.map((item) => `#${item.productId} ${item.error}`).join("; ")}` : ""}`,
      );
      setSelected(new Set(failures.map((item) => item.productId)));
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Product action failed.",
      );
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }
  const rangeStart = data?.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const rangeEnd = data
    ? Math.min(data.total, rangeStart + products.length - 1)
    : 0;

  return (
    <main className="admin-products-page">
      <header className="admin-products-heading">
        <div className="admin-products-title">
          <span>
            <Boxes aria-hidden="true" />
          </span>
          <div>
            <h1>Products</h1>
            <p>Manage your products, inventory, and pricing.</p>
          </div>
        </div>
        <div className="admin-products-header-actions">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload aria-hidden="true" /> Import
          </Button>
          <Link href="/admin/products/new" className="admin-primary-link">
            <PackagePlus aria-hidden="true" /> Create Product
          </Link>
        </div>
      </header>

      <section className="admin-products-toolbar" aria-label="Product filters">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setParam("q", query.trim());
          }}
          className="admin-product-search"
        >
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="product-search">
            Search Products
          </label>
          <input
            id="product-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID, SKU, category…"
          />
          <button type="submit" className="sr-only">
            Search
          </button>
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setParam("q");
              }}
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </form>
        <AdminSelect
          ariaLabel="Filter by Category"
          value={searchParams.get("category") ?? ""}
          loading={!categoryData}
          onChange={(value) => setParam("category", value)}
          options={[
            { value: "", label: "All Categories" },
            ...categories.map((category) => ({
              value: category.slug,
              label: category.name,
            })),
          ]}
        />
        <AdminSelect
          ariaLabel="Filter by Product type"
          value={searchParams.get("type") ?? ""}
          onChange={(value) => setParam("type", value)}
          options={[
            { value: "", label: "All Types" },
            { value: "SIMPLE", label: "Simple" },
            { value: "CONFIGURABLE", label: "Configurable" },
          ]}
        />
        <AdminSelect
          ariaLabel="Filter by publication status"
          value={searchParams.get("status") ?? ""}
          onChange={(value) => setParam("status", value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "published", label: "Published" },
            { value: "unpublished", label: "Unpublished" },
          ]}
        />
        <div className="admin-toolbar-popover">
          <Button
            variant="secondary"
            aria-expanded={filtersOpen}
            onClick={() => {
              announceAdminDropdownOpen("filters");
              setColumnsOpen(false);
              setOpenMenu(null);
              setFiltersOpen(!filtersOpen);
            }}
          >
            <Filter aria-hidden="true" /> Filters
          </Button>
          {filtersOpen ? (
            <div className="admin-popover">
              <AdminSelect
                label="Availability"
                value={searchParams.get("availability") ?? ""}
                onChange={(value) => setParam("availability", value)}
                options={[
                  { value: "", label: "Any availability" },
                  { value: "available", label: "Available" },
                  { value: "out_of_stock", label: "Out of stock" },
                  { value: "unavailable", label: "Unavailable" },
                ]}
              />
              <AdminSelect
                label="Sort"
                value={searchParams.get("sort") ?? "newest"}
                onChange={(value) => setParam("sort", value)}
                options={[
                  { value: "newest", label: "Newest" },
                  { value: "oldest", label: "Oldest" },
                  { value: "name", label: "Name" },
                  { value: "price", label: "Base price" },
                  { value: "status", label: "Status" },
                ]}
              />
              <div className="admin-price-filter">
                <label>
                  Min price
                  <input
                    type="number"
                    min="0"
                    value={searchParams.get("minPrice") ?? ""}
                    onChange={(e) => setParam("minPrice", e.target.value)}
                  />
                </label>
                <label>
                  Max price
                  <input
                    type="number"
                    min="0"
                    value={searchParams.get("maxPrice") ?? ""}
                    onChange={(e) => setParam("maxPrice", e.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>
        <div className="admin-toolbar-popover">
          <Button
            variant="secondary"
            aria-expanded={columnsOpen}
            onClick={() => {
              announceAdminDropdownOpen("columns");
              setFiltersOpen(false);
              setOpenMenu(null);
              setColumnsOpen(!columnsOpen);
            }}
          >
            <Columns3 aria-hidden="true" /> Columns
          </Button>
          {columnsOpen ? (
            <div className="admin-popover admin-column-menu">
              {allColumns.map((column) => (
                <label key={column.id}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(column.id)}
                    onChange={() => toggleColumn(column.id)}
                  />
                  {column.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div
        className="admin-bulk-toolbar"
        role="region"
        aria-label="Bulk Product actions"
      >
        <strong>{selected.size} selected</strong>
        {selected.size > 0 ? (
          <button onClick={() => setSelected(new Set())}>Clear</button>
        ) : null}
        <Button
          variant="secondary"
          disabled={busy || selected.size === 0}
          onClick={() =>
            setConfirmAction({
              action: "publish",
              ids: Array.from(selected),
              label: "Publish selected Products?",
            })
          }
        >
          Publish
        </Button>
        <Button
          variant="secondary"
          disabled={busy || selected.size === 0}
          onClick={() =>
            setConfirmAction({
              action: "unpublish",
              ids: Array.from(selected),
              label: "Unpublish selected Products?",
            })
          }
        >
          Unpublish
        </Button>
        <Button
          variant="danger"
          disabled={busy || selected.size === 0}
          onClick={() =>
            setConfirmAction({
              action: "delete",
              ids: Array.from(selected),
              label: `Delete ${selected.size} selected Products according to the current deletion policy?`,
            })
          }
        >
          Delete
        </Button>
      </div>
      {notice ? (
        <p role="status" className="admin-products-notice">
          {notice}
        </p>
      ) : null}

      {isLoading ? (
        <div className="admin-products-skeleton" aria-label="Loading Products">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : isError ? (
        <div className="admin-products-state">
          <h2>Products could not be loaded</h2>
          <p>Try the request again. No Product data was changed.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      ) : !products.length ? (
        <div className="admin-products-state">
          <Boxes aria-hidden="true" />
          <h2>
            {searchParams.toString()
              ? "No Products match these filters"
              : "No Products yet"}
          </h2>
          <p>
            Clear filters or create a Product to begin managing the catalog.
          </p>
          <Button onClick={() => router.replace(pathname)}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="admin-products-table-wrap">
            <table className="admin-products-table">
              <colgroup>
                <col className="admin-col-checkbox" />
                <col className="admin-col-product" />
                {visibleColumns.has("type") && (
                  <col className="admin-col-type" />
                )}
                {visibleColumns.has("category") && (
                  <col className="admin-col-category" />
                )}
                {visibleColumns.has("price") && (
                  <col className="admin-col-price" />
                )}
                {visibleColumns.has("inventory") && (
                  <col className="admin-col-inventory" />
                )}
                {visibleColumns.has("availability") && (
                  <col className="admin-col-availability" />
                )}
                {visibleColumns.has("status") && (
                  <col className="admin-col-status" />
                )}
                <col className="admin-col-actions" />
                <col className="admin-col-chevron" />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all visible Products"
                      checked={allSelected}
                      ref={(node) => {
                        if (node)
                          node.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() =>
                        setSelected(
                          allSelected
                            ? new Set()
                            : new Set(products.map((product) => product.id)),
                        )
                      }
                    />
                  </th>
                  <th>Product</th>
                  {visibleColumns.has("type") && <th>Type</th>}
                  {visibleColumns.has("category") && <th>Category</th>}
                  {visibleColumns.has("price") && <th>Price</th>}
                  {visibleColumns.has("inventory") && <th>SKU / Stock</th>}
                  {visibleColumns.has("availability") && <th>Availability</th>}
                  {visibleColumns.has("status") && <th>Status</th>}
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                  <th>
                    <span className="sr-only">Expand</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <Fragment key={product.id}>
                    <tr
                      key={product.id}
                      className={expanded === product.id ? "is-expanded" : ""}
                      onClick={(event) => {
                        if (
                          !(event.target as HTMLElement).closest(
                            "button,a,input,select,textarea,label",
                          )
                        )
                          toggleEditor(product.id);
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name}`}
                          checked={selected.has(product.id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(product.id)) next.delete(product.id);
                              else next.add(product.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="admin-product-cell">
                        <div className="admin-product-identity">
                          <ProductThumbnail product={product} />
                          <div>
                            <strong>{product.name}</strong>
                            <span>Product #{product.id}</span>
                          </div>
                        </div>
                      </td>
                      {visibleColumns.has("type") && (
                        <td>
                          <Badge
                            tone={
                              product.productType === "CONFIGURABLE"
                                ? "purple"
                                : "info"
                            }
                          >
                            {product.productType === "SIMPLE"
                              ? "Simple"
                              : "Configurable"}
                          </Badge>
                        </td>
                      )}
                      {visibleColumns.has("category") && (
                        <td title={product.category.name}>
                          {product.category.name}
                        </td>
                      )}
                      {visibleColumns.has("price") && (
                        <td>
                          {product.minPrice !== product.maxPrice
                            ? `${formatCurrency(product.minPrice)} – ${formatCurrency(product.maxPrice)}`
                            : formatCurrency(product.maxPrice)}
                        </td>
                      )}
                      {visibleColumns.has("inventory") && (
                        <td>
                          {product.skuCount} SKU
                          {product.skuCount === 1 ? "" : "s"}
                          <span className="admin-cell-secondary">
                            {product.totalStock} units
                          </span>
                        </td>
                      )}
                      {visibleColumns.has("availability") && (
                        <td>
                          <Badge
                            tone={
                              product.availability === "AVAILABLE"
                                ? "success"
                                : product.availability === "OUT_OF_STOCK"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {product.availability === "AVAILABLE"
                              ? "Available"
                              : product.availability === "OUT_OF_STOCK"
                                ? "Out of stock"
                                : "Unavailable"}
                          </Badge>
                        </td>
                      )}
                      {visibleColumns.has("status") && (
                        <td>
                          <Badge
                            tone={product.isActive ? "success" : "neutral"}
                          >
                            {product.isActive ? "Published" : "Unpublished"}
                          </Badge>
                        </td>
                      )}
                      <td className="admin-action-cell">
                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={openMenu === product.id}
                          aria-label={`Actions for ${product.name}`}
                          onClick={() => {
                            announceAdminDropdownOpen("row-actions");
                            setFiltersOpen(false);
                            setColumnsOpen(false);
                            setOpenMenu(
                              openMenu === product.id ? null : product.id,
                            );
                          }}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </button>
                        {openMenu === product.id ? (
                          <div role="menu" className="admin-row-menu">
                            <Link
                              role="menuitem"
                              href={`/products/${product.id}`}
                            >
                              View on storefront
                            </Link>
                            <button
                              role="menuitem"
                              onClick={() =>
                                setConfirmAction({
                                  action: product.isActive
                                    ? "unpublish"
                                    : "publish",
                                  ids: [product.id],
                                  label: `${product.isActive ? "Unpublish" : "Publish"} “${product.name}”?`,
                                })
                              }
                            >
                              {product.isActive ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              role="menuitem"
                              className="danger"
                              onClick={() =>
                                setConfirmAction({
                                  action: "delete",
                                  ids: [product.id],
                                  label: `Delete “${product.name}” according to the current deletion policy?`,
                                })
                              }
                            >
                              Delete Product
                            </button>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-expand-button"
                          aria-expanded={expanded === product.id}
                          aria-controls={`product-editor-${product.id}`}
                          aria-label={`${expanded === product.id ? "Collapse" : "Expand"} editor for ${product.name}`}
                          onClick={() => toggleEditor(product.id)}
                        >
                          <ChevronDown aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                    {expanded === product.id ? (
                      <tr
                        key={`${product.id}-editor`}
                        className="admin-editor-row"
                      >
                        <td colSpan={visibleColumns.size + 4}>
                          <AdminProductInlineEditor
                            product={product}
                            categories={categories}
                            onDirtyChange={setEditorDirty}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-product-cards">
            {products.map((product) => (
              <article key={product.id}>
                <div className="admin-mobile-product-head">
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.name}`}
                    checked={selected.has(product.id)}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(product.id)) next.delete(product.id);
                        else next.add(product.id);
                        return next;
                      })
                    }
                  />
                  <ProductThumbnail product={product} />
                  <div>
                    <h2>{product.name}</h2>
                    <span>#{product.id}</span>
                  </div>
                  <button
                    aria-expanded={expanded === product.id}
                    aria-controls={`product-editor-${product.id}`}
                    onClick={() => toggleEditor(product.id)}
                  >
                    <ChevronDown />
                  </button>
                </div>
                <div className="admin-mobile-product-meta">
                  <Badge
                    tone={
                      product.productType === "CONFIGURABLE" ? "purple" : "info"
                    }
                  >
                    {product.productType === "SIMPLE"
                      ? "Simple"
                      : "Configurable"}
                  </Badge>
                  <strong>{formatCurrency(product.minPrice)}</strong>
                  <span>{product.totalStock} units</span>
                  <Badge tone={product.isActive ? "success" : "neutral"}>
                    {product.isActive ? "Published" : "Unpublished"}
                  </Badge>
                </div>
                {expanded === product.id ? (
                  <AdminProductInlineEditor
                    product={product}
                    categories={categories}
                    onDirtyChange={setEditorDirty}
                  />
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}
      {data && data.total > 0 ? (
        <nav
          className="admin-products-pagination"
          aria-label="Product pagination"
        >
          <p>
            Showing {rangeStart} to {rangeEnd} of {data.total} products
          </p>
          <label>
            Rows
            <AdminSelect
              ariaLabel="Rows per page"
              value={String(data.pageSize)}
              onChange={(value) => setParam("pageSize", value)}
              options={[5, 10, 20, 50].map((size) => ({
                value: String(size),
                label: String(size),
              }))}
              menuWidth={112}
            />
          </label>
          <button
            aria-label="Previous page"
            disabled={data.page <= 1}
            onClick={() => setParam("page", String(data.page - 1))}
          >
            <ChevronLeft />
          </button>
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <button
            aria-label="Next page"
            disabled={data.page >= data.totalPages}
            onClick={() => setParam("page", String(data.page + 1))}
          >
            <ChevronRight />
          </button>
        </nav>
      ) : null}
      {importOpen ? (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onComplete={() =>
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] })
          }
        />
      ) : null}
      {confirmAction ? (
        <Modal
          title={confirmAction.label}
          description={
            confirmAction.action === "delete"
              ? "Deletion removes eligible Products and their SKUs. Products protected by active orders will fail and remain selected; historical snapshots remain unchanged."
              : "This changes storefront publication only. Inventory and Product data are preserved."
          }
          onClose={() => setConfirmAction(null)}
        >
          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction.action === "delete" ? "danger" : "primary"}
              disabled={busy}
              onClick={() => perform(confirmAction.action, confirmAction.ids)}
            >
              {busy ? "Working…" : "Confirm"}
            </Button>
          </div>
        </Modal>
      ) : null}
      {pendingEditor !== undefined ? (
        <Modal
          title="Discard unsaved editor changes?"
          description="This Product has unsaved Product or Inventory changes. Discarding closes this editor without sending those drafts to the server."
          onClose={() => setPendingEditor(undefined)}
        >
          <div className="admin-modal-actions">
            <Button
              variant="secondary"
              onClick={() => setPendingEditor(undefined)}
            >
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const target = pendingEditor;
                setPendingEditor(undefined);
                setEditorDirty(false);
                setExpanded(target);
                setOpenMenu(null);
                setNotice(null);
              }}
            >
              Discard unsaved changes
            </Button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
