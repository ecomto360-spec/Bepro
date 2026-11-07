import type { APIRoute } from "astro";
import { trackCustomerOrder } from "@/core/api/client";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { orderNumber?: string; phone?: string };
    if (!body.orderNumber || !body.phone) return new Response(JSON.stringify({ error: "Informations requises" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const data = await trackCustomerOrder(body.orderNumber, body.phone);
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Commande introuvable" }, { status: 404 });
  }
};
