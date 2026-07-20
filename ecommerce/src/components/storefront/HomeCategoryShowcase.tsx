import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import type { CategoryDto, ProductDto } from "@/types/product";
import { ProductImage } from "@/components/products/ProductImage";
import { SectionHeading } from "@/components/storefront/SectionHeading";

export function HomeCategoryShowcase({
  categories,
  products,
}: {
  categories: CategoryDto[];
  products: ProductDto[];
}) {
  if (!categories.length) return null;

  const visualByCategory = new Map<number, ProductDto>();
  for (const product of products) {
    const current = visualByCategory.get(product.categoryId);
    if (!current || (!current.images[0] && product.images[0])) {
      visualByCategory.set(product.categoryId, product);
    }
  }

  return (
    <section
      className="client-home-categories"
      aria-labelledby="category-heading"
    >
      <SectionHeading
        eyebrow="Shop by category"
        title="Start with what you need"
        description="Explore the catalogue’s real categories and see how many published Products are available in each."
        action={
          <Link href="/products" className="client-text-link font-semibold">
            Browse the full catalogue
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      />
      <div className="client-category-grid">
        {categories.slice(0, 8).map((category) => {
          const product = visualByCategory.get(category.id);
          const image = product?.images[0];
          const count = category._count?.products ?? 0;
          return (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className="client-category-card"
            >
              <div className="client-category-media">
                {image && product ? (
                  <ProductImage
                    src={image}
                    alt=""
                    className="client-category-image"
                  />
                ) : (
                  <div className="client-category-fallback" aria-hidden="true">
                    <ImageIcon />
                  </div>
                )}
              </div>
              <div className="client-category-content">
                <div>
                  <h3>{category.name}</h3>
                  <p>
                    {count} Product{count === 1 ? "" : "s"}
                  </p>
                </div>
                <span aria-hidden="true">
                  <ArrowRight />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
