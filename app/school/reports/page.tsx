"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Loader2 } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useSchool } from "@/components/school/SchoolContext";
import {
  PageHeader, SectionCard, NoSchoolGate, Table,
} from "@/components/school/SchoolUI";

const G = "#15803D";

type ReportType = "activity" | "learner" | "curriculum" | "license" | "executive";

const REPORT_TYPES: {
  id:       ReportType;
  label:    string;
  emoji:    string;
  desc:     string;
  columns:  string[];
}[] = [
  {
    id:      "executive",
    label:   "Executive Summary",
    emoji:   "📋",
    desc:    "One-page printable summary: key KPIs, top insights, at-risk count — perfect for leadership reports.",
    columns: [],
  },
  {
    id:      "activity",
    label:   "Activity Summary",
    emoji:   "⚡",
    desc:    "Every mission completion in the date range: date, learner, story, activity type, stars.",
    columns: ["Date", "Learner", "Language", "Mission Type", "Story", "Stars"],
  },
  {
    id:      "learner",
    label:   "Learner Progress",
    emoji:   "👤",
    desc:    "Per-learner summary: missions completed, total stars, last active date.",
    columns: ["Name", "Language", "Age", "Enrolled", "Missions", "Stars", "Last Active"],
  },
  {
    id:      "curriculum",
    label:   "Curriculum Coverage",
    emoji:   "📖",
    desc:    "Per-story and per-mission-type completions and unique learner counts.",
    columns: ["Story", "Mission Type", "Completions", "Unique Learners", "Total Stars"],
  },
  {
    id:      "license",
    label:   "License Snapshot",
    emoji:   "🔑",
    desc:    "Current seat usage, license type, dates and per-class breakdown.",
    columns: ["Metric", "Value"],
  },
];

interface ReportRow { [key: string]: string | number | null }

interface ExecSummary {
  school_name:         string;
  period:              string;
  total_enrolled:      number;
  active_learners:     number;
  engagement_rate_pct: number;
  missions_completed:  number;
  learning_hours:      number;
  most_engaged_story:  string;
  most_engaged_class:  string;
  learners_at_risk:    number;
  insights:            (string | null)[];
}

function ExecutiveSummaryView({ data, onPrint }: { data: ExecSummary; onPrint: () => void }) {
  const G = "#15803D";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-black text-[16px] text-gray-900">{data.school_name}</p>
          <p className="text-[11px] text-gray-400">{data.period}</p>
        </div>
        <button onClick={onPrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black text-white hover:opacity-90 transition"
          style={{ background: G }}>
          🖨️ Print / Save PDF
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Enrolled",        value: data.total_enrolled,      color: G       },
          { label: "Active Learners", value: data.active_learners,     color: "#3B82F6" },
          { label: "Engagement",      value: `${data.engagement_rate_pct}%`, color: "#8B5CF6" },
          { label: "Missions Done",   value: data.missions_completed,  color: "#F59E0B" },
          { label: "Learning Hours",  value: `${data.learning_hours}h`,color: G       },
          { label: "At-Risk",         value: data.learners_at_risk,
            color: data.learners_at_risk > 0 ? "#EF4444" : G },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-xl border border-gray-100 text-center">
            <p className="font-black text-[22px]" style={{ color: item.color }}>{item.value}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Most Engaged Story</p>
          <p className="font-bold text-[13px] text-gray-800">{data.most_engaged_story}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Most Active Class</p>
          <p className="font-bold text-[13px] text-gray-800">{data.most_engaged_class}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Key Insights</p>
        <ul className="space-y-2">
          {data.insights.filter(Boolean).map((ins, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-gray-700">
              <span className="shrink-0 font-black" style={{ color: G }}>✓</span>
              {ins}
            </li>
          ))}
        </ul>
      </div>

      {data.learners_at_risk > 0 && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100">
          <p className="font-bold text-[12px] text-red-700">
            ⚠️ {data.learners_at_risk} learner{data.learners_at_risk !== 1 ? "s" : ""} flagged as at-risk (7+ days inactive).
            Visit the Dashboard for the full list.
          </p>
        </div>
      )}
    </div>
  );
}

