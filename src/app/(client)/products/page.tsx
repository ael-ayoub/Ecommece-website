import { listProducts } from "@/services/product.service";
import { listCategories } from "@/services/category.service";
import { ProductCard } from "@/components/products/ProductCard";
import { CategoryFilter } from "@/components/products/CategoryFilter";
import { SearchBar } from "@/components/products/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import type { ProductDto } from "@/types/product";

interface Props {
  searchParams: { category?: string; q?: string; page?: string };
}

export default async function ProductsPage({ searchParams }: Props) {
  const page = searchParams.page ? Number(searchParams.page) : 1;

  const [{ products, totalPages }, categories] = await Promise.all([
    listProducts({
      page,
      categorySlug: searchParams.category,
      search: searchParams.q,
    }),
    listCategories(),
  ]);

  const activeCategory = categories.find((c) => c.slug === searchParams.category);

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.q) params.set("q", searchParams.q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">
          {activeCategory ? activeCategory.name : "All products"}
        </h1>
        <SearchBar />
      </div>

      {searchParams.q && (
        <p className="mb-4 text-sm text-gray-600">Results for: &quot;{searchParams.q}&quot;</p>
      )}

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-[200px_1fr]">
        <CategoryFilter categories={categories} activeSlug={searchParams.category} />

        <div>
          {products.length === 0 ? (
            <p className="py-16 text-center text-gray-500">
              {searchParams.q
                ? "No products match your search."
                : "No products in this category yet."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product: ProductDto) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
