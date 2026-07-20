"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CheckCircle2, Send, Globe2, LayoutDashboard, Award, Mic,
  BookOpen, Users, ShieldCheck, ChevronRight, ArrowRight,
  Menu, X,
} from "lucide-react";
import supabase from "@/lib/supabaseClient";

/* ─── Motion ────────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

/* ─── Nav ───────────────────────────────────────────────────────── */
function SchoolsNav({ scrolled, authed }: { scrolled: boolean; authed: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
        scrolled ? "bg-white/98 backdrop-blur-xl border-b border-gray-200 shadow-sm" : "bg-transparent"
      }`}>
        <div className="flex items-center justify-between px-6 sm:px-10 lg:px-16 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image src="/nimi-logo.png" alt="NIMIPIKO" width={40} height={40} className="w-10 h-10 object-contain" />
            <span className="font-baloo font-black text-[18px] text-gray-900 hidden sm:block">NIMIPIKO</span>
          </Link>

          <ul className="hidden lg:flex items-center gap-8">
            {[
              { label: "For Families", href: "/",        active: false },
              { label: "For Schools",  href: "/schools", active: true  },
              { label: "Pricing",      href: "/pricing", active: false },
              { label: "About",        href: "/about",   active: false },
            ].map(n => (
              <li key={n.label}>
                <Link href={n.href}
                  className={`font-nunito font-bold text-[14px] transition-colors ${
                    n.active ? "text-green-700 border-b-2 border-green-600 pb-0.5" : "text-gray-500 hover:text-gray-900"
                  }`}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden lg:flex items-center gap-3">
            {authed ? (
              <Link href="/home"
                className="font-nunito font-bold text-[13px] text-white bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-lg transition-all">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/loginpage"
                  className="font-nunito font-bold text-[13px] text-gray-600 hover:text-gray-900 px-4 py-2.5 transition-colors">
                  Log In
                </Link>
                <a href="#contact"
                  className="font-nunito font-bold text-[13px] text-white bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-lg transition-all shadow-sm">
                  Request a Demo
                </a>
              </>
            )}
          </div>

          <button onClick={() => setOpen(o => !o)} aria-label="Toggle menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            {open ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="fixed left-0 top-0 h-[100dvh] w-72 z-50 bg-white shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-gray-100">
                <Image src="/nimi-logo.png" alt="NIMIPIKO" width={36} height={36} className="w-9 h-9 object-contain" />
                <span className="font-baloo font-black text-[17px] text-gray-900">NIMIPIKO</span>
              </div>
              <nav className="flex flex-col px-3 py-4 gap-0.5 flex-1">
                {[["For Families", "/"], ["For Schools", "/schools"], ["Pricing", "/pricing"], ["About", "/about"]].map(([l, h]) => (
                  <Link key={l} href={h} onClick={() => setOpen(false)}
                    className="font-nunito font-bold text-[14px] text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    {l}
                  </Link>
                ))}
              </nav>
              <div className="px-6 py-5 border-t border-gray-100 space-y-2.5">
                <Link href="/loginpage" onClick={() => setOpen(false)}
                  className="block w-full text-center font-nunito font-bold text-gray-700 border border-gray-200 py-2.5 rounded-lg text-[14px]">
                  Log In
                </Link>
                <a href="#contact" onClick={() => setOpen(false)}
                  className="block w-full text-center font-nunito font-bold text-white bg-green-700 py-2.5 rounded-lg text-[14px]">
                  Request a Demo
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Dashboard preview card ────────────────────────────────────── */
function DashboardPreview() {
  return (
    <div className="relative w-full max-w-[420px] mx-auto xl:mx-0">
      {/* Main card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-green-700 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-nunito font-bold text-green-200 text-[11px] uppercase tracking-widest">Teacher Dashboard</p>
            <p className="font-baloo font-black text-white text-[16px]">Grade 3 · English Class</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-nunito font-bold text-gray-500 text-[11px] uppercase tracking-wide">Class Progress</span>
              <span className="font-baloo font-black text-green-700 text-[13px]">18 / 24 students</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "75%" }}
                transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "⭐", value: "142", label: "Stars earned" },
              { icon: "🏆", value: "6",   label: "Certificates" },
              { icon: "📖", value: "3",   label: "Stories done" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[18px] mb-0.5">{s.icon}</p>
                <p className="font-baloo font-black text-gray-900 text-[16px] leading-none">{s.value}</p>
                <p className="font-nunito text-gray-400 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top learners */}
          <div>
            <p className="font-nunito font-bold text-gray-400 text-[11px] uppercase tracking-wide mb-2">Top learners this week</p>
            {[
              { name: "Amina K.", stars: 5, lang: "EN" },
              { name: "Jean-Paul M.", stars: 4, lang: "FR" },
              { name: "Uwase G.", stars: 4, lang: "RW" },
            ].map((l, i) => (
              <div key={l.name} className={`flex items-center justify-between py-2 ${i < 2 ? "border-b border-gray-50" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="font-baloo font-black text-green-700 text-[10px]">{l.name[0]}</span>
                  </div>
                  <span className="font-nunito font-bold text-gray-700 text-[13px]">{l.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-100">{l.lang}</span>
                  <span className="text-yellow-400 text-[12px]">{"★".repeat(l.stars)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex items-center justify-between">
          <span className="font-nunito text-green-700 text-[12px] font-bold">Weekly report ready</span>
          <ChevronRight className="w-4 h-4 text-green-500" />
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="absolute -top-4 -right-4 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-lg">
        <p className="font-baloo font-black text-gray-900 text-[13px]">🇷🇼 Kinyarwanda</p>
        <p className="font-nunito text-gray-400 text-[10px]">+ 🇫🇷 French · 🇬🇧 English</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
        className="absolute -bottom-4 -left-4 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <p className="font-nunito font-bold text-gray-700 text-[12px]">Setup in under 1 hour</p>
      </motion.div>
    </div>
  );
}

/* ─── Data ──────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Globe2,          title: "3 Languages",              grad: "from-sky-500 to-blue-600",
    desc: "English, French & Kinyarwanda — every story, song, and activity exists in all three simultaneously.",
    bullets: ["Switch language per child profile", "Mother-tongue first approach", "No extra cost for additional languages"] },
  { icon: Mic,             title: "Songs & Karaoke",          grad: "from-fuchsia-500 to-pink-600",
    desc: "Every story has an original song children can sing along to — with karaoke mode in all 3 languages.",
    bullets: ["Professional voice actors", "Builds phonics and fluency", "Children love to participate"] },
  { icon: Award,           title: "Achievement Certificates", grad: "from-amber-500 to-orange-500",
    desc: "Auto-generated, printable certificates for every milestone. Children keep them — parents frame them.",
    bullets: ["Auto-generated per milestone", "Print-ready PDF format", "Motivates consistent effort"] },
  { icon: Users,           title: "AI Companion Nimi",        grad: "from-violet-500 to-indigo-600",
    desc: "A safe, educator-reviewed AI that answers questions and reinforces learning in the child's own language.",
    bullets: ["Responds in EN, FR or RW", "Educator-reviewed guardrails", "Voice and text interaction"] },
];

const PLANS = [
  {
    name: "Small Group", emoji: "🏫", price: "$7", per: "/student/month",
    rwf: "~5,000 RWF/student/month", ideal: "10–50 learners",
    cta: "Get Started", highlight: false,
    features: ["Up to 50 child profiles", "All 3 languages (EN · FR · RW)", "Teacher dashboard", "Weekly progress reports", "All stories & activities", "Achievement certificates"],
  },
  {
    name: "Institution", emoji: "🏛️", price: "$5", per: "/student/month",
    rwf: "~4,000 RWF/student/month", ideal: "50–300 learners",
    cta: "Request a Quote", highlight: true,
    features: ["Unlimited classrooms", "Dedicated account manager", "Staff onboarding session", "District-level reporting", "Custom branding options", "Priority support"],
  },
  {
    name: "Enterprise", emoji: "🎓", price: "Custom", per: "",
    rwf: "Custom quote", ideal: "300+ · NGOs · Districts",
    cta: "Contact Us", highlight: false,
    features: ["Full district deployment", "Educator Portal (separate login)", "API / LMS integration", "SLA agreement", "Dedicated onboarding", "Custom content"],
  },
];

const FOUNDING_PERKS = [
  { icon: "🏅", title: "Founding School Price",   desc: "Lock in the lowest per-student rate we will ever offer. Your price never increases as we grow." },
  { icon: "🎙️", title: "Shape the Product",      desc: "Founding partners have a direct line to our team. Your classroom needs influence what we build next." },
  { icon: "🚀", title: "First Access to Features", desc: "Every new story pack, language update, and dashboard feature goes to founding schools first." },
  { icon: "🤝", title: "Dedicated Support",        desc: "Our founders don't use a ticketing system. You get a real contact on our education team." },
  { icon: "📣", title: "Recognition",              desc: "Founding schools are featured across our platform as pioneers of multilingual learning." },
  { icon: "🔒", title: "No Lock-in",               desc: "Despite the founding price, you can cancel anytime. We earn your renewal with results." },
];

const FAQS = [
  { q: "Can we trial it before committing?",
    a: "Yes. We offer a free guided demo and a 30-day full-access trial for any school. No payment required upfront — submit the inquiry form and we'll set it up for your class." },
  { q: "How do teacher accounts work?",
    a: "Each teacher gets a separate educator login with access only to their own class profiles and dashboard. Principals receive an admin view across all classrooms." },
  { q: "How do you handle student data?",
    a: "We don't require student surnames — first name only. Data is never shared with third parties. We are GDPR-compliant with all data stored in encrypted EU-region servers." },
  { q: "Can we pay in RWF via MTN MoMo?",
    a: "Yes. Every school plan has a RWF price and we accept MTN MoMo for Rwanda-based institutions. We can also invoice via bank transfer for larger contracts." },
  { q: "Does it work on low-bandwidth connections?",
    a: "Nimipiko is a progressive web app that runs on any tablet, Chromebook, or smartphone browser. Stories are optimised for 3G connections with minimal data usage." },
  { q: "What languages does the AI companion support?",
    a: "Nimi responds in all 3 languages. Language is set per child profile, so each student gets responses in the language they are learning in." },
];

/* ─── FAQ Component ─────────────────────────────────────────────── */
function SchoolsFAQ({ noMotion }: { noMotion: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="px-6 sm:px-10 lg:px-16 py-20 sm:py-24 bg-gray-50 border-t border-gray-100">
      <div className="max-w-3xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={noMotion ? {} : stagger}>
          <motion.div variants={noMotion ? {} : fadeUp} className="mb-12">
            <p className="font-nunito font-bold text-green-700 text-[13px] uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[36px] leading-tight">
              Questions from school administrators
            </h2>
          </motion.div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={noMotion ? {} : fadeUp}>
                <button onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left bg-white border border-gray-200 hover:border-green-300 px-6 py-4 flex items-center justify-between gap-4 rounded-xl transition-colors">
                  <span className="font-nunito font-bold text-gray-800 text-[15px]">{faq.q}</span>
                  <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.2 }}
                    className="text-green-600 text-[22px] font-light leading-none shrink-0">+</motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden">
                      <div className="px-6 py-4 bg-green-50 border border-t-0 border-gray-200 rounded-b-xl">
                        <p className="font-nunito text-gray-600 text-[14px] leading-relaxed">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function SchoolsPage() {
  const noMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [authed,   setAuthed]   = useState(false);
  const [form,     setForm]     = useState({ name: "", school: "", email: "", country: "", size: "", message: "" });
  const [status,   setStatus]   = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setAuthed(true); });
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await fetch("/api/schools/inquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-white font-nunito overflow-x-clip">
      <SchoolsNav scrolled={scrolled} authed={authed} />

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="relative bg-white pt-32 pb-20 sm:pt-40 sm:pb-28 px-6 sm:px-10 lg:px-16 overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 60% 40%, #f0fdf4 0%, transparent 70%)" }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-30"
          style={{ background: "radial-gradient(circle at 80% 20%, #dcfce7 0%, transparent 60%)" }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid xl:grid-cols-2 gap-14 xl:gap-20 items-center">
            {/* Left */}
            <motion.div initial="hidden" animate="visible" variants={noMotion ? {} : stagger}>
              <motion.div variants={noMotion ? {} : fadeUp}
                className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 font-nunito font-bold text-[12px] uppercase tracking-widest px-4 py-2 rounded-full mb-7">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                Now enrolling founding school partners
              </motion.div>

              <motion.h1 variants={noMotion ? {} : fadeUp}
                className="font-baloo font-black text-gray-900 leading-[1.05] mb-6"
                style={{ fontSize: "clamp(2.4rem, 4.2vw, 4rem)" }}>
                Multilingual Learning.<br />
                <span className="text-green-700">Measurable Results.</span>
              </motion.h1>

              <motion.p variants={noMotion ? {} : fadeUp}
                className="text-gray-500 text-[17px] leading-relaxed mb-8 max-w-[42ch]">
                Nimipiko gives teachers a complete multilingual learning platform — interactive stories, AI tutoring, and a real-time progress dashboard — in English, French, and Kinyarwanda.
              </motion.p>

              <motion.div variants={noMotion ? {} : fadeUp} className="flex flex-wrap gap-3 mb-10">
                <a href="#contact"
                  className="inline-flex items-center gap-2 font-nunito font-bold text-[15px] text-white bg-green-700 hover:bg-green-800 px-7 py-3.5 rounded-xl shadow-lg shadow-green-700/20 transition-all hover:-translate-y-px">
                  Request a Demo <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#features"
                  className="inline-flex items-center gap-2 font-nunito font-bold text-[15px] text-gray-700 border border-gray-200 hover:border-gray-300 bg-white px-7 py-3.5 rounded-xl transition-all">
                  See the Platform
                </a>
              </motion.div>

              <motion.div variants={noMotion ? {} : fadeUp} className="flex flex-wrap gap-x-6 gap-y-2">
                {["3 Languages supported", "Ages 2–12", "Zero ads, zero distractions", "Cancel anytime"].map(t => (
                  <span key={t} className="flex items-center gap-2 font-nunito text-gray-500 text-[13px]">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Dashboard preview */}
            <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden xl:block">
              <DashboardPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ METRICS BAR ══════════════════════════════════════════════ */}
      <section className="bg-gray-900 py-10 px-6 sm:px-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={noMotion ? {} : stagger}
          className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "3",       label: "Languages",           sub: "EN · FR · RW" },
            { value: "30+",     label: "Stories & Activities", sub: "Curriculum-aligned" },
            { value: "4",       label: "Age Groups",           sub: "Ages 2–12" },
            { value: "< 1 hr",  label: "Onboarding Time",     sub: "Start the same day" },
          ].map(s => (
            <motion.div key={s.label} variants={noMotion ? {} : fadeUp}>
              <p className="font-baloo font-black text-white text-[32px] sm:text-[38px] leading-none">{s.value}</p>
              <p className="font-nunito font-bold text-gray-200 text-[13px] mt-1">{s.label}</p>
              <p className="font-nunito text-gray-500 text-[11px] mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ FEATURES ═════════════════════════════════════════════════ */}
      <section id="features" className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="max-w-2xl mb-16">
              <p className="font-nunito font-bold text-green-700 text-[13px] uppercase tracking-widest mb-4">Platform Features</p>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight mb-4">
                Built for how African classrooms actually work.
              </h2>
              <p className="text-gray-500 text-[16px] leading-relaxed">
                Every feature is designed with multilingual education in mind — not adapted from a single-language platform.
              </p>
            </motion.div>

            {/* Large bento */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 mb-5">
              {/* Featured — Curriculum card */}
              <motion.div variants={noMotion ? {} : fadeUp} className="lg:row-span-2">
                <motion.div whileHover={noMotion ? {} : { y: -4 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative overflow-hidden flex flex-col h-full min-h-[360px] lg:min-h-[540px] rounded-2xl border border-gray-100 shadow-xl"
                  style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)" }}>
                  <div className="absolute -bottom-8 -right-8 opacity-[0.07] select-none pointer-events-none" aria-hidden>
                    <BookOpen className="w-56 h-56 text-green-800" />
                  </div>
                  <div className="p-8 flex flex-col flex-1 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-green-700 flex items-center justify-center mb-5 shadow-md">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-nunito font-bold text-green-700 text-[12px] uppercase tracking-widest mb-2">Core Feature</p>
                    <h3 className="font-baloo font-black text-gray-900 text-[26px] leading-tight mb-4">
                      Curriculum-Aligned Stories
                    </h3>
                    <p className="font-nunito text-gray-600 text-[15px] leading-relaxed mb-6 max-w-[34ch]">
                      Stories structured by age group — 2–4, 5–6, 7–9, and 10+ — with progressive skill unlocking. Each story reinforces literacy, numeracy, and social-emotional learning in 3 languages.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {[
                        "Age-grouped progression across 4 levels",
                        "Read-along narration in EN / FR / RW",
                        "Comprehension activities after each chapter",
                        "Printable colouring pages & movement activities",
                      ].map(b => (
                        <li key={b} className="flex items-start gap-2.5 font-nunito text-[14px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-end justify-between gap-4">
                      <div className="bg-white/80 backdrop-blur-sm border border-green-100 rounded-xl px-5 py-3.5 shadow-sm">
                        <p className="font-baloo font-black text-green-700 text-[20px] leading-none">4 age groups</p>
                        <p className="font-nunito text-gray-400 text-[12px] mt-0.5">Progressive learning path</p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-sm border border-green-100 rounded-xl px-5 py-3.5 shadow-sm">
                        <p className="font-baloo font-black text-green-700 text-[20px] leading-none">3 languages</p>
                        <p className="font-nunito text-gray-400 text-[12px] mt-0.5">Every story, all three</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Class Profiles */}
              <motion.div variants={noMotion ? {} : fadeUp}>
                <motion.div whileHover={noMotion ? {} : { y: -4 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative overflow-hidden flex flex-col h-full rounded-2xl border border-gray-100 shadow-lg"
                  style={{ background: "linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)" }}>
                  <div className="absolute -bottom-6 -right-6 opacity-[0.07] pointer-events-none" aria-hidden>
                    <Users className="w-32 h-32 text-blue-800" />
                  </div>
                  <div className="p-7 flex flex-col flex-1 relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-md">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-8 h-1 rounded-full bg-blue-400 mb-3" />
                    <h3 className="font-baloo font-black text-gray-900 text-[20px] mb-3">Class Profiles</h3>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Create up to 30 child profiles per classroom. Each learner gets their own progress, stars, and certificates under one teacher account.
                    </p>
                    <ul className="space-y-2 mt-auto">
                      {["Up to 30 profiles per classroom", "Individual progress tracking", "Bulk profile creation"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>

              {/* Teacher Dashboard */}
              <motion.div variants={noMotion ? {} : fadeUp}>
                <motion.div whileHover={noMotion ? {} : { y: -4 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative overflow-hidden flex flex-col h-full rounded-2xl border border-gray-100 shadow-lg"
                  style={{ background: "linear-gradient(145deg, #fff7ed 0%, #fed7aa 50%, #ffedd5 100%)" }}>
                  <div className="absolute -bottom-6 -right-6 opacity-[0.07] pointer-events-none" aria-hidden>
                    <LayoutDashboard className="w-32 h-32 text-orange-800" />
                  </div>
                  <div className="p-7 flex flex-col flex-1 relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center mb-4 shadow-md">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-8 h-1 rounded-full bg-orange-400 mb-3" />
                    <h3 className="font-baloo font-black text-gray-900 text-[20px] mb-3">Teacher Dashboard</h3>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Completion rates, star achievements, time-on-task, and weekly heatmaps — all in one view designed for busy educators. Export to PDF for district reports.
                    </p>
                    <ul className="space-y-2 mt-auto">
                      {["Real-time class overview", "Weekly & monthly reports", "PDF export for districts"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* 4-tile grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {FEATURES.map(({ icon: Icon, title, grad, desc, bullets }) => (
                <motion.div key={title} variants={noMotion ? {} : fadeUp}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 hover:bg-gray-100 transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-baloo font-black text-gray-900 text-[15px] mb-1.5">{title}</p>
                    <p className="font-nunito text-gray-500 text-[12px] leading-relaxed mb-3">{desc}</p>
                    <ul className="space-y-1.5">
                      {bullets.map(b => (
                        <li key={b} className="flex items-start gap-1.5 font-nunito text-[11px] text-gray-500">
                          <CheckCircle2 className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-16">
              <p className="font-nunito font-bold text-green-700 text-[13px] uppercase tracking-widest mb-4">Getting Started</p>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Your school is live in <span className="text-green-700">3 steps.</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px] max-w-lg mx-auto">
                No IT department required. Most schools are fully onboarded within one business day.
              </p>
            </motion.div>

            <div className="relative grid sm:grid-cols-3 gap-6">
              <div className="hidden sm:block absolute top-10 left-[calc(16.67%+48px)] right-[calc(16.67%+48px)] h-px border-t-2 border-dashed border-green-200" />
              {[
                { step: "01", title: "Submit your inquiry",
                  desc: "Fill in the form below. We reply within one business day with a tailored quote and a demo access link.",
                  accent: "bg-green-700" },
                { step: "02", title: "Onboarding call",
                  desc: "Our education team walks through setup with you — teacher accounts, class profiles, language settings. Under an hour.",
                  accent: "bg-green-600" },
                { step: "03", title: "Your school goes live",
                  desc: "Teachers create class profiles, assign stories, and track progress from day one. Students start learning immediately.",
                  accent: "bg-green-500" },
              ].map(({ step, title, desc, accent }) => (
                <motion.div key={step} variants={noMotion ? {} : fadeUp} className="flex flex-col items-center text-center gap-5">
                  <div className={`relative z-10 w-14 h-14 rounded-2xl ${accent} text-white font-baloo font-black text-[20px] flex items-center justify-center shadow-lg shadow-green-700/20 ring-4 ring-white`}>
                    {step}
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl px-6 py-5 shadow-sm w-full">
                    <h3 className="font-baloo font-black text-gray-900 text-[17px] mb-2">{title}</h3>
                    <p className="font-nunito text-gray-500 text-[13px] leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ PLANS ════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-14">
              <p className="font-nunito font-bold text-green-700 text-[13px] uppercase tracking-widest mb-4">Pricing</p>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Transparent, volume-based pricing.
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px]">
                The more learners, the lower the per-student cost. Rwanda RWF pricing on every plan.
              </p>
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-5 py-2 mt-5">
                <span className="text-[14px]">🇷🇼</span>
                <span className="font-nunito font-bold text-green-700 text-[13px]">MTN MoMo and bank transfer accepted for Rwanda institutions</span>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6">
              {PLANS.map(p => (
                <motion.div key={p.name} variants={noMotion ? {} : fadeUp}>
                  <div className={`relative pt-5 flex flex-col h-full`}>
                    {p.highlight && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                        <motion.span
                          animate={{ boxShadow: ["0 0 0 0 rgba(21,128,61,0.5)", "0 0 0 8px rgba(21,128,61,0)", "0 0 0 0 rgba(21,128,61,0)"] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                          className="inline-flex items-center gap-1 bg-green-700 text-white font-nunito font-bold text-[11px] px-5 py-1.5 rounded-full shadow-lg tracking-wide">
                          ★ MOST POPULAR
                        </motion.span>
                      </div>
                    )}
                    <div className={`relative overflow-hidden flex flex-col flex-1 rounded-2xl ${
                      p.highlight ? "border-2 border-green-600 shadow-xl shadow-green-100" : "border border-gray-200 shadow-sm"
                    }`}>
                      <div className={`px-7 pt-8 pb-5 flex items-center gap-4 ${
                        p.highlight ? "bg-gradient-to-br from-green-700 to-green-800" : "bg-gray-900"
                      }`}>
                        <span className="text-[36px]">{p.emoji}</span>
                        <div>
                          <h3 className="font-baloo font-black text-white text-[20px]">{p.name}</h3>
                          <p className="font-nunito text-white/60 text-[12px]">{p.ideal}</p>
                        </div>
                      </div>
                      <div className="bg-white p-7 flex flex-col gap-5 flex-1">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-baloo font-black text-gray-900 text-[38px] leading-none">{p.price}</span>
                            {p.per && <span className="font-nunito text-gray-400 text-[14px]">{p.per}</span>}
                          </div>
                          {p.price !== "Custom" && (
                            <p className="font-nunito text-green-700 text-[12px] font-bold mt-1">🇷🇼 {p.rwf}</p>
                          )}
                        </div>
                        <ul className="space-y-3 flex-1">
                          {p.features.map(f => (
                            <li key={f} className="flex items-center gap-2.5 font-nunito text-[13px] text-gray-600">
                              <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.highlight ? "text-green-600" : "text-gray-400"}`} />{f}
                            </li>
                          ))}
                        </ul>
                        <a href="#contact"
                          className={`mt-2 w-full text-center font-nunito font-bold text-[14px] py-3.5 rounded-xl transition-all ${
                            p.highlight
                              ? "bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-green-700/20"
                              : "bg-gray-900 hover:bg-gray-800 text-white"
                          }`}>
                          {p.cta}
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ TRUST / SAFE ═════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 py-20 sm:py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-12">
              <p className="font-nunito font-bold text-green-700 text-[13px] uppercase tracking-widest mb-4">Trust & Safety</p>
              <h2 className="font-baloo font-black text-gray-900 text-[26px] sm:text-[38px] leading-tight">
                Built for institutions. Safe for students.
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: ShieldCheck, title: "Zero Ads",           desc: "No advertising of any kind. No distractions, ever.", color: "text-red-500 bg-red-50" },
                { icon: ShieldCheck, title: "GDPR-Compliant",     desc: "First name only. Data never shared. EU-region encrypted servers.", color: "text-blue-500 bg-blue-50" },
                { icon: ShieldCheck, title: "Educator-Reviewed",  desc: "Every story and activity reviewed by child development experts.", color: "text-violet-500 bg-violet-50" },
                { icon: ShieldCheck, title: "AI Guardrails",      desc: "Nimi's AI responses are filtered and educator-approved by design.", color: "text-green-600 bg-green-50" },
              ].map(({ icon: Icon, title, desc, color }) => (
                <motion.div key={title} variants={noMotion ? {} : fadeUp}
                  className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-baloo font-black text-gray-900 text-[15px] mb-1">{title}</p>
                    <p className="font-nunito text-gray-500 text-[12px] leading-snug">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOUNDING PARTNER ═════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-green-900/50 border border-green-700/50 text-green-300 font-nunito font-bold text-[12px] uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                Limited availability
              </div>
              <h2 className="font-baloo font-black text-white text-[28px] sm:text-[42px] leading-tight mb-4">
                Become a Founding School Partner.
              </h2>
              <p className="font-nunito text-gray-400 text-[16px] max-w-xl mx-auto leading-relaxed">
                We are at the beginning. Founding schools get a price, a voice, and a relationship that later adopters never will.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {FOUNDING_PERKS.map(p => (
                <motion.div key={p.title} variants={noMotion ? {} : fadeUp}>
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-3 h-full hover:bg-gray-750 transition-colors">
                    <span className="text-[28px]">{p.icon}</span>
                    <p className="font-baloo font-black text-white text-[16px]">{p.title}</p>
                    <p className="font-nunito text-gray-400 text-[13px] leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={noMotion ? {} : fadeUp} className="text-center">
              <a href="#contact"
                className="inline-flex items-center gap-2 bg-white hover:bg-green-50 text-gray-900 font-nunito font-bold text-[15px] px-10 py-4 rounded-xl shadow-xl transition-all">
                Apply as a Founding School <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════ */}
      <SchoolsFAQ noMotion={!!noMotion} />

      {/* ══ CONTACT ══════════════════════════════════════════════════ */}
      <section id="contact" className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-14 items-start">
              {/* Left */}
              <motion.div variants={noMotion ? {} : fadeUp}>
                <p className="font-nunito font-bold text-green-700 text-[13px] uppercase tracking-widest mb-4">Get in Touch</p>
                <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[38px] leading-tight mb-4">
                  Ready to bring Nimipiko to your school?
                </h2>
                <p className="font-nunito text-gray-500 text-[15px] leading-relaxed mb-10">
                  Fill in the form and we'll reply within one business day with a tailored quote and a demo access link.
                </p>
                <div className="space-y-6">
                  {[
                    { emoji: "⚡", title: "Fast setup",         desc: "Most schools are onboarded within one business day. We handle the technical side." },
                    { emoji: "🎓", title: "Onboarding session", desc: "Every institution gets a dedicated call with our education team." },
                    { emoji: "💬", title: "Ongoing support",    desc: "Priority WhatsApp support — response within 4 hours on business days." },
                    { emoji: "📋", title: "Custom reporting",   desc: "We build district-level reports tailored to your curriculum requirements." },
                  ].map(({ emoji, title, desc }) => (
                    <div key={title} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-[20px] shrink-0">
                        {emoji}
                      </div>
                      <div>
                        <p className="font-nunito font-bold text-gray-900 text-[15px]">{title}</p>
                        <p className="font-nunito text-gray-500 text-[13px] leading-relaxed mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Right — form */}
              <motion.div variants={noMotion ? {} : fadeUp}>
                {status === "sent" ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center">
                    <p className="text-5xl mb-5">🎉</p>
                    <p className="font-baloo font-black text-green-800 text-[22px] mb-2">Received. We'll be in touch soon.</p>
                    <p className="font-nunito text-green-600 text-[14px]">Check your inbox within one business day.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-8 space-y-5 shadow-sm">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-nunito font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-2">Your Name *</label>
                        <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition placeholder:text-gray-300"
                          placeholder="Jean-Pierre K." />
                      </div>
                      <div>
                        <label className="block font-nunito font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-2">School Name *</label>
                        <input required value={form.school} onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition placeholder:text-gray-300"
                          placeholder="GS Kacyiru" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-nunito font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-2">Email Address *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition placeholder:text-gray-300"
                        placeholder="principal@school.rw" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-nunito font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-2">Country</label>
                        <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition placeholder:text-gray-300"
                          placeholder="Rwanda" />
                      </div>
                      <div>
                        <label className="block font-nunito font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-2">No. of Students</label>
                        <select value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition">
                          <option value="">Select range…</option>
                          <option>1–30</option><option>31–100</option><option>101–300</option><option>300+</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-nunito font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-2">Message (optional)</label>
                      <textarea rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition resize-none placeholder:text-gray-300"
                        placeholder="Tell us about your school's needs…" />
                    </div>
                    {status === "error" && (
                      <p className="font-nunito text-red-500 text-[13px]">
                        Something went wrong. Email us at <a href="mailto:schools@nimipiko.com" className="underline">schools@nimipiko.com</a>.
                      </p>
                    )}
                    <button type="submit" disabled={status === "sending"}
                      className="w-full bg-green-700 hover:bg-green-800 text-white font-nunito font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-700/20 transition-all disabled:opacity-60">
                      <Send className="w-4 h-4" />
                      {status === "sending" ? "Sending…" : "Send Inquiry"}
                    </button>
                    <p className="text-center font-nunito text-gray-400 text-[12px]">
                      Or email us: <a href="mailto:schools@nimipiko.com" className="text-green-700 font-bold hover:underline">schools@nimipiko.com</a>
                    </p>
                  </form>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 px-6 sm:px-10 lg:px-16 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-10 mb-10">
            <div className="flex flex-col items-center sm:items-start gap-3">
              <Image src="/nimi-logo.png" alt="NIMIPIKO" width={48} height={48} className="object-contain" />
              <p className="font-baloo font-black text-white text-[17px]">NIMIPIKO</p>
              <p className="font-nunito text-gray-500 text-[13px] max-w-[200px] text-center sm:text-left leading-relaxed">
                Where every child becomes the hero of their own story.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-10 text-center sm:text-left">
              <div>
                <p className="font-nunito font-bold text-gray-300 text-[12px] uppercase tracking-widest mb-4">Product</p>
                {[["For Families", "/"], ["For Schools", "/schools"], ["Pricing", "/pricing"]].map(([l, h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-500 hover:text-white text-[13px] mb-2.5 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-nunito font-bold text-gray-300 text-[12px] uppercase tracking-widest mb-4">Company</p>
                {[["About", "/about"], ["Stories", "/stories"], ["Community", "/community"]].map(([l, h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-500 hover:text-white text-[13px] mb-2.5 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-nunito font-bold text-gray-300 text-[12px] uppercase tracking-widest mb-4">Legal</p>
                {[["Privacy Policy", "/privacy"], ["Terms of Use", "/terms"]].map(([l, h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-500 hover:text-white text-[13px] mb-2.5 transition-colors">{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-nunito text-gray-600 text-[12px]">
              © {new Date().getFullYear()} Nimipiko Studio LTD. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-nunito text-gray-600 text-[11px]">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
