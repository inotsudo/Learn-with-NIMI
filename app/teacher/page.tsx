"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, BookOpen, BarChart3, Settings,
  LogOut, Award, Star, Activity, Search, Plus, Download,
  Menu, X, CheckCircle2, AlertCircle, Loader2,
  ChevronUp, ChevronDown, Megaphone, Trash2, Copy, Check,
  Upload, Printer, ExternalLink, ClipboardList, Calendar, UserCheck,
} from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { getCachedTeacher, clearTeacherCache, type TeacherProfile } from "./teacherAuth";

/* ─── Types ─────────────────────────────────────────────────────── */
interface ChildSummary {
  child_id: string;
  child_name: string;
  child_language: "en" | "fr" | "rw";
  child_age: number | null;
  missions_done: number;
  stars_earned: number;
  certificates: number;
  badges: number;
  last_active: string | null;
}
interface StoryBreakdown {
  story_id: string;
  story_title: string;
  story_slug: string;
  total_missions: number;
  completions: number;
  children_started: number;
}
interface DayActivity { date: string; count: number }
interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

/* ─── Design tokens ──────────────────────────────────────────────── */
const T = {
  page:       "var(--ds-surface-page,#F9FAFB)",
  card:       "var(--ds-surface-card,#FFFFFF)",
  border:     "var(--ds-border-primary,#E5E7EB)",
  text:       "var(--ds-text-primary,#111827)",
  muted:      "var(--ds-text-secondary,#6B7280)",
  brand:      "var(--ds-brand-primary,#15803D)",
  brandSoft:  "var(--ds-brand-soft,rgba(21,128,61,0.10))",
  brandSubtle:"var(--ds-brand-subtle,#F0FDF4)",
  gold:       "var(--story-gold,#e89b2a)",
  leaf:       "var(--leaf-r,20px 20px 20px 5px)",
  leafSm:     "var(--leaf-r-sm,14px 14px 14px 4px)",
  leafLg:     "var(--leaf-r-lg,28px 28px 28px 7px)",
};

