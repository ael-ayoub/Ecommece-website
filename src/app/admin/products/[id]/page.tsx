import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/services/product.service";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { NotFoundError } from "@/lib/errors";

interface Props {
  params: { id: string };
}

export default async function EditProductPage({ params }: Props) {
  const product = await getProductById(Number(params.id), { includeInactive: true }).catch(
    (err) => {
      if (err instanceof NotFoundError) return null;
      throw err;
    },
  );

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Edit Product</h1>
      <ProductForm
        product={{
          ...product,
          basePrice: product.basePrice.toString(),
          variants: product.variants.map((v) => ({ ...v, price: v.price?.toString() ?? null })),
        }}
      />
      <Link
        href={`/admin/products/${product.id}/variants`}
        className="mt-4 inline-block text-sm underline"
      >
        Manage variants →
      </Link>
    </div>
  );
}
