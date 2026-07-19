import { formatCurrency } from "@/lib/format";
import type { OrderItemDto } from "@/types/order";
import type { Prisma } from "@prisma/client";

export function OrderItemsTable({
  items,
  total,
}: {
  items: OrderItemDto[];
  total: string | number | Prisma.Decimal;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Product</th>
          <th>SKU / Variant</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const qty = item.variant?.quantity ?? 0;
          const unitPrice = item.variant?.unitPriceSnapshot ?? "0";
          return (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2">
                <span>{item.productNameSnapshot}</span>
                {!item.product ? (
                  <span className="ml-2 text-xs text-gray-500">Product no longer available</span>
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
              <td className="font-medium">{formatCurrency(Number(unitPrice.toString()) * qty)}</td>
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
