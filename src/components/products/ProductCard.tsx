"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { ProductDto } from "@/types/product";

export function ProductCard({ product }: { product: ProductDto }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const activeVariants = product.variants.filter((v) => v.isActive && v.stockQuantity > 0);
  const singleVariant = activeVariants.length === 1 ? activeVariants[0] : null;
  const inStock = activeVariants.length > 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    // Only ever reachable when exactly one active in-stock variant exists —
    // otherwise the card shows "Select Options" instead (see below), so a
    // wrong/ambiguous variant can never be silently added from the card.
    if (!singleVariant) return;

    addItem(
      {
        id: `${product.id}:${singleVariant.id}`,
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] ?? null,
        variantId: singleVariant.id,
        variantLabel: singleVariant.variantLabel,
        unitPrice: Number((singleVariant.price ?? product.basePrice).toString()),
        stockQuantity: singleVariant.stockQuantity,
      },
      1,
    );
    setAdded(true);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
      <Link href={`/products/${product.id}`}>
        <div className="flex aspect-square items-center justify-center bg-gray-100 text-gray-400">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-1 p-4 pb-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {product.category.name}
          </span>
          <h3 className="font-medium">{product.name}</h3>
          <p className="font-semibold">{formatCurrency(product.basePrice)}</p>
        </div>
      </Link>

      <div className="px-4 pb-4">
        {!inStock ? (
          <span className="text-xs font-medium text-red-600">Out of stock</span>
        ) : singleVariant ? (
          <button
            onClick={handleAddToCart}
            className="w-full rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
          >
            {added ? "Added ✓" : "Add to Cart"}
          </button>
        ) : (
          <Link
            href={`/products/${product.id}`}
            className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-center text-sm hover:bg-gray-50"
          >
            Select Options
          </Link>
        )}
      </div>
    </div>
  );
}
