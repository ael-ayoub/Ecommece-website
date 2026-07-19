export function formatCurrency(
  value: string | number | { toString(): string },
): string {
  const num = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat(process.env.NEXT_PUBLIC_APP_LOCALE ?? "en-US", {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_APP_CURRENCY ?? "USD",
  }).format(num);
}
