import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToParent } from "@/lib/push";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: targets, error } = await sb.rpc("get_push_reminder_targets");
  if (error) {
    const _emsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: _emsg }, { status: 500 });
  }

  const byParent = new Map<string, { child_name: string }[]>();
  for (const row of targets ?? []) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push({ child_name: row.child_name });
    byParent.set(row.parent_id, list);
  }

  for (const [parentId, children] of byParent) {
    const body =
      children.length === 1
        ? `👋 ${children[0].child_name} hasn't done today's NIMIPIKO adventure yet! 🌟`
        : `👋 Your NIMIPIKO learners haven't done today's adventure yet! 🌟`;

    await sendPushToParent(sb, parentId, {
      title: "NIMIPIKO Reminder",
      body,
      url: "/",
    });
  }

  return NextResponse.json({ remindersSent: byParent.size });
}
