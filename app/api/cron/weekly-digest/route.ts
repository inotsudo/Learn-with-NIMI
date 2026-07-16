export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWeeklyDigest, type WeeklyDigestChild } from "@/lib/email";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function weekLabel(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(now)}`;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // All parents with an email
  const { data: parents, error: pErr } = await sb
    .from("parents")
    .select("id, email, name")
    .not("email", "is", null);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  let sent = 0;
  const errors: string[] = [];

  for (const parent of parents ?? []) {
    try {
      // Children of this parent
      const { data: children } = await sb
        .from("children")
        .select("id, name, language")
        .eq("parent_id", parent.id);

      if (!children?.length) continue;

      const childDigests: WeeklyDigestChild[] = [];

      for (const child of children) {
        // Missions completed this week
        const { data: missions } = await sb
          .from("child_progress")
          .select("mission_id, stars_earned")
          .eq("child_id", child.id)
          .eq("language", child.language)
          .gte("completed_at", weekAgo);

        const missionsThisWeek = missions?.length ?? 0;
        const starsThisWeek = missions?.reduce((s, m) => s + (m.stars_earned ?? 0), 0) ?? 0;

        // Stories that had at least one mission completed this week
        const { data: storySlots } = missionsThisWeek > 0
          ? await sb
              .from("story_slots")
              .select("story_id")
              .in("mission_id", missions!.map(m => m.mission_id))
          : { data: [] };

        const storiesThisWeek = new Set(storySlots?.map(s => s.story_id) ?? []).size;

        // Streak — count distinct active days in last 30 days
        const { data: actDates } = await sb
          .from("child_progress")
          .select("completed_at")
          .eq("child_id", child.id)
          .eq("language", child.language)
          .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order("completed_at", { ascending: false });

        // Compute current streak from activity dates
        const daySet = new Set(
          (actDates ?? []).map(r => new Date(r.completed_at).toISOString().slice(0, 10))
        );
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (daySet.has(d.toISOString().slice(0, 10))) streak++;
          else if (i > 0) break;
        }

        // Feelings this week
        const { data: feelingRows } = await sb
          .from("story_feelings")
          .select("feeling")
          .eq("child_id", child.id)
          .gte("felt_at", weekAgo);

        const feelings = feelingRows?.map(r => r.feeling) ?? [];

        childDigests.push({
          name: child.name,
          language: child.language,
          missionsThisWeek,
          storiesThisWeek,
          streak,
          starsThisWeek,
          feelings,
        });
      }

      if (!childDigests.length) continue;

      await sendWeeklyDigest({
        to: parent.email,
        parentName: parent.name ?? "there",
        weekOf: weekLabel(),
        children: childDigests,
      });

      sent++;
    } catch (err) {
      errors.push(`${parent.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
