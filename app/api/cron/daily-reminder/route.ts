import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToParent } from "@/lib/push";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error("[daily-reminder] VAPID keys not configured — skipping");
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: targets, error } = await sb.rpc("get_push_reminder_targets");
    if (error) {
      console.error("[daily-reminder] RPC error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by parent — one parent may have multiple children
    const byParent = new Map<string, Array<{
      child_name: string;
      had_activity_yesterday: boolean;
      streak_broke: boolean;
    }>>();

    for (const row of targets ?? []) {
      const list = byParent.get(row.parent_id) ?? [];
      list.push({
        child_name: row.child_name,
        had_activity_yesterday: row.had_activity_yesterday,
        streak_broke: row.streak_broke,
      });
      byParent.set(row.parent_id, list);
    }

    let sent = 0;
    let failed = 0;

    for (const [parentId, children] of byParent) {
      // Pick the most urgent child story (streak_broke > streak_at_risk > generic)
      const broke  = children.find(c => c.streak_broke);
      const atRisk = children.find(c => c.had_activity_yesterday && !c.streak_broke);
      const any    = children[0];

      let title: string;
      let body: string;

      if (broke) {
        // Streak just broke — recovery nudge
        const name = broke.child_name;
        title = "💪 Fresh start today!";
        body  = children.length === 1
          ? `${name}'s streak ended yesterday — but today is a new day! Open NIMIPIKO and keep the adventure going. 🌟`
          : `One of your learners missed yesterday — today is a fresh start! Open NIMIPIKO now. 🌟`;
      } else if (atRisk) {
        // Active streak, nothing done today yet — highest urgency
        const name = atRisk.child_name;
        title = "🔥 Streak on the line!";
        body  = children.length === 1
          ? `${name} was on a roll! Don't break the streak — open NIMIPIKO for today's adventure.`
          : `Your NIMIPIKO learners were on a roll! Keep those streaks alive — open the app now.`;
      } else {
        // Generic reminder — first time or no recent activity
        const name = any.child_name;
        title = "NIMIPIKO Reminder";
        body  = children.length === 1
          ? `👋 ${name} hasn't done today's NIMIPIKO adventure yet! 🌟`
          : `👋 Your NIMIPIKO learners haven't done today's adventure yet! 🌟`;
      }

      const result = await sendPushToParent(sb, parentId, { title, body, url: "/" });
      if (result.sent > 0) sent++;
      else failed++;
    }

    console.log(`[daily-reminder] targets=${byParent.size} sent=${sent} failed=${failed}`);
    return NextResponse.json({ targets: byParent.size, sent, failed });
  } catch (err: unknown) {
    console.error("[daily-reminder] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
