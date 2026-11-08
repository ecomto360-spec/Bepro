import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { AppContext } from "../../../cod-server/src/types";
import { getDb } from "../../../cod-server/src/db";
import { requireScope } from "../../../cod-server/src/rbac/middleware";
import { SCOPES } from "../../../cod-shared/rbac/scopes";
import { readStockConfig, sanitizeStockConfig, writeStockConfig } from "./registry";

export const extensionRegistryRoutes = new Hono<AppContext>();

extensionRegistryRoutes.get("/", requireScope(SCOPES.PRODUCTS_READ), async (c) => {
  const db = getDb(c.env.DB);
  const stock = await readStockConfig(db);
  return c.json({ success: true, data: [{
    id: "stock-profitability",
    name: "Stock & rentabilité",
    version: "1.0.0",
    description: "Inventaire, coûts figés, dépenses et rapports de rentabilité COD.",
    dashboard: "/extensions/stock-profitability",
    enabled: stock.enabled,
    config: stock.config,
    migrations: ["0034_stock_profitability.sql"],
  }] });
});

extensionRegistryRoutes.patch("/stock-profitability", requireScope(SCOPES.PRODUCTS_MANAGE), async (c) => {
  const body = await c.req.json<{ enabled?: boolean; config?: Record<string, unknown> }>();
  const db = getDb(c.env.DB);
  const current = await readStockConfig(db);
  const enabled = typeof body.enabled === "boolean" ? body.enabled : current.enabled;
  const config = sanitizeStockConfig({ ...current.config, ...(body.config ?? {}) });
  await writeStockConfig(db, enabled, config, current.storeId);
  await db.run(sql`INSERT INTO ext_sp_logs (id, store_id, level, action, message, context_json, created_at)
    VALUES (${crypto.randomUUID()}, ${current.storeId}, 'info', 'extension.configured', 'Configuration Stock & rentabilité mise à jour', ${JSON.stringify({ enabled })}, ${new Date().toISOString()})`);
  return c.json({ success: true, data: { enabled, config } });
});

extensionRegistryRoutes.get("/stock-profitability/logs", requireScope(SCOPES.PRODUCTS_READ), async (c) => {
  const db = getDb(c.env.DB);
  const current = await readStockConfig(db);
  const rows = await db.all(sql`SELECT id, level, action, message, context_json AS context, created_at AS createdAt
    FROM ext_sp_logs WHERE store_id = ${current.storeId} ORDER BY created_at DESC LIMIT 200`);
  return c.json({ success: true, data: rows });
});
