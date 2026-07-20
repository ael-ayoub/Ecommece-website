import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PRODUCT_IMPORT_ROWS,
  parseSimpleProductCsv,
} from "../../src/domain/product-import";

const header = "name,description,base_price,category,sku,stock,is_active\n";

test("Simple Product CSV parses quoted commas and publication state", () => {
  const rows = parseSimpleProductCsv(
    `${header}"Travel Mug","Steel, insulated",24.50,Accessories,mug-01,8,published\n`,
  );
  assert.equal(rows[0].description, "Steel, insulated");
  assert.equal(rows[0].isActive, true);
  assert.equal(rows[0].error, undefined);
});

test("Simple Product CSV reports invalid stock by physical row", () => {
  const rows = parseSimpleProductCsv(
    `${header}Mug,Steel,24.50,Accessories,MUG-01,-1,maybe\n`,
  );
  assert.equal(rows[0].row, 2);
  assert.equal(rows[0].error, "Stock must be a non-negative whole number.");
});

test("Simple Product CSV requires the exact template and row bound", () => {
  assert.throws(() => parseSimpleProductCsv("name,sku\nMug,MUG-01\n"));
  const records = Array.from(
    { length: MAX_PRODUCT_IMPORT_ROWS + 1 },
    (_, index) =>
      `Product ${index},Description,10,Accessories,SKU-${index},1,false`,
  ).join("\n");
  assert.throws(() => parseSimpleProductCsv(`${header}${records}`));
});
