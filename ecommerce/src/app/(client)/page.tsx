import Link from "next/link";
import { ArrowRight, Banknote, Boxes, Search } from "lucide-react";
import { listCategories } from "@/services/category.service";
import { listProducts } from "@/services/product.service";
import { ProductGrid } from "@/components/products/ProductGrid";
import { SectionHeading } from "@/components/storefront/SectionHeading";
import { StorefrontContainer } from "@/components/storefront/StorefrontContainer";

export default async function Home() {
  const [{ products }, categories] = await Promise.all([
    listProducts({ page: 1, pageSize: 8 }),
    listCategories(),
  ]);

  return (
    <main className="client-full-bleed">
      <section className="overflow-hidden border-b border-[var(--client-border-subtle)]">
        <StorefrontContainer className="relative grid gap-10 py-12 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-16 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="client-eyebrow">A clearer way to shop</p>
            <h1 className="client-display-title mt-3 text-balance">
              Find the right Product, then choose exactly what fits.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--client-text-secondary)] sm:text-lg">
              Explore the current catalogue with transparent prices, real SKU
              availability, and secure checkout for guests or account holders.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className="client-button-primary">
                Browse Products
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/products#catalogue-search"
                className="client-button-secondary"
              >
                <Search aria-hidden="true" className="size-4" />
                Search the catalogue
              </Link>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto hidden aspect-[4/3] w-full max-w-lg md:block"
          >
            <div className="absolute inset-x-8 inset-y-4 rotate-2 rounded-[2rem] border border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] shadow-[var(--client-shadow-lg)]" />
            <div className="absolute inset-x-16 inset-y-10 -rotate-3 rounded-[1.75rem] bg-[var(--client-surface-elevated)] shadow-[var(--client-shadow-md)]" />
            <div className="absolute inset-x-24 inset-y-16 grid place-items-center rounded-[1.5rem] bg-[var(--client-text-primary)] text-white shadow-[var(--client-shadow-lg)]">
              <Boxes className="size-16 stroke-[1.25]" />
            </div>
          </div>
        </StorefrontContainer>
      </section>

      {categories.length > 0 && (
        <section className="py-12 sm:py-16" aria-labelledby="category-heading">
          <StorefrontContainer>
            <SectionHeading
              eyebrow="Shop by category"
              title="Start with what you need"
              description="Use the catalogue’s real categories to narrow your search."
            />
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 8).map((category, index) => (
                <Link
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  className="group flex min-h-28 flex-col justify-between rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 shadow-[var(--client-shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--client-border-strong)] hover:shadow-[var(--client-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span className="text-xs font-semibold tabular-nums text-[var(--client-text-secondary)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex items-center justify-between gap-3 font-semibold">
                    {category.name}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </StorefrontContainer>
        </section>
      )}

      <section
        className="border-y border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] py-12 sm:py-16"
        aria-labelledby="latest-products-heading"
      >
        <StorefrontContainer>
          <SectionHeading
            eyebrow="Latest catalogue"
            title="Recently added Products"
            description="The newest published Products, using current prices, images, and availability."
            action={
              <Link href="/products" className="client-text-link font-semibold">
                View all Products
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          />
          {products.length > 0 ? (
            <div className="mt-8">
              <ProductGrid products={products} />
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-[var(--client-border-strong)] bg-[var(--client-surface)] px-6 py-12 text-center">
              <h2 className="font-semibold">No published Products yet</h2>
              <p className="mt-2 text-sm text-[var(--client-text-secondary)]">
                Products will appear here when they become available.
              </p>
            </div>
          )}
        </StorefrontContainer>
      </section>

      <section className="py-10">
        <StorefrontContainer>
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-6 shadow-[var(--client-shadow-sm)] sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--client-accent-soft)] text-[var(--client-accent)]">
              <Banknote aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Cash on Delivery</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--client-text-secondary)]">
                Payment is collected when you receive your order.
              </p>
            </div>
          </div>
        </StorefrontContainer>
      </section>
    </main>
  );
}
