import type { ProductDto } from "@/types/product";

export type CatalogueAction = "ADD_TO_CART" | "CHOOSE_OPTIONS" | "UNAVAILABLE";

export function getCataloguePresentation(product: ProductDto) {
  const purchasableVariants = product.variants.filter(
    (variant) => variant.isActive && variant.stockQuantity > 0,
  );
  const singleVariant =
    product.productType === "SIMPLE" && purchasableVariants.length === 1
      ? purchasableVariants[0]
      : null;

  const action: CatalogueAction =
    product.availability !== "AVAILABLE"
      ? "UNAVAILABLE"
      : singleVariant
        ? "ADD_TO_CART"
        : "CHOOSE_OPTIONS";

  return {
    action,
    singleVariant,
    hasPriceRange: product.minPrice !== product.maxPrice,
    availabilityLabel:
      product.availability === "AVAILABLE"
        ? "Available"
        : product.availability === "OUT_OF_STOCK"
          ? "Out of stock"
          : "Unavailable",
  };
}
