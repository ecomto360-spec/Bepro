import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import type { AppContext } from "../../../cod-server/src/types";
import { getDb } from "../../../cod-server/src/db";
import { orderProducts, productVariants, products, stockMovements } from "../../../cod-server/src/db/schema";
import { requireScope } from "../../../cod-server/src/rbac/middleware";
import { SCOPES } from "../../../cod-shared/rbac/scopes";
import { adjustStock } from "../../../cod-server/src/endpoints/stock/queries";
import { readStockConfig, sanitizeStockConfig, writeStockConfig } from "../../shared/server/registry";
import { marginPercent, netProfit, productRevenue, grossMargin, costOfGoods, summarizeOrder } from "./money";
import { simplePdf } from "./report";

export const stockProfitabilityRoutes = new Hono<AppContext>();

stockProfitabilityRoutes.use("*", async (c, next) => {
  const current = await readStockConfig(getDb(c.env.DB));
  if (!current.enabled) return c.notFound();
  await next();
});
stockProfitabilityRoutes.use("*", requireScope(SCOPES.PRODUCTS_READ));

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
function csv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  return [Object.keys(rows[0]).map(csvCell).join(","), ...rows.map((row) => Object.values(row).map(csvCell).join(","))].join("\n");
}

stockProfitabilityRoutes.get("/inventory", async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.all<Record<string, unknown>>(sql`
    SELECT p.id AS productId, NULL AS variantId, p.name AS productName, NULL AS variations,
      p.sku AS sku, p.inventory AS quantity, p.low_stock_threshold AS threshold,
      COALESCE(pc.cost_price, p.cost_price, 0) AS costPrice, COALESCE(pc.sale_price, p.price) AS salePrice,
      p.compare_at_price AS compareAtPrice, pc.supplier AS supplier, cat.name AS category
    FROM products p
    LEFT JOIN ext_sp_product_costs pc ON pc.product_id = p.id AND pc.variant_id IS NULL
    LEFT JOIN product_categories cat ON cat.id = p.category_id
    WHERE p.deleted_at IS NULL AND p.has_variants = 0 AND p.track_inventory = 1
    UNION ALL
    SELECT p.id, v.id, p.name, v.variations, v.sku, v.inventory, v.low_stock_threshold,
      COALESCE(pc.cost_price, p.cost_price, 0), COALESCE(pc.sale_price, v.price),
      v.compare_at_price, pc.supplier, cat.name
    FROM product_variants v JOIN products p ON p.id = v.product_id
    LEFT JOIN ext_sp_product_costs pc ON pc.product_id = p.id AND pc.variant_id = v.id
    LEFT JOIN product_categories cat ON cat.id = p.category_id
    WHERE p.deleted_at IS NULL AND p.track_inventory = 1 AND v.active = 1
    ORDER BY productName, sku
  `);
  const search = (c.req.query("search") ?? "").toLocaleLowerCase();
  const status = c.req.query("status") ?? "all";
  const items = rows.map<Record<string, any>>((row) => {
    const quantity = Number(row.quantity);
    const threshold = Number(row.threshold);
    return { ...row, stockValueCost: quantity * Number(row.costPrice), stockValueSale: quantity * Number(row.salePrice), unitMargin: Number(row.salePrice) - Number(row.costPrice), status: quantity <= 0 ? "out" : quantity <= threshold ? "low" : "ok" };
  }).filter((row) => (!search || `${row.productName} ${row.sku}`.toLocaleLowerCase().includes(search)) && (status === "all" || row.status === status));
  return c.json({ success: true, data: { items, totals: {
    quantity: items.reduce((s, r) => s + Number(r.quantity), 0),
    cost: items.reduce((s, r) => s + Number(r.stockValueCost), 0),
    sale: items.reduce((s, r) => s + Number(r.stockValueSale), 0),
    low: items.filter((r) => r.status === "low").length,
    out: items.filter((r) => r.status === "out").length,
  } } });
});

