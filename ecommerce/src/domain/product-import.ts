export const SIMPLE_PRODUCT_IMPORT_HEADERS = [
  "name",
  "description",
  "base_price",
  "category",
  "sku",
  "stock",
  "is_active",
] as const;

export const MAX_PRODUCT_IMPORT_BYTES = 256 * 1024;
export const MAX_PRODUCT_IMPORT_ROWS = 25;

export interface SimpleProductImportRow {
  row: number;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  sku: string;
  stock: number;
  isActive: boolean;
  error?: string;
}

function parseRecord(record: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let cursor = 0; cursor < record.length; cursor += 1) {
    const char = record[cursor];
    if (char === '"' && quoted && record[cursor + 1] === '"') {
      value += '"';
      cursor += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("The CSV contains an unterminated quoted value.");
  cells.push(value.trim());
  return cells;
}

export function parseSimpleProductCsv(text: string): SimpleProductImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = parseRecord(lines.shift() ?? "");
  if (headers.join("|") !== SIMPLE_PRODUCT_IMPORT_HEADERS.join("|")) {
    throw new Error(
      `Use the template columns: ${SIMPLE_PRODUCT_IMPORT_HEADERS.join(", ")}.`,
    );
  }
  if (lines.length > MAX_PRODUCT_IMPORT_ROWS) {
    throw new Error(
      `Import at most ${MAX_PRODUCT_IMPORT_ROWS} Products at a time.`,
    );
  }
  return lines.map((line, index) => {
    const cells = parseRecord(line);
    const [name, description, price, category, sku, stock, active] = cells;
    const basePrice = Number(price);
    const stockNumber = Number(stock);
    const status = active?.toLowerCase() ?? "";
    const error =
      cells.length !== SIMPLE_PRODUCT_IMPORT_HEADERS.length
        ? "Expected 7 columns."
        : !name || !description || !category || !sku
          ? "Required value is missing."
          : !Number.isFinite(basePrice) || basePrice <= 0
            ? "Base price must be greater than zero."
            : !Number.isInteger(stockNumber) || stockNumber < 0
              ? "Stock must be a non-negative whole number."
              : !["true", "false", "published", "unpublished"].includes(status)
                ? "Publication status must be true, false, published, or unpublished."
                : undefined;
    return {
      row: index + 2,
      name,
      description,
      basePrice,
      category,
      sku,
      stock: stockNumber,
      isActive: ["true", "published"].includes(status),
      error,
    };
  });
}
