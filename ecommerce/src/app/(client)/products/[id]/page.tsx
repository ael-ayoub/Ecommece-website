import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, ChevronRight, RotateCcw } from "lucide-react";
import { getProductById } from "@/services/product.service";
import { VariantSelector } from "@/components/products/VariantSelector";
import { ProductGallery } from "@/components/products/ProductGallery";
import { NotFoundError } from "@/lib/errors";

interface Props {
  params: { id: string };
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await getProductById(Number(params.id)).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });

  if (!product) notFound();

  const orderedImages =
    product.imageRecords.length > 0
      ? product.imageRecords
      : product.images.map((url, position) => ({
          id: -1 - position,
          url,
          altText: null,
        }));

  return (
    <main className="pb-12">
      <nav aria-label="Breadcrumb" className="mb-7">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--client-text-secondary)]">
          <li>
            <Link href="/" className="client-text-link min-h-0">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li>
            <Link
              href={`/products?category=${encodeURIComponent(product.category.slug)}`}
              className="client-text-link min-h-0"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li
            aria-current="page"
            className="font-medium text-[var(--client-text-primary)]"
          >
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)] lg:items-start xl:gap-16">
        <ProductGallery images={orderedImages} productName={product.name} />

        <section
          aria-labelledby="product-title"
          className="lg:sticky lg:top-24"
        >
          <p className="client-eyebrow">{product.category.name}</p>
          <h1
            id="product-title"
            className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {product.name}
          </h1>

          <div className="mt-6 rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 shadow-[var(--client-shadow-md)] sm:p-6">
            {product.variants.length > 0 ? (
              <VariantSelector
                productId={product.id}
                productName={product.name}
                productImage={product.images[0] ?? null}
                variants={product.variants}
                basePrice={product.basePrice.toString()}
                productType={product.productType}
                showExactStock={product.showExactStock}
              />
            ) : (
              <div
                role="status"
                className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
              >
                This Product is currently unavailable.
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl border border-[var(--client-border-subtle)] p-4">
              <Banknote
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[var(--client-accent)]"
              />
              <div>
                <h2 className="text-sm font-semibold">Cash on Delivery</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--client-text-secondary)]">
                  Pay when you receive your order.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-[var(--client-border-subtle)] p-4">
              <RotateCcw
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[var(--client-accent)]"
              />
              <div>
                <h2 className="text-sm font-semibold">Pending orders</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--client-text-secondary)]">
                  Account holders can cancel while an order is Pending.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="description-heading"
        className="mt-14 border-t border-[var(--client-border-subtle)] pt-10"
      >
        <p className="client-eyebrow">Product information</p>
        <h2 id="description-heading" className="mt-2 text-2xl font-semibold">
          Description
        </h2>
        <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-8 text-[var(--client-text-secondary)]">
          {product.description ||
            "No description is available for this Product."}
        </p>
      </section>
    </main>
  );
}
