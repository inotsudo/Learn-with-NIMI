"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, AlertTriangle } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useSchool } from "@/components/school/SchoolContext";
import {
  PageHeader, SectionCard, StatCard,
  NoSchoolGate, ProgressBar, Chip, Table,
} from "@/components/school/SchoolUI";

const G = "#15803D";

interface StoryRow {
  story_id:          string;
  story_title:       string;
  story_emoji:       string | null;
  sort_order:        number;
  total_missions:    number;
  learners_started:  number;
  learners_finished: number;
  completion_pct:    number;
}

interface MissionRate {
  type:           string;
  total_missions: number;
  completions:    number;
}

interface CurriculumData {
  total_learners: number;
  story_coverage: StoryRow[];
  mission_rates:  MissionRate[];
}

const LANG_OPTIONS = [
  { value: "",   label: "All Languages" },
  { value: "en", label: "English"       },
  { value: "fr", label: "French"        },
  { value: "rw", label: "Kinyarwanda"  },
];

const TYPE_EMOJI: Record<string, string> = {
  sing: "🎵", move: "🏃", color: "🎨",
  watch: "📺", read: "📖", story: "📚",
};

function coverageColor(pct: number): string {
  if (pct >= 70) return G;
  if (pct >= 40) return "#F59E0B";
  return "#EF4444";
}

export default function CurriculumInsightsPage() {
  const { school, loading: schoolLoading } = useSchool();
  const [lang,    setLang]    = useState("");
  const [data,    setData]    = useState<CurriculumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school) return;
    setLoading(true);
    void (async () => {
      try {
        const { data: raw } = await supabase.rpc("get_school_curriculum_insights", {
          p_school_id: school.school_id,
          p_language:  lang || null,
        });
        setData(raw as CurriculumData);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, lang]);

  if (schoolLoading || (loading && school)) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!school) return <NoSchoolGate />;

  const stories = data?.story_coverage ?? [];
  const missionRates = data?.mission_rates ?? [];
  const totalLearners = data?.total_learners ?? 0;

  const storiesNotStarted = stories.filter(s => s.learners_started === 0).length;
  const storiesLow        = stories.filter(s => s.completion_pct > 0 && s.completion_pct < 40).length;
  const avgCoverage       = stories.length
    ? Math.round(stories.reduce((acc, s) => acc + s.completion_pct, 0) / stories.length)
    : 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Curriculum Insights"
        subtitle="Story coverage, mission completion rates and learning gaps"
        action={
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-700 bg-white focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": G } as React.CSSProperties}>
            {LANG_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Learners" value={totalLearners}
          icon={<span className="text-[18px]">👥</span>} color={G} delay={0} />
        <StatCard label="Avg Story Coverage" value={`${avgCoverage}%`}
          sub="across all stories" icon={<BookOpen className="w-5 h-5" />} color="#3B82F6" delay={0.04} />
        <StatCard label="Stories Not Started" value={storiesNotStarted}
          sub="0 learners touched" icon={<AlertTriangle className="w-5 h-5" />}
          color={storiesNotStarted > 0 ? "#EF4444" : G} delay={0.08} />
        <StatCard label="Low Engagement" value={storiesLow}
          sub="below 40% coverage" icon={<span className="text-[18px]">📉</span>}
          color={storiesLow > 0 ? "#F59E0B" : G} delay={0.12} />
      </div>

      {/* Story coverage grid */}
      <SectionCard title="Story-by-Story Coverage" className="mb-5">
        {stories.length === 0 ? (
          <p className="text-[13px] text-gray-400 py-8 text-center">
            No stories found. Publish content in the Admin portal first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((s, i) => {
              const color = coverageColor(s.completion_pct);
              return (
                <motion.div key={s.story_id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-2xl border-2 transition-colors"
                  style={{ borderColor: s.completion_pct === 0 ? "#FEE2E2" : "#F3F4F6" }}>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-[22px] shrink-0">{s.story_emoji ?? "📖"}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-gray-800 leading-tight">{s.story_title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.total_missions} missions</p>
                    </div>
                    {s.completion_pct === 0 && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5 ml-auto" />
                    )}
                  </div>
                  <ProgressBar pct={s.completion_pct} color={color} height={8} />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-gray-400">
                      {s.learners_started}/{totalLearners} started
                    </span>
                    <span className="text-[11px] font-black" style={{ color }}>
                      {s.completion_pct}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Mission type rates */}
      <SectionCard title="Activity Type Completion Rates">
        <Table
          headers={["Activity Type", "Total Missions", "Completions", "Rate"]}
          emptyMsg="No mission data available."
          rows={missionRates.map(r => {
            const rate = r.total_missions > 0
              ? Math.round((r.completions / r.total_missions) * 100)
              : 0;
            return [
              <span key="type" className="flex items-center gap-2">
                <span className="text-[18px]">{TYPE_EMOJI[r.type] ?? "📌"}</span>
                <span className="font-bold text-gray-800 capitalize">{r.type}</span>
              </span>,
              <span key="total" className="text-gray-600">{r.total_missions}</span>,
              <span key="comp" className="font-bold" style={{ color: G }}>{r.completions}</span>,
              <div key="rate" className="flex items-center gap-3 min-w-[100px]">
                <div className="flex-1">
                  <ProgressBar pct={rate} color={coverageColor(rate)} height={5} />
                </div>
                <span className="text-[11px] font-black w-8 text-right"
                  style={{ color: coverageColor(rate) }}>
                  {rate}%
                </span>
              </div>,
            ];
          })}
        />
      </SectionCard>

      {/* Recommendations */}
      {(storiesNotStarted > 0 || storiesLow > 0) && (
        <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <p className="font-black text-[13px] text-amber-800 mb-2">📋 Recommendations</p>
          <ul className="space-y-1.5">
            {storiesNotStarted > 0 && (
              <li className="text-[12px] text-amber-700 flex items-start gap-2">
                <span className="shrink-0">•</span>
                <span>
                  <strong>{storiesNotStarted} {storiesNotStarted === 1 ? "story hasn't" : "stories haven't"} been started</strong> by any learner.
                  Encourage teachers to assign these in class.
                </span>
              </li>
            )}
            {storiesLow > 0 && (
              <li className="text-[12px] text-amber-700 flex items-start gap-2">
                <span className="shrink-0">•</span>
                <span>
                  <strong>{storiesLow} {storiesLow === 1 ? "story has" : "stories have"} low engagement</strong> (below 40%).
                  Consider reviewing difficulty or scheduling class time for these stories.
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
