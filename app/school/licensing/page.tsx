"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, AlertTriangle, RefreshCw } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useSchool } from "@/components/school/SchoolContext";
import {
  PageHeader, SectionCard, StatCard,
  NoSchoolGate, ProgressBar, Table,
} from "@/components/school/SchoolUI";

const G = "#15803D";

const LICENSE_META: Record<string, { label: string; color: string; features: string[] }> = {
  trial:      {
    label: "Trial",      color: "#F59E0B",
    features: ["Up to 30 learners", "All stories", "Basic analytics", "30-day trial"],
  },
  standard:   {
    label: "Standard",   color: "#3B82F6",
    features: ["Up to 100 learners", "All stories & missions", "Full analytics", "Priority support"],
  },
  premium:    {
    label: "Premium",    color: "#8B5CF6",
    features: ["Up to 500 learners", "Curriculum CMS access", "Custom reports", "Dedicated CSM"],
  },
  enterprise: {
    label: "Enterprise", color: G,
    features: ["Unlimited learners", "White-label option", "API access", "SLA guarantee"],
  },
};

interface LicenseData {
  license_type:          string;
  seat_count:            number;
  seats_used:            number;
  seats_free:            number;
  license_start:         string | null;
  license_end:           string | null;
  auto_renew:            boolean;
  days_remaining:        number | null;
  class_seats:           { class_name: string; teacher_name: string; seat_count: number }[];
  // ROI metrics
  total_missions:        number;
  estimated_learning_min: number;
  stories_mastered:      number;
  active_languages:      number;
}

