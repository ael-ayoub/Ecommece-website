"use client";

import { Boxes } from "lucide-react";
import { ProductImage } from "@/components/products/ProductImage";

export function FeaturedProduct3DFallback({
  image,
  productName,
  loading = false,
}: {
  image?: string;
  productName: string;
  loading?: boolean;
}) {
  return (
    <div
      className={`client-featured-3d-fallback ${loading ? "is-loading" : ""}`}
      aria-label={
        loading
          ? `Loading interactive model for ${productName}`
          : `Featured Product: ${productName}`
      }
      role="img"
    >
      {image ? (
        <ProductImage
          src={image}
          alt={productName}
          className="client-hero-product-image"
        />
      ) : (
        <div className="client-hero-product-fallback">
          <Boxes aria-hidden="true" />
          <span>Image unavailable</span>
        </div>
      )}
      {loading ? (
        <span className="client-featured-3d-loading" aria-hidden="true">
          Loading 3D view…
        </span>
      ) : null}
    </div>
  );
}
