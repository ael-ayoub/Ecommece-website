export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

export function normalizeSku(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeOptionText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function effectivePrice(
  basePrice: string | number,
  override: string | number | null,
) {
  return Number(override ?? basePrice);
}

export interface ProductOptionInput {
  name: string;
  values: string[];
}

export function generateOptionCombinations(options: ProductOptionInput[]) {
  return options.reduce<Record<string, string>[]>(
    (combinations, option) =>
      combinations.flatMap((combination) =>
        option.values.map((value) => ({
          ...combination,
          [option.name]: value,
        })),
      ),
    [{}],
  );
}

export function combinationKey(
  values: Record<string, string>,
  optionNames: string[],
) {
  return optionNames.map((name) => `${name}=${values[name] ?? ""}`).join("|");
}
