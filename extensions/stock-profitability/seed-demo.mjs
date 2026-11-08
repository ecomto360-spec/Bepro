#!/usr/bin/env node
/** Jeu de démonstration déterministe : 20 commandes, 17 livrées et 3 retours. */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const rows = Array.from({ length: 20 }, (_, index) => {
  const i = index + 1; const quantity = (i % 3) + 1; const returned = i >= 18;
  return { i, id: `ext-sp-demo-order-${String(i).padStart(2, "0")}`, lineId: `ext-sp-demo-line-${String(i).padStart(2, "0")}`, quantity, unitSale: 2000 + i * 100, unitCost: 1000 + i * 50, discount: (i % 4) * 50, status: returned ? "returned" : "delivered", returnedQuantity: returned ? quantity : 0, resalable: i !== 19, deliveryCharged: 400, deliveryCost: 250, returnFee: returned ? 300 : 0, confirmationFee: 20, packagingFee: 30, adCost: 100, otherFees: 0, date: `2026-11-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z` };
});
const summarize = (orders) => {
  const keptDiscount = (o) => o.quantity ? o.discount * (o.quantity - o.returnedQuantity) / o.quantity : 0;
  const revenue = orders.reduce((s, o) => s + o.unitSale * (o.quantity - o.returnedQuantity) - keptDiscount(o), 0);
  const cogs = orders.reduce((s, o) => s + o.unitCost * (o.quantity - o.returnedQuantity), 0);
  const grossMargin = orders.reduce((s, o) => s + (o.unitSale - o.unitCost) * (o.quantity - o.returnedQuantity) - keptDiscount(o), 0);
  const netProfit = orders.reduce((s, o) => s + (o.unitSale - o.unitCost) * (o.quantity - o.returnedQuantity) - keptDiscount(o) + o.deliveryCharged - o.deliveryCost - o.returnFee - o.confirmationFee - o.packagingFee - o.adCost - o.otherFees, 0);
  return { orders: orders.length, revenue, cogs, grossMargin, deliveryCharged: orders.reduce((s, o) => s + o.deliveryCharged, 0), deliveryCost: orders.reduce((s, o) => s + o.deliveryCost, 0), netProfit, marginPercent: revenue > 0 ? Math.round(netProfit / revenue * 10000) / 100 : 0 };
};
const expected = { delivered: summarize(rows.filter((o) => o.status === "delivered")), returned: summarize(rows.filter((o) => o.status === "returned")), globalExpenses: 10000, resalableReturnedUnits: rows.filter((o) => o.status === "returned" && o.resalable).reduce((s, o) => s + o.quantity, 0), nonResalableReturnedUnits: rows.filter((o) => !o.resalable).reduce((s, o) => s + o.quantity, 0) };
expected.operationalNetAfterGlobalExpenses = expected.delivered.netProfit - expected.globalExpenses;

