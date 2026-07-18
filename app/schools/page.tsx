"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Globe2, BarChart3, Users, CheckCircle2, Star, Send, GraduationCap, Mic, Palette, Trophy } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { PageSurface } from "@/components/layout/primitives";

const FEATURES = [
  { icon: Globe2,        title: "3 Languages",           desc: "English, French & Kinyarwanda in every story. Ideal for multilingual classrooms." },
  { icon: BookOpen,      title: "Curriculum-Aligned",    desc: "Stories structured by age group (2–4, 5–6, 7–9, 10+) with progressive skill unlocking." },
  { icon: Users,         title: "Class Profiles",        desc: "Create up to 30 child profiles per classroom. Track each learner's progress individually." },
  { icon: BarChart3,     title: "Teacher Dashboard",     desc: "See completion rates, star achievements, and weekly activity heatmaps at a glance." },
  { icon: Mic,           title: "Audio & Karaoke",       desc: "Every story includes FlipFlop audio books and original language songs children can sing along to." },
  { icon: Palette,       title: "Creative Activities",   desc: "Printable coloring pages and movement activities keep learners engaged beyond screens." },
  { icon: Trophy,        title: "Certificates",          desc: "Auto-generated achievement certificates motivate learners and celebrate every milestone." },
  { icon: GraduationCap, title: "AI Companion Nimi",    desc: "Safe, moderated AI that answers questions and reinforces learning in the child's own language." },
];

const PLANS = [
  {
    name: "Small Group License",
    icon: "🏫",
    price: "$7",
    period: "/student/month",
    rwf: "5,000–6,000 RWF",
    ideal: "10–50 learners",
    features: ["Up to 50 child profiles", "All 3 languages (EN · FR · RW)", "Teacher dashboard", "Weekly progress reports", "All stories & activities", "Achievement certificates"],
    highlight: false,
  },
  {
    name: "Large Institution",
    icon: "🏛️",
    price: "$5",
    period: "/student/month",
    rwf: "4,000–5,000 RWF",
    ideal: "50+ learners",
    features: ["Unlimited classrooms", "Dedicated account manager", "Staff onboarding session", "District-level reporting", "Custom branding options", "Priority support"],
    highlight: true,
  },
  {
    name: "Custom Enterprise",
    icon: "🎓",
    price: "Custom",
    period: "",
    rwf: "Custom Quote",
    ideal: "100+ learners · NGOs · Districts",
    features: ["Full district deployment", "Educator Portal (separate from parent)", "API access for LMS integration", "SLA agreement", "Dedicated onboarding", "Custom content options"],
    highlight: false,
  },
];

const TESTIMONIALS = [
  { quote: "My students beg to do their Nimipiko lesson. The Kinyarwanda stories hit different for our kids.", name: "Claudine N.", role: "Primary Teacher, Kigali", stars: 5 },
  { quote: "Finally a resource that works in all three of our school languages. The certificates motivate everyone.", name: "Emmanuel T.", role: "Head Teacher, GS Remera", stars: 5 },
];

