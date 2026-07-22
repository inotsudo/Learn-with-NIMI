"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useSchool } from "@/components/school/SchoolContext";
import {
  PageHeader, SectionCard, StatCard,
  NoSchoolGate, MiniBarChart, Table, Chip, ProgressBar,
} from "@/components/school/SchoolUI";

interface ClassRow {
  class_name:         string;
  teacher_name:       string | null;
  learner_count:      number;
  weekly_active:      number;
  weekly_active_pct:  number;
  avg_missions_7d:    number;
  avg_stars_all_time: number;
}

const G = "#15803D";

interface DailyPoint { date: string; active: number }
interface LangRow    { language: string; count: number }
interface TypeRow    { type: string; count: number }
interface LearnerRow {
  child_name:   string;
  language:     string;
  missions_done: number;
  stars:        number;
}

interface Analytics {
  daily_active:  DailyPoint[];
  lang_dist:     LangRow[];
  mission_types: TypeRow[];
  top_learners:  LearnerRow[];
}

const LANG_LABELS: Record<string, string> = { en: "English", fr: "French", rw: "Kinyarwanda" };
const LANG_COLORS: Record<string, string> = { en: "#3B82F6", fr: "#F59E0B", rw: G };
const TYPE_EMOJI:  Record<string, string> = {
  sing: "🎵", move: "🏃", color: "🎨",
  watch: "📺", read: "📖", story: "📚",
};

