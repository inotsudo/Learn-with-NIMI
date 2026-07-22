"use client";

/**
 * ScreenTimePanel — Phase 4.4
 *
 * Parent-facing panel in the Learning tab showing:
 *   · Today's session time vs age-appropriate recommendation
 *   · Status badge (Healthy / Approaching / Over limit)
 *   · 7-day mini bar chart (past week, including today)
 *   · Pediatric screen-time guidelines for this child's age group
 *
 * Fetches data from get_screen_time_summary (migration 121) via the
 * browser Supabase client (parent auth context).
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import supabase from "@/lib/supabaseClient";
import {
  getScreenTimeSummary,
  getThresholds,
  formatDuration,
  type ScreenTimeSummary,
} from "@/lib/screenTime";
import { Bone } from "@/components/ui/Bone";

// ── Status helpers ────────────────────────────────────────────────────────────

type HealthStatus = "healthy" | "approaching" | "over";

function getHealthStatus(todayMinutes: number, breakAfter: number, limit: number): HealthStatus {
  if (todayMinutes >= limit)     return "over";
  if (todayMinutes >= breakAfter) return "approaching";
  return "healthy";
}

const STATUS_CONFIG: Record<HealthStatus, {
  label: string; emoji: string;
  bg: string; border: string; text: string;
  barColor: string;
}> = {
  healthy: {
    label: "Healthy",        emoji: "✓",
    bg: "bg-emerald-50",    border: "border-emerald-200", text: "text-emerald-700",
    barColor: "bg-emerald-500",
  },
  approaching: {
    label: "Near limit",    emoji: "⚠",
    bg: "bg-amber-50",      border: "border-amber-200",   text: "text-amber-700",
    barColor: "bg-amber-400",
  },
  over: {
    label: "Over recommended", emoji: "!",
    bg: "bg-rose-50",       border: "border-rose-200",    text: "text-rose-700",
    barColor: "bg-rose-500",
  },
};

// ── Day label ─────────────────────────────────────────────────────────────────

function shortDayLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getUTCDay()];
}

// ── Tip copy ──────────────────────────────────────────────────────────────────

function getGuidanceTip(ageLabel: string, breakAfter: number, limit: number): string {
  return `For ${ageLabel}, pediatricians suggest a ${breakAfter}-minute session limit with breaks, aiming for under ${limit} minutes of screen time per day. Short, focused sessions tend to lead to better retention.`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  childId:   string;
  childName: string;
  ageYears:  number | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScreenTimePanel({ childId, childName, ageYears }: Props) {
  const [loading,  setLoading]  = useState(true);
  const [summary,  setSummary]  = useState<ScreenTimeSummary | null>(null);

  useEffect(() => {
    setLoading(true);
    setSummary(null);
    void getScreenTimeSummary(supabase, childId).then(s => {
      setSummary(s);
      setLoading(false);
    });
  }, [childId]);

  const thresholds = getThresholds(ageYears);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-ds-border p-5 shadow-ds-card space-y-4" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2">
          <Bone className="w-7 h-7 rounded-lg" />
          <Bone className="h-5 w-32" />
        </div>
        <Bone className="h-4 w-full rounded-full" />
        <div className="flex gap-1.5 items-end h-16">
          {Array.from({ length: 7 }).map((_, i) => (
            <Bone key={i} className="flex-1 rounded-t-md" style={{ height: `${30 + i * 5}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const todaySeconds = summary?.todaySeconds ?? 0;
  const todayMinutes = Math.floor(todaySeconds / 60);
  const todayCount   = summary?.todayCount   ?? 0;
  const weekSeconds  = summary?.weekSeconds  ?? 0;
  const daily        = summary?.dailyBreakdown ?? [];

  const healthStatus = getHealthStatus(todayMinutes, thresholds.breakAfterMinutes, thresholds.limitMinutes);
  const cfg = STATUS_CONFIG[healthStatus];

  const todayPct = Math.min(100, (todayMinutes / thresholds.limitMinutes) * 100);

  // Bar chart: max bar height based on the week's max seconds
  const maxBarSeconds = Math.max(...daily.map(d => d.seconds), 60);

  const noDataToday = todaySeconds === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-ds-border p-5 shadow-ds-card"
      style={{ borderRadius: "var(--leaf-r-lg)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">⏱️</span>
        <h2 className="font-black text-ds-text text-[18px]">Screen Time</h2>
        <span className={`ml-auto text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>

      {/* No data */}
      {noDataToday ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center mb-4">
          <span className="text-3xl">📱</span>
          <p className="font-black text-ds-text text-[15px]">No sessions today</p>
          <p className="text-gray-400 text-[12px] font-nunito">
            {childName}&apos;s app time will appear here once they open the app today.
          </p>
        </div>
      ) : (
        <>
          {/* Today stat row */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex flex-col items-center justify-center w-20 h-20 shrink-0 border-2 rounded-2xl ${cfg.bg} ${cfg.border}`}>
              <span className={`font-black text-[22px] leading-none ${cfg.text}`}>
                {todayMinutes}
              </span>
              <span className={`text-[9px] font-bold ${cfg.text} opacity-70`}>min today</span>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-ds-muted mb-1">
                  <span>0</span>
                  <span>{thresholds.breakAfterMinutes} min break</span>
                  <span>{thresholds.limitMinutes} min limit</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-gray-100 relative">
                  {/* Break threshold marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
                    style={{ left: `${(thresholds.breakAfterMinutes / thresholds.limitMinutes) * 100}%` }}
                  />
                  <motion.div
                    className={`h-full rounded-full ${cfg.barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${todayPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
              {/* Secondary stats */}
              <div className="flex gap-3">
                <span className="text-[11px] text-ds-muted font-semibold">
                  {todayCount} session{todayCount !== 1 ? "s" : ""} today
                </span>
                {weekSeconds > 0 && (
                  <span className="text-[11px] text-ds-muted font-semibold">
                    {formatDuration(weekSeconds)} this week
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 7-day bar chart */}
      {daily.length === 7 && (
        <div className="mb-5">
          <p className="text-[10px] font-black text-ds-muted uppercase tracking-widest mb-3">Past 7 days</p>
          <div className="flex items-end gap-1.5 h-14">
            {daily.map((entry, i) => {
              const isToday = i === daily.length - 1;
              const pct     = maxBarSeconds > 0 ? (entry.seconds / maxBarSeconds) * 100 : 0;
              const mins    = Math.floor(entry.seconds / 60);
              return (
                <div key={entry.date} className="flex flex-col items-center flex-1 gap-1 h-full">
                  <div className="flex-1 flex items-end w-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, entry.seconds > 0 ? 8 : 0)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.04 }}
                      title={mins > 0 ? `${mins} min` : "No session"}
                      className={`w-full rounded-t-sm ${
                        isToday
                          ? cfg.barColor
                          : entry.seconds > 0
                          ? "bg-gray-300"
                          : "bg-gray-100"
                      }`}
                      style={{ minHeight: entry.seconds > 0 ? "4px" : "0" }}
                    />
                  </div>
                  <span className={`text-[8px] font-bold ${isToday ? cfg.text : "text-gray-400"}`}>
                    {shortDayLabel(entry.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Guidelines tip */}
      <div className="flex gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
        <span className="text-[16px] shrink-0">📋</span>
        <p className="text-[11px] text-blue-700 font-semibold leading-relaxed font-nunito">
          {getGuidanceTip(thresholds.ageLabel, thresholds.breakAfterMinutes, thresholds.limitMinutes)}
        </p>
      </div>

      {/* Gentle nudge note */}
      <p className="text-[10px] text-gray-300 font-semibold text-center mt-4">
        Nimi gently suggests breaks to {childName} after {thresholds.breakAfterMinutes} minutes of learning.
      </p>
    </motion.div>
  );
}