const sql = ["BEGIN TRANSACTION;", "DELETE FROM ext_sp_order_line_costs WHERE order_id LIKE 'ext-sp-demo-order-%';", "DELETE FROM ext_sp_order_costs WHERE order_id LIKE 'ext-sp-demo-order-%';", "DELETE FROM stock_movements WHERE reference LIKE 'ext-sp-demo-order-%';", "DELETE FROM order_products WHERE order_id LIKE 'ext-sp-demo-order-%';", "DELETE FROM orders WHERE id LIKE 'ext-sp-demo-order-%';", "DELETE FROM ext_sp_expenses WHERE id LIKE 'ext-sp-demo-expense-%';", `INSERT OR IGNORE INTO stores (id, name, created_at, updated_at) VALUES ('default', 'Boutique démo', '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z');`, `INSERT OR IGNORE INTO wilayas (id, name, name_ar) VALUES (16, 'Alger', 'الجزائر');`, `INSERT OR IGNORE INTO communes (id, wilaya_id, name, name_ar) VALUES ('c-16-001', 16, 'Alger Centre', 'الجزائر الوسطى');`, `INSERT OR IGNORE INTO products (id, name, handle, price, cost_price, has_variants, inventory, track_inventory, created_at, updated_at) VALUES ('bepro-p-01', 'Chaussures de running Performance', 'performance-running', 2000, 1000, 1, 0, 1, '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z');`, `INSERT OR IGNORE INTO product_variants (id, product_id, variations, price, sku, inventory, low_stock_threshold, active, created_at, updated_at) VALUES ('bepro-p-01-v-1', 'bepro-p-01', '{"Taille":"40"}', 2000, 'performance-running-40', 50, 5, 1, '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z');`, `UPDATE product_variants SET inventory = 50 WHERE id = 'bepro-p-01-v-1';`, `INSERT OR IGNORE INTO customers (id, name, phone, wilaya_id, commune_id, wilaya, commune, total_orders, total_spent, created_at) VALUES ('ext-sp-demo-customer', 'Client démo rentabilité', '0599000003', 16, 'c-16-001', 'Alger', 'Alger Centre', 0, 0, '2026-11-01T00:00:00.000Z');`, `INSERT INTO extension_registry (id, store_id, enabled, config_json, created_at, updated_at) VALUES ('stock-profitability', 'default', 1, '{"deductionTiming":"order","stockZeroBehavior":"block","restockOnReturn":true,"profitBasis":"delivered","lowStockAlert":true,"lowStockEmail":false,"defaultPackagingFee":0,"defaultConfirmationFee":0,"defaultAdCost":0}', '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z') ON CONFLICT(id, store_id) DO UPDATE SET enabled=1;`];
let inventory = 50;
for (const o of rows) {
  const price = o.unitSale * o.quantity - o.discount;
  sql.push(`INSERT INTO orders (id, order_number, customer_id, customer_name, phone, wilaya_id, commune_id, price, status, delivery_fee, cod_amount, created_at, updated_at) VALUES (${q(o.id)}, ${q(`EXT-SP-${String(o.i).padStart(2, "0")}`)}, 'ext-sp-demo-customer', 'Client démo rentabilité', '0599000003', 16, 'c-16-001', ${price}, ${q(o.status)}, 400, ${price + 400}, ${q(o.date)}, ${q(o.date)});`);
  sql.push(`INSERT INTO order_products (id, order_id, product_id, product_name, variant_id, variant_label, sku, quantity, price_per_unit, line_total, status, returned_quantity, created_at) VALUES (${q(o.lineId)}, ${q(o.id)}, 'bepro-p-01', 'Chaussures de running Performance', 'bepro-p-01-v-1', '40', 'performance-running-40', ${o.quantity}, ${o.unitSale}, ${price}, ${q(o.returnedQuantity ? "returned" : "fulfilled")}, ${o.returnedQuantity}, ${q(o.date)});`);
  sql.push(`INSERT INTO ext_sp_order_costs (order_id, delivery_cost, return_fee, confirmation_fee, packaging_fee, ad_cost, other_fees, created_at, updated_at) VALUES (${q(o.id)}, 250, ${o.returnFee}, 20, 30, 100, 0, ${q(o.date)}, ${q(o.date)});`);
  sql.push(`INSERT INTO ext_sp_order_line_costs (id, order_id, order_product_id, product_id, variant_id, unit_cost, unit_sale, quantity, discount, returned_quantity, resalable, created_at, updated_at) VALUES ('ext-sp-demo-cost-${o.i}', ${q(o.id)}, ${q(o.lineId)}, 'bepro-p-01', 'bepro-p-01-v-1', ${o.unitCost}, ${o.unitSale}, ${o.quantity}, ${o.discount}, ${o.returnedQuantity}, ${o.resalable ? 1 : 0}, ${q(o.date)}, ${q(o.date)});`);
  const afterSale = inventory - o.quantity;
  sql.push(`INSERT INTO stock_movements (id, product_id, variant_id, type, delta, qty_before, qty_after, reason, reference, created_by, created_by_name, created_at) VALUES ('ext-sp-demo-sale-${o.i}', 'bepro-p-01', 'bepro-p-01-v-1', 'ORDER_DEDUCTED', ${-o.quantity}, ${inventory}, ${afterSale}, 'Seed démo', ${q(o.id)}, 'seed', 'Démo rentabilité', ${q(o.date)});`);
  inventory = afterSale;
  if (o.returnedQuantity && o.resalable) {
    const afterReturn = inventory + o.returnedQuantity;
    sql.push(`INSERT INTO stock_movements (id, product_id, variant_id, type, delta, qty_before, qty_after, reason, reference, created_by, created_by_name, created_at) VALUES ('ext-sp-demo-return-${o.i}', 'bepro-p-01', 'bepro-p-01-v-1', 'ORDER_RETURNED', ${o.returnedQuantity}, ${inventory}, ${afterReturn}, 'Retour revendable', ${q(o.id)}, 'seed', 'Démo rentabilité', ${q(o.date)});`);
    inventory = afterReturn;
  }
}
for (const [id, category, platform, amount] of [["ext-sp-demo-expense-meta", "publicite", "Meta", 5000], ["ext-sp-demo-expense-tiktok", "publicite", "TikTok", 3000], ["ext-sp-demo-expense-packaging", "emballage", null, 2000]]) sql.push(`INSERT INTO ext_sp_expenses (id, store_id, category, platform, amount, expense_date, notes, created_by, created_at) VALUES ('${id}', 'default', '${category}', ${platform ? q(platform) : "NULL"}, ${amount}, '2026-11-15', 'Seed démo', 'seed', '2026-11-15T10:00:00.000Z');`);
sql.push(`UPDATE product_variants SET inventory = ${inventory} WHERE id = 'bepro-p-01-v-1';`, "COMMIT;");
writeFileSync(join(here, "seed-demo.sql"), sql.join("\n") + "\n");
writeFileSync(join(here, "expected-demo.json"), JSON.stringify({ ...expected, finalInventory: inventory }, null, 2) + "\n");
console.log(JSON.stringify({ orders: rows.length, returned: 3, expected: { ...expected, finalInventory: inventory }, files: ["seed-demo.sql", "expected-demo.json"] }, null, 2));
console.log("Pour appliquer : wrangler d1 execute codflow-os-db --local --persist-to .wrangler-shared --file extensions/stock-profitability/seed-demo.sql");
