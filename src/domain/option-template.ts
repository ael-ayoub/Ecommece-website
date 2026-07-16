export const MAX_SKU_COMBINATIONS = 100;

export function normalizeTemplateText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizedTemplateKey(value: string) {
  return normalizeTemplateText(value).toLocaleLowerCase("en-US");
}

export interface RankedTemplate {
  id: number;
  name: string;
  recommendedPriority: number | null;
  isPinned: boolean;
  usageCount: number;
  lastUsedAt: Date | string | null;
}

export function rankOptionTemplates<T extends RankedTemplate>(templates: T[]) {
  return [...templates].sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    const recommendation = (right.recommendedPriority ?? -1) - (left.recommendedPriority ?? -1);
    if (recommendation !== 0) return recommendation;
    const recent =
      new Date(right.lastUsedAt ?? 0).getTime() - new Date(left.lastUsedAt ?? 0).getTime();
    if (recent !== 0) return recent;
    if (left.usageCount !== right.usageCount) return right.usageCount - left.usageCount;
    return left.name.localeCompare(right.name);
  });
}

interface AvailabilityVariant {
  isActive: boolean;
  stockQuantity: number;
  values: Record<string, string>;
}

export function optionValueAvailability(
  variants: AvailabilityVariant[],
  selections: Record<string, string>,
  optionName: string,
  value: string,
) {
  const candidates = variants.filter(
    (variant) =>
      variant.values[optionName] === value &&
      Object.entries(selections).every(
        ([name, selected]) => name === optionName || variant.values[name] === selected,
      ),
  );
  if (candidates.some((variant) => variant.isActive && variant.stockQuantity > 0)) {
    return "AVAILABLE" as const;
  }
  if (candidates.some((variant) => variant.isActive)) return "OUT_OF_STOCK" as const;
  return "UNAVAILABLE" as const;
}