stockProfitabilityRoutes.patch("/inventory/:productId", requireScope(SCOPES.PRODUCTS_MANAGE), async (c) => {
  const db = getDb(c.env.DB);
  const productId = c.req.param("productId");
  const body = await c.req.json<{ variantId?: string | null; costPrice?: number; salePrice?: number; compareAtPrice?: number | null; supplier?: string; threshold?: number; inventoryDelta?: number; reason?: string }>();
  const variantId = body.variantId ?? null;
  const now = new Date().toISOString();
  const current = variantId
    ? await db.select().from(productVariants).where(eq(productVariants.id, variantId)).get()
    : await db.select().from(products).where(eq(products.id, productId)).get();
  if (!current) return c.json({ error: "Produit ou variation introuvable" }, 404);
  if (variantId) {
    await db.update(productVariants).set({ ...(body.salePrice !== undefined ? { price: Math.max(0, Math.round(body.salePrice)) } : {}), ...(body.compareAtPrice !== undefined ? { compareAtPrice: body.compareAtPrice } : {}), ...(body.threshold !== undefined ? { lowStockThreshold: Math.max(0, Math.round(body.threshold)) } : {}), updatedAt: now }).where(eq(productVariants.id, variantId));
  } else {
    await db.update(products).set({ ...(body.costPrice !== undefined ? { costPrice: Math.max(0, Math.round(body.costPrice)) } : {}), ...(body.salePrice !== undefined ? { price: Math.max(0, Math.round(body.salePrice)) } : {}), ...(body.compareAtPrice !== undefined ? { compareAtPrice: body.compareAtPrice } : {}), ...(body.threshold !== undefined ? { lowStockThreshold: Math.max(0, Math.round(body.threshold)) } : {}), updatedAt: now }).where(eq(products.id, productId));
  }
  const id = `${productId}:${variantId ?? "simple"}`;
  const costPrice = Math.max(0, Number(body.costPrice ?? ("costPrice" in current ? current.costPrice : 0) ?? 0));
  const salePrice = Math.max(0, Number(body.salePrice ?? current.price));
  await db.run(sql`INSERT INTO ext_sp_product_costs (id, product_id, variant_id, supplier, cost_price, sale_price, compare_at_price, created_at, updated_at)
    VALUES (${id}, ${productId}, ${variantId}, ${body.supplier ?? null}, ${costPrice}, ${salePrice}, ${body.compareAtPrice ?? current.compareAtPrice}, ${now}, ${now})
    ON CONFLICT(id) DO UPDATE SET supplier=excluded.supplier, cost_price=excluded.cost_price, sale_price=excluded.sale_price, compare_at_price=excluded.compare_at_price, updated_at=excluded.updated_at`);
  let movement = null;
  if (body.inventoryDelta) {
    const actor = c.get("user");
    const result = await adjustStock(db, { productId, variantId, type: body.inventoryDelta > 0 ? "ADJUSTMENT_ADD" : "ADJUSTMENT_REMOVE", delta: body.inventoryDelta, reason: body.reason ?? "Édition rapide extension stock", createdBy: actor.id, createdByName: actor.name ?? "Admin" });
    movement = result.movement;
  }
  return c.json({ success: true, data: { id, movement } });
});

stockProfitabilityRoutes.get("/products/:productId", async (c) => {
  const db = getDb(c.env.DB);
  const productId = c.req.param("productId");
  const variantId = c.req.query("variantId") ?? null;
  const costs = await db.get(sql`SELECT * FROM ext_sp_product_costs WHERE product_id = ${productId} AND ${variantId ? sql`variant_id = ${variantId}` : sql`variant_id IS NULL`}`);
  const movements = await db.select().from(stockMovements).where(and(eq(stockMovements.productId, productId), variantId ? eq(stockMovements.variantId, variantId) : sql`1=1`)).orderBy(desc(stockMovements.createdAt)).limit(100);
  const first = movements[0];
  const current = variantId ? await db.select().from(productVariants).where(eq(productVariants.id, variantId)).get() : await db.select().from(products).where(eq(products.id, productId)).get();
  return c.json({ success: true, data: { costs, current, movements, margin: current ? summarizeOrder([{ unitCost: Number((costs as any)?.cost_price ?? 0), unitSale: current.price, quantity: 1 }], {}) : null, unused: first?.id ?? null } });
});

