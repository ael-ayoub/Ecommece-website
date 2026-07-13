import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { ProductDto } from "@/types/product";

export function ProductCard({ product }: { product: ProductDto }) {
  const inStock = product.variants.some((v) => v.isActive && v.stockQuantity > 0);

  return (
    <Link
      href={`/products/${product.id}`}
      className="flex flex-col overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-md"
    >
      <div className="flex aspect-square items-center justify-center bg-gray-100 text-gray-400">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm">No image</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {product.category.name}
        </span>
        <h3 className="font-medium">{product.name}</h3>
        <p className="mt-auto font-semibold">{formatCurrency(product.basePrice)}</p>
        {!inStock && <span className="text-xs font-medium text-red-600">Out of stock</span>}
      </div>
    </Link>
  );
}
