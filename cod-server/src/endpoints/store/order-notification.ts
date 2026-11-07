import { eq } from "drizzle-orm";
import type { AppDb } from "@/db";
import { users } from "@/db/schema";
import { sendTransactionalEmail } from "../../../../cod-shared/lib/transactional-email";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}

/** Best effort: order creation never depends on email provider availability. */
export async function sendNewOrderEmail(
  db: AppDb,
  input: { orderId: string; orderNumber: string; customerName: string; phone: string; total: number },
) {
  try {
    const admin = await db.select({ email: users.email }).from(users).where(eq(users.role, "admin")).limit(1).get();
    if (!admin) return { sent: false, error: null };
    const customer = escapeHtml(input.customerName);
    const phone = escapeHtml(input.phone);
    return await sendTransactionalEmail(db, {
      to: admin.email,
      subject: `Nouvelle commande ${input.orderNumber} — bepro`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1 style="color:#075bbf">Nouvelle commande bepro</h1><p><strong>${escapeHtml(input.orderNumber)}</strong></p><p>Client : ${customer}<br>Téléphone : ${phone}<br>Total COD : ${input.total.toLocaleString("fr-DZ")} DA</p><p>Ouvrez le dashboard CodFlow pour confirmer et traiter cette commande.</p></div>`,
      text: `Nouvelle commande ${input.orderNumber}. Client : ${input.customerName}. Téléphone : ${input.phone}. Total COD : ${input.total} DA.`,
      idempotencyKey: `new-order-${input.orderId}`,
    });
  } catch {
    return { sent: false, error: "transient" };
  }
}
