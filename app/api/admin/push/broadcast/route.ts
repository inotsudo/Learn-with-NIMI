import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToParent } from "@/lib/push";
import { getServiceClient } from "@/lib/supabase/serviceClient";

interface BroadcastBody {
  title: string;
  body: string;
  url?: string;
  target_parent_id?: string | null;
}

export async function POST(req: NextRequest) {
  const adminCheck = getServiceClient();
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await sb.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { data: admin } = await adminCheck.from("admins").select("id").eq("id", user.id).maybeSingle();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, url, target_parent_id } = (await req.json()) as BroadcastBody;
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const payload = { title, body, url: url || undefined };

  // Count recipients before sending so the audit row exists before any push fires
  let parentIds: string[] = [];
  if (target_parent_id) {
    parentIds = [target_parent_id];
  } else {
    const { data: subs } = await sb.from("push_subscriptions").select("parent_id");
    parentIds = Array.from(new Set((subs ?? []).map((s) => s.parent_id as string)));
  }

  // Write audit record FIRST — if push fails mid-loop, at least we have a record of intent
  const { data: broadcast, error } = await sb
    .from("push_broadcasts")
    .insert({
      sent_by: user.id,
      title,
      body,
      url: url || null,
      target_parent_id: target_parent_id || null,
      recipient_parents: parentIds.length,
      recipient_devices: 0, // updated below
    })
    .select("*, parents(name, email)")
    .single();

  if (error) {
    const _emsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: _emsg }, { status: 500 });
  }

  // Send all pushes in parallel
  const results = await Promise.allSettled(
    parentIds.map(parentId => sendPushToParent(sb, parentId, payload))
  );
  const recipientDevices = results.reduce((sum, r) =>
    sum + (r.status === "fulfilled" ? r.value.sent : 0), 0
  );

  // Best-effort update with actual device count
  void sb.from("push_broadcasts")
    .update({ recipient_devices: recipientDevices })
    .eq("id", broadcast.id)
    .then(() => {}, () => {});

  return NextResponse.json({ ...broadcast, recipient_devices: recipientDevices });
}
