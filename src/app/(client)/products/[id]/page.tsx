import { notFound } from "next/navigation";
import { getProductById } from "@/services/product.service";
import { VariantSelector } from "@/components/products/VariantSelector";
import { NotFoundError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";

interface Props {
  params: { id: string };
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await getProductById(Number(params.id)).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });

  if (!product) {
    notFound();
  }

  const anyInStock = product.variants.some((v) => v.isActive && v.stockQuantity > 0);

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Home &gt; {product.category.name} &gt; {product.name}
      </p>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-gray-400">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <span>No image</span>
          )}
        </div>

        <div>
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {product.category.name}
          </span>
          <h1 className="mb-1 text-2xl font-bold">{product.name}</h1>
          {product.variants.length === 0 && (
            <p className="mb-1 text-2xl font-bold">
              {formatCurrency(product.basePrice.toString())}
            </p>
          )}
          <p className="mb-4 text-sm text-gray-600">{anyInStock ? "In stock" : "Out of stock"}</p>

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
            <p className="text-sm text-red-600">No variants available for this product.</p>
          )}

          <p className="mt-6 text-sm font-medium">Payment: Cash on Delivery</p>
          <p className="text-sm text-gray-500">You only pay when you receive your order.</p>
        </div>
      </div>

      <div className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="mb-2 font-semibold">Description</h2>
        <p className="text-gray-700">{product.description}</p>
      </div>
    </div>
  );
}
