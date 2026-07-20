import { ProductForm } from "@/components/admin/products/ProductForm";
import { getMediaConfig } from "@/media/config";

export default function NewProductPage() {
  const media = getMediaConfig();
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Create Product</h1>
      <ProductForm
        mediaLimits={{
          maxFileSizeBytes: media.maxFileSizeBytes,
          maxImages: media.maxImagesPerProduct,
        }}
      />
    </div>
  );
}
