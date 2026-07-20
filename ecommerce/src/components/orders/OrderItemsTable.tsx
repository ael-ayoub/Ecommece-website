import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import type { OrderItemDto } from "@/types/order";
import type { Prisma } from "@prisma/client";
import { ProductImage } from "@/components/products/ProductImage";

export function OrderItemsTable({
  items,
  total,
  productLinkBase = "/products",
  clientResponsive = false,
}: {
  items: OrderItemDto[];
  total: string | number | Prisma.Decimal;
  productLinkBase?: string;
  clientResponsive?: boolean;
}) {
  if (clientResponsive) {
    return (
      <div>
        <ul aria-label="Order items" className="grid gap-4">
          {items.map((item) => {
            const quantity = item.variant?.quantity ?? 0;
            const unitPrice = item.variant?.unitPriceSnapshot ?? "0";
            const productName = item.productNameSnapshot;
            return (
              <li
                key={item.id}
                className="grid gap-4 rounded-xl border border-[var(--client-border-subtle)] p-4 sm:grid-cols-[5rem_1fr_auto]"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-[var(--client-surface-muted)]">
                  {item.imageSnapshot ? (
                    <ProductImage
                      src={item.imageSnapshot}
                      alt={productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center px-2 text-center text-xs text-[var(--client-text-secondary)]">
                      Image unavailable
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    {item.product?.isActive ? (
                      <Link href={`/products/${item.product.id}`} className="client-text-link">
                        {productName}
                      </Link>
                    ) : (
                      productName
                    )}
                  </h2>
                  {!item.product?.isActive && (
                    <p className="mt-1 text-xs text-[var(--client-text-secondary)]">
                      This Product is no longer available.
                    </p>
                  )}
                  <p className="mt-2 break-words text-sm text-[var(--client-text-secondary)]">
                    {item.variant
                      ? `${item.variant.variantLabelSnapshot} · SKU ${item.variant.skuSnapshot}`
                      : "Historical item details unavailable"}
                  </p>
                  {item.variant?.optionValuesSnapshot &&
                    typeof item.variant.optionValuesSnapshot === "object" &&
                    !Array.isArray(item.variant.optionValuesSnapshot) && (
                      <p className="mt-1 text-xs text-[var(--client-text-secondary)]">
                        {Object.entries(item.variant.optionValuesSnapshot)
                          .map(([name, value]) => `${name}: ${String(value)}`)
                          .join(" · ")}
                      </p>
                    )}
                  <p className="mt-2 text-sm">
                    {quantity} × {formatCurrency(unitPrice)}
                  </p>
                </div>
                <p className="self-end font-bold tabular-nums sm:self-start">
                  {formatCurrency(Number(unitPrice.toString()) * quantity)}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex items-center justify-between border-t border-[var(--client-border-strong)] pt-5">
          <span className="font-semibold">Order total</span>
          <strong className="text-xl tabular-nums">{formatCurrency(total)}</strong>
        </div>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th scope="col" className="py-2">Product</th>
          <th scope="col">SKU / Variant</th>
          <th scope="col">Qty</th>
          <th scope="col">Unit Price</th>
          <th scope="col">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const qty = item.variant?.quantity ?? 0;
          const unitPrice = item.variant?.unitPriceSnapshot ?? "0";
          return (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2">
                {item.product &&
                (productLinkBase !== "/products" || item.product.isActive) ? (
                  <Link
                    href={`${productLinkBase}/${item.product.id}`}
                    className="underline"
                  >
                    {item.productNameSnapshot}
                  </Link>
                ) : (
                  <span>{item.productNameSnapshot}</span>
                )}
                {!item.product ? (
                  <span className="ml-2 text-xs text-gray-500">
                    Product was deleted
                  </span>
                ) : null}
              </td>
              <td>
                {item.variant
                  ? `${item.variant.skuSnapshot} / ${item.variant.variantLabelSnapshot}`
                  : "—"}
                {item.variant?.optionValuesSnapshot &&
                typeof item.variant.optionValuesSnapshot === "object" &&
                !Array.isArray(item.variant.optionValuesSnapshot) ? (
                  <span className="block text-xs text-gray-500">
                    {Object.entries(item.variant.optionValuesSnapshot)
                      .map(([name, value]) => `${name}: ${String(value)}`)
                      .join(" · ")}
                  </span>
                ) : null}
              </td>
              <td>{qty}</td>
              <td>{formatCurrency(unitPrice)}</td>
              <td className="font-medium">
                {formatCurrency(Number(unitPrice.toString()) * qty)}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={4} className="pt-3 text-right font-medium">
            Total:
          </td>
          <td className="pt-3 font-bold">{formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
