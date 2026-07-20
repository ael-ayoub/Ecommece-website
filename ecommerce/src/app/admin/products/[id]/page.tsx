import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/services/product.service";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { NotFoundError } from "@/lib/errors";
import { getMediaConfig } from "@/media/config";

interface Props {
  params: { id: string };
  searchParams: { imageUpload?: string };
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const media = getMediaConfig();
  const product = await getProductById(Number(params.id), {
    includeInactive: true,
  }).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Edit Product</h1>
      <ProductForm
        mediaLimits={{
          maxFileSizeBytes: media.maxFileSizeBytes,
          maxImages: media.maxImagesPerProduct,
        }}
        initialNotice={
          searchParams.imageUpload === "failed"
            ? "The Product was created, but one or more images could not be uploaded. Review the validation requirements and try adding them again here."
            : undefined
        }
        product={{
          ...product,
          basePrice: product.basePrice.toString(),
          variants: product.variants.map((v) => ({
            ...v,
            price: v.price?.toString() ?? null,
          })),
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
