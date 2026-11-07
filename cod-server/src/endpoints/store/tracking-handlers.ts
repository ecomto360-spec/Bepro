import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { orders, orderProducts, wilayas } from "@/db/schema";

const trackingInput = z.object({
  orderNumber: z.string().trim().min(4).max(64),
  phone: z.string().trim().min(9).max(20),
});

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^00213/.test(digits)) return `0${digits.slice(5)}`;
  if (/^213/.test(digits)) return `0${digits.slice(3)}`;
  return digits;
}

export function publicOrderStatus(status: string): "pending" | "confirmed" | "dispatched" | "delivered" | "returned" {
  if (["delivered"].includes(status)) return "delivered";
  if (["returned", "cancelled"].includes(status)) return "returned";
  if (["dispatched", "out_for_delivery", "assigned"].includes(status)) return "dispatched";
  if (["confirmed", "preparing", "ready"].includes(status)) return "confirmed";
  return "pending";
}

export async function trackOrderHandler(c: Context<AppContext>) {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Requête invalide" }, 400); }
  const parsed = trackingInput.safeParse(body);
  if (!parsed.success) return c.json({ error: "Numéro de commande ou téléphone invalide" }, 400);

  const db = getDb(c.env.DB);
  const order = await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    status: orders.status,
    phone: orders.phone,
    total: orders.codAmount,
    deliveryFee: orders.deliveryFee,
    deliveryType: orders.deliveryType,
    createdAt: orders.createdAt,
    wilayaId: orders.wilayaId,
    communeId: orders.communeId,
  }).from(orders).where(eq(orders.orderNumber, parsed.data.orderNumber)).get();

  if (!order || normalizePhone(order.phone) !== normalizePhone(parsed.data.phone)) {
    return c.json({ error: "Commande introuvable. Vérifiez les informations saisies." }, 404);
  }

  const [items, wilaya] = await Promise.all([
    db.select({ productName: orderProducts.productName, variantLabel: orderProducts.variantLabel, quantity: orderProducts.quantity, total: orderProducts.lineTotal }).from(orderProducts).where(eq(orderProducts.orderId, order.id)).all(),
    order.wilayaId == null ? Promise.resolve(undefined) : db.select({ name: wilayas.name, nameAr: wilayas.nameAr }).from(wilayas).where(eq(wilayas.id, order.wilayaId)).get(),
  ]);

  return c.json({ success: true, data: {
    orderNumber: order.orderNumber,
    status: publicOrderStatus(order.status),
    total: order.total,
    deliveryFee: order.deliveryFee,
    deliveryType: order.deliveryType,
    createdAt: order.createdAt,
    destination: { wilaya: wilaya?.name ?? "", wilayaAr: wilaya?.nameAr ?? "" },
    items,
  } });
}
