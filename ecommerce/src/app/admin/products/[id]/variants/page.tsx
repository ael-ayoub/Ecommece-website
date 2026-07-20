import { VariantManager } from "@/components/admin/products/VariantManager";

interface Props {
  params: { id: string };
}

export default function ProductVariantsPage({ params }: Props) {
  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">SKU inventory</p>
          <h1>Manage Variants</h1>
          <p>
            Edit explicit SKU combinations, stock, labels, and price overrides.
          </p>
        </div>
      </div>
      <VariantManager productId={Number(params.id)} />
    </div>
  );
}
