import { PackageX } from "lucide-react";
import { StorefrontState } from "@/components/storefront/StorefrontState";

export default function ProductNotFound() {
  return (
    <main>
      <StorefrontState
        icon={PackageX}
        title="Product not found"
        description="This Product may be unpublished, removed, or the link may be incorrect."
        actionHref="/products"
        actionLabel="Browse available Products"
      />
    </main>
  );
}
