import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCategories } from "@/services/category.service";
import { listProducts } from "@/services/product.service";
import { ProductGrid } from "@/components/products/ProductGrid";
import { SectionHeading } from "@/components/storefront/SectionHeading";
import { StorefrontContainer } from "@/components/storefront/StorefrontContainer";
import { HomeHero } from "@/components/storefront/HomeHero";
import { HomeCategoryShowcase } from "@/components/storefront/HomeCategoryShowcase";
import { HomeTrustStrip } from "@/components/storefront/HomeTrustStrip";

export default async function Home() {
  const [{ products }, categories] = await Promise.all([
    listProducts({ page: 1, pageSize: 50 }),
    listCategories(),
  ]);
  const featuredProduct =
    products.find((product) => product.images.length > 0) ?? products[0];

  return (
    <main className="client-full-bleed client-home">
      <StorefrontContainer className="client-home-hero-wrap">
        <HomeHero featuredProduct={featuredProduct} />
      </StorefrontContainer>

      <StorefrontContainer>
        <HomeCategoryShowcase categories={categories} products={products} />
        <HomeTrustStrip />
      </StorefrontContainer>

      <section
        className="client-home-latest"
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
              <ProductGrid products={products.slice(0, 8)} />
            </div>
          ) : (
            <div className="client-home-empty">
              <h2>No published Products yet</h2>
              <p>Products will appear here when they become available.</p>
            </div>
          )}
        </StorefrontContainer>
      </section>
    </main>
  );
}
