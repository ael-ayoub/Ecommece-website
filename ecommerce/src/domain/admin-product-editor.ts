export type InventoryPresentation =
  "SIMPLE_INVENTORY" | "STRUCTURED_VARIANTS" | "LEGACY_VARIANTS";

export function inventoryPresentation(
  productType: "SIMPLE" | "CONFIGURABLE",
  optionCount: number,
): InventoryPresentation {
  if (productType === "SIMPLE") return "SIMPLE_INVENTORY";
  return optionCount > 0 ? "STRUCTURED_VARIANTS" : "LEGACY_VARIANTS";
}
