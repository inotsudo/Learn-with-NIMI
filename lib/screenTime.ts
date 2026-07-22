"use client";

/**
 * Screen Time — Phase 4.4
 *
 * Tracks active session duration, computes age-appropriate thresholds,
 * and surfaces gentle break/limit signals without blocking learning.
 *
 * Key exports:
 *   useScreenTime — React hook for the child-facing session (talk-to-nimi)
 *   getScreenTimeSummary — data loader for the parent dashboard panel
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import supabase from "./supabaseClient";

// ── Thresholds ────────────────────────────────────────────────────────────────
// Based on WHO and pediatric screen-time recommendations.
// breakAfterMinutes: gentle nudge ("take a short break")
// limitMinutes:      stronger nudge ("that's enough for now")

export interface ScreenTimeThresholds {
  breakAfterMinutes: number;
  limitMinutes:      number;
  ageLabel:          string;
}

export function getThresholds(ageYears: number | null): ScreenTimeThresholds {
  const age = ageYears ?? 7;
  if (age <= 4)  return { breakAfterMinutes: 15, limitMinutes: 20, ageLabel: "ages 3–4"  };
  if (age <= 7)  return { breakAfterMinutes: 20, limitMinutes: 30, ageLabel: "ages 5–7"  };
  if (age <= 10) return { breakAfterMinutes: 25, limitMinutes: 40, ageLabel: "ages 8–10" };
  return               { breakAfterMinutes: 30, limitMinutes: 50, ageLabel: "ages 11+"  };
}

// ── Offline activity suggestions ──────────────────────────────────────────────

export const OFFLINE_ACTIVITIES = [
  "Draw a picture of your favourite story character",
  "Count how many colourful things you can find in the room",
  "Tell a family member one thing you learned today",
  "Sing your favourite song out loud",
  "Go outside (or open a window) and take 5 deep breaths",
  "Do 10 jumping jacks and stretch your arms wide",
  "Grab a glass of water — your brain loves staying hydrated!",
  "Draw your own storybook page and show someone",
  "Find 5 objects that start with the same letter",
  "Make up a short story and tell it to your favourite toy",
];

export function randomActivity(): string {
  return OFFLINE_ACTIVITIES[Math.floor(Math.random() * OFFLINE_ACTIVITIES.length)];
}

// ── Status ────────────────────────────────────────────────────────────────────

export type ScreenTimeStatus = "ok" | "break_suggested" | "over_limit";

function computeStatus(
  elapsedMinutes: number,
  thresholds: ScreenTimeThresholds,
  dismissedUntil: number | null,
): ScreenTimeStatus {
  if (dismissedUntil && Date.now() < dismissedUntil) return "ok";
  if (elapsedMinutes >= thresholds.limitMinutes)      return "over_limit";
  if (elapsedMinutes >= thresholds.breakAfterMinutes) return "break_suggested";
  return "ok";
}

// ── useScreenTime hook ────────────────────────────────────────────────────────

export interface ScreenTimeState {
  elapsedSeconds:  number;
  elapsedMinutes:  number;        // floored integer
  status:          ScreenTimeStatus;
  thresholds:      ScreenTimeThresholds;
  offlineSuggestion: string;
  dismiss: () => void;            // snooze nudge for 15 min
}

/**
 * Tracks a child's app session duration.
 *
 * - Registers a session row in child_sessions on mount (when childId is known)
 * - Ends the session on unmount and on beforeunload
 * - Increments a second-level timer for in-UI status computation
 * - Exposes dismiss() to snooze the break nudge for 15 minutes
 */
export function useScreenTime(
  childId:  string | null,
  ageYears: number | null,
): ScreenTimeState {
  const [elapsedSeconds,  setElapsedSeconds]  = useState(0);
  const [dismissedUntil,  setDismissedUntil]  = useState<number | null>(null);
  const [offlineSuggestion] = useState(() => randomActivity());

  const sessionIdRef = useRef<string | null>(null);
  const childIdRef   = useRef<string | null>(null);

  // Start session when childId becomes available
  useEffect(() => {
    if (!childId) return;
    childIdRef.current = childId;

    let isMounted = true;

    const startSession = async () => {
      const { data, error } = await supabase.rpc("start_child_session", {
        p_child_id: childId,
      });
      if (isMounted && !error && data) {
        sessionIdRef.current = data as string;
      }
    };

    void startSession();

    // Second-by-second timer
    const timer = setInterval(() => {
      if (isMounted) setElapsedSeconds(s => s + 1);
    }, 1_000);

    const endSession = () => {
      const sid = sessionIdRef.current;
      const cid = childIdRef.current;
      if (!sid || !cid) return;
      sessionIdRef.current = null;
      // Fire-and-forget — keepalive ensures the request completes even on unload
      void supabase.rpc("end_child_session", {
        p_session_id: sid,
        p_child_id:   cid,
      });
    };

    const handleUnload = () => endSession();
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      isMounted = false;
      clearInterval(timer);
      window.removeEventListener("beforeunload", handleUnload);
      endSession();
    };
  }, [childId]);

  const thresholds = getThresholds(ageYears);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const status = computeStatus(elapsedMinutes, thresholds, dismissedUntil);

  const dismiss = useCallback(() => {
    setDismissedUntil(Date.now() + 15 * 60 * 1_000); // snooze 15 min
  }, []);

  return {
    elapsedSeconds,
    elapsedMinutes,
    status,
    thresholds,
    offlineSuggestion,
    dismiss,
  };
}

// ── getScreenTimeSummary ──────────────────────────────────────────────────────

export interface DailyEntry {
  date:    string;   // ISO date string "YYYY-MM-DD"
  seconds: number;
}

export interface ScreenTimeSummary {
  todaySeconds:   number;
  todayCount:     number;
  weekSeconds:    number;
  dailyBreakdown: DailyEntry[];  // 7 entries, oldest → today
}

export async function getScreenTimeSummary(
  client:  SupabaseClient,
  childId: string,
): Promise<ScreenTimeSummary> {
  const { data, error } = await client.rpc("get_screen_time_summary", {
    p_child_id: childId,
  });

  if (error || !data) {
    return {
      todaySeconds:   0,
      todayCount:     0,
      weekSeconds:    0,
      dailyBreakdown: [],
    };
  }

  const d = data as {
    today_seconds:   number;
    today_count:     number;
    week_seconds:    number;
    daily_breakdown: DailyEntry[];
  };

  return {
    todaySeconds:   d.today_seconds   ?? 0,
    todayCount:     d.today_count     ?? 0,
    weekSeconds:    d.week_seconds    ?? 0,
    dailyBreakdown: d.daily_breakdown ?? [],
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds < 60)  return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${m} min`;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}