function DonutChart({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke="#F3F4F6" strokeWidth={12} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={12}
        strokeDasharray={`${circ}`}
        strokeDashoffset={circ}
        strokeLinecap="round"
        style={{ transformOrigin: "50% 50%", rotate: "-90deg" }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill="#111827" fontSize={18} fontWeight={900}>
        {pct}%
      </text>
    </svg>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function LicensingDashboardPage() {
  const { school, loading: schoolLoading } = useSchool();
  const [data,    setData]    = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school) return;
    void (async () => {
      try {
        const { data: raw } = await supabase.rpc("get_school_license_info", {
          p_school_id: school.school_id,
        });
        setData(raw as LicenseData);
      } finally {
        setLoading(false);
      }
    })();
  }, [school]);

  if (schoolLoading || (loading && school)) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!school) return <NoSchoolGate />;

  const d = data;
  const seatPct = d ? Math.round((d.seats_used / Math.max(d.seat_count, 1)) * 100) : 0;
  const meta    = LICENSE_META[d?.license_type ?? "standard"] ?? LICENSE_META.standard;
  const isExpiringSoon = d?.days_remaining != null && d.days_remaining <= 30;
  const isExpired      = d?.days_remaining != null && d.days_remaining === 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Licensing Dashboard"
        subtitle="Seat usage, license status and renewal management"
      />

      {/* Expiry alert */}
      {(isExpiringSoon || isExpired) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 rounded-2xl border flex items-start gap-3"
          style={{
            background: isExpired ? "#FEF2F2" : "#FFFBEB",
            borderColor: isExpired ? "#FECACA" : "#FDE68A",
          }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: isExpired ? "#EF4444" : "#F59E0B" }} />
          <div>
            <p className="font-black text-[13px]" style={{ color: isExpired ? "#B91C1C" : "#92400E" }}>
              {isExpired
                ? "License has expired — learner access may be restricted"
                : `License expires in ${d?.days_remaining} days`}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: isExpired ? "#DC2626" : "#B45309" }}>
              Contact your account manager or email schools@nimipiko.com to renew.
            </p>
          </div>
          <a href="mailto:schools@nimipiko.com"
            className="shrink-0 ml-auto px-4 py-2 rounded-xl text-[12px] font-black text-white transition hover:opacity-90"
            style={{ background: isExpired ? "#EF4444" : "#F59E0B" }}>
            Renew Now
          </a>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Seat usage donut */}
        <SectionCard title="Seat Usage">
          <div className="flex flex-col items-center gap-4">
            <DonutChart
              pct={seatPct}
              color={seatPct >= 90 ? "#EF4444" : seatPct >= 70 ? "#F59E0B" : G}
            />
            <div className="grid grid-cols-3 w-full gap-3 text-center">
              <div>
                <p className="font-black text-[20px] text-gray-900">{d?.seat_count ?? 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total</p>
              </div>
              <div>
                <p className="font-black text-[20px]" style={{ color: G }}>{d?.seats_used ?? 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Used</p>
              </div>
              <div>
                <p className="font-black text-[20px] text-gray-400">{d?.seats_free ?? 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Free</p>
              </div>
            </div>
            {seatPct >= 80 && (
              <a href="mailto:schools@nimipiko.com"
                className="w-full py-2.5 rounded-xl text-[13px] font-black text-white text-center block hover:opacity-90 transition"
                style={{ background: G }}>
                + Add More Seats
              </a>
            )}
          </div>
        </SectionCard>

        {/* License details */}
        <SectionCard title="License Details" className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `${meta.color}18` }}>
              <BadgeCheck className="w-6 h-6" style={{ color: meta.color }} />
            </div>
            <div>
              <p className="font-black text-[18px] text-gray-900">{meta.label} Plan</p>
              <p className="text-[12px] text-gray-400 font-medium">
                {school.school_name} · {school.country}
              </p>
            </div>
            <span className="ml-auto text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: `${meta.color}18`, color: meta.color }}>
              {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : "Active"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-[13px]">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Start Date</p>
              <p className="font-bold text-gray-800">{fmtDate(d?.license_start ?? null)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">End Date</p>
              <p className="font-bold text-gray-800">{fmtDate(d?.license_end ?? null)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Auto-Renew</p>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" style={{ color: d?.auto_renew ? G : "#9CA3AF" }} />
                <span className="font-bold" style={{ color: d?.auto_renew ? G : "#9CA3AF" }}>
                  {d?.auto_renew ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Days Remaining</p>
              <p className="font-black text-[16px]"
                style={{ color: isExpired ? "#EF4444" : isExpiringSoon ? "#F59E0B" : G }}>
                {d?.days_remaining != null ? `${d.days_remaining} days` : "No expiry"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Plan Features</p>
            <div className="flex flex-wrap gap-2">
              {meta.features.map(f => (
                <span key={f} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${meta.color}12`, color: meta.color }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Seat breakdown by class */}
      <SectionCard title="Seats by Class">
        {(d?.class_seats ?? []).length === 0 ? (
          <p className="text-[13px] text-gray-400 py-4 text-center">
            No classes linked yet. Teachers can join via their class code.
          </p>
        ) : (
          <>
            <Table
              headers={["Class", "Teacher", "Seats Used", "% of Total"]}
              rows={(d?.class_seats ?? []).map(c => {
                const pct = d ? Math.round((c.seat_count / d.seat_count) * 100) : 0;
                return [
                  <span key="cls" className="font-bold text-gray-800">{c.class_name}</span>,
                  <span key="tch" className="text-gray-600">{c.teacher_name || "—"}</span>,
                  <span key="cnt" className="font-black" style={{ color: G }}>{c.seat_count}</span>,
                  <div key="pct" className="flex items-center gap-3 min-w-[100px]">
                    <div className="flex-1">
                      <ProgressBar pct={pct} color={G} height={4} />
                    </div>
                    <span className="text-[11px] font-black text-gray-500 w-8 text-right">{pct}%</span>
                  </div>,
                ];
              })}
            />
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-[13px]">
              <span className="text-gray-500 font-medium">Unassigned seats</span>
              <span className="font-black text-gray-800">{d?.seats_free ?? 0}</span>
            </div>
          </>
        )}
      </SectionCard>

      {/* ROI metrics */}
      <SectionCard title="License ROI — Learning Impact" className="mt-5">
        <p className="text-[11px] text-gray-400 mb-4">
          These numbers help demonstrate the value of your Nimipiko license to school leadership and boards.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              emoji: "⚡",
              label: "Missions Completed",
              value: d?.total_missions ?? 0,
              sub: "all time, all learners",
              color: G,
            },
            {
              emoji: "⏱️",
              label: "Learning Time",
              value: d
                ? d.estimated_learning_min >= 60
                  ? `${Math.round(d.estimated_learning_min / 60)}h ${d.estimated_learning_min % 60}m`
                  : `${d.estimated_learning_min}m`
                : "—",
              sub: "estimated at 8 min/mission",
              color: "#3B82F6",
            },
            {
              emoji: "🏆",
              label: "Stories Mastered",
              value: d?.stories_mastered ?? 0,
              sub: "≥50% of learners finished",
              color: "#8B5CF6",
            },
            {
              emoji: "🌍",
              label: "Active Languages",
              value: d?.active_languages ?? 0,
              sub: "languages with 5+ completions",
              color: "#F59E0B",
            },
          ].map(item => (
            <div key={item.label}
              className="p-4 rounded-2xl border border-gray-100 flex flex-col gap-2">
              <span className="text-[24px]">{item.emoji}</span>
              <p className="font-black text-[22px] text-gray-900">{item.value}</p>
              <div>
                <p className="font-bold text-[12px] text-gray-700">{item.label}</p>
                <p className="text-[10px] text-gray-400">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
        {d && d.total_missions > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-100">
            <p className="text-[12px] text-green-800 font-bold">
              📋 Board-ready insight: Your {d.seats_used} learners have completed{" "}
              <strong>{d.total_missions.toLocaleString()} activities</strong> — approximately{" "}
              <strong>
                {d.estimated_learning_min >= 60
                  ? `${Math.round(d.estimated_learning_min / 60)} hours`
                  : `${d.estimated_learning_min} minutes`}
              </strong>{" "}
              of language learning delivered through the Nimipiko platform.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Upgrade CTA */}
      {(d?.license_type === "trial" || d?.license_type === "standard") && (
        <div className="mt-5 p-5 rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, #15803D 0%, #16a34a 100%)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-black text-[16px] mb-1">
                {d?.license_type === "trial" ? "🚀 Ready to go beyond the trial?" : "✨ Upgrade to Premium"}
              </p>
              <p className="text-green-200 text-[12px]">
                {d?.license_type === "trial"
                  ? "Get more seats, full analytics, and dedicated support."
                  : "Unlock unlimited learners, curriculum access, and a dedicated CSM."}
              </p>
            </div>
            <a href="mailto:schools@nimipiko.com"
              className="shrink-0 px-5 py-2.5 bg-white rounded-xl font-black text-[13px] hover:bg-green-50 transition"
              style={{ color: G }}>
              Talk to Sales
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