const RANGE_OPTIONS = [
  { label: "7 days",  value: 7  },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

export default function SchoolAnalyticsPage() {
  const { school, loading: schoolLoading } = useSchool();
  const [range,      setRange]      = useState(30);
  const [data,       setData]       = useState<Analytics | null>(null);
  const [classes,    setClasses]    = useState<ClassRow[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!school) return;
    setLoading(true);
    void (async () => {
      try {
        const [{ data: raw }, { data: cls }] = await Promise.all([
          supabase.rpc("get_school_analytics", {
            p_school_id: school.school_id,
            p_days: range,
          }),
          supabase.rpc("get_school_class_comparison", {
            p_school_id: school.school_id,
          }),
        ]);
        setData(raw as Analytics);
        setClasses((cls as ClassRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, range]);

  if (schoolLoading || (loading && school)) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!school) return <NoSchoolGate />;

  const daily = data?.daily_active ?? [];
  const peakActive  = Math.max(...daily.map(d => d.active), 0);
  const totalActive = daily.reduce((s, d) => s + d.active, 0);
  const avgActive   = daily.length ? Math.round(totalActive / daily.length) : 0;

  const langTotal = (data?.lang_dist ?? []).reduce((s, l) => s + l.count, 0) || 1;
  const typeTotal = (data?.mission_types ?? []).reduce((s, t) => s + t.count, 0) || 1;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="School Analytics"
        subtitle="Learner engagement, language distribution and activity breakdown"
        action={
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setRange(opt.value)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                style={{
                  background: range === opt.value ? "white" : "transparent",
                  color:      range === opt.value ? G : "#6B7280",
                  boxShadow:  range === opt.value ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Peak Daily Active" value={peakActive}
          sub={`highest single day`} icon={<TrendingUp className="w-5 h-5" />} color="#8B5CF6" delay={0} />
        <StatCard label="Avg Daily Active" value={avgActive}
          sub={`over ${range} days`} icon={<Users className="w-5 h-5" />} color="#3B82F6" delay={0.04} />
        <StatCard label="Total Sessions" value={totalActive}
          sub="activity completions" icon={<span className="text-[18px]">⚡</span>} color="#F59E0B" delay={0.08} />
      </div>

      {/* Daily active chart */}
      <SectionCard title={`Daily Active Learners — Last ${range} Days`} className="mb-5">
        {daily.length === 0 ? (
          <p className="text-[13px] text-gray-400 py-6 text-center">No activity data for this period.</p>
        ) : (
          <>
            <MiniBarChart
              data={daily.map(d => ({
                label: new Date(d.date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
                value: d.active,
              }))}
              color={G}
              height={80}
            />
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
              <span>{new Date(daily[0]?.date ?? "").toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>
              <span>{new Date(daily[daily.length - 1]?.date ?? "").toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>
            </div>
          </>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Language distribution */}
        <SectionCard title="Language Distribution">
          {(data?.lang_dist ?? []).length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-4">No data</p>
          ) : (
            <div className="space-y-3">
              {(data?.lang_dist ?? []).map(l => {
                const pct = Math.round((l.count / langTotal) * 100);
                const color = LANG_COLORS[l.language] ?? "#9CA3AF";
                return (
                  <div key={l.language}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[12px] font-bold text-gray-700">
                        {LANG_LABELS[l.language] ?? l.language}
                      </span>
                      <span className="text-[12px] font-black" style={{ color }}>
                        {l.count} ({pct}%)
                      </span>
                    </div>
                    <ProgressBar pct={pct} color={color} height={6} />
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Mission type breakdown */}
        <SectionCard title="Activity Type Breakdown" className="lg:col-span-2">
          {(data?.mission_types ?? []).length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-4">No activity this period.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(data?.mission_types ?? []).slice(0, 6).map(t => {
                const pct = Math.round((t.count / typeTotal) * 100);
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-[22px] shrink-0">{TYPE_EMOJI[t.type] ?? "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-600 capitalize">{t.type}</span>
                        <span className="text-[11px] font-black text-gray-800">{t.count}</span>
                      </div>
                      <ProgressBar pct={pct} color={G} height={4} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Top learners leaderboard */}
      <SectionCard title={`Most Active Learners — Last ${range} Days`} className="mb-5">
        <p className="text-[11px] text-gray-400 mb-3">
          To see learners who need support, visit the{" "}
          <a href="/school/dashboard" className="font-bold underline" style={{ color: G }}>
            Dashboard → At-Risk Learners
          </a> panel.
        </p>
        <Table
          headers={["Rank", "Learner", "Language", "Missions", "Stars"]}
          emptyMsg="No learner activity in this period."
          rows={(data?.top_learners ?? []).map((l, i) => [
            <span key="rank" className="font-black text-gray-400 text-[14px]">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
            </span>,
            <span key="name" className="font-bold text-gray-800">{l.child_name}</span>,
            <Chip key="lang"
              label={LANG_LABELS[l.language] ?? l.language}
              color={LANG_COLORS[l.language] ?? "#6B7280"} />,
            <span key="missions" className="font-black" style={{ color: G }}>{l.missions_done}</span>,
            <span key="stars" className="font-bold text-amber-600">⭐ {l.stars}</span>,
          ])}
        />
      </SectionCard>

      {/* Class comparison */}
      {classes.length > 0 && (
        <SectionCard title="Class-by-Class Comparison — Last 7 Days">
          <Table
            headers={["Class", "Teacher", "Learners", "Weekly Active", "Avg Missions/wk", "Avg Stars", "Benchmark"]}
            emptyMsg="No class data available."
            rows={classes.map(c => {
              const bm = c.weekly_active_pct >= 70
                ? { label: "Above Avg", color: G }
                : c.weekly_active_pct >= 40
                ? { label: "Average",   color: "#F59E0B" }
                : { label: "Below Avg", color: "#EF4444" };
              return [
                <span key="cls" className="font-bold text-gray-800">{c.class_name}</span>,
                <span key="tch" className="text-gray-500 text-[11px]">{c.teacher_name || "—"}</span>,
                <span key="lc" className="font-bold">{c.learner_count}</span>,
                <span key="wa" className="font-bold" style={{ color: G }}>
                  {c.weekly_active} <span className="text-gray-400 font-normal text-[11px]">({c.weekly_active_pct}%)</span>
                </span>,
                <span key="am" className="font-bold text-gray-700">{c.avg_missions_7d}</span>,
                <span key="as" className="font-bold text-amber-600">⭐ {c.avg_stars_all_time}</span>,
                <span key="bm" className="text-[11px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${bm.color}18`, color: bm.color }}>
                  {bm.label}
                </span>,
              ];
            })}
          />
          <p className="text-[10px] text-gray-400 mt-3">
            Benchmark: ≥70% weekly active = Above Avg · 40–69% = Average · &lt;40% = Below Avg
          </p>
        </SectionCard>
      )}
    </div>
  );
}