/* ─── Utils ──────────────────────────────────────────────────────── */
const LANG_FULL: Record<string, string> = { en: "English", fr: "French", rw: "Kinyarwanda" };
const LANG_FLAG: Record<string, string> = { en: "🇬🇧", fr: "🇫🇷", rw: "🇷🇼" };

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 3);
}
function ago(ts: string | null): string {
  if (!ts) return "Never";
  const d = (Date.now() - new Date(ts).getTime()) / 86_400_000;
  if (d < 0.042) return "Just now";
  if (d < 1)    return `${Math.floor(d * 24)}h ago`;
  if (d < 7)    return `${Math.floor(d)}d ago`;
  if (d < 30)   return `${Math.floor(d / 7)}w ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmt(ts: string) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
type ActivityStatus = "active" | "recent" | "inactive";
function actStatus(ts: string | null): ActivityStatus {
  if (!ts) return "inactive";
  const d = (Date.now() - new Date(ts).getTime()) / 86_400_000;
  return d < 2 ? "active" : d < 7 ? "recent" : "inactive";
}
const ST_DOT:   Record<ActivityStatus, string> = { active: "#10b981", recent: "#f59e0b", inactive: "#d1d5db" };
const ST_LABEL: Record<ActivityStatus, string> = { active: "Active", recent: "Recent", inactive: "Inactive" };
const ST_BG:    Record<ActivityStatus, string> = {
  active:   "background:#ecfdf5;color:#047857",
  recent:   "background:#fffbeb;color:#b45309",
  inactive: "background:#f9fafb;color:#6b7280",
};
function parseStatusStyle(s: string): Record<string, string> {
  return Object.fromEntries(
    s.split(";").map(p => { const [k, v] = p.split(":"); return [k?.trim(), v?.trim()]; }).filter(([k]) => k)
  );
}

/* ─── CSV parser ─────────────────────────────────────────────────── */
interface CSVRow { name: string; age: string; language: string; error?: string }
function parseCSV(text: string): CSVRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const nameIdx = header.indexOf("name");
  const ageIdx  = header.indexOf("age");
  const langIdx = header.findIndex(h => h === "language" || h === "lang");
  if (nameIdx === -1) return [{ name: "—", age: "", language: "", error: "No 'name' column found in header" }];
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx] ?? "";
    const age  = ageIdx >= 0 ? (cols[ageIdx] ?? "") : "";
    const lang = langIdx >= 0 ? (cols[langIdx] ?? "en") : "en";
    const normLang = lang.toLowerCase();
    const validLang = ["en", "fr", "rw"].includes(normLang) ? normLang : "en";
    return { name, age, language: validLang, error: !name ? "Missing name" : undefined };
  }).filter(r => r.name || r.error);
}

/* ─── Print progress card ────────────────────────────────────────── */
function printProgressCard(s: ChildSummary, teacher: TeacherProfile | null) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Progress Card – ${s.child_name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&family=Baloo+2:wght@800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Nunito',sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{width:400px;padding:36px;border:3px solid #15803d;border-radius:20px 20px 20px 5px}
  .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:24px}
  .logo-row span{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:18px;color:#15803d}
  .name{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:28px;color:#111827;margin-bottom:4px}
  .sub{font-size:13px;color:#6B7280;margin-bottom:24px}
  hr{border:none;border-top:1px solid #E5E7EB;margin:20px 0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .stat{background:#F0FDF4;border-radius:14px 14px 14px 4px;padding:14px 16px}
  .stat-val{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:28px;color:#111827}
  .stat-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;margin-top:2px}
  .footer{margin-top:24px;font-size:11px;color:#9CA3AF;text-align:center}
  @media print{body{min-height:unset}}
</style></head><body>
<div class="card">
  <div class="logo-row"><span>🌿 NIMIPIKO</span></div>
  <div class="name">${s.child_name}</div>
  <div class="sub">${LANG_FLAG[s.child_language] ?? ""} ${LANG_FULL[s.child_language] ?? ""}${s.child_age ? ` · Age ${s.child_age}` : ""}${teacher?.class_name ? ` · ${teacher.class_name}` : ""}${teacher?.school_name ? ` · ${teacher.school_name}` : ""}</div>
  <hr>
  <div class="grid">
    <div class="stat"><div class="stat-val">⭐ ${s.stars_earned}</div><div class="stat-label">Stars Earned</div></div>
    <div class="stat"><div class="stat-val">${s.missions_done}</div><div class="stat-label">Missions Done</div></div>
    <div class="stat"><div class="stat-val">${s.certificates}</div><div class="stat-label">Certificates</div></div>
    <div class="stat"><div class="stat-val">${s.badges}</div><div class="stat-label">Badges</div></div>
  </div>
  <div class="footer">Generated by NIMIPIKO Teacher Portal · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
  const w = window.open("", "_blank", "width=520,height=650");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ─── Weekly bar chart ───────────────────────────────────────────── */
function WeekChart({ data }: { data: DayActivity[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2">
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d.count / max) * 60), d.count > 0 ? 6 : 3);
        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
            {d.count > 0 && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                {d.count}
              </div>
            )}
            <motion.div initial={{ height: 0 }} animate={{ height: barH }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
              style={{ height: barH, background: d.count > 0 ? T.brand : "#E5E7EB", borderRadius: "4px 4px 2px 2px" }}
              className="w-full group-hover:opacity-80 transition-opacity" />
            <span className="font-nunito text-[10px] select-none" style={{ color: T.muted }}>{dayLabel(d.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── KPI card ───────────────────────────────────────────────────── */
function KPI({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="flex flex-col gap-3 px-6 py-5 shadow-sm"
      style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between">
        <span className="font-nunito font-bold text-[11px] uppercase tracking-widest" style={{ color: T.muted }}>{label}</span>
        <div className="w-9 h-9 flex items-center justify-center" style={{ background: T.brandSubtle, borderRadius: T.leafSm }}>
          <Icon className="w-4 h-4" style={{ color: T.brand }} />
        </div>
      </div>
      <div>
        <p className="font-baloo font-black text-[32px] leading-none" style={{ color: T.text }}>{value}</p>
        {sub && (
          <p className="font-nunito text-[12px] mt-1 flex items-center gap-1" style={{ color: T.muted }}>
            {trend === "up"   && <ChevronUp   className="w-3.5 h-3.5" style={{ color: "#10b981" }} />}
            {trend === "down" && <ChevronDown className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Copy button ────────────────────────────────────────────────── */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1.5 font-nunito font-bold text-[12px] px-3 py-1.5 transition-all"
      style={{ background: copied ? "#ecfdf5" : T.brandSubtle, color: copied ? "#047857" : T.brand, borderRadius: "100px" }}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

/* ─── CSV Import Modal ───────────────────────────────────────────── */
function CSVImportModal({ open, onClose, onImported }: {
  open: boolean; onClose: () => void; onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<number | null>(null);

  function reset() { setRows([]); setErr(""); setDone(null); if (fileRef.current) fileRef.current.value = ""; }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setRows(parseCSV(ev.target?.result as string)); setErr(""); setDone(null); };
    reader.readAsText(file);
  }

  async function importAll() {
    const valid = rows.filter(r => r.name && !r.error);
    if (!valid.length) { setErr("No valid rows to import."); return; }
    setSaving(true); setErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Not signed in."); setSaving(false); return; }
    const inserts = valid.map(r => ({
      teacher_id: user.id, name: r.name,
      age: r.age ? parseInt(r.age) || null : null,
      language: r.language || "en",
    }));
    const { error } = await supabase.from("children").insert(inserts);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setDone(valid.length);
    onImported();
    setTimeout(() => { reset(); onClose(); }, 1800);
  }

  const validCount = rows.filter(r => r.name && !r.error).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", damping: 26 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg p-7 shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-baloo font-black text-[20px]" style={{ color: T.text }}>Import from CSV</h2>
                  <p className="font-nunito text-[12px] mt-0.5" style={{ color: T.muted }}>Columns: name, age (optional), language (optional)</p>
                </div>
                <button onClick={() => { reset(); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" style={{ color: T.muted }} />
                </button>
              </div>

              <div className="mb-5 px-4 py-3 font-nunito text-[12px]" style={{ background: T.brandSubtle, borderRadius: T.leafSm, color: T.brand }}>
                <strong>Expected format:</strong> name,age,language<br />
                <span style={{ color: T.muted }}>e.g.: Amina,7,en — Languages: en · fr · rw</span>
              </div>

              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" id="csv-input" />
              <label htmlFor="csv-input"
                className="flex flex-col items-center gap-3 p-8 cursor-pointer transition-all mb-5"
                style={{ border: `2px dashed ${T.border}`, borderRadius: T.leaf }}>
                <div className="w-10 h-10 flex items-center justify-center" style={{ background: T.brandSubtle, borderRadius: T.leafSm }}>
                  <Upload className="w-5 h-5" style={{ color: T.brand }} />
                </div>
                <div className="text-center">
                  <p className="font-nunito font-bold text-[13px]" style={{ color: T.text }}>Click to select a CSV file</p>
                  <p className="font-nunito text-[12px] mt-0.5" style={{ color: T.muted }}>or drag and drop</p>
                </div>
              </label>

              {rows.length > 0 && (
                <div className="mb-5 overflow-hidden" style={{ borderRadius: T.leafSm, border: `1px solid ${T.border}` }}>
                  <div className="px-4 py-2.5 flex items-center" style={{ background: "#F9FAFB", borderBottom: `1px solid ${T.border}` }}>
                    <span className="font-nunito font-bold text-[12px]" style={{ color: T.text }}>{rows.length} rows · {validCount} valid</span>
                  </div>
                  <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                    <table className="w-full min-w-[360px]">
                      <thead style={{ borderBottom: `1px solid ${T.border}` }}>
                        <tr>
                          {["Name", "Age", "Language", "Status"].map(h => (
                            <th key={h} className="px-4 py-2 text-left font-nunito font-bold text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: r.error ? "#fef2f2" : "transparent" }}>
                            <td className="px-4 py-2 font-nunito text-[13px]" style={{ color: T.text }}>{r.name || "—"}</td>
                            <td className="px-4 py-2 font-nunito text-[13px]" style={{ color: T.muted }}>{r.age || "—"}</td>
                            <td className="px-4 py-2 font-nunito text-[13px]" style={{ color: T.muted }}>{LANG_FLAG[r.language] ?? ""} {LANG_FULL[r.language] ?? r.language}</td>
                            <td className="px-4 py-2">
                              {r.error
                                ? <span className="font-nunito text-[11px] text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{r.error}</span>
                                : <span className="font-nunito text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />OK</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {done !== null && (
                <div className="mb-4 px-4 py-3 font-nunito font-bold text-[13px] text-emerald-700 flex items-center gap-2"
                  style={{ background: "#ecfdf5", borderRadius: T.leafSm }}>
                  <CheckCircle2 className="w-4 h-4" /> {done} students imported!
                </div>
              )}
              {err && <p className="mb-4 font-nunito text-red-500 text-[13px] flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{err}</p>}

              <div className="flex gap-3">
                <button onClick={() => { reset(); onClose(); }}
                  className="flex-1 font-nunito font-bold text-[13px] py-3 hover:bg-gray-50 transition-colors"
                  style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.muted }}>
                  Cancel
                </button>
                <button onClick={importAll} disabled={saving || validCount === 0}
                  className="flex-1 font-nunito font-bold text-[13px] py-3 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: T.brand, borderRadius: T.leafSm }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {saving ? "Importing…" : `Import ${validCount} Students`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Add student modal ──────────────────────────────────────────── */
function AddStudentModal({ open, onClose, onAdded }: {
  open: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({ name: "", age: "", language: "en" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Not signed in."); setSaving(false); return; }
    const { error } = await supabase.from("children").insert({
      teacher_id: user.id, name: form.name.trim(),
      age: form.age ? parseInt(form.age) : null, language: form.language,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setForm({ name: "", age: "", language: "en" });
    onAdded(); onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ type: "spring", damping: 26 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <form onSubmit={submit} className="pointer-events-auto w-full max-w-sm p-7 shadow-2xl"
              style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-baloo font-black text-[20px]" style={{ color: T.text }}>Add Student</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" style={{ color: T.muted }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block font-nunito font-bold text-[11px] uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>First Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 text-[14px] focus:outline-none transition"
                    style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
                    placeholder="e.g. Amina"
                    onFocus={e => e.currentTarget.style.borderColor = T.brand}
                    onBlur={e => e.currentTarget.style.borderColor = T.border} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-nunito font-bold text-[11px] uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Age</label>
                    <input type="number" min={2} max={12} value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                      className="w-full px-4 py-3 text-[14px] focus:outline-none transition"
                      style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
                      placeholder="7"
                      onFocus={e => e.currentTarget.style.borderColor = T.brand}
                      onBlur={e => e.currentTarget.style.borderColor = T.border} />
                  </div>
                  <div>
                    <label className="block font-nunito font-bold text-[11px] uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Language</label>
                    <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                      className="w-full px-4 py-3 text-[14px] focus:outline-none"
                      style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}>
                      <option value="en">🇬🇧 English</option>
                      <option value="fr">🇫🇷 French</option>
                      <option value="rw">🇷🇼 Kinyarwanda</option>
                    </select>
                  </div>
                </div>
                {err && <p className="font-nunito text-red-500 text-[13px] flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{err}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={onClose}
                  className="flex-1 font-nunito font-bold text-[13px] py-3 hover:bg-gray-50 transition-colors"
                  style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.muted }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 font-nunito font-bold text-[13px] py-3 text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: T.brand, borderRadius: T.leafSm }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? "Adding…" : "Add Student"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview",      view: "dashboard"     },
  { icon: Users,           label: "Students",      view: "students"      },
  { icon: ClipboardList,   label: "Assignments",   view: "assignments"   },
  { icon: BookOpen,        label: "Story Progress", view: "stories"       },
  { icon: Megaphone,       label: "Announcements", view: "announcements" },
  { icon: BarChart3,       label: "Reports",       view: "reports"       },
  { icon: Settings,        label: "Settings",      view: "settings"      },
];

function Sidebar({ teacher, view, onView, mobileOpen, onClose }: {
  teacher: TeacherProfile | null; view: string; onView: (v: string) => void;
  mobileOpen: boolean; onClose: () => void;
}) {
  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />
        )}
      </AnimatePresence>
      <aside className={`fixed top-0 left-0 h-[100dvh] z-50 flex flex-col w-[228px] transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: "#15803d" }}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/nimi-logo.png" alt="NIMIPIKO" width={34} height={34} className="w-[34px] h-[34px] object-contain" />
            <div>
              <p className="font-baloo font-black text-white text-[15px] leading-none">NIMIPIKO</p>
              <p className="font-nunito text-green-200 text-[10px] mt-0.5 uppercase tracking-wider">Teacher Portal</p>
            </div>
          </Link>
          <button onClick={onClose} className="ml-auto md:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {teacher && (
          <div className="mx-4 mt-4 px-4 py-3 border border-white/20" style={{ background: "rgba(0,0,0,0.15)", borderRadius: T.leafSm }}>
            <p className="font-nunito font-bold text-green-200 text-[10px] uppercase tracking-widest mb-0.5">Current Class</p>
            <p className="font-baloo font-black text-white text-[14px] truncate">{teacher.class_name ?? "My Class"}</p>
            {teacher.school_name && <p className="font-nunito text-green-300 text-[11px] truncate">{teacher.school_name}</p>}
            {teacher.class_code && (
              <div className="mt-2 flex items-center gap-2">
                <code className="font-baloo font-black text-white/80 text-[13px] tracking-widest">{teacher.class_code}</code>
                <CopyButton text={teacher.class_code} label="Copy" />
              </div>
            )}
          </div>
        )}

        <nav className="flex flex-col gap-0.5 px-3 mt-5 flex-1">
          {NAV_ITEMS.map(({ icon: Icon, label, view: v }) => (
            <button key={v} onClick={() => { onView(v); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left font-nunito font-bold text-[13px] transition-all"
              style={{ borderRadius: T.leafSm, background: view === v ? "rgba(255,255,255,0.18)" : "transparent", color: view === v ? "#fff" : "rgba(255,255,255,0.7)" }}
              onMouseEnter={e => { if (view !== v) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (view !== v) e.currentTarget.style.background = "transparent"; }}>
              <Icon style={{ width: 16, height: 16 }} className="shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-baloo font-black text-green-800 text-[13px]"
              style={{ background: T.gold }}>
              {teacher ? initials(teacher.name || teacher.email) : "T"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-nunito font-bold text-white text-[13px] truncate leading-none">{teacher?.name || "Teacher"}</p>
              <p className="font-nunito text-green-300 text-[11px] truncate mt-0.5">{teacher?.email}</p>
            </div>
            <button onClick={async () => { clearTeacherCache(); await supabase.auth.signOut(); window.location.href = "/loginpage"; }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10" title="Sign out">
              <LogOut className="w-4 h-4 text-green-300" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── Overview ───────────────────────────────────────────────────── */
function OverviewView({ students, stories, weekData, announcements, loading, onAdd, onViewAnn }: {
  students: ChildSummary[]; stories: StoryBreakdown[];
  weekData: DayActivity[]; announcements: Announcement[];
  loading: boolean; onAdd: () => void; onViewAnn: () => void;
}) {
  const totalStars  = students.reduce((s, c) => s + c.stars_earned, 0);
  const totalCerts  = students.reduce((s, c) => s + c.certificates, 0);
  const activeToday = students.filter(c => actStatus(c.last_active) === "active").length;
  const activeWeek  = students.filter(c => actStatus(c.last_active) !== "inactive").length;
  const weekTotal   = weekData.reduce((s, d) => s + d.count, 0);
  const topLearners = [...students].sort((a, b) => b.stars_earned - a.stars_earned).slice(0, 6);
  const needsAttn   = students.filter(c => actStatus(c.last_active) === "inactive").slice(0, 4);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin" style={{ color: T.brand }} /></div>;

  if (students.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 flex items-center justify-center mb-6" style={{ background: T.brandSubtle, borderRadius: T.leaf }}>
        <Users className="w-9 h-9" style={{ color: T.brand }} />
      </div>
      <h3 className="font-baloo font-black text-[22px] mb-2" style={{ color: T.text }}>Your class is empty</h3>
      <p className="font-nunito text-[14px] max-w-xs mb-7 leading-relaxed" style={{ color: T.muted }}>
        Add your first student to start tracking reading progress, stars, and certificates.
      </p>
      <button onClick={onAdd}
        className="inline-flex items-center gap-2 font-nunito font-bold text-[14px] text-white px-7 py-3.5"
        style={{ background: T.brand, borderRadius: T.leaf }}>
        <Plus className="w-4 h-4" /> Add First Student
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI icon={Users}    label="Enrolled"     value={students.length} sub={`${activeWeek} active this week`} trend="flat" />
        <KPI icon={Activity} label="Active Today" value={activeToday} sub={`of ${students.length} students`} trend={activeToday >= students.length / 2 ? "up" : "down"} />
        <KPI icon={Star}     label="Stars Earned" value={totalStars.toLocaleString()} sub="all time" trend="up" />
        <KPI icon={Award}    label="Certificates" value={totalCerts} sub="issued" trend="up" />
      </div>

      <div className="grid xl:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-5">
          {/* Weekly activity */}
          <div className="px-6 py-5 shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-baloo font-black text-[17px]" style={{ color: T.text }}>Weekly Activity</h2>
                <p className="font-nunito text-[12px] mt-0.5" style={{ color: T.muted }}>Mission completions — last 7 days</p>
              </div>
              <div className="text-right">
                <p className="font-baloo font-black text-[28px] leading-none" style={{ color: T.text }}>{weekTotal}</p>
                <p className="font-nunito text-[11px] mt-0.5" style={{ color: T.muted }}>completions</p>
              </div>
            </div>
            <WeekChart data={weekData} />
          </div>

          {/* Announcements preview */}
          {announcements.length > 0 && (
            <div className="shadow-sm overflow-hidden" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" style={{ color: T.brand }} />
                  <h2 className="font-baloo font-black text-[17px]" style={{ color: T.text }}>Recent Announcements</h2>
                </div>
                <button onClick={onViewAnn} className="font-nunito font-bold text-[12px]" style={{ color: T.brand }}>View all</button>
              </div>
              <div className="px-6 py-4 space-y-4">
                {announcements.slice(0, 2).map(a => (
                  <div key={a.id}>
                    {a.title && <p className="font-nunito font-bold text-[13px]" style={{ color: T.text }}>{a.title}</p>}
                    <p className="font-nunito text-[12px] mt-0.5 line-clamp-2" style={{ color: T.muted }}>{a.body}</p>
                    <p className="font-nunito text-[11px] mt-1" style={{ color: T.muted }}>{fmt(a.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roster preview */}
          <div className="shadow-sm overflow-hidden" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
              <h2 className="font-baloo font-black text-[17px]" style={{ color: T.text }}>Class Roster</h2>
              <button onClick={onAdd} className="flex items-center gap-1.5 font-nunito font-bold text-[12px]" style={{ color: T.brand }}>
                <Plus className="w-3.5 h-3.5" /> Add student
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Student", "Language", "Progress", "Stars", "Last Active"].map(h => (
                      <th key={h} className={`py-2.5 font-nunito font-bold text-[11px] uppercase tracking-wider ${h === "Stars" || h === "Last Active" ? "text-right" : "text-left"} ${h === "Student" || h === "Last Active" ? "px-6" : "px-4"}`}
                        style={{ color: T.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const st = actStatus(s.last_active);
                    const maxM = Math.max(...students.map(x => x.missions_done), 1);
                    const pct = Math.round((s.missions_done / maxM) * 100);
                    return (
                      <tr key={s.child_id} className="hover:bg-gray-50/60 transition-colors" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-baloo font-black text-[11px]"
                                style={{ background: T.brandSubtle, color: T.brand }}>{initials(s.child_name)}</div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: ST_DOT[st] }} />
                            </div>
                            <div>
                              <p className="font-nunito font-bold text-[13px]" style={{ color: T.text }}>{s.child_name}</p>
                              {s.child_age && <p className="font-nunito text-[11px]" style={{ color: T.muted }}>Age {s.child_age}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-nunito font-bold text-[11px] px-2 py-1 rounded-lg" style={{ background: T.brandSubtle, color: T.brand }}>
                            {LANG_FLAG[s.child_language]} {LANG_FULL[s.child_language]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 min-w-[70px] h-1.5 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
                                className="h-full rounded-full" style={{ background: T.brand }} />
                            </div>
                            <span className="font-nunito text-[11px]" style={{ color: T.muted }}>{s.missions_done}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-baloo font-black text-[14px]" style={{ color: T.gold }}>⭐ {s.stars_earned}</td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="font-nunito font-bold text-[11px] px-2.5 py-1 rounded-lg" style={parseStatusStyle(ST_BG[st])}>{ST_LABEL[st]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="overflow-hidden shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
              <h3 className="font-baloo font-black text-[15px]" style={{ color: T.text }}>Top Learners</h3>
              <p className="font-nunito text-[11px] mt-0.5" style={{ color: T.muted }}>Ranked by stars earned</p>
            </div>
            <div className="px-5 py-2">
              {topLearners.map((s, i) => (
                <div key={s.child_id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < topLearners.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <span className="w-5 text-[14px] text-center shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="font-nunito text-[11px]" style={{ color: T.muted }}>{i + 1}</span>}
                  </span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-baloo font-black text-[10px]"
                    style={{ background: T.brandSubtle, color: T.brand }}>{initials(s.child_name)}</div>
                  <p className="font-nunito font-bold text-[13px] flex-1 truncate" style={{ color: T.text }}>{s.child_name}</p>
                  <p className="font-baloo font-black text-[13px] shrink-0" style={{ color: T.gold }}>⭐ {s.stars_earned}</p>
                </div>
              ))}
            </div>
          </div>

          {needsAttn.length > 0 && (
            <div className="overflow-hidden shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
              <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="font-baloo font-black text-[15px]" style={{ color: T.text }}>Needs Attention</h3>
              </div>
              <div className="px-5 py-2">
                {needsAttn.map((s, i) => (
                  <div key={s.child_id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < needsAttn.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-baloo font-black text-[10px]"
                      style={{ background: "#fef3c7", color: "#92400e" }}>{initials(s.child_name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-nunito font-bold text-[13px] truncate" style={{ color: T.text }}>{s.child_name}</p>
                      <p className="font-nunito text-[11px]" style={{ color: T.muted }}>Last seen {ago(s.last_active)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3" style={{ background: "#fffbeb", borderTop: "1px solid #fde68a" }}>
                <p className="font-nunito text-[11px] text-amber-700">{needsAttn.length} student{needsAttn.length > 1 ? "s" : ""} inactive 7+ days.</p>
              </div>
            </div>
          )}

          <div className="px-5 py-4 shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
            <h3 className="font-baloo font-black text-[15px] mb-4" style={{ color: T.text }}>Languages</h3>
            {(["en", "fr", "rw"] as const).map(lang => {
              const count = students.filter(s => s.child_language === lang).length;
              if (!count) return null;
              const pct = students.length ? Math.round((count / students.length) * 100) : 0;
              return (
                <div key={lang} className="mb-3 last:mb-0">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-nunito font-bold text-[12px]" style={{ color: T.text }}>{LANG_FLAG[lang]} {LANG_FULL[lang]}</span>
                    <span className="font-nunito text-[11px]" style={{ color: T.muted }}>{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: T.brand }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Students view ──────────────────────────────────────────────── */
function StudentsView({ students, loading, onAdd, onImport, teacher }: {
  students: ChildSummary[]; loading: boolean; onAdd: () => void;
  onImport: () => void; teacher: TeacherProfile | null;
}) {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("all");
  const [sort, setSort] = useState<"name" | "stars" | "missions" | "activity">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(col: typeof sort) {
    if (sort === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(col); setSortDir("desc"); }
  }

  const filtered = useMemo(() => [...students]
    .filter(s => (lang === "all" || s.child_language === lang) && s.child_name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const diff = sort === "name" ? a.child_name.localeCompare(b.child_name)
        : sort === "stars"    ? a.stars_earned - b.stars_earned
        : sort === "missions" ? a.missions_done - b.missions_done
        : new Date(a.last_active ?? 0).getTime() - new Date(b.last_active ?? 0).getTime();
      return sortDir === "asc" ? diff : -diff;
    }), [students, q, lang, sort, sortDir]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin" style={{ color: T.brand }} /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.muted }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students…"
            className="w-full pl-10 pr-4 py-2.5 text-[13px] focus:outline-none transition"
            style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
            onFocus={e => e.currentTarget.style.borderColor = T.brand}
            onBlur={e => e.currentTarget.style.borderColor = T.border} />
        </div>
        <select value={lang} onChange={e => setLang(e.target.value)}
          className="px-3.5 py-2.5 text-[13px] focus:outline-none"
          style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}>
          <option value="all">All Languages</option>
          <option value="en">🇬🇧 English</option>
          <option value="fr">🇫🇷 French</option>
          <option value="rw">🇷🇼 Kinyarwanda</option>
        </select>
        <button onClick={onImport}
          className="flex items-center gap-2 font-nunito font-bold text-[13px] px-4 py-2.5"
          style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}>
          <Upload className="w-4 h-4" /> Import CSV
        </button>
        <button onClick={onAdd}
          className="flex items-center gap-2 text-white font-nunito font-bold text-[13px] px-4 py-2.5"
          style={{ background: T.brand, borderRadius: T.leafSm }}>
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      <div className="shadow-sm overflow-hidden" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead style={{ borderBottom: `1px solid ${T.border}`, background: "#F9FAFB" }}>
              <tr>
                {[
                  { col: "name" as const,     label: "Student",     cls: "px-6" },
                  { col: null,                 label: "Language",    cls: "px-4" },
                  { col: "missions" as const,  label: "Missions",    cls: "px-4" },
                  { col: "stars" as const,     label: "Stars",       cls: "px-4" },
                  { col: null,                 label: "Certs",       cls: "px-4" },
                  { col: null,                 label: "Status",      cls: "px-4" },
                  { col: "activity" as const,  label: "Last Active", cls: "px-4" },
                  { col: null,                 label: "",            cls: "px-4" },
                ].map(({ col, label, cls }) => (
                  <th key={label}
                    className={`py-2.5 text-left font-nunito font-bold text-[11px] uppercase tracking-wider ${cls} ${col ? "cursor-pointer select-none" : ""}`}
                    style={{ color: sort === col ? T.brand : T.muted }}
                    onClick={() => col && toggleSort(col)}>
                    <span className="flex items-center gap-1">
                      {label}
                      {sort === col && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center font-nunito text-[13px]" style={{ color: T.muted }}>
                  {q || lang !== "all" ? "No students match your filters." : "No students yet."}
                </td></tr>
              ) : filtered.map(s => {
                const st = actStatus(s.last_active);
                return (
                  <tr key={s.child_id} className="hover:bg-gray-50/40 transition-colors" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-baloo font-black text-[12px]"
                            style={{ background: T.brandSubtle, color: T.brand }}>{initials(s.child_name)}</div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: ST_DOT[st] }} />
                        </div>
                        <div>
                          <p className="font-nunito font-bold text-[13px]" style={{ color: T.text }}>{s.child_name}</p>
                          {s.child_age && <p className="font-nunito text-[11px]" style={{ color: T.muted }}>Age {s.child_age}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-nunito font-bold text-[11px] px-2 py-1 rounded-lg" style={{ background: T.brandSubtle, color: T.brand }}>
                        {LANG_FLAG[s.child_language]} {LANG_FULL[s.child_language]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-nunito font-bold text-[13px]" style={{ color: T.text }}>{s.missions_done}</td>
                    <td className="px-4 py-3.5 font-baloo font-black text-[14px]" style={{ color: T.gold }}>⭐ {s.stars_earned}</td>
                    <td className="px-4 py-3.5">
                      {s.certificates > 0
                        ? <span className="flex items-center gap-1 font-nunito font-bold text-[13px] text-violet-600"><Award className="w-3.5 h-3.5" />{s.certificates}</span>
                        : <span style={{ color: "#d1d5db" }}>—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-nunito font-bold text-[11px] px-2.5 py-1 rounded-lg" style={parseStatusStyle(ST_BG[st])}>{ST_LABEL[st]}</span>
                    </td>
                    <td className="px-4 py-3.5 font-nunito text-[12px]" style={{ color: T.muted }}>{ago(s.last_active)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => printProgressCard(s, teacher)}
                        className="inline-flex items-center gap-1 font-nunito font-bold text-[11px] px-2.5 py-1.5 hover:opacity-80 transition-opacity"
                        style={{ background: T.brandSubtle, color: T.brand, borderRadius: T.leafSm }} title="Print progress card">
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-6 py-3" style={{ borderTop: `1px solid ${T.border}`, background: "#FAFAFA" }}>
            <p className="font-nunito text-[12px]" style={{ color: T.muted }}>{filtered.length} student{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stories view ───────────────────────────────────────────────── */
/* ─── Story Progress view ────────────────────────────────────────── */
interface ClassStoryItem {
  story_id: string;
  story_title: string;
  story_slug: string;
  theme_emoji: string | null;
  age_min: number | null;
  age_max: number | null;
  category: string | null;
  is_free: boolean;
  total_slots: number;
  total_students: number;
  students_started: number;
  students_complete: number;
}
interface SlotProgress {
  slot_key: string;
  slot_order: number;
  mission_type: string;
  total_students: number;
  completed_count: number;
}

const SLOT_META: Record<string, { emoji: string; label: string; color: string }> = {
  flipflop_audio: { emoji: "🎧", label: "Listen",  color: "#8b5cf6" },
  story_pdf:      { emoji: "📖", label: "Read",    color: "#0ea5e9" },
  coloring:       { emoji: "🎨", label: "Color",   color: "#f59e0b" },
  move_explore:   { emoji: "🤸", label: "Move",    color: "#f43f5e" },
  sing_along:     { emoji: "🎵", label: "Sing",    color: "#ec4899" },
  bonus_video:    { emoji: "🎬", label: "Watch",   color: "#10b981" },
};

const AGE_FILTERS = [
  { label: "All ages", min: null, max: null },
  { label: "4–6",     min: 4,    max: 6    },
  { label: "6–8",     min: 6,    max: 8    },
  { label: "8–10",    min: 8,    max: 10   },
];
const LANG_FILTERS = [
  { label: "All",  value: "all" },
  { label: "🇬🇧 EN", value: "en"  },
  { label: "🇫🇷 FR", value: "fr"  },
  { label: "🇷🇼 RW", value: "rw"  },
];

function StoryProgressView({ studentCount, teacherStories }: { studentCount: number; teacherStories: StoryBreakdown[] }) {
  const [library, setLibrary]       = useState<ClassStoryItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<ClassStoryItem | null>(null);
  const [slots, setSlots]           = useState<SlotProgress[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [ageFilter, setAgeFilter]   = useState(0);
  const [langFilter, setLangFilter] = useState("all");
  const [assigning, setAssigning]   = useState(false);
  const [assigned, setAssigned]     = useState<string | null>(null);
  const [dueDate, setDueDate]       = useState("");
  const [showDue, setShowDue]       = useState(false);

  useEffect(() => {
    supabase.rpc("get_class_story_library")
      .then(({ data }) => { setLibrary((data ?? []) as ClassStoryItem[]); setLoading(false); });
  }, []);

  async function selectStory(item: ClassStoryItem) {
    setSelected(item); setSlots([]); setSlotsLoading(true); setAssigned(null); setShowDue(false); setDueDate("");
    const { data } = await supabase.rpc("get_teacher_class_story_progress", { p_story_id: item.story_id });
    setSlots((data ?? []) as SlotProgress[]);
    setSlotsLoading(false);
  }

  async function assignStory() {
    if (!selected) return;
    setAssigning(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAssigning(false); return; }
    const payload: Record<string, unknown> = {
      teacher_id: user.id,
      title: `Complete: ${selected.story_title}`,
      story_id: selected.story_id,
    };
    if (dueDate) payload.due_date = dueDate;
    const { data: ins, error } = await supabase.from("assignments").insert(payload).select("id").single();
    if (!error && ins) {
      await supabase.rpc("assign_to_class", { p_assignment_id: (ins as { id: string }).id });
      setAssigned(selected.story_id);
    }
    setAssigning(false);
  }

  const af = AGE_FILTERS[ageFilter];
  const filtered = library.filter(s => {
    if (langFilter !== "all") {
      // filter by whether this story has English as proxy — we filter by age + category only (language availability is implicit)
      // language filter left as a UX hint for now
    }
    if (af.min !== null && s.age_max !== null && s.age_max < af.min) return false;
    if (af.max !== null && s.age_min !== null && s.age_min > af.max) return false;
    return true;
  });

  const totalStudents = selected?.total_students ?? studentCount;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-baloo font-black text-[22px]" style={{ color: T.text }}>Story Progress</h2>
        <p className="font-nunito text-[13px]" style={{ color: T.muted }}>
          {library.length} stories · select one to see per-mission class progress
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-nunito font-bold text-[11px] uppercase tracking-wide" style={{ color: T.muted }}>Age:</span>
        {AGE_FILTERS.map((f, i) => (
          <button key={i} onClick={() => setAgeFilter(i)}
            className="font-nunito font-bold text-[12px] px-3 py-1 transition-all"
            style={{ background: ageFilter === i ? T.brand : T.brandSubtle, color: ageFilter === i ? "#fff" : T.brand, borderRadius: "100px" }}>
            {f.label}
          </button>
        ))}
        <span className="font-nunito font-bold text-[11px] uppercase tracking-wide ml-2" style={{ color: T.muted }}>Lang:</span>
        {LANG_FILTERS.map(f => (
          <button key={f.value} onClick={() => setLangFilter(f.value)}
            className="font-nunito font-bold text-[12px] px-3 py-1 transition-all"
            style={{ background: langFilter === f.value ? T.brand : T.brandSubtle, color: langFilter === f.value ? "#fff" : T.brand, borderRadius: "100px" }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-14 justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.brand }} />
          <span className="font-nunito text-[13px]" style={{ color: T.muted }}>Loading stories…</span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">

          {/* ── Story card list ─────────────────────────────────── */}
          <div className="lg:w-[320px] shrink-0 space-y-2.5 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0 && (
              <p className="text-center py-10 font-nunito text-[13px]" style={{ color: T.muted }}>No stories match these filters.</p>
            )}
            {filtered.map(s => {
              const startedPct  = s.total_students > 0 ? Math.round((s.students_started  / s.total_students) * 100) : 0;
              const completePct = s.total_students > 0 ? Math.round((s.students_complete / s.total_students) * 100) : 0;
              const isSelected  = selected?.story_id === s.story_id;
              return (
                <button key={s.story_id} onClick={() => selectStory(s)} className="w-full text-left p-4 transition-all hover:shadow-md"
                  style={{
                    background: isSelected ? T.brandSubtle : T.card,
                    borderRadius: T.leafSm,
                    border: `1px solid ${isSelected ? T.brand : T.border}`,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-[20px]"
                      style={{ background: "#fff", borderRadius: T.leafSm, border: `1px solid ${T.border}` }}>
                      {s.theme_emoji ?? "📖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-nunito font-bold text-[13px] leading-snug" style={{ color: T.text }}>{s.story_title}</p>
                      <p className="font-nunito text-[10px] mt-0.5" style={{ color: T.muted }}>
                        {s.age_min && s.age_max ? `Age ${s.age_min}–${s.age_max}` : "All ages"}
                        {s.category ? ` · ${s.category}` : ""}
                        {!s.is_free && <span className="ml-1 text-amber-500">★ Premium</span>}
                      </p>

                      {/* Dual progress bar */}
                      {s.total_students > 0 && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-nunito text-[10px]" style={{ color: T.muted }}>
                              Started: {s.students_started}/{s.total_students}
                            </span>
                            <span className="font-nunito font-bold text-[10px]" style={{ color: T.brand }}>{startedPct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
                            <div className="h-full rounded-full" style={{ width: `${startedPct}%`, background: T.brand }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-nunito text-[10px]" style={{ color: T.muted }}>
                              Complete: {s.students_complete}/{s.total_students}
                            </span>
                            <span className="font-nunito font-bold text-[10px]" style={{ color: "#10b981" }}>{completePct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
                            <div className="h-full rounded-full" style={{ width: `${completePct}%`, background: "#10b981" }} />
                          </div>
                        </div>
                      )}
                      {s.total_students === 0 && (
                        <p className="font-nunito text-[10px] mt-1.5" style={{ color: T.muted }}>No students yet</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Slot breakdown panel ────────────────────────────── */}
          <div className="flex-1">
            {!selected ? (
              <div className="py-20 text-center" style={{ border: `1.5px dashed ${T.border}`, borderRadius: T.leaf }}>
                <p className="text-[36px] mb-3">📚</p>
                <p className="font-baloo font-black text-[17px]" style={{ color: T.text }}>Select a story</p>
                <p className="font-nunito text-[13px] mt-1" style={{ color: T.muted }}>
                  See how each mission slot is progressing across your class.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-5" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>

                {/* Story header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 flex items-center justify-center text-[24px] shrink-0"
                      style={{ background: T.brandSubtle, borderRadius: T.leafSm }}>
                      {selected.theme_emoji ?? "📖"}
                    </div>
                    <div>
                      <h3 className="font-baloo font-black text-[19px]" style={{ color: T.text }}>{selected.story_title}</h3>
                      <p className="font-nunito text-[12px]" style={{ color: T.muted }}>
                        {totalStudents} students · {selected.total_slots} missions per student
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-baloo font-black text-[26px] leading-none" style={{ color: "#10b981" }}>
                      {selected.total_students > 0 ? Math.round((selected.students_complete / selected.total_students) * 100) : 0}%
                    </p>
                    <p className="font-nunito text-[10px]" style={{ color: T.muted }}>complete</p>
                  </div>
                </div>

                {/* Per-slot bars */}
                {slotsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.brand }} />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="font-nunito text-[13px] text-center py-8" style={{ color: T.muted }}>
                    No slot data yet — students haven't started this story.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {slots.map((sl, i) => {
                      const meta   = SLOT_META[sl.slot_key] ?? { emoji: "📌", label: sl.slot_key, color: T.brand };
                      const pct    = sl.total_students > 0 ? Math.round((sl.completed_count / sl.total_students) * 100) : 0;
                      const pctStr = `${pct}%`;
                      return (
                        <div key={sl.slot_key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[16px]">{meta.emoji}</span>
                              <span className="font-nunito font-bold text-[13px]" style={{ color: T.text }}>{meta.label}</span>
                              <span className="font-nunito text-[11px] px-2 py-0.5 rounded-full"
                                style={{ background: T.page, color: T.muted }}>
                                {sl.slot_key}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-nunito text-[12px]" style={{ color: T.muted }}>
                                {sl.completed_count}/{sl.total_students}
                              </span>
                              <span className="font-baloo font-black text-[14px]" style={{ color: meta.color }}>{pctStr}</span>
                            </div>
                          </div>
                          <div className="h-3 rounded-full overflow-hidden" style={{ background: T.border }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: pctStr }}
                              transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ background: meta.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Assign to class */}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 20 }}>
                  {assigned === selected.story_id ? (
                    <div className="flex items-center gap-2 justify-center py-3"
                      style={{ background: "#dcfce7", borderRadius: T.leafSm }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-nunito font-bold text-[13px] text-emerald-700">
                        Assigned to all {totalStudents} students!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-baloo font-black text-[14px]" style={{ color: T.text }}>Assign this story mission</p>
                        <button onClick={() => setShowDue(v => !v)}
                          className="font-nunito text-[11px] flex items-center gap-1"
                          style={{ color: T.muted }}>
                          <Calendar className="w-3.5 h-3.5" />
                          {showDue ? "No due date" : "Add due date"}
                        </button>
                      </div>
                      {showDue && (
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                          className="w-full font-nunito text-[13px] px-3 py-2.5 outline-none"
                          style={{ background: T.page, borderRadius: T.leafSm, border: `1px solid ${T.border}`, color: T.text }} />
                      )}
                      <p className="font-nunito text-[12px]" style={{ color: T.muted }}>
                        Creates a mission for all {totalStudents} students to complete all 6 activities in "{selected.story_title}".
                      </p>
                      <button onClick={assignStory} disabled={assigning || totalStudents === 0}
                        className="w-full flex items-center justify-center gap-2 font-nunito font-bold text-[13px] text-white py-3 transition-all hover:opacity-90 active:scale-98 disabled:opacity-50"
                        style={{ background: T.brand, borderRadius: T.leafSm }}>
                        {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                        {assigning ? "Assigning…" : `Assign to ${totalStudents} student${totalStudents !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

/* ─── Delete confirmation modal ──────────────────────────────────── */
function ConfirmDeleteModal({ open, onConfirm, onCancel, deleting }: {
  open: boolean; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm p-7 shadow-2xl"
              style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
                style={{ background: "#fef2f2", borderRadius: T.leafSm }}>
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-baloo font-black text-[19px] text-center mb-2" style={{ color: T.text }}>
                Delete announcement?
              </h3>
              <p className="font-nunito text-[13px] text-center mb-6" style={{ color: T.muted }}>
                This will remove the announcement from the class page immediately.
              </p>
              <div className="flex gap-3">
                <button onClick={onCancel} disabled={deleting}
                  className="flex-1 font-nunito font-bold text-[13px] py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.muted }}>
                  Cancel
                </button>
                <button onClick={onConfirm} disabled={deleting}
                  className="flex-1 font-nunito font-bold text-[13px] py-3 text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                  style={{ background: "#ef4444", borderRadius: T.leafSm }}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Assignments view ───────────────────────────────────────────── */
interface TeacherAssignment {
  assignment_id: string;
  title: string;
  instructions: string | null;
  story_id: string | null;
  story_title: string | null;
  story_slug: string | null;
  due_date: string | null;
  total_assigned: number;
  completed_count: number;
  created_at: string;
}
interface AssignmentStudentRow {
  child_id: string;
  child_name: string;
  language: string;
  age: number | null;
  completed_at: string | null;
  seen_at: string | null;
}

function AssignmentsView({ students, stories }: { students: ChildSummary[]; stories: StoryBreakdown[] }) {
  const [assignments, setAssignments]   = useState<TeacherAssignment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [createOpen, setCreateOpen]     = useState(false);
  const [detailId, setDetailId]         = useState<string | null>(null);
  const [detail, setDetail]             = useState<AssignmentStudentRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState({ title: "", instructions: "", story_id: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("get_teacher_assignments");
    setAssignments((data ?? []) as TeacherAssignment[]);
    setLoading(false);
  }

  async function openDetail(id: string) {
    setDetailId(id); setDetailLoading(true); setDetail([]);
    const { data } = await supabase.rpc("get_assignment_detail", { p_assignment_id: id });
    setDetail((data ?? []) as AssignmentStudentRow[]);
    setDetailLoading(false);
  }

  async function create() {
    if (!form.title.trim()) { setFormErr("Title is required."); return; }
    if (!students.length)   { setFormErr("You have no students to assign to."); return; }
    setSaving(true); setFormErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFormErr("Not signed in."); setSaving(false); return; }
    const payload: Record<string, unknown> = { teacher_id: user.id, title: form.title.trim() };
    if (form.instructions.trim()) payload.instructions = form.instructions.trim();
    if (form.story_id)            payload.story_id     = form.story_id;
    if (form.due_date)            payload.due_date     = form.due_date;
    const { data: inserted, error } = await supabase.from("assignments").insert(payload).select("id").single();
    if (error || !inserted) { setFormErr(error?.message ?? "Failed to create assignment."); setSaving(false); return; }
    await supabase.rpc("assign_to_class", { p_assignment_id: (inserted as { id: string }).id });
    setSaving(false);
    setCreateOpen(false);
    setForm({ title: "", instructions: "", story_id: "", due_date: "" });
    void load();
  }

  async function deleteAssignment(id: string) {
    await supabase.from("assignments").delete().eq("id", id);
    if (detailId === id) setDetailId(null);
    void load();
  }

  const selectedAssignment = assignments.find(a => a.assignment_id === detailId);

  function dueBadge(due: string | null) {
    if (!due) return null;
    const diff = (new Date(due).getTime() - Date.now()) / 86_400_000;
    const label = diff < 0 ? "Overdue" : diff < 1 ? "Due today" : diff <= 2 ? `Due in ${Math.ceil(diff)}d` : new Date(due).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const color = diff < 0 ? "#dc2626" : diff <= 2 ? "#d97706" : "#6B7280";
    const bg    = diff < 0 ? "#fef2f2" : diff <= 2 ? "#fffbeb" : "#f3f4f6";
    return <span className="font-nunito font-bold text-[10px] px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{label}</span>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h2 className="font-baloo font-black text-[22px]" style={{ color: T.text }}>Assignments</h2>
          <p className="font-nunito text-[13px]" style={{ color: T.muted }}>
            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} · {students.length} student{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 font-nunito font-bold text-[13px] text-white px-4 py-2.5 transition-all hover:opacity-90 active:scale-95"
          style={{ background: T.brand, borderRadius: T.leafSm }}>
          <Plus className="w-4 h-4" /> New Assignment
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-10 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.brand }} />
          <span className="font-nunito text-[13px]" style={{ color: T.muted }}>Loading…</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="py-16 text-center" style={{ border: `1.5px dashed ${T.border}`, borderRadius: T.leaf }}>
          <p className="text-[40px] mb-3">📋</p>
          <p className="font-baloo font-black text-[18px]" style={{ color: T.text }}>No assignments yet</p>
          <p className="font-nunito text-[13px] mt-1 mb-5" style={{ color: T.muted }}>Create your first assignment and it'll be sent to all your students.</p>
          <button onClick={() => setCreateOpen(true)}
            className="font-nunito font-bold text-[13px] text-white px-5 py-2.5 transition-all hover:opacity-90"
            style={{ background: T.brand, borderRadius: T.leafSm }}>
            <Plus className="w-4 h-4 inline mr-1.5" />Create Assignment
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Assignment list */}
          <div className="lg:w-[340px] shrink-0 space-y-3">
            {assignments.map(a => {
              const pct = a.total_assigned > 0 ? Math.round((a.completed_count / a.total_assigned) * 100) : 0;
              return (
                <div key={a.assignment_id}
                  onClick={() => openDetail(a.assignment_id)}
                  className="cursor-pointer p-4 transition-all hover:shadow-md"
                  style={{
                    background: detailId === a.assignment_id ? T.brandSubtle : T.card,
                    borderRadius: T.leafSm,
                    border: `1px solid ${detailId === a.assignment_id ? T.brand : T.border}`,
                  }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-nunito font-bold text-[13px] flex-1" style={{ color: T.text }}>{a.title}</p>
                    <button onClick={e => { e.stopPropagation(); void deleteAssignment(a.assignment_id); }}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                    </button>
                  </div>
                  {a.story_title && (
                    <p className="font-nunito text-[11px] mb-2" style={{ color: T.muted }}>📖 {a.story_title}</p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    {dueBadge(a.due_date)}
                    <span className="font-nunito text-[11px]" style={{ color: T.muted }}>
                      <UserCheck className="w-3 h-3 inline mr-0.5" />{a.completed_count}/{a.total_assigned}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : T.brand }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="flex-1">
            {!detailId ? (
              <div className="py-14 text-center" style={{ border: `1.5px dashed ${T.border}`, borderRadius: T.leaf }}>
                <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: T.border }} />
                <p className="font-nunito text-[13px]" style={{ color: T.muted }}>Select an assignment to see student progress</p>
              </div>
            ) : (
              <div className="p-5" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
                <div className="mb-4">
                  <h3 className="font-baloo font-black text-[17px]" style={{ color: T.text }}>{selectedAssignment?.title}</h3>
                  {selectedAssignment?.instructions && (
                    <p className="font-nunito text-[12px] mt-1" style={{ color: T.muted }}>{selectedAssignment.instructions}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {dueBadge(selectedAssignment?.due_date ?? null)}
                    <span className="font-nunito text-[12px]" style={{ color: T.muted }}>
                      {selectedAssignment?.completed_count}/{selectedAssignment?.total_assigned} completed
                    </span>
                  </div>
                </div>
                {detailLoading ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.brand }} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detail.map(s => (
                      <div key={s.child_id} className="flex items-center gap-3 px-4 py-3"
                        style={{ background: s.completed_at ? "#f0fdf4" : T.page, borderRadius: T.leafSm, border: `1px solid ${s.completed_at ? "#bbf7d0" : T.border}` }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-baloo font-black text-[12px] text-white shrink-0"
                          style={{ background: T.brand }}>{initials(s.child_name)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-nunito font-bold text-[13px]" style={{ color: T.text }}>{s.child_name}</p>
                          <p className="font-nunito text-[11px]" style={{ color: T.muted }}>
                            {LANG_FLAG[s.language] ?? ""} {LANG_FULL[s.language] ?? s.language}{s.age ? ` · Age ${s.age}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {s.completed_at ? (
                            <span className="flex items-center gap-1 font-nunito font-bold text-[11px] px-2 py-0.5 rounded-full"
                              style={{ background: "#dcfce7", color: "#15803d" }}>
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          ) : (
                            <span className="font-nunito font-bold text-[11px] px-2 py-0.5 rounded-full"
                              style={{ background: "#f3f4f6", color: "#6B7280" }}>
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {detail.length === 0 && (
                      <p className="text-center py-6 font-nunito text-[13px]" style={{ color: T.muted }}>No students assigned.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", damping: 26 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-md p-7 shadow-2xl"
                style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-baloo font-black text-[20px]" style={{ color: T.text }}>New Assignment</h2>
                  <button onClick={() => setCreateOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                    <X className="w-4 h-4" style={{ color: T.muted }} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-nunito font-bold text-[12px] block mb-1.5" style={{ color: T.muted }}>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Read The Lion Story"
                      className="w-full font-nunito text-[13px] px-3 py-2.5 outline-none transition-all"
                      style={{ background: T.page, borderRadius: T.leafSm, border: `1px solid ${T.border}`, color: T.text }} />
                  </div>
                  <div>
                    <label className="font-nunito font-bold text-[12px] block mb-1.5" style={{ color: T.muted }}>Instructions (optional)</label>
                    <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                      rows={3} placeholder="e.g. Read pages 1–4 and answer the questions"
                      className="w-full font-nunito text-[13px] px-3 py-2.5 outline-none resize-none transition-all"
                      style={{ background: T.page, borderRadius: T.leafSm, border: `1px solid ${T.border}`, color: T.text }} />
                  </div>
                  <div>
                    <label className="font-nunito font-bold text-[12px] block mb-1.5" style={{ color: T.muted }}>Linked Story (optional)</label>
                    <select value={form.story_id} onChange={e => setForm(f => ({ ...f, story_id: e.target.value }))}
                      className="w-full font-nunito text-[13px] px-3 py-2.5 outline-none"
                      style={{ background: T.page, borderRadius: T.leafSm, border: `1px solid ${T.border}`, color: T.text }}>
                      <option value="">— No specific story —</option>
                      {stories.map(s => (
                        <option key={s.story_id} value={s.story_id}>{s.story_title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-nunito font-bold text-[12px] block mb-1.5" style={{ color: T.muted }}>
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />Due Date (optional)
                    </label>
                    <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full font-nunito text-[13px] px-3 py-2.5 outline-none"
                      style={{ background: T.page, borderRadius: T.leafSm, border: `1px solid ${T.border}`, color: T.text }} />
                  </div>

                  {formErr && <p className="font-nunito text-[12px]" style={{ color: "#ef4444" }}>{formErr}</p>}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setCreateOpen(false)}
                      className="flex-1 font-nunito font-bold text-[13px] py-2.5 transition-all"
                      style={{ background: T.page, borderRadius: T.leafSm, border: `1px solid ${T.border}`, color: T.muted }}>
                      Cancel
                    </button>
                    <button onClick={create} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 font-nunito font-bold text-[13px] text-white py-2.5 transition-all disabled:opacity-60"
                      style={{ background: T.brand, borderRadius: T.leafSm }}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {saving ? "Creating…" : `Assign to All (${students.length})`}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Announcements view ─────────────────────────────────────────── */
function AnnouncementsView({ teacher, announcements, onRefresh }: {
  teacher: TeacherProfile | null; announcements: Announcement[]; onRefresh: () => void;
}) {
  const [form, setForm] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const joinUrl = typeof window !== "undefined" && teacher?.class_code
    ? `${window.location.origin}/join/${teacher.class_code}` : "";

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!form.body.trim()) { setErr("Message body is required."); return; }
    setSaving(true); setErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Not signed in."); setSaving(false); return; }
    const { error } = await supabase.from("class_announcements")
      .insert({ teacher_id: user.id, title: form.title.trim(), body: form.body.trim() });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setForm({ title: "", body: "" });
    onRefresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    await supabase.from("class_announcements").delete().eq("id", pendingDelete);
    setDeleting(false);
    setPendingDelete(null);
    onRefresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Class join link */}
      {teacher?.class_code && (
        <div className="px-6 py-5 shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
          <h3 className="font-baloo font-black text-[16px] mb-1" style={{ color: T.text }}>Class Public Page</h3>
          <p className="font-nunito text-[12px] mb-4" style={{ color: T.muted }}>
            Share this link with parents — they can view your announcements without signing in.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <code className="font-mono text-[12px] px-3 py-2 flex-1 min-w-0 truncate"
              style={{ background: "#F3F4F6", borderRadius: T.leafSm, color: T.text }}>{joinUrl}</code>
            <CopyButton text={joinUrl} label="Copy link" />
            <a href={joinUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-nunito font-bold text-[12px] px-3 py-1.5"
              style={{ border: `1px solid ${T.border}`, borderRadius: "100px", color: T.muted }}>
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </a>
          </div>
        </div>
      )}

      {/* Compose */}
      <form onSubmit={post} className="px-6 py-5 shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
        <h2 className="font-baloo font-black text-[17px] mb-4" style={{ color: T.text }}>New Announcement</h2>
        <div className="space-y-4">
          <div>
            <label className="block font-nunito font-bold text-[11px] uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Title (optional)</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Parent–Teacher Meeting" className="w-full px-4 py-3 text-[14px] focus:outline-none transition"
              style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
              onFocus={e => e.currentTarget.style.borderColor = T.brand}
              onBlur={e => e.currentTarget.style.borderColor = T.border} />
          </div>
          <div>
            <label className="block font-nunito font-bold text-[11px] uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Message *</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={4}
              placeholder="Write your announcement here…" className="w-full px-4 py-3 text-[14px] focus:outline-none transition resize-none"
              style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
              onFocus={e => e.currentTarget.style.borderColor = T.brand}
              onBlur={e => e.currentTarget.style.borderColor = T.border} />
          </div>
          {err && <p className="font-nunito text-red-500 text-[13px] flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{err}</p>}
        </div>
        <button type="submit" disabled={saving}
          className="mt-4 flex items-center gap-2 text-white font-nunito font-bold text-[13px] px-6 py-3 disabled:opacity-60"
          style={{ background: T.brand, borderRadius: T.leafSm }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
          {saving ? "Posting…" : "Post Announcement"}
        </button>
      </form>

      {/* List */}
      {announcements.length === 0 ? (
        <div className="px-6 py-10 text-center shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
          <Megaphone className="w-8 h-8 mx-auto mb-3" style={{ color: T.muted }} />
          <p className="font-nunito text-[13px]" style={{ color: T.muted }}>No announcements yet. Post your first one above.</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
            <h2 className="font-baloo font-black text-[17px]" style={{ color: T.text }}>Posted Announcements</h2>
          </div>
          {announcements.map((a, i) => (
            <div key={a.id} className="px-6 py-5 hover:bg-gray-50/40 transition-colors group"
              style={{ borderBottom: i < announcements.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {a.title && <p className="font-baloo font-black text-[15px] mb-1" style={{ color: T.text }}>{a.title}</p>}
                  <p className="font-nunito text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: T.muted }}>{a.body}</p>
                  <p className="font-nunito text-[11px] mt-2" style={{ color: T.muted }}>{fmt(a.created_at)}</p>
                </div>
                <button onClick={() => setPendingDelete(a.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        deleting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ─── Reports view ───────────────────────────────────────────────── */
function ReportsView({ students }: { students: ChildSummary[] }) {
  function downloadCSV() {
    const rows = [
      ["Name", "Language", "Age", "Missions", "Stars", "Certificates", "Status", "Last Active"],
      ...students.map(s => [
        s.child_name, LANG_FULL[s.child_language] ?? s.child_language,
        s.child_age ?? "", s.missions_done, s.stars_earned, s.certificates,
        ST_LABEL[actStatus(s.last_active)],
        s.last_active ? new Date(s.last_active).toLocaleDateString("en-GB") : "Never",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `nimipiko-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-baloo font-black text-[20px]" style={{ color: T.text }}>Class Report</h2>
          <p className="font-nunito text-[13px] mt-0.5" style={{ color: T.muted }}>
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={downloadCSV}
          className="flex items-center gap-2 text-white font-nunito font-bold text-[13px] px-5 py-2.5"
          style={{ background: T.brand, borderRadius: T.leafSm }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Students",     value: students.length },
          { label: "Missions",     value: students.reduce((s, c) => s + c.missions_done, 0) },
          { label: "Stars",        value: students.reduce((s, c) => s + c.stars_earned, 0).toLocaleString() },
          { label: "Certificates", value: students.reduce((s, c) => s + c.certificates, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-4 shadow-sm text-center" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
            <p className="font-baloo font-black text-[28px] leading-none" style={{ color: T.text }}>{value}</p>
            <p className="font-nunito text-[12px] mt-1" style={{ color: T.muted }}>{label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead style={{ borderBottom: `1px solid ${T.border}`, background: "#F9FAFB" }}>
              <tr>
                {["Student", "Language", "Missions", "Stars", "Certificates", "Status", "Last Active"].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-nunito font-bold text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center font-nunito text-[13px]" style={{ color: T.muted }}>No students yet.</td></tr>
              ) : students.map(s => {
                const st = actStatus(s.last_active);
                return (
                  <tr key={s.child_id} className="hover:bg-gray-50/40 transition-colors" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-baloo font-black text-[10px]" style={{ background: T.brandSubtle, color: T.brand }}>{initials(s.child_name)}</div>
                        <span className="font-nunito font-bold text-[13px]" style={{ color: T.text }}>{s.child_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-nunito font-bold text-[11px] px-2 py-1 rounded-lg" style={{ background: T.brandSubtle, color: T.brand }}>
                        {LANG_FLAG[s.child_language]} {LANG_FULL[s.child_language]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-nunito font-bold text-[13px]" style={{ color: T.text }}>{s.missions_done}</td>
                    <td className="px-5 py-3.5 font-baloo font-black text-[14px]" style={{ color: T.gold }}>⭐ {s.stars_earned}</td>
                    <td className="px-5 py-3.5">
                      {s.certificates > 0
                        ? <span className="flex items-center gap-1 font-nunito font-bold text-[13px] text-violet-600"><Award className="w-3.5 h-3.5" />{s.certificates}</span>
                        : <span style={{ color: "#d1d5db" }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-nunito font-bold text-[11px] px-2.5 py-1 rounded-lg" style={parseStatusStyle(ST_BG[st])}>{ST_LABEL[st]}</span>
                    </td>
                    <td className="px-5 py-3.5 font-nunito text-[12px]" style={{ color: T.muted }}>{ago(s.last_active)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Settings view ──────────────────────────────────────────────── */
function SettingsView({ teacher, onSaved }: { teacher: TeacherProfile | null; onSaved: () => void }) {
  const [form, setForm] = useState({ name: teacher?.name ?? "", school_name: teacher?.school_name ?? "", class_name: teacher?.class_name ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const joinUrl = typeof window !== "undefined" && teacher?.class_code
    ? `${window.location.origin}/join/${teacher.class_code}` : "";

  useEffect(() => {
    if (teacher) setForm({ name: teacher.name, school_name: teacher.school_name ?? "", class_name: teacher.class_name ?? "" });
  }, [teacher]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("teacher_profiles").upsert(
      { id: user.id, email: user.email ?? "", name: form.name, school_name: form.school_name || null, class_name: form.class_name || null },
      { onConflict: "id" }
    );
    clearTeacherCache(); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500); onSaved();
  }

  return (
    <div className="max-w-lg space-y-5">
      {teacher?.class_code && (
        <div className="px-6 py-5 shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
          <h3 className="font-baloo font-black text-[16px] mb-1" style={{ color: T.text }}>Class Join Link</h3>
          <p className="font-nunito text-[12px] mb-4" style={{ color: T.muted }}>Share with parents so they can view class announcements.</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-nunito font-bold text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>Code</span>
            <code className="font-baloo font-black text-[18px] tracking-[0.2em] px-3 py-1.5"
              style={{ background: T.brandSubtle, color: T.brand, borderRadius: T.leafSm }}>{teacher.class_code}</code>
            <CopyButton text={teacher.class_code} label="Copy code" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="font-mono text-[12px] px-3 py-1.5 flex-1 min-w-0 truncate"
              style={{ background: "#F3F4F6", borderRadius: T.leafSm, color: T.text }}>{joinUrl}</code>
            <CopyButton text={joinUrl} label="Copy link" />
            <a href={joinUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-nunito font-bold text-[12px] px-3 py-1.5"
              style={{ border: `1px solid ${T.border}`, borderRadius: "100px", color: T.muted }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <form onSubmit={save} className="p-7 shadow-sm space-y-5" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
        <h2 className="font-baloo font-black text-[18px]" style={{ color: T.text }}>Profile & Class</h2>
        {[
          { label: "Your Name",   key: "name",        ph: "e.g. Ms. Uwase" },
          { label: "School Name", key: "school_name", ph: "e.g. GS Kacyiru" },
          { label: "Class Name",  key: "class_name",  ph: "e.g. Grade 3 English" },
        ].map(f => (
          <div key={f.key}>
            <label className="block font-nunito font-bold text-[11px] uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>{f.label}</label>
            <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.ph} className="w-full px-4 py-3 text-[14px] focus:outline-none transition"
              style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
              onFocus={e => e.currentTarget.style.borderColor = T.brand}
              onBlur={e => e.currentTarget.style.borderColor = T.border} />
          </div>
        ))}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 text-white font-nunito font-bold text-[14px] px-6 py-3 disabled:opacity-60"
          style={{ background: T.brand, borderRadius: T.leafSm }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </form>

      <div className="p-7 shadow-sm" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
        <h3 className="font-baloo font-black text-[16px] mb-1" style={{ color: T.text }}>Signed in as</h3>
        <p className="font-nunito text-[13px] mb-4" style={{ color: T.muted }}>{teacher?.email}</p>
        <button onClick={async () => { clearTeacherCache(); await supabase.auth.signOut(); window.location.href = "/loginpage"; }}
          className="flex items-center gap-2 font-nunito font-bold text-[13px] text-red-600 hover:text-red-700 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

/* ─── Onboarding ─────────────────────────────────────────────────── */
function TeacherOnboarding({ userId, email, onComplete }: {
  userId: string; email: string; onComplete: (t: TeacherProfile) => void;
}) {
  const [form, setForm] = useState({ name: "", school_name: "", class_name: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Please enter your name."); return; }
    setSaving(true); setErr("");
    const { data, error } = await supabase.from("teacher_profiles")
      .insert({ id: userId, email, name: form.name.trim(), school_name: form.school_name.trim() || null, class_name: form.class_name.trim() || null })
      .select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onComplete(data as TeacherProfile);
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 font-nunito" style={{ background: T.page }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/nimi-logo.png" alt="NIMIPIKO" width={52} height={52} className="w-[52px] h-[52px] object-contain mx-auto mb-4" />
          <h1 className="font-baloo font-black text-[26px]" style={{ color: T.text }}>Set up your class</h1>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: T.muted }}>Create your teacher profile to access your dashboard.</p>
        </div>
        <form onSubmit={submit} className="p-8 shadow-sm space-y-5" style={{ background: T.card, borderRadius: T.leaf, border: `1px solid ${T.border}` }}>
          {[
            { label: "Your Name *", key: "name",        ph: "e.g. Ms. Uwase" },
            { label: "School Name", key: "school_name", ph: "e.g. GS Kacyiru" },
            { label: "Class Name",  key: "class_name",  ph: "e.g. Grade 3 English" },
          ].map(f => (
            <div key={f.key}>
              <label className="block font-nunito font-bold text-[11px] uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} className="w-full px-4 py-3 text-[14px] focus:outline-none transition"
                style={{ border: `1px solid ${T.border}`, borderRadius: T.leafSm, color: T.text }}
                onFocus={e => e.currentTarget.style.borderColor = T.brand}
                onBlur={e => e.currentTarget.style.borderColor = T.border} />
            </div>
          ))}
          {err && <p className="text-red-500 text-[13px] flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" />{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full text-white font-nunito font-bold text-[15px] py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: T.brand, borderRadius: T.leaf }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Creating…" : "Go to my dashboard →"}
          </button>
        </form>
        <p className="text-center text-[12px] mt-4" style={{ color: T.muted }}>
          Signed in as <strong>{email}</strong> ·{" "}
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/loginpage"; }}
            className="font-bold hover:underline" style={{ color: T.brand }}>Sign out</button>
        </p>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
const VIEW_TITLE: Record<string, string> = {
  dashboard: "Overview", students: "Students", stories: "Stories",
  announcements: "Announcements", reports: "Reports", settings: "Settings",
};

export default function TeacherPage() {
  const router = useRouter();
  const [teacher, setTeacher]             = useState<TeacherProfile | null>(null);
  const [authState, setAuthState]         = useState<"loading" | "onboarding" | "ready">("loading");
  const [onboardingUser, setOnboarding]   = useState<{ id: string; email: string } | null>(null);
  const [view, setView]                   = useState("dashboard");
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [addOpen, setAddOpen]             = useState(false);
  const [importOpen, setImportOpen]       = useState(false);
  const [students, setStudents]           = useState<ChildSummary[]>([]);
  const [stories, setStories]             = useState<StoryBreakdown[]>([]);
  const [weekData, setWeekData]           = useState<DayActivity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading]     = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/loginpage?next=/teacher"); return; }
      const { data } = await supabase.from("teacher_profiles")
        .select("id,name,email,school_name,class_name,class_code").eq("id", user.id).maybeSingle();
      if (!data) { setOnboarding({ id: user.id, email: user.email ?? "" }); setAuthState("onboarding"); }
      else { setTeacher(data as TeacherProfile); setAuthState("ready"); }
    }).catch(() => router.replace("/loginpage?next=/teacher"));
  }, [router]);

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    const [summaryRes, storiesRes, annRes] = await Promise.all([
      supabase.rpc("get_teacher_class_summary"),
      supabase.rpc("get_teacher_story_breakdown"),
      supabase.from("class_announcements").select("id,title,body,created_at").order("created_at", { ascending: false }),
    ]);
    setStudents((summaryRes.data ?? []) as ChildSummary[]);
    setStories((storiesRes.data ?? []) as StoryBreakdown[]);
    setAnnouncements((annRes.data ?? []) as Announcement[]);

    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: raw } = await supabase.from("child_progress")
      .select("completed_at, children!inner(teacher_id)").gte("completed_at", since);
    const days: DayActivity[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86_400_000);
      return { date: d.toISOString().slice(0, 10), count: 0 };
    });
    (raw ?? []).forEach((r: { completed_at: string }) => {
      const slot = days.find(d => d.date === r.completed_at.slice(0, 10));
      if (slot) slot.count++;
    });
    setWeekData(days);
    setDataLoading(false);
  }, []);

  const refreshAnnouncements = useCallback(async () => {
    const { data } = await supabase.from("class_announcements")
      .select("id,title,body,created_at").order("created_at", { ascending: false });
    setAnnouncements((data ?? []) as Announcement[]);
  }, []);

  useEffect(() => { if (authState === "ready") fetchData(); }, [authState, fetchData]);

  if (authState === "loading") return (
    <div className="flex items-center justify-center h-[100dvh]" style={{ background: T.page }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.brand }} />
    </div>
  );
  if (authState === "onboarding" && onboardingUser) return (
    <TeacherOnboarding userId={onboardingUser.id} email={onboardingUser.email}
      onComplete={t => { setTeacher(t); setAuthState("ready"); }} />
  );

  return (
    <div className="min-h-[100dvh] font-nunito flex" style={{ background: T.page }}>
      <Sidebar teacher={teacher} view={view} onView={setView} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 md:ml-[228px] flex flex-col min-h-[100dvh]">
        <header className="sticky top-0 z-30 px-5 sm:px-8 py-4 flex items-center gap-4"
          style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setMobileOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <Menu className="w-5 h-5" style={{ color: T.muted }} />
          </button>
          <div className="flex-1">
            <h1 className="font-baloo font-black text-[18px] leading-none" style={{ color: T.text }}>{VIEW_TITLE[view]}</h1>
            {teacher && (
              <p className="font-nunito text-[12px] mt-0.5" style={{ color: T.muted }}>
                {teacher.class_name ?? "My Class"}{teacher.school_name ? ` · ${teacher.school_name}` : ""}
              </p>
            )}
          </div>
          {!dataLoading && students.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 font-nunito font-bold text-[12px] px-3 py-1.5"
              style={{ background: T.brandSubtle, color: T.brand, borderRadius: "100px" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.brand }} />
              {students.filter(s => actStatus(s.last_active) === "active").length} active today
            </div>
          )}
          {(view === "dashboard" || view === "students") && (
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 text-white font-nunito font-bold text-[12px] px-3.5 py-2"
              style={{ background: T.brand, borderRadius: T.leafSm }}>
              <Plus className="w-3.5 h-3.5" /> Add Student
            </button>
          )}
        </header>

        <main className="flex-1 px-5 sm:px-8 py-7">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {view === "dashboard"     && <OverviewView students={students} stories={stories} weekData={weekData} announcements={announcements} loading={dataLoading} onAdd={() => setAddOpen(true)} onViewAnn={() => setView("announcements")} />}
              {view === "students"      && <StudentsView students={students} loading={dataLoading} onAdd={() => setAddOpen(true)} onImport={() => setImportOpen(true)} teacher={teacher} />}
              {view === "assignments"   && <AssignmentsView students={students} stories={stories} />}
              {view === "stories"       && <StoryProgressView studentCount={students.length} teacherStories={stories} />}
              {view === "announcements" && <AnnouncementsView teacher={teacher} announcements={announcements} onRefresh={refreshAnnouncements} />}
              {view === "reports"       && <ReportsView students={students} />}
              {view === "settings"      && <SettingsView teacher={teacher} onSaved={() => { clearTeacherCache(); getCachedTeacher().then(t => setTeacher(t)); }} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AddStudentModal open={addOpen}   onClose={() => setAddOpen(false)}   onAdded={fetchData} />
      <CSVImportModal  open={importOpen} onClose={() => setImportOpen(false)} onImported={fetchData} />
    </div>
  );
}
