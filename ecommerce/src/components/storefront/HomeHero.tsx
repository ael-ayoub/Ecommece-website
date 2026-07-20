import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Boxes,
  Search,
  ShieldCheck,
  Tags,
} from "lucide-react";
import type { ProductDto } from "@/types/product";
import { formatCurrency } from "@/lib/format";
import { FeaturedProduct3D } from "@/components/storefront/FeaturedProduct3D";

const benefits = [
  {
    label: "Secure Checkout",
    description: "Protected order submission.",
    icon: ShieldCheck,
  },
  {
    label: "Real Stock",
    description: "Availability comes from active SKUs.",
    icon: Boxes,
  },
  {
    label: "Transparent Prices",
    description: "Current Product and SKU pricing.",
    icon: Tags,
  },
  {
    label: "Cash on Delivery",
    description: "Pay when your order arrives.",
    icon: Banknote,
  },
] as const;

export function HomeHero({
  featuredProduct,
  modelAvailable,
}: {
  featuredProduct?: ProductDto;
  modelAvailable: boolean;
}) {
  const image = featuredProduct?.images[0];

  return (
    <section className="client-home-hero" aria-labelledby="home-hero-title">
      <div className="client-hero-decoration" aria-hidden="true" />

      <div className="client-hero-copy">
        <p className="client-hero-eyebrow">A clearer way to shop</p>
        <h1 id="home-hero-title">
          Find the right product, then choose <span>exactly what fits.</span>
        </h1>
        <p className="client-hero-description">
          Explore transparent prices and real SKU availability, then use secure
          guest or account checkout with Cash on Delivery.
        </p>
        <div className="client-hero-actions">
          <Link href="/products" className="client-hero-primary">
            Browse Products
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            href="/products#catalogue-search"
            className="client-hero-secondary"
          >
            <Search aria-hidden="true" />
            Search the catalogue
          </Link>
        </div>
      </div>

      <div className="client-hero-product">
        <div className="client-hero-product-frame">
          <span className="client-hero-frame-line" aria-hidden="true" />
          {featuredProduct ? (
            <div className="client-hero-product-link">
              <div className="client-hero-product-media">
                <FeaturedProduct3D
                  image={image}
                  productName={featuredProduct.name}
                  modelAvailable={modelAvailable}
                />
              </div>
              <Link
                href={`/products/${featuredProduct.id}`}
                className="client-hero-product-details"
                aria-label={`View featured Product ${featuredProduct.name}`}
              >
                <div>
                  <p>{featuredProduct.category.name}</p>
                  <h2>{featuredProduct.name}</h2>
                </div>
                <strong>
                  {featuredProduct.minPrice !== featuredProduct.maxPrice
                    ? `From ${formatCurrency(featuredProduct.minPrice)}`
                    : formatCurrency(featuredProduct.minPrice)}
                </strong>
              </Link>
            </div>
          ) : (
            <div className="client-hero-product-empty">
              <Boxes aria-hidden="true" />
              <p>Published Products will appear here.</p>
            </div>
          )}
          <div className="client-hero-plinth" aria-hidden="true" />
        </div>
      </div>

      <div className="client-hero-benefits" aria-label="Shopping benefits">
        {benefits.map(({ label, description, icon: Icon }) => (
          <div key={label} className="client-hero-benefit">
            <span>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <h2>{label}</h2>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