const FADE_UP = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export default function SchoolsPage() {
  const [formState, setFormState] = useState({ name: "", school: "", email: "", country: "", size: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.school) return;
    setStatus("sending");
    try {
      await fetch("/api/schools/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 w-full content-enter space-y-8">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <motion.div initial="hidden" animate="visible" variants={FADE_UP} transition={{ duration: 0.5 }}
            className="relative overflow-hidden text-center px-6 py-12 sm:py-16"
            style={{ borderRadius: "var(--leaf-r-lg)", background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #10b981 100%)" }}>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="inline-block bg-white/20 border border-white/30 text-white font-bold text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
                🎓 Nimipiko for Schools
              </span>
              <h1 className="font-baloo font-black text-white text-[32px] sm:text-[46px] leading-tight mb-4">
                The Learning App Your<br />
                <span className="text-yellow-300">Classroom Deserves</span>
              </h1>
              <p className="text-white/85 text-[15px] sm:text-[17px] leading-relaxed max-w-xl mx-auto mb-8">
                Interactive stories, songs, AI tutoring and achievement certificates — in English, French and Kinyarwanda. Built for African classrooms.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="#contact"
                  className="bg-white text-green-700 font-black text-[14px] px-8 py-3.5 rounded-full shadow-xl hover:bg-yellow-50 transition">
                  Get School Pricing →
                </a>
                <Link href="/stories"
                  className="bg-white/20 border border-white/40 text-white font-bold text-[14px] px-8 py-3.5 rounded-full hover:bg-white/30 transition">
                  Preview Stories
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── Stats bar ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: "12,000+", label: "Families Learning" },
              { value: "3",       label: "Languages" },
              { value: "30+",     label: "Stories Available" },
              { value: "2–12",    label: "Ages Served" },
            ].map(s => (
              <div key={s.label} className="bg-ds-card border border-ds-border shadow-ds-card text-center px-4 py-5" style={{ borderRadius: "var(--leaf-r)" }}>
                <p className="font-baloo font-black text-[var(--nimi-green)] text-[28px] leading-none">{s.value}</p>
                <p className="text-ds-muted text-[12px] font-bold mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Features ─────────────────────────────────────────── */}
          <div>
            <h2 className="font-baloo font-black text-ds-text text-[24px] sm:text-[30px] text-center mb-2">
              Everything Teachers Need
            </h2>
            <p className="text-ds-muted text-center text-[14px] mb-8 max-w-xl mx-auto">
              Purpose-built for multilingual primary education in East Africa.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map(f => (
                <div key={f.title} className="bg-ds-card border border-ds-border shadow-ds-card p-5 hover:shadow-ds-hover transition-shadow" style={{ borderRadius: "var(--leaf-r)" }}>
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-green-700" />
                  </div>
                  <h3 className="font-baloo font-black text-ds-text text-[14px] mb-1">{f.title}</h3>
                  <p className="text-ds-muted text-[12px] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Plans ────────────────────────────────────────────── */}
          <div>
            <h2 className="font-baloo font-black text-ds-text text-[24px] sm:text-[30px] text-center mb-2">School Plans</h2>
            <p className="text-ds-muted text-center text-[14px] mb-1">Volume-based pricing — the more learners, the lower the per-student cost.</p>
            <p className="text-[var(--nimi-green)] text-center text-[12px] font-bold mb-8">🇷🇼 Rwanda pricing available in RWF — noted on each plan.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {PLANS.map(p => (
                <div key={p.name}
                  className={`border-2 p-6 flex flex-col shadow-ds-card ${p.highlight ? "border-[var(--nimi-green)] bg-green-50/60" : "border-ds-border bg-ds-card"}`}
                  style={{ borderRadius: "var(--leaf-r-lg)" }}>
                  <div className="text-3xl mb-3">{p.icon}</div>
                  <h3 className="font-baloo font-black text-ds-text text-[18px]">{p.name}</h3>
                  <p className="text-ds-muted text-[11px] font-bold mb-4">{p.ideal}</p>
                  <div className="mb-4">
                    <div className="flex items-end gap-1">
                      <span className="font-baloo font-black text-ds-text text-[34px] leading-none">{p.price}</span>
                      {p.period && <span className="text-ds-muted text-[12px] mb-1.5">{p.period}</span>}
                    </div>
                    {p.price !== "Custom" && (
                      <p className="text-[var(--nimi-green)] text-[11px] font-bold mt-0.5">🇷🇼 {p.rwf}/student/month</p>
                    )}
                    {p.price === "Custom" && (
                      <p className="text-[var(--nimi-green)] text-[11px] font-bold mt-0.5">🇷🇼 {p.rwf}</p>
                    )}
                  </div>
                  <ul className="space-y-2 flex-1 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-ds-text">
                        <CheckCircle2 className="w-4 h-4 text-[var(--nimi-green)] shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#contact"
                    className={`text-center font-black text-[14px] py-3 rounded-full transition ${
                      p.highlight
                        ? "bg-[var(--nimi-green)] text-white hover:bg-[var(--ds-brand-hover)] shadow-ds-cta"
                        : "bg-ds-text text-white hover:opacity-80"
                    }`}>
                    {p.price === "Custom" ? "Contact Us" : p.highlight ? "Get a Quote" : "Get Started"}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* ── Testimonials ─────────────────────────────────────── */}
          <div className="relative overflow-hidden px-6 py-10 sm:py-12"
            style={{ borderRadius: "var(--leaf-r-lg)", background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)" }}>
            <h2 className="font-baloo font-black text-white text-[22px] sm:text-[26px] text-center mb-7">What Teachers Say</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {TESTIMONIALS.map(t => (
                <div key={t.name} className="bg-white p-6 shadow-sm" style={{ borderRadius: "var(--leaf-r)" }}>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-ds-text text-[14px] leading-relaxed italic mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <p className="font-black text-ds-text text-[13px]">{t.name}</p>
                  <p className="text-ds-muted text-[11px]">{t.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Contact form ─────────────────────────────────────── */}
          <div id="contact" className="max-w-xl mx-auto w-full">
            <h2 className="font-baloo font-black text-ds-text text-[24px] sm:text-[28px] text-center mb-2">Get School Pricing</h2>
            <p className="text-ds-muted text-center text-[14px] mb-8">Tell us about your school and we&apos;ll reply within one business day.</p>

            {status === "sent" ? (
              <div className="bg-green-50 border border-green-200 p-8 text-center" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-black text-green-800 text-[18px]">Got it! We&apos;ll be in touch soon.</p>
                <p className="text-green-600 text-[13px] mt-1">Check your inbox within one business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-ds-card border border-ds-border shadow-ds-card p-7 space-y-4" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-ds-muted uppercase tracking-wide mb-1">Your Name *</label>
                    <input required value={formState.name} onChange={e => setFormState(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
                      placeholder="Jean-Pierre K." />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-ds-muted uppercase tracking-wide mb-1">School Name *</label>
                    <input required value={formState.school} onChange={e => setFormState(p => ({ ...p, school: e.target.value }))}
                      className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
                      placeholder="GS Kacyiru" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-ds-muted uppercase tracking-wide mb-1">Email Address *</label>
                  <input required type="email" value={formState.email} onChange={e => setFormState(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
                    placeholder="teacher@school.rw" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-ds-muted uppercase tracking-wide mb-1">Country</label>
                    <input value={formState.country} onChange={e => setFormState(p => ({ ...p, country: e.target.value }))}
                      className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
                      placeholder="Rwanda" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-ds-muted uppercase tracking-wide mb-1">No. of Learners</label>
                    <select value={formState.size} onChange={e => setFormState(p => ({ ...p, size: e.target.value }))}
                      className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition">
                      <option value="">Select range…</option>
                      <option>1–30</option>
                      <option>31–100</option>
                      <option>101–300</option>
                      <option>300+</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-ds-muted uppercase tracking-wide mb-1">Message (optional)</label>
                  <textarea rows={3} value={formState.message} onChange={e => setFormState(p => ({ ...p, message: e.target.value }))}
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition resize-none placeholder:text-gray-400"
                    placeholder="Tell us about your classroom needs…" />
                </div>
                {status === "error" && (
                  <p className="text-red-500 text-[12px]">Something went wrong. Email us directly at <a href="mailto:schools@nimipiko.com" className="underline">schools@nimipiko.com</a>.</p>
                )}
                <button type="submit" disabled={status === "sending"}
                  className="w-full bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white font-black text-[15px] py-3.5 leaf flex items-center justify-center gap-2 shadow-ds-cta transition disabled:opacity-60">
                  <Send className="w-4 h-4" />
                  {status === "sending" ? "Sending…" : "Send Inquiry"}
                </button>
                <p className="text-center text-ds-muted text-[11px]">Or email us directly: <a href="mailto:schools@nimipiko.com" className="text-[var(--nimi-green)] font-bold hover:underline">schools@nimipiko.com</a></p>
              </form>
            )}
          </div>

        </main>
      </PageSurface>
    </AppShell>
  );
}
