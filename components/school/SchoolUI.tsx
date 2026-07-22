"use client";

import { motion } from "framer-motion";
import { useSchool } from "./SchoolContext";
import { School } from "lucide-react";

const G = "#15803D";

// ── Page header ────────────────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, action,
}: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-black text-[22px] text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-gray-500 mt-0.5 font-medium">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, icon, color = G, delay = 0,
}: {
  label: string; value: string | number; sub?: string;
  icon?: React.ReactNode; color?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-start gap-4">
      {icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="font-black text-[26px] leading-none text-gray-900">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1 font-medium">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
export function SectionCard({
  title, children, className = "",
}: {
  title?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="font-black text-[14px] text-gray-800">{title}</p>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
export function ProgressBar({
  pct, color = G, height = 6,
}: { pct: number; color?: string; height?: number }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "#F3F4F6" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ── Badge chip ─────────────────────────────────────────────────────────────────
export function Chip({
  label, color = G,
}: { label: string; color?: string }) {
  return (
    <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}>
      {label}
    </span>
  );
}

// ── No-school gate ─────────────────────────────────────────────────────────────
export function NoSchoolGate() {
  const { loading, error } = useSchool();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${G} transparent transparent transparent` }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "#F3F4F6" }}>
        <School className="w-8 h-8 text-gray-300" />
      </div>
      <div>
        <p className="font-black text-[18px] text-gray-700">No School Account Found</p>
        <p className="text-[13px] text-gray-400 mt-1 max-w-sm">
          {error ?? "Your account isn't linked to a school yet. Contact NIMIPIKO to set up your school portal."}
        </p>
      </div>
      <a href="mailto:schools@nimipiko.com"
        className="mt-2 px-5 py-2.5 rounded-xl font-black text-[13px] text-white transition hover:opacity-90"
        style={{ background: G }}>
        Contact Us →
      </a>
    </div>
  );
}

// ── Simple sparkline (CSS bar chart) ──────────────────────────────────────────
export function MiniBarChart({
  data, color = G, height = 48,
}: {
  data: { label?: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.015, duration: 0.3 }}
          className="flex-1 rounded-sm origin-bottom"
          style={{
            height: `${Math.max(4, Math.round((d.value / max) * height))}px`,
            background: d.value > 0 ? color : "#E5E7EB",
            opacity:    d.value > 0 ? 0.85 : 0.4,
          }}
          title={d.label ? `${d.label}: ${d.value}` : String(d.value)}
        />
      ))}
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────────
export function Table({
  headers, rows, emptyMsg = "No data yet.",
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  emptyMsg?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map(h => (
              <th key={h} className="text-left pb-3 pr-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length}
                className="pt-8 pb-4 text-center text-[13px] text-gray-400 font-medium">
                {emptyMsg}
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-3 pr-4 text-gray-700 font-medium align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
