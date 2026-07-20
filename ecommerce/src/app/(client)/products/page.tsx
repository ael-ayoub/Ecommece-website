import { listProducts } from "@/services/product.service";
import { listCategories } from "@/services/category.service";
import Link from "next/link";
import { CategoryFilter } from "@/components/products/CategoryFilter";
import { SearchBar } from "@/components/products/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import { ProductGrid } from "@/components/products/ProductGrid";
import { StorefrontState } from "@/components/storefront/StorefrontState";
import { PackageSearch } from "lucide-react";

interface Props {
  searchParams: { category?: string; q?: string; page?: string };
}

export default async function ProductsPage({ searchParams }: Props) {
  const requestedPage = Number(searchParams.page ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [{ products, total, totalPages }, categories] = await Promise.all([
    listProducts({
      page,
      categorySlug: searchParams.category,
      search: searchParams.q,
    }),
    listCategories(),
  ]);

  const activeCategory = categories.find(
    (c) => c.slug === searchParams.category,
  );
  const hasActiveCriteria = Boolean(searchParams.category || searchParams.q);

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.q) params.set("q", searchParams.q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="pb-12">
      <header className="mb-8 max-w-2xl">
        <p className="client-eyebrow mb-2">Shop the collection</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          {activeCategory ? activeCategory.name : "All Products"}
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--client-text-secondary)]">
          Browse our available products and find the option that fits you.
        </p>
      </header>

      <section
        id="catalogue-search"
        aria-label="Product search and filters"
        className="space-y-5 scroll-mt-28"
      >
        <SearchBar />
        <CategoryFilter
          categories={categories}
          activeSlug={searchParams.category}
          searchQuery={searchParams.q}
        />
      </section>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--client-border-subtle)] pb-4">
        <div>
          <h2 className="text-lg font-semibold">
            {activeCategory?.name ?? "Available products"}
          </h2>
          <p
            className="mt-1 text-sm text-[var(--client-text-secondary)]"
            aria-live="polite"
          >
            {total} {total === 1 ? "product" : "products"}
            {searchParams.q ? ` matching “${searchParams.q}”` : ""}
          </p>
        </div>
        {hasActiveCriteria && (
          <Link
            href="/products"
            className="client-text-link text-sm font-semibold"
          >
            Clear all filters
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <StorefrontState
          icon={PackageSearch}
          title={
            hasActiveCriteria
              ? "No Products match your selection"
              : "No Products are available yet"
          }
          description={
            hasActiveCriteria
              ? "Try a different search or category, or clear the current filters to browse the full catalogue."
              : "Please check back soon. New Products will appear here when they become available."
          }
          actionHref={hasActiveCriteria ? "/products" : undefined}
          actionLabel={hasActiveCriteria ? "View all Products" : undefined}
        />
      ) : (
        <>
          <div className="mt-6">
            <ProductGrid products={products} />
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </>
      )}
    </main>
  );
}
