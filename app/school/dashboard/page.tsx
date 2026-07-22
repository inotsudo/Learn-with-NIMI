"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Activity, CheckCircle2, Star, Clock, AlertTriangle } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useSchool } from "@/components/school/SchoolContext";
import {
  PageHeader, StatCard, SectionCard,
  NoSchoolGate, Table, Chip,
} from "@/components/school/SchoolUI";

interface AtRiskLearner {
  child_name:       string;
  language:         string;
  class_name:       string;
  missions_all_time: number;
  last_active:      string | null;
  days_inactive:    number | null;
  school_avg:       number;
  risk_flags:       string[];
}

const G = "#15803D";

interface DashStats {
  total_enrolled:   number;
  active_this_week: number;
  missions_30d:     number;
  avg_stars:        number;
  classes: {
    class_code:    string | null;
    class_name:    string;
    teacher_name:  string;
    teacher_email: string;
    learner_count: number;
  }[];
  recent_activity: {
    child_name:   string;
    mission_type: string;
    story_title:  string;
    completed_at: string;
  }[];
}

const MISSION_TYPE_EMOJI: Record<string, string> = {
  sing: "🎵", move: "🏃", color: "🎨", watch: "📺",
  read: "📖", story: "📚", discover: "🔍", zoom: "🔭",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const FLAG_META: Record<string, { label: string; color: string }> = {
  never_started:  { label: "Never started",  color: "#EF4444" },
  inactive_14d:   { label: "14d inactive",   color: "#DC2626" },
  inactive_7d:    { label: "7d inactive",    color: "#F59E0B" },
  low_engagement: { label: "Low engagement", color: "#8B5CF6" },
};

export default function SchoolDashboardPage() {
  const { school, loading: schoolLoading } = useSchool();
  const [stats,    setStats]    = useState<DashStats | null>(null);
  const [atRisk,   setAtRisk]   = useState<{ school_avg: number; learners: AtRiskLearner[] } | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!school) return;
    void (async () => {
      try {
        const [{ data: dashData }, { data: riskData }] = await Promise.all([
          supabase.rpc("get_school_dashboard_stats", { p_school_id: school.school_id }),
          supabase.rpc("get_at_risk_learners",       { p_school_id: school.school_id }),
        ]);
        setStats(dashData as DashStats);
        setAtRisk(riskData as { school_avg: number; learners: AtRiskLearner[] });
      } finally {
        setLoading(false);
      }
    })();
  }, [school]);

  if (schoolLoading || (loading && school)) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!school) return <NoSchoolGate />;

  const s = stats;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title={`${school.school_name}`}
        subtitle={`${today} · School Intelligence Dashboard`}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Enrolled Learners"
          value={s?.total_enrolled ?? 0}
          sub="total students"
          icon={<Users className="w-5 h-5" />}
          color={G} delay={0}
        />
        <StatCard
          label="Active This Week"
          value={s?.active_this_week ?? 0}
          sub={s ? `${Math.round((s.active_this_week / Math.max(s.total_enrolled, 1)) * 100)}% engagement` : ""}
          icon={<Activity className="w-5 h-5" />}
          color="#3B82F6" delay={0.04}
        />
        <StatCard
          label="Missions (30 days)"
          value={s?.missions_30d ?? 0}
          sub="completed activities"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="#8B5CF6" delay={0.08}
        />
        <StatCard
          label="Avg Stars / Learner"
          value={s?.avg_stars ?? 0}
          sub="all time"
          icon={<Star className="w-5 h-5" />}
          color="#F59E0B" delay={0.12}
        />
      </div>

      {/* Class roster + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Classes — 3 cols */}
        <div className="lg:col-span-3">
          <SectionCard title="Class Roster">
            <Table
              headers={["Class", "Teacher", "Learners"]}
              emptyMsg="No classes linked yet. Ask teachers to join via their class code."
              rows={(s?.classes ?? []).map(c => [
                <div key="cls">
                  <p className="font-bold text-gray-800">{c.class_name}</p>
                  {c.class_code && (
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Code: {c.class_code}
                    </p>
                  )}
                </div>,
                <div key="tch">
                  <p className="font-medium text-gray-700">{c.teacher_name || "—"}</p>
                  <p className="text-[11px] text-gray-400">{c.teacher_email}</p>
                </div>,
                <span key="cnt" className="font-black text-[16px]" style={{ color: G }}>
                  {c.learner_count}
                </span>,
              ])}
            />
          </SectionCard>
        </div>

        {/* Recent activity — 2 cols */}
        <div className="lg:col-span-2">
          <SectionCard title="Recent Activity">
            {(s?.recent_activity ?? []).length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">
                No activity yet — learners haven&apos;t started missions.
              </p>
            ) : (
              <ul className="space-y-3">
                {(s?.recent_activity ?? []).map((act, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3">
                    <span className="text-[20px] shrink-0 mt-0.5">
                      {MISSION_TYPE_EMOJI[act.mission_type] ?? "📌"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-gray-800 truncate">{act.child_name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{act.story_title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Chip label={act.mission_type} color="#6B7280" />
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {timeAgo(act.completed_at)}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* At-risk learners */}
      {(atRisk?.learners ?? []).length > 0 && (
        <div className="mt-5">
          <SectionCard
            title={`At-Risk Learners · ${atRisk!.learners.length} flagged`}
            className="border-2 border-red-100">
            <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700">
                These learners may need teacher outreach. School average: <strong>{atRisk!.school_avg} missions</strong>.
                Inactive or low-engagement learners are shown here.
              </p>
            </div>
            <Table
              headers={["Learner", "Class", "Last Active", "Missions", "Risk Flags"]}
              rows={atRisk!.learners.map(l => [
                <div key="name">
                  <p className="font-bold text-gray-800">{l.child_name}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">{l.language}</p>
                </div>,
                <span key="cls" className="text-[12px] text-gray-600">{l.class_name}</span>,
                <span key="la" className="text-[12px]"
                  style={{ color: l.days_inactive != null && l.days_inactive >= 14 ? "#EF4444" : "#6B7280" }}>
                  {l.last_active == null
                    ? <span className="font-bold text-red-500">Never</span>
                    : `${l.days_inactive}d ago`}
                </span>,
                <span key="mc" className="font-bold text-[13px]" style={{ color: l.missions_all_time === 0 ? "#EF4444" : "#6B7280" }}>
                  {l.missions_all_time}
                  <span className="text-[10px] font-normal text-gray-400 ml-1">/ avg {l.school_avg}</span>
                </span>,
                <div key="flags" className="flex flex-wrap gap-1">
                  {(l.risk_flags ?? []).map(f => {
                    const m = FLAG_META[f] ?? { label: f, color: "#9CA3AF" };
                    return (
                      <span key={f} className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: `${m.color}18`, color: m.color }}>
                        {m.label}
                      </span>
                    );
                  })}
                </div>,
              ])}
            />
          </SectionCard>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/school/analytics",  emoji: "📊", label: "View Analytics"      },
          { href: "/school/curriculum", emoji: "📖", label: "Curriculum Insights" },
          { href: "/school/licensing",  emoji: "🔑", label: "License & Seats"     },
          { href: "/school/reports",    emoji: "📄", label: "Generate Report"     },
        ].map(({ href, emoji, label }) => (
          <a key={href} href={href}
            className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-[13px] font-bold text-gray-600 hover:border-green-200 hover:text-green-700 transition-all">
            <span className="text-[18px]">{emoji}</span>
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
