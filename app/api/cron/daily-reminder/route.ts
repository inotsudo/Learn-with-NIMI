import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToParent } from "@/lib/push";
import { generateProactiveSuggestions } from "@/lib/intelligence/proactiveEngine";
import { bestSuggestionForPush } from "@/lib/intelligence/proactiveEngine";
import { sendTrialEndingSoon, sendTrialExpired } from "@/lib/email";
import type { LearnerMemory, LearnerContext } from "@/lib/ai/types";

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
    // Expire any trials whose 7-day window has passed (fire-and-forget, non-fatal)
    void sb.rpc("expire_trial_subscriptions");

    // ── Trial lifecycle emails ────────────────────────────────────────────────
    // Run in parallel; failures are non-fatal so the push loop still runs.
    void (async () => {
      try {
        const now = new Date();

        // 1. Trials expiring in exactly 3 days — send "ending soon" warning
        // 2. Trials expiring in exactly 1 day — send urgent warning
        // We check a ±12 h window around each threshold to avoid double-sends.
        const in3days = new Date(now.getTime() + 3 * 86_400_000);
        const in1day  = new Date(now.getTime() + 1 * 86_400_000);

        const { data: endingSoon } = await sb
          .from("nimipiko_subscriptions")
          .select("parent_id, current_period_end")
          .eq("payment_provider", "trial")
          .eq("status", "active")
          .or(
            // 3-day window: expires between now+2.5d and now+3.5d
            `current_period_end.gte.${new Date(in3days.getTime() - 12 * 3600_000).toISOString()},` +
            `current_period_end.lte.${new Date(in3days.getTime() + 12 * 3600_000).toISOString()}`,
          );

        const { data: endingTomorrow } = await sb
          .from("nimipiko_subscriptions")
          .select("parent_id, current_period_end")
          .eq("payment_provider", "trial")
          .eq("status", "active")
          .gte("current_period_end", new Date(in1day.getTime() - 12 * 3600_000).toISOString())
          .lte("current_period_end", new Date(in1day.getTime() + 12 * 3600_000).toISOString());

        // 3. Trials that just expired in the last 25 hours
        const { data: justExpired } = await sb
          .from("nimipiko_subscriptions")
          .select("parent_id")
          .eq("payment_provider", "trial")
          .eq("status", "expired")
          .gte("updated_at", new Date(now.getTime() - 25 * 3600_000).toISOString());

        const parentIds = new Set<string>([
          ...(endingSoon ?? []).map((r: { parent_id: string }) => r.parent_id),
          ...(endingTomorrow ?? []).map((r: { parent_id: string }) => r.parent_id),
          ...(justExpired ?? []).map((r: { parent_id: string }) => r.parent_id),
        ]);

        if (parentIds.size === 0) return;

        // Fetch auth emails for all affected parents in one call
        for (const parentId of parentIds) {
          try {
            const { data: authUser } = await sb.auth.admin.getUserById(parentId);
            const email = authUser?.user?.email;
            if (!email) continue;

            const { data: parentRow } = await sb
              .from("parents")
              .select("name")
              .eq("id", parentId)
              .maybeSingle();
            const name = (parentRow?.name as string | null) ?? "there";

            const expiringSoon3 = (endingSoon ?? []).find((r: { parent_id: string }) => r.parent_id === parentId);
            const expiringSoon1 = (endingTomorrow ?? []).find((r: { parent_id: string }) => r.parent_id === parentId);
            const expired = (justExpired ?? []).find((r: { parent_id: string }) => r.parent_id === parentId);

            if (expiringSoon3) {
              await sendTrialEndingSoon({ to: email, parentName: name, daysLeft: 3, expiresOn: expiringSoon3.current_period_end as string });
              void sendPushToParent(sb, parentId, {
                title: "⏳ 3 days left on your free trial",
                body: `${name}, your NIMIPIKO trial ends in 3 days. Subscribe to keep full access.`,
                url: "/pricing",
              });
            } else if (expiringSoon1) {
              await sendTrialEndingSoon({ to: email, parentName: name, daysLeft: 1, expiresOn: expiringSoon1.current_period_end as string });
              void sendPushToParent(sb, parentId, {
                title: "⚡ Trial ends tomorrow!",
                body: "Subscribe now to keep all stories, unlimited Nimi AI, and certificates.",
                url: "/pricing",
              });
            } else if (expired) {
              await sendTrialExpired({ to: email, parentName: name });
              void sendPushToParent(sb, parentId, {
                title: "Your free trial has ended",
                body: "You're on the free plan now. Subscribe to restore full Club access.",
                url: "/pricing",
              });
            }
          } catch (inner) {
            console.error("[daily-reminder] trial email failed for", parentId, inner);
          }
        }
      } catch (err) {
        console.error("[daily-reminder] trial email batch failed:", err);
      }
    })();
    // ── End trial lifecycle emails ────────────────────────────────────────────

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
      // Pick the most urgent child (streak_broke > streak_at_risk > any)
      const broke  = children.find(c => c.streak_broke);
      const atRisk = children.find(c => c.had_activity_yesterday && !c.streak_broke);
      const any    = children[0];

      // Determine the primary child for this notification
      const primary = broke ?? atRisk ?? any;

      let title = "NIMIPIKO Reminder";
      let body  = `👋 ${any.child_name} hasn't done today's NIMIPIKO adventure yet! 🌟`;

      // Try to get a personalised proactive suggestion for the primary child
      // (non-fatal — falls back to template copy if anything fails)
      let usedProactive = false;
      try {
        const { data: childRow } = await sb
          .from("children")
          .select("id, language")
          .eq("parent_id", parentId)
          .eq("name", primary.child_name)
          .maybeSingle();

        if (childRow?.id) {
          const [ctxResult, memoriesResult] = await Promise.allSettled([
            sb.rpc("get_learner_context",  { p_child_id: childRow.id }),
            sb.rpc("get_learner_memories", { p_child_id: childRow.id, p_types: null }),
          ]);

          const ctx = ctxResult.status === "fulfilled"
            ? (ctxResult.value.data as LearnerContext | null)
            : null;
          const memories = memoriesResult.status === "fulfilled"
            ? ((memoriesResult.value.data as LearnerMemory[] | null) ?? [])
            : [];

          if (ctx) {
            const lang = (["en", "fr", "rw"].includes(childRow.language ?? "")
              ? childRow.language : "en") as "en" | "fr" | "rw";
            const suggestions = generateProactiveSuggestions(ctx, memories, 0, lang);
            const best = bestSuggestionForPush(suggestions);
            if (best) {
              title = best.title;
              body  = best.message;
              usedProactive = true;
            }
          }
        }
      } catch {
        // silently fall back to template copy below
      }

      if (!usedProactive) {
        if (broke) {
          const name = broke.child_name;
          title = "💪 Fresh start today!";
          body  = children.length === 1
            ? `${name}'s streak ended yesterday — but today is a new day! Open NIMIPIKO and keep the adventure going. 🌟`
            : `One of your learners missed yesterday — today is a fresh start! Open NIMIPIKO now. 🌟`;
        } else if (atRisk) {
          const name = atRisk.child_name;
          title = "🔥 Streak on the line!";
          body  = children.length === 1
            ? `${name} was on a roll! Don't break the streak — open NIMIPIKO for today's adventure.`
            : `Your NIMIPIKO learners were on a roll! Keep those streaks alive — open the app now.`;
        } else {
          const name = any.child_name;
          title = "NIMIPIKO Reminder";
          body  = children.length === 1
            ? `👋 ${name} hasn't done today's NIMIPIKO adventure yet! 🌟`
            : `👋 Your NIMIPIKO learners haven't done today's adventure yet! 🌟`;
        }
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
