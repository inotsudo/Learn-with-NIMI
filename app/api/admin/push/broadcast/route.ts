import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToParent } from "@/lib/push";

// Service-role client used exclusively for the admins-table lookup so the
// check does not depend on RLS being correctly configured.
const adminCheck = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface BroadcastBody {
  title: string;
  body: string;
  url?: string;
  target_parent_id?: string | null;
}

export async function POST(req: NextRequest) {
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
  let recipientParents = 0;
  let recipientDevices = 0;

  if (target_parent_id) {
    const result = await sendPushToParent(sb, target_parent_id, payload);
    recipientParents = 1;
    recipientDevices = result.sent;
  } else {
    const { data: subs } = await sb.from("push_subscriptions").select("parent_id");
    const parentIds = Array.from(new Set((subs ?? []).map((s) => s.parent_id as string)));
    recipientParents = parentIds.length;
    for (const parentId of parentIds) {
      const result = await sendPushToParent(sb, parentId, payload);
      recipientDevices += result.sent;
    }
  }

  const { data: broadcast, error } = await sb
    .from("push_broadcasts")
    .insert({
      sent_by: user.id,
      title,
      body,
      url: url || null,
      target_parent_id: target_parent_id || null,
      recipient_parents: recipientParents,
      recipient_devices: recipientDevices,
    })
    .select("*, parents(name, email)")
    .single();

  if (error) {
    const _emsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: _emsg }, { status: 500 });
  }

  return NextResponse.json(broadcast);
}
