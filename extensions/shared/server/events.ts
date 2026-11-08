import { sql } from "drizzle-orm";
import type { Context } from "hono";
import type { AppContext } from "../../../cod-server/src/types";
import { getDb } from "../../../cod-server/src/db";
import { extensionStoreId, readStockConfig } from "./registry";

export type ExtensionEventName = "order.created" | "order.confirmed" | "order.dispatched" | "order.delivered" | "order.returned" | "stock.low";

/** Couplage uniquement par événement : une extension désactivée ne reçoit rien. */
export async function emitExtensionEvent(c: Context<AppContext>, eventName: ExtensionEventName, aggregateId: string, payload: Record<string, unknown> = {}) {
  const db = getDb(c.env.DB);
  const storeId = c.get("storeId") ?? await extensionStoreId(db);
  const current = await readStockConfig(db, storeId);
  if (!current.enabled) return;
  const now = new Date().toISOString();
  await db.run(sql`INSERT INTO ext_sp_events (id, store_id, event_name, aggregate_id, payload_json, status, attempts, created_at)
    VALUES (${crypto.randomUUID()}, ${storeId}, ${eventName}, ${aggregateId}, ${JSON.stringify(payload)}, 'pending', 0, ${now})
    ON CONFLICT(event_name, aggregate_id) DO NOTHING`);
  const task = (async () => {
    try {
      const { handleStockProfitabilityEvent } = await import("../../stock-profitability/server/listener");
      await handleStockProfitabilityEvent(db, eventName, aggregateId, payload, storeId);
      await db.run(sql`UPDATE ext_sp_events SET status = 'processed', attempts = attempts + 1, processed_at = ${new Date().toISOString()}, last_error = NULL WHERE event_name = ${eventName} AND aggregate_id = ${aggregateId}`);
    } catch (error) {
      await db.run(sql`UPDATE ext_sp_events SET status = 'failed', attempts = attempts + 1, last_error = ${error instanceof Error ? error.message : String(error)} WHERE event_name = ${eventName} AND aggregate_id = ${aggregateId}`);
      console.error(`[extension:${eventName}]`, error);
    }
  })();
  c.executionCtx.waitUntil(task);
}
