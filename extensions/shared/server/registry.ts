import { sql } from "drizzle-orm";
import type { AppDb } from "../../../cod-server/src/db";

export const STOCK_EXTENSION_ID = "stock-profitability";

export const STOCK_DEFAULT_CONFIG = {
  deductionTiming: "order" as "order" | "confirmed" | "dispatched",
  stockZeroBehavior: "block" as "block" | "warn",
  restockOnReturn: true,
  profitBasis: "delivered" as "delivered" | "forecast",
  lowStockAlert: true,
  lowStockEmail: false,
  defaultPackagingFee: 0,
  defaultConfirmationFee: 0,
  defaultAdCost: 0,
};

export type StockConfig = typeof STOCK_DEFAULT_CONFIG;

export async function extensionStoreId(db: AppDb): Promise<string> {
  const row = await db.get<{ id: string }>(sql`SELECT id FROM stores ORDER BY created_at LIMIT 1`);
  return row?.id ?? "default";
}

export async function readStockConfig(db: AppDb, storeId?: string): Promise<{ enabled: boolean; config: StockConfig; storeId: string }> {
  const resolvedStore = storeId ?? await extensionStoreId(db);
  const row = await db.get<{ enabled: number; config_json: string }>(sql`
    SELECT enabled, config_json FROM extension_registry
    WHERE id = ${STOCK_EXTENSION_ID} AND store_id = ${resolvedStore}
  `);
  let config = { ...STOCK_DEFAULT_CONFIG };
  try { config = { ...config, ...JSON.parse(row?.config_json ?? "{}") }; } catch { /* defaults */ }
  return { enabled: Boolean(row?.enabled), config, storeId: resolvedStore };
}

export async function writeStockConfig(db: AppDb, enabled: boolean, config: StockConfig, storeId?: string) {
  const resolvedStore = storeId ?? await extensionStoreId(db);
  const now = new Date().toISOString();
  await db.run(sql`
    INSERT INTO extension_registry (id, store_id, enabled, config_json, created_at, updated_at)
    VALUES (${STOCK_EXTENSION_ID}, ${resolvedStore}, ${enabled ? 1 : 0}, ${JSON.stringify(config)}, ${now}, ${now})
    ON CONFLICT(id, store_id) DO UPDATE SET enabled = excluded.enabled,
      config_json = excluded.config_json, updated_at = excluded.updated_at
  `);
}

export function sanitizeStockConfig(input: Record<string, unknown>): StockConfig {
  const d = STOCK_DEFAULT_CONFIG;
  const nonNegative = (key: keyof Pick<StockConfig, "defaultPackagingFee" | "defaultConfirmationFee" | "defaultAdCost">) =>
    Math.max(0, Number(input[key] ?? d[key]) || 0);
  return {
    deductionTiming: ["order", "confirmed", "dispatched"].includes(String(input.deductionTiming)) ? input.deductionTiming as StockConfig["deductionTiming"] : d.deductionTiming,
    stockZeroBehavior: input.stockZeroBehavior === "warn" ? "warn" : "block",
    restockOnReturn: input.restockOnReturn !== false,
    profitBasis: input.profitBasis === "forecast" ? "forecast" : "delivered",
    lowStockAlert: input.lowStockAlert !== false,
    lowStockEmail: input.lowStockEmail === true,
    defaultPackagingFee: nonNegative("defaultPackagingFee"),
    defaultConfirmationFee: nonNegative("defaultConfirmationFee"),
    defaultAdCost: nonNegative("defaultAdCost"),
  };
}
