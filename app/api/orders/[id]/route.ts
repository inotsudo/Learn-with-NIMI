export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteClient } from "@/lib/supabaseRouteClient";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH /api/orders/:id — supports { action: "cancel" } to cancel a pending order
// Called when a CyberSource modal is closed before payment is submitted.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createRouteClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let action: string | undefined;
    try { ({ action } = await req.json()); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
    if (action !== "cancel") return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const { data: order } = await serviceSupabase
      .from("orders")
      .select("id, parent_id, payment_status")
      .eq("id", id)
      .single();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.parent_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (order.payment_status !== "pending") {
      // Already progressed (processing, completed, failed) — silently succeed so the client isn't confused
      return NextResponse.json({ success: true, skipped: true });
    }

    await serviceSupabase.from("orders").update({ payment_status: "cancelled" }).eq("id", id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
