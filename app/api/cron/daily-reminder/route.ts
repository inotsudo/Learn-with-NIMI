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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: targets, error } = await sb.rpc("get_push_reminder_targets");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