function toCSV(columns: string[], rows: ReportRow[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = columns.map(escape).join(",");
  const body   = rows.map(r => Object.values(r).map(escape).join(",")).join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function flattenLicense(raw: Record<string, unknown>): ReportRow[] {
  return Object.entries(raw)
    .filter(([k]) => k !== "class_seats")
    .map(([k, v]) => ({ Metric: k.replace(/_/g, " "), Value: String(v ?? "—") }))
    .concat(
      ((raw.class_seats as { class_name: string; teacher_name: string; seat_count: number }[]) ?? []).map(c => ({
        Metric: `Class: ${c.class_name} (${c.teacher_name})`,
        Value:  String(c.seat_count),
      }))
    );
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function AdministratorReportsPage() {
  const { school, loading: schoolLoading } = useSchool();

  const [reportType,   setReportType]   = useState<ReportType>("executive");
  const [dateFrom,     setDateFrom]     = useState(defaultFrom);
  const [dateTo,       setDateTo]       = useState(new Date().toISOString().slice(0, 10));
  const [generating,   setGenerating]   = useState(false);
  const [rows,         setRows]         = useState<ReportRow[] | null>(null);
  const [execSummary,  setExecSummary]  = useState<ExecSummary | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [generated,    setGenerated]    = useState<{ type: ReportType; from: string; to: string } | null>(null);

  const meta = REPORT_TYPES.find(r => r.id === reportType)!;

  async function handleGenerate() {
    if (!school) return;
    setGenerating(true);
    setError(null);
    setRows(null);
    setExecSummary(null);
    try {
      const skipDates = reportType === "license";
      const { data, error: e } = await supabase.rpc("generate_school_report", {
        p_school_id: school.school_id,
        p_type:      reportType,
        p_date_from: skipDates ? undefined : dateFrom,
        p_date_to:   skipDates ? undefined : dateTo,
      });
      if (e) throw e;
      const result = data as { rows: ReportRow[] | Record<string, unknown> };

      if (reportType === "executive") {
        setExecSummary(result.rows as unknown as ExecSummary);
      } else if (reportType === "license") {
        setRows(flattenLicense(result.rows as Record<string, unknown>));
      } else {
        setRows((result.rows ?? []) as ReportRow[]);
      }
      setGenerated({ type: reportType, from: dateFrom, to: dateTo });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    if (!rows || !generated) return;
    const m = REPORT_TYPES.find(r => r.id === generated.type)!;
    const csv = toCSV(m.columns, rows);
    const filename = `nimipiko-${generated.type}-${generated.from}-${generated.to}.csv`;
    downloadCSV(filename, csv);
  }

  if (schoolLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!school) return <NoSchoolGate />;

  // Preview table: cap at 100 rows to avoid overwhelming the UI
  const previewRows = (rows ?? []).slice(0, 100);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Administrator Reports"
        subtitle="Generate, preview and export school intelligence reports"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Report builder */}
        <SectionCard title="Report Builder" className="lg:col-span-1">
          <div className="space-y-5">

            {/* Type selector */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Report Type</p>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_TYPES.map(rt => (
                  <button key={rt.id}
                    onClick={() => { setReportType(rt.id); setRows(null); setGenerated(null); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: reportType === rt.id ? G : "#E5E7EB",
                      background:  reportType === rt.id ? `${G}0a` : "white",
                    }}>
                    <span className="text-[20px] shrink-0">{rt.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-[12px] text-gray-800">{rt.label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-2">{rt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date range (hidden for license) */}
            {reportType !== "license" && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date Range</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">From</label>
                    <input type="date" value={dateFrom}
                      max={dateTo}
                      onChange={e => setDateFrom(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": G } as React.CSSProperties} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">To</label>
                    <input type="date" value={dateTo}
                      min={dateFrom}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={e => setDateTo(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": G } as React.CSSProperties} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-[12px] font-bold text-red-500">⚠️ {error}</p>
            )}

            <button
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="w-full py-3 rounded-xl font-black text-[14px] text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              style={{ background: G }}>
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><FileText className="w-4 h-4" /> Generate Report</>}
            </button>
          </div>
        </SectionCard>

        {/* Preview pane */}
        <div className="lg:col-span-2">
          <SectionCard
            title={execSummary
              ? "Executive Summary"
              : rows
              ? `${meta.label} · ${rows.length} row${rows.length !== 1 ? "s" : ""}`
              : "Report Preview"}
            className="h-full">
            <AnimatePresence mode="wait">
              {!rows && !generating && (
                <motion.div key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <span className="text-[48px]">{meta.emoji}</span>
                  <p className="font-bold text-[14px] text-gray-600">{meta.label}</p>
                  <p className="text-[12px] text-gray-400 max-w-xs">{meta.desc}</p>
                  <p className="text-[11px] text-gray-300 mt-2">Click "Generate Report" to preview data</p>
                </motion.div>
              )}

              {generating && (
                <motion.div key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: G }} />
                  <p className="text-[13px] font-bold" style={{ color: G }}>Building your report…</p>
                </motion.div>
              )}

              {execSummary && (
                <motion.div key="exec"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <ExecutiveSummaryView data={execSummary} onPrint={handlePrint} />
                </motion.div>
              )}

              {rows && (
                <motion.div key="results"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {/* Download bar */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {generated?.type === "license"
                          ? "License snapshot"
                          : `${generated?.from} → ${generated?.to}`}
                        {rows.length > 100 && (
                          <span className="ml-1 text-amber-500 font-bold">
                            · Showing first 100 of {rows.length}
                          </span>
                        )}
                      </p>
                    </div>
                    <button onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black text-white hover:opacity-90 transition"
                      style={{ background: G }}>
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  </div>

                  {previewRows.length === 0 ? (
                    <p className="text-[13px] text-gray-400 py-6 text-center">
                      No data found for the selected period.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <Table
                        headers={meta.columns}
                        rows={previewRows.map(r =>
                          Object.values(r).map(v =>
                            <span key={String(v)} className="whitespace-nowrap">{v == null ? "—" : String(v)}</span>
                          )
                        )}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>
        </div>
      </div>

      {/* Past reports hint */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
        <span className="text-[20px] shrink-0">💡</span>
        <div>
          <p className="font-bold text-[12px] text-blue-800">Tip: Schedule monthly reports</p>
          <p className="text-[11px] text-blue-600 mt-0.5">
            Contact your account manager to set up automatic monthly report delivery to your inbox.
            Reports include all four types bundled as a PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
