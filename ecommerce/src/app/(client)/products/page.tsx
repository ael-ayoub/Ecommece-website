import { listProducts } from "@/services/product.service";
import { listCategories } from "@/services/category.service";
import Link from "next/link";
import { ProductCard } from "@/components/products/ProductCard";
import { CategoryFilter } from "@/components/products/CategoryFilter";
import { SearchBar } from "@/components/products/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import type { ProductDto } from "@/types/product";

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
    <main className="pb-12 text-stone-950">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Shop the collection
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {activeCategory ? activeCategory.name : "All Products"}
        </h1>
        <p className="mt-3 text-base leading-7 text-stone-600">
          Browse our available products and find the option that fits you.
        </p>
      </header>

      <section aria-label="Product search and filters" className="space-y-5">
        <SearchBar />
        <CategoryFilter
          categories={categories}
          activeSlug={searchParams.category}
          searchQuery={searchParams.q}
        />
      </section>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold">
            {activeCategory?.name ?? "Available products"}
          </h2>
          <p className="mt-1 text-sm text-stone-500" aria-live="polite">
            {total} {total === 1 ? "product" : "products"}
            {searchParams.q ? ` matching “${searchParams.q}”` : ""}
          </p>
        </div>
        {hasActiveCriteria && (
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Clear all filters
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <section className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
          <div
            aria-hidden="true"
            className="mb-5 grid size-14 place-items-center rounded-full bg-stone-100 text-2xl font-medium text-stone-500"
          >
            0
          </div>
          <h2 className="text-xl font-semibold">
            {hasActiveCriteria
              ? "No products match your selection"
              : "No products are available yet"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">
            {hasActiveCriteria
              ? "Try a different search or category, or clear the current filters to browse the full catalog."
              : "Please check back soon. New products will appear here when they become available."}
          </p>
          {hasActiveCriteria && (
            <Link
              href="/products"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-stone-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              View all products
            </Link>
          )}
        </section>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product: ProductDto) => (
              <ProductCard key={product.id} product={product} />
            ))}
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
