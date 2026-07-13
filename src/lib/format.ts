export function formatCurrency(value: string | number | { toString(): string }): string {
  const num = typeof value === "number" ? value : Number(value.toString());
  return `$${num.toFixed(2)}`;
}
