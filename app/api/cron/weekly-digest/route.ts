export const runtime = "nodejs";
export const maxDuration = 300;

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

      // Fetch all data for all children in parallel — one Promise.all per parent
      // instead of 4 sequential queries per child (which causes timeouts at scale).
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const childIds = children.map(c => c.id);

      const [missionsRes, actDatesRes, feelingsRes] = await Promise.all([
        sb.from("child_progress")
          .select("child_id, mission_id, stars_earned, language")
          .in("child_id", childIds)
          .gte("completed_at", weekAgo),
        sb.from("child_progress")
          .select("child_id, completed_at, language")
          .in("child_id", childIds)
          .gte("completed_at", thirtyDaysAgo),
        sb.from("story_feelings")
          .select("child_id, feeling")
          .in("child_id", childIds)
          .gte("felt_at", weekAgo),
      ]);

      // Collect all mission_ids this week to batch-fetch story_slots
      const weekMissions = missionsRes.data ?? [];
      const allMissionIds = [...new Set(weekMissions.map(m => m.mission_id))];
      const { data: storySlotRows } = allMissionIds.length > 0
        ? await sb.from("story_slots").select("mission_id, story_id").in("mission_id", allMissionIds)
        : { data: [] };
      const missionToStory = new Map((storySlotRows ?? []).map(r => [r.mission_id, r.story_id]));

      const today = new Date();
      const childDigests: WeeklyDigestChild[] = [];

      for (const child of children) {
        const missions = weekMissions.filter(m => m.child_id === child.id && m.language === child.language);
        const missionsThisWeek = missions.length;
        const starsThisWeek = missions.reduce((s, m) => s + (m.stars_earned ?? 0), 0);
        const storiesThisWeek = new Set(missions.map(m => missionToStory.get(m.mission_id)).filter(Boolean)).size;

        const actDates = (actDatesRes.data ?? [])
          .filter(r => r.child_id === child.id && r.language === child.language);
        const daySet = new Set(actDates.map(r => new Date(r.completed_at).toISOString().slice(0, 10)));
        let streak = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (daySet.has(d.toISOString().slice(0, 10))) streak++;
          else if (i > 0) break;
        }

        const feelings = (feelingsRes.data ?? [])
          .filter(r => r.child_id === child.id)
          .map(r => r.feeling);

        childDigests.push({ name: child.name, language: child.language, missionsThisWeek, storiesThisWeek, streak, starsThisWeek, feelings });
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
