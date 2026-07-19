import { VariantManager } from "@/components/admin/products/VariantManager";

interface Props {
  params: { id: string };
}

export default function ProductVariantsPage({ params }: Props) {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Manage Variants</h1>
      <VariantManager productId={Number(params.id)} />
    </div>
  );
}