stockProfitabilityRoutes.get("/movements", async (c) => {
  const db = getDb(c.env.DB);
  const productId = c.req.query("productId");
  const rows = await db.select().from(stockMovements).where(productId ? eq(stockMovements.productId, productId) : sql`1=1`).orderBy(desc(stockMovements.createdAt)).limit(300);
  return c.json({ success: true, data: rows });
});

async function stats(db: ReturnType<typeof getDb>, from: string, to: string, basis: string) {
  const statuses = basis === "forecast" ? ["confirmed", "preparing", "ready", "assigned", "dispatched", "out_for_delivery", "delivered"] : ["delivered"];
  const rows = await db.all<any>(sql`
    SELECT o.id AS orderId, o.status, o.created_at AS createdAt, o.delivery_fee AS deliveryCharged,
      o.wilaya_id AS wilayaId, w.name AS wilaya, COALESCE(dc.name, 'Interne / non assigné') AS carrier,
      oc.delivery_cost AS deliveryCost, oc.return_fee AS returnFee, oc.confirmation_fee AS confirmationFee,
      oc.packaging_fee AS packagingFee, oc.ad_cost AS adCost, oc.other_fees AS otherFees,
      lc.product_id AS productId, p.name AS productName, COALESCE(cat.name, 'Sans catégorie') AS category,
      lc.unit_cost AS unitCost, lc.unit_sale AS unitSale, lc.quantity, lc.discount, lc.returned_quantity AS returnedQuantity
    FROM orders o
    JOIN ext_sp_order_costs oc ON oc.order_id = o.id
    JOIN ext_sp_order_line_costs lc ON lc.order_id = o.id
    JOIN products p ON p.id = lc.product_id
    LEFT JOIN product_categories cat ON cat.id = p.category_id
    LEFT JOIN wilayas w ON w.id = o.wilaya_id
    LEFT JOIN delivery_companies dc ON dc.id = o.company_id
    WHERE o.created_at >= ${from} AND o.created_at <= ${to + "T23:59:59.999Z"}
      AND o.status IN (${sql.join(statuses.map((s) => sql`${s}`), sql`,`)})
  `);
  const byOrder = new Map<string, { lines: any[]; costs: any; status: string; date: string; wilaya: string; carrier: string }>();
  for (const r of rows) {
    if (!byOrder.has(r.orderId)) byOrder.set(r.orderId, { lines: [], costs: r, status: r.status, date: r.createdAt.slice(0, 10), wilaya: r.wilaya ?? "Inconnue", carrier: r.carrier });
    byOrder.get(r.orderId)!.lines.push(r);
  }
  const summaries = [...byOrder.values()].map((o) => ({ ...o, ...summarizeOrder(o.lines, o.costs) }));
  const sum = (key: "revenue" | "cogs" | "grossMargin" | "netProfit" | "deliveryCharged" | "deliveryCost") => Math.round(summaries.reduce((s, o) => s + o[key], 0) * 100) / 100;
  const current = await readStockConfig(db);
  const expenses = await db.get<{ total: number }>(sql`SELECT COALESCE(SUM(amount), 0) AS total FROM ext_sp_expenses WHERE store_id = ${current.storeId} AND expense_date >= ${from} AND expense_date <= ${to}`);
  const allOrders = await db.all<{ status: string; price: number; deliveryFee: number }>(sql`SELECT status, price, delivery_fee AS deliveryFee FROM orders WHERE created_at >= ${from} AND created_at <= ${to + "T23:59:59.999Z"}`);
  const group = (key: "productName" | "wilaya" | "carrier" | "category" | "date") => {
    const map = new Map<string, any>();
    for (const o of summaries) {
      if (key === "date" || key === "wilaya" || key === "carrier") {
        const name = o[key]; const g = map.get(name) ?? { name, orders: 0, revenue: 0, netProfit: 0 };
        g.orders++; g.revenue += o.revenue; g.netProfit += o.netProfit; map.set(name, g);
      } else {
        for (const l of o.lines) {
          const name = l[key]; const g = map.get(name) ?? { name, quantity: 0, revenue: 0, netProfit: 0 };
          const kept = Math.max(0, l.quantity - l.returnedQuantity); const discount = l.quantity > 0 ? l.discount * kept / l.quantity : 0;
          g.quantity += kept; g.revenue += l.unitSale * kept - discount; map.set(name, g);
        }
      }
    }
    if (key === "productName" || key === "category") for (const o of summaries) for (const l of o.lines) {
      const name = l[key]; const g = map.get(name); const kept = Math.max(0, l.quantity - l.returnedQuantity); const discount = l.quantity > 0 ? l.discount * kept / l.quantity : 0; if (g) g.netProfit += (l.unitSale - l.unitCost) * kept - discount;
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  };
  const net = sum("netProfit");
  return {
    period: { from, to, basis },
    totals: { revenue: sum("revenue"), cogs: sum("cogs"), grossMargin: sum("grossMargin"), deliveryCharged: sum("deliveryCharged"), deliveryCost: sum("deliveryCost"), netProfit: net, expenses: Number(expenses?.total ?? 0), operationalNet: Math.round((net - Number(expenses?.total ?? 0)) * 100) / 100, marginPercent: marginPercent(net, sum("revenue")), orders: allOrders.length, averageBasket: byOrder.size ? Math.round((sum("revenue") + sum("deliveryCharged")) / byOrder.size * 100) / 100 : 0, confirmationRate: allOrders.length ? Math.round(allOrders.filter((o) => !["new", "cancelled", "unreachable"].includes(o.status)).length / allOrders.length * 10000) / 100 : 0, deliveryRate: allOrders.length ? Math.round(allOrders.filter((o) => o.status === "delivered").length / allOrders.length * 10000) / 100 : 0, returnRate: allOrders.length ? Math.round(allOrders.filter((o) => o.status === "returned").length / allOrders.length * 10000) / 100 : 0 },
    topProducts: group("productName"), byWilaya: group("wilaya"), byCarrier: group("carrier"), byCategory: group("category"), daily: group("date"),
    statusBreakdown: Object.entries(allOrders.reduce<Record<string, number>>((a, o) => (a[o.status] = (a[o.status] ?? 0) + 1, a), {})).map(([name, count]) => ({ name, count })),
    expensesByPlatform: await db.all(sql`SELECT COALESCE(platform, category) AS name, SUM(amount) AS amount FROM ext_sp_expenses WHERE store_id = ${current.storeId} AND expense_date >= ${from} AND expense_date <= ${to} GROUP BY COALESCE(platform, category)`),
  };
}

stockProfitabilityRoutes.get("/stats", async (c) => {
  const now = new Date(); const from = c.req.query("from") ?? now.toISOString().slice(0, 8) + "01"; const to = c.req.query("to") ?? now.toISOString().slice(0, 10);
  const current = await readStockConfig(getDb(c.env.DB));
  const basis = c.req.query("basis") ?? current.config.profitBasis;
  return c.json({ success: true, data: await stats(getDb(c.env.DB), from, to, basis) });
});

stockProfitabilityRoutes.get("/expenses", async (c) => {
  const from = c.req.query("from") ?? "0000-01-01"; const to = c.req.query("to") ?? "9999-12-31";
  const current = await readStockConfig(getDb(c.env.DB));
  const rows = await getDb(c.env.DB).all(sql`SELECT * FROM ext_sp_expenses WHERE store_id = ${current.storeId} AND expense_date >= ${from} AND expense_date <= ${to} ORDER BY expense_date DESC`);
  return c.json({ success: true, data: rows });
});
stockProfitabilityRoutes.post("/expenses", requireScope(SCOPES.PRODUCTS_MANAGE), async (c) => {
  const b = await c.req.json<{ category: string; platform?: string; amount: number; expenseDate: string; notes?: string }>();
  if (!b.category || !b.expenseDate || !(b.amount > 0)) return c.json({ error: "Catégorie, date et montant positif requis" }, 400);
  const current = await readStockConfig(getDb(c.env.DB)); const id = crypto.randomUUID();
  await getDb(c.env.DB).run(sql`INSERT INTO ext_sp_expenses (id, store_id, category, platform, amount, expense_date, notes, created_by, created_at) VALUES (${id}, ${current.storeId}, ${b.category}, ${b.platform ?? null}, ${b.amount}, ${b.expenseDate}, ${b.notes ?? null}, ${c.get("user").id}, ${new Date().toISOString()})`);
  return c.json({ success: true, data: { id } }, 201);
});
stockProfitabilityRoutes.delete("/expenses/:id", requireScope(SCOPES.PRODUCTS_MANAGE), async (c) => {
  const current = await readStockConfig(getDb(c.env.DB));
  await getDb(c.env.DB).run(sql`DELETE FROM ext_sp_expenses WHERE id = ${c.req.param("id")} AND store_id = ${current.storeId}`);
  return c.json({ success: true });
});

stockProfitabilityRoutes.get("/reports/inventory.csv", async (c) => {
  const db = getDb(c.env.DB); const rows = await db.all(sql`SELECT p.name AS produit, v.sku, v.inventory AS quantite, v.low_stock_threshold AS seuil, COALESCE(pc.cost_price, p.cost_price, 0) AS achat, v.price AS vente, pc.supplier AS fournisseur FROM product_variants v JOIN products p ON p.id=v.product_id LEFT JOIN ext_sp_product_costs pc ON pc.product_id=p.id AND pc.variant_id=v.id`);
  return new Response("\ufeff" + csv(rows as any), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=inventaire.csv" } });
});
stockProfitabilityRoutes.get("/reports/stats.pdf", async (c) => {
  const now = new Date(); const from = c.req.query("from") ?? now.toISOString().slice(0, 8) + "01"; const to = c.req.query("to") ?? now.toISOString().slice(0, 10);
  const data = await stats(getDb(c.env.DB), from, to, c.req.query("basis") ?? "delivered");
  const lines = ["bepro - Rapport de rentabilite", `Periode: ${from} -> ${to}`, ...Object.entries(data.totals).map(([k, v]) => `${k}: ${v}`)];
  return new Response(simplePdf("Rapport bepro", lines).slice().buffer as ArrayBuffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=rentabilite.pdf" } });
});
stockProfitabilityRoutes.post("/inventory/import", requireScope(SCOPES.PRODUCTS_MANAGE), async (c) => {
  const text = await c.req.text(); const lines = text.split(/\r?\n/).filter(Boolean); let updated = 0; const errors: string[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const [sku, quantity, threshold, costPrice] = cells;
    if (!sku) continue;
    try {
      const variant = await getDb(c.env.DB).select().from(productVariants).where(eq(productVariants.sku, sku)).get();
      if (!variant) throw new Error("SKU inconnu");
      const delta = Number(quantity) - variant.inventory;
      if (delta) await adjustStock(getDb(c.env.DB), { productId: variant.productId, variantId: variant.id, type: delta > 0 ? "ADJUSTMENT_ADD" : "ADJUSTMENT_REMOVE", delta, reason: "Import CSV", createdBy: c.get("user").id, createdByName: c.get("user").name ?? "Admin" });
      await getDb(c.env.DB).update(productVariants).set({ lowStockThreshold: Number(threshold) || 0, updatedAt: new Date().toISOString() }).where(eq(productVariants.id, variant.id));
      await getDb(c.env.DB).run(sql`INSERT INTO ext_sp_product_costs (id, product_id, variant_id, cost_price, sale_price, created_at, updated_at) VALUES (${variant.productId + ":" + variant.id}, ${variant.productId}, ${variant.id}, ${Number(costPrice) || 0}, ${variant.price}, ${new Date().toISOString()}, ${new Date().toISOString()}) ON CONFLICT(id) DO UPDATE SET cost_price=excluded.cost_price, updated_at=excluded.updated_at`);
      updated++;
    } catch (e) { errors.push(`${sku}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  return c.json({ success: errors.length === 0, data: { updated, errors } }, errors.length ? 422 : 200);
});
