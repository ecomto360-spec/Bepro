import { eq, sql } from "drizzle-orm";
import type { AppDb } from "../../../cod-server/src/db";
import { orderProducts, orders, productVariants, products, stockMovements } from "../../../cod-server/src/db/schema";
import { readStockConfig, type StockConfig } from "../../shared/server/registry";
import { adjustStock } from "../../../cod-server/src/endpoints/stock/queries";

async function log(db: AppDb, storeId: string, level: string, action: string, message: string, context: unknown = {}) {
  await db.run(sql`INSERT INTO ext_sp_logs (id, store_id, level, action, message, context_json, created_at)
    VALUES (${crypto.randomUUID()}, ${storeId}, ${level}, ${action}, ${message}, ${JSON.stringify(context)}, ${new Date().toISOString()})`);
}

export async function snapshotOrder(db: AppDb, orderId: string, config: StockConfig) {
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error(`Commande introuvable: ${orderId}`);
  const now = new Date().toISOString();
  await db.run(sql`INSERT INTO ext_sp_order_costs
    (order_id, delivery_cost, return_fee, confirmation_fee, packaging_fee, ad_cost, other_fees, created_at, updated_at)
    VALUES (${orderId}, ${order.driverFee ?? 0}, 0, ${config.defaultConfirmationFee}, ${config.defaultPackagingFee}, ${config.defaultAdCost}, 0, ${now}, ${now})
    ON CONFLICT(order_id) DO NOTHING`);

  const lines = await db.select().from(orderProducts).where(eq(orderProducts.orderId, orderId));
  for (const line of lines) {
    const product = await db.select({ costPrice: products.costPrice }).from(products).where(eq(products.id, line.productId)).get();
    const variantCost = line.variantId
      ? await db.get<{ cost_price: number }>(sql`SELECT cost_price FROM ext_sp_product_costs WHERE product_id = ${line.productId} AND variant_id = ${line.variantId}`)
      : null;
    const productCost = await db.get<{ cost_price: number }>(sql`SELECT cost_price FROM ext_sp_product_costs WHERE product_id = ${line.productId} AND variant_id IS NULL`);
    const unitCost = variantCost?.cost_price ?? productCost?.cost_price ?? product?.costPrice ?? 0;
    await db.run(sql`INSERT INTO ext_sp_order_line_costs
      (id, order_id, order_product_id, product_id, variant_id, unit_cost, unit_sale, quantity, discount, returned_quantity, resalable, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${orderId}, ${line.id}, ${line.productId}, ${line.variantId}, ${unitCost}, ${line.pricePerUnit}, ${line.quantity}, 0, ${line.returnedQuantity}, 1, ${now}, ${now})
      ON CONFLICT(order_product_id) DO NOTHING`);
  }
}

export async function assertOrderStockAvailable(db: AppDb, orderId: string) {
  const lines = await db.select().from(orderProducts).where(eq(orderProducts.orderId, orderId));
  for (const line of lines) {
    const product = await db.select({ trackInventory: products.trackInventory }).from(products).where(eq(products.id, line.productId)).get();
    if (!product?.trackInventory) continue;
    const stock = line.variantId
      ? (await db.select({ inventory: productVariants.inventory }).from(productVariants).where(eq(productVariants.id, line.variantId)).get())?.inventory
      : (await db.select({ inventory: products.inventory }).from(products).where(eq(products.id, line.productId)).get())?.inventory;
    if (stock === undefined) throw new Error(`Article de stock introuvable: ${line.productName}`);
    if (stock < line.quantity) throw new Error(`Stock insuffisant pour ${line.productName}: ${stock} disponible(s), ${line.quantity} requis`);
  }
}

async function deductOrderStock(db: AppDb, orderId: string, config: StockConfig, storeId: string) {
  const existing = await db.get<{ id: string }>(sql`SELECT id FROM stock_movements WHERE reference = ${orderId} AND type = 'ORDER_DEDUCTED' LIMIT 1`);
  if (existing) return;
  const lines = await db.select().from(orderProducts).where(eq(orderProducts.orderId, orderId));
  const now = new Date().toISOString();
  for (const line of lines) {
    const product = await db.select({ trackInventory: products.trackInventory }).from(products).where(eq(products.id, line.productId)).get();
    if (!product?.trackInventory) continue;
    const reference = `${orderId}:${line.id}`;
    const done = await db.get<{ id: string }>(sql`SELECT id FROM stock_movements WHERE reference = ${reference} AND type = 'ORDER_DEDUCTED' LIMIT 1`);
    if (done) continue;
    const qty = line.quantity;
    if (config.stockZeroBehavior === "block") {
      await adjustStock(db, { productId: line.productId, variantId: line.variantId, type: "ORDER_DEDUCTED", delta: -qty, reason: "Extension stock différée", reference, createdBy: "extension", createdByName: "Stock & rentabilité" });
    } else {
      const inventoryColumn = line.variantId ? productVariants.inventory : products.inventory;
      const target = line.variantId ? productVariants : products;
      const targetId = line.variantId ?? line.productId;
      const update = line.variantId
        ? db.update(productVariants).set({ inventory: sql`${productVariants.inventory} - ${qty}`, updatedAt: now }).where(eq(productVariants.id, targetId))
        : db.update(products).set({ inventory: sql`${products.inventory} - ${qty}`, updatedAt: now }).where(eq(products.id, targetId));
      await db.batch([
        db.insert(stockMovements).values({ id: crypto.randomUUID(), productId: line.productId, variantId: line.variantId, type: "ORDER_DEDUCTED", delta: -qty, qtyBefore: sql`(SELECT ${inventoryColumn} FROM ${target} WHERE id = ${targetId})`, qtyAfter: sql`(SELECT ${inventoryColumn} - ${qty} FROM ${target} WHERE id = ${targetId})`, reason: "Extension stock: avertissement, stock négatif autorisé", reference, createdBy: "extension", createdByName: "Stock & rentabilité", createdAt: now }),
        update,
      ] as any);
    }
  }
  await log(db, storeId, "info", "stock.deducted", "Stock décrémenté par événement", { orderId, timing: config.deductionTiming });
}

export async function handleStockProfitabilityEvent(db: AppDb, eventName: string, aggregateId: string, payload: Record<string, unknown>, storeId?: string) {
  const current = await readStockConfig(db, storeId);
  if (!current.enabled) return;
  if (eventName === "order.created") {
    await snapshotOrder(db, aggregateId, current.config);
  } else if (eventName === `order.${current.config.deductionTiming}` && current.config.deductionTiming !== "order") {
    await snapshotOrder(db, aggregateId, current.config);
    await deductOrderStock(db, aggregateId, current.config, current.storeId);
  } else if (eventName === "order.returned") {
    const lineId = String(payload.productLineId ?? "");
    const returnedQuantity = Number(payload.returnedQuantity ?? 0);
    const resalable = payload.resalable !== false;
    if (lineId) await db.run(sql`UPDATE ext_sp_order_line_costs SET returned_quantity = ${returnedQuantity}, resalable = ${resalable ? 1 : 0}, updated_at = ${new Date().toISOString()} WHERE order_product_id = ${lineId}`);
  }
  if (["order.created", "order.confirmed", "order.dispatched", "order.delivered", "order.returned", "stock.low"].includes(eventName)) {
    await log(db, current.storeId, "info", eventName, "Événement traité par Stock & rentabilité", { aggregateId });
  }
}
