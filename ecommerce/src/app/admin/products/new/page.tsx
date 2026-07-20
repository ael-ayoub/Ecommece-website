import { ProductForm } from "@/components/admin/products/ProductForm";
import { getMediaConfig } from "@/media/config";

export default function NewProductPage() {
  const media = getMediaConfig();
  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Catalog</p>
          <h1>Create Product</h1>
          <p>
            Define Product information, inventory type, images, and offered
            SKUs.
          </p>
        </div>
      </div>
      <ProductForm
        mediaLimits={{
          maxFileSizeBytes: media.maxFileSizeBytes,
          maxImages: media.maxImagesPerProduct,
        }}
      />
    </div>
  );
}
