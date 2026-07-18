"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2, Send } from "lucide-react";
import supabase from "@/lib/supabaseClient";

/* ─── Animations ────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
};

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
        scrolled ? "bg-white/95 backdrop-blur-2xl border-b border-gray-200 shadow-[0_4px_32px_rgba(0,0,0,0.10)]" : ""
      }`}>
        <div className="flex items-center justify-between px-5 sm:px-8 lg:px-12 py-3.5 w-full">
          <Link href="/" className="shrink-0">
            <Image src="/nimi-logo.png" alt="NIMIPIKO" width={80} height={80}
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md" />
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
                  className={`font-baloo font-black text-[14px] transition-colors ${
                    n.active
                      ? "text-[var(--nimi-green)] border-b-2 border-[var(--nimi-green)] pb-0.5"
                      : "text-gray-600 hover:text-gray-900"
                  }`}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden lg:flex items-center gap-2.5">
            {authed ? (
              <Link href="/home"
                className="font-baloo font-black text-[13px] text-white px-5 py-2 rounded-full shadow-sm transition-all hover:-translate-y-px"
                style={{ backgroundColor: "var(--nimi-green)", boxShadow: "0 2px 12px rgba(21,128,61,0.30)" }}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/loginpage"
                  className="font-baloo font-black text-[13px] text-gray-700 px-5 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-all">
                  Log In
                </Link>
                <a href="#contact"
                  className="font-baloo font-black text-[13px] text-white px-5 py-2 rounded-full shadow-sm transition-all hover:-translate-y-px"
                  style={{ backgroundColor: "var(--nimi-green)", boxShadow: "0 2px 12px rgba(21,128,61,0.30)" }}>
                  Get School Pricing
                </a>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button onClick={() => setOpen(o => !o)} aria-label="Toggle menu"
            className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-full hover:bg-gray-100 transition-colors">
            {["a","b","c"].map((k, i) => (
              <motion.span key={k}
                className="block w-[22px] h-[2px] rounded-full bg-gray-700"
                animate={i===0?(open?{rotate:45,y:7}:{rotate:0,y:0}):i===1?(open?{opacity:0,scaleX:0}:{opacity:1,scaleX:1}):(open?{rotate:-45,y:-7}:{rotate:0,y:0})}
                transition={{ duration: i===1?0.15:0.25, ease:"easeInOut" }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
              className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20" onClick={() => setOpen(false)} />
            <motion.div initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}}
              transition={{type:"spring",damping:26,stiffness:280}}
              className="fixed left-0 top-0 h-[100dvh] w-72 z-50 bg-white shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
                <Image src="/nimi-logo.png" alt="NIMIPIKO" width={48} height={48} className="w-12 h-12 object-contain" />
                <p className="font-baloo font-black text-gray-900 text-[16px]">For Schools</p>
              </div>
              <nav className="flex flex-col px-4 py-4 gap-1 flex-1">
                {[["For Families","/"],["For Schools","/schools"],["Pricing","/pricing"],["About","/about"]].map(([label,href]) => (
                  <Link key={label} href={href} onClick={() => setOpen(false)}
                    className="font-baloo font-black text-[14px] text-gray-700 px-4 py-3 rounded-2xl hover:bg-gray-50 transition-colors">
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-6 py-5 border-t border-gray-100 flex flex-col gap-2.5">
                <Link href="/loginpage" onClick={() => setOpen(false)}
                  className="w-full text-center font-baloo font-black text-gray-700 border border-gray-200 py-2.5 rounded-full text-[14px]">
                  Log In
                </Link>
                <a href="#contact" onClick={() => setOpen(false)}
                  className="w-full text-center font-baloo font-black text-white py-2.5 rounded-full text-[14px]"
                  style={{ backgroundColor: "var(--nimi-green)" }}>
                  Get School Pricing
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Data ──────────────────────────────────────────────────────── */
const FEATURES = [
  { emoji:"🌍", title:"3 Languages",         grad:"from-sky-400 to-blue-500",      bg:"bg-sky-50 border-sky-200",
    desc:"English, French & Kinyarwanda in every story — purpose-built for multilingual classrooms.",
    bullets:["Switch language mid-session","All content in all 3 languages","Mother-tongue first approach"] },
  { emoji:"📊", title:"Teacher Dashboard",   grad:"from-teal-400 to-emerald-500",  bg:"bg-teal-50 border-teal-200",
    desc:"See completion rates, star achievements, and weekly heatmaps at a glance.",
    bullets:["Completion & time-on-task","Star & badge progress","Weekly activity heatmaps"] },
  { emoji:"🏆", title:"Achievement Certificates", grad:"from-amber-400 to-yellow-500", bg:"bg-amber-50 border-amber-200",
    desc:"Auto-generated printable certificates celebrate every milestone — frameable keepsakes.",
    bullets:["Auto-generated per milestone","Printable & downloadable","Motivates every learner"] },
  { emoji:"🤖", title:"AI Companion Nimi",   grad:"from-violet-400 to-indigo-500", bg:"bg-violet-50 border-violet-200",
    desc:"Safe, moderated AI that answers questions in the child's own language.",
    bullets:["Responds in EN, FR or RW","Educator-reviewed guardrails","Voice & text interaction"] },
];

const PLANS = [
  {
    name: "Small Group", emoji: "🏫", price: "$7", per: "/student/month",
    rwf: "~5,000 RWF/student/month", ideal: "10–50 learners",
    cta: "Get Started", highlight: false,
    features: ["Up to 50 child profiles","All 3 languages (EN · FR · RW)","Teacher dashboard","Weekly progress reports","All stories & activities","Achievement certificates"],
  },
  {
    name: "Institution", emoji: "🏛️", price: "$5", per: "/student/month",
    rwf: "~4,000 RWF/student/month", ideal: "50–300 learners",
    cta: "Get a Quote", highlight: true,
    features: ["Unlimited classrooms","Dedicated account manager","Staff onboarding session","District-level reporting","Custom branding options","Priority support"],
  },
  {
    name: "Enterprise", emoji: "🎓", price: "Custom", per: "",
    rwf: "Custom quote", ideal: "300+ · NGOs · Districts",
    cta: "Contact Us", highlight: false,
    features: ["Full district deployment","Educator Portal (separate login)","API / LMS integration","SLA agreement","Dedicated onboarding","Custom content options"],
  },
];

const TESTIMONIALS = [
  { quote: "My students beg to do their Nimipiko lesson. The Kinyarwanda stories hit different for our kids.", name: "Claudine N.", role: "Primary Teacher, Kigali", stars: 5 },
  { quote: "Finally a resource that works in all three of our school languages. The certificates motivate everyone.", name: "Emmanuel T.", role: "Head Teacher, GS Remera", stars: 5 },
  { quote: "The teacher dashboard gives me exactly the data I need for my weekly reports. My district loves it.", name: "Alice M.", role: "Education Coordinator, Eastern Province", stars: 5 },
];

/* ─── Page ──────────────────────────────────────────────────────── */
export default function SchoolsPage() {
  const noMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [authed,   setAuthed]   = useState(false);
  const [form,     setForm]     = useState({ name:"", school:"", email:"", country:"", size:"", message:"" });
  const [status,   setStatus]   = useState<"idle"|"sending"|"sent"|"error">("idle");

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
    <div className="min-h-screen font-nunito overflow-x-clip w-full" style={{ backgroundColor: "var(--parchment)" }}>
      <SchoolsNav scrolled={scrolled} authed={authed} />

      {/* ══ HERO — mobile ═════════════════════════════════════════════ */}
      <section className="xl:hidden relative overflow-hidden" style={{ minHeight: "100svh" }}>
        <Image src="/themes/default/hero/hero-background.png" alt="" aria-hidden fill priority
          className="object-cover object-top pointer-events-none select-none" style={{ willChange: "transform", transform: "translateZ(0)" }} />
        <div className="absolute inset-x-0 top-0 h-[65%] pointer-events-none"
          style={{ background: "linear-gradient(to bottom,rgba(255,255,255,0.96) 0%,rgba(255,255,255,0.85) 55%,transparent 100%)" }} />

        <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center text-center px-6"
          style={{ paddingTop: "clamp(100px,16dvh,140px)" }}>
          <motion.div initial="hidden" animate="visible" variants={noMotion ? {} : stagger} className="max-w-xl mx-auto">
            <motion.span variants={noMotion ? {} : fadeUp}
              className="inline-flex items-center gap-1.5 font-nunito font-bold text-[11px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-4 shadow-sm">
              🎓 Nimipiko for Schools & Institutions
            </motion.span>
            <motion.h1 variants={noMotion ? {} : fadeUp}
              className="font-baloo font-black leading-tight mb-4"
              style={{ fontSize: "clamp(1.9rem,6vw,3rem)" }}>
              <span className="text-[var(--ds-brand-primary)] block">The Classroom They&apos;ll</span>
              <span className="text-gray-900 block">Never Want to Leave.</span>
            </motion.h1>
            <motion.p variants={noMotion ? {} : fadeUp}
              className="font-nunito font-semibold text-gray-600 leading-relaxed mb-7"
              style={{ fontSize: "clamp(0.85rem,2vw,1rem)", maxWidth: "38ch", margin: "0 auto 1.75rem" }}>
              Interactive stories, songs, AI tutoring and achievement certificates — in English, French and Kinyarwanda.
            </motion.p>
            <motion.div variants={noMotion ? {} : fadeUp} className="flex flex-wrap items-center justify-center gap-3 mb-5">
              <a href="#contact"
                className="font-baloo font-black text-white text-[14px] px-7 py-3.5 rounded-full shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,var(--nimi-green) 0%,#166534 100%)", boxShadow: "0 6px 24px rgba(21,128,61,0.40)" }}>
                🏫 Get School Pricing →
              </a>
              <Link href="/stories"
                className="font-baloo font-black text-gray-700 text-[14px] px-7 py-3.5 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm hover:bg-white transition-all">
                Preview Stories
              </Link>
            </motion.div>
            <motion.div variants={noMotion ? {} : fadeUp} className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="font-nunito text-gray-500 text-[11px]">12,000+ families · 3 languages · Ages 2–12</span>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[70px] sm:h-[100px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══ HERO — desktop ════════════════════════════════════════════ */}
      <section className="hidden xl:block relative overflow-hidden" style={{ minHeight: "100svh" }}>
        <Image src="/themes/default/hero/new-background.png" alt="" aria-hidden fill priority
          className="object-cover object-top pointer-events-none select-none" />
        {/* Left fade so content stays readable */}
        <div className="absolute inset-y-0 left-0 w-[52%] pointer-events-none"
          style={{ background: "linear-gradient(to right,rgba(255,255,255,0.97) 0%,rgba(255,255,255,0.92) 45%,rgba(255,255,255,0.4) 75%,transparent 100%)" }} />

        {/* Content — left column, same pattern as landing page */}
        <div className="absolute top-0 left-0 z-10 flex flex-col w-[46%] px-12 xl:px-16 2xl:px-20"
          style={{ paddingTop: "clamp(110px,18dvh,180px)" }}>
          <motion.div initial="hidden" animate="visible" variants={noMotion ? {} : stagger}>
            <motion.span variants={noMotion ? {} : fadeUp}
              className="inline-flex items-center gap-1.5 font-nunito font-bold text-[11px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-5 shadow-sm self-start">
              🎓 Nimipiko for Schools & Institutions
            </motion.span>

            <motion.h1 variants={noMotion ? {} : fadeUp}
              className="font-baloo font-black leading-tight mb-5"
              style={{ fontSize: "clamp(2.4rem,3.6vw,4rem)" }}>
              <span className="text-[var(--ds-brand-primary)] block">The Classroom</span>
              <span className="text-[var(--ds-brand-primary)] block">They&apos;ll Never</span>
              <span className="text-gray-900 block">Want to Leave.</span>
            </motion.h1>

            <motion.p variants={noMotion ? {} : fadeUp}
              className="font-nunito font-semibold text-gray-700 leading-relaxed mb-7"
              style={{ fontSize: "clamp(0.9rem,1.15vw,1.1rem)", maxWidth: "36ch" }}>
              Interactive stories, songs, AI tutoring and achievement certificates — in English, French and Kinyarwanda. Built for African classrooms.
            </motion.p>

            <motion.div variants={noMotion ? {} : fadeUp} className="flex gap-3 flex-wrap items-center mb-6">
              <a href="#contact"
                className="font-baloo font-black text-white text-[15px] px-8 py-3.5 rounded-full shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,var(--nimi-green) 0%,#166534 100%)", boxShadow: "0 6px 24px rgba(21,128,61,0.40)" }}>
                🏫 Get School Pricing →
              </a>
              <Link href="/stories"
                className="font-baloo font-bold text-gray-600 hover:text-[var(--ds-brand-primary)] text-[14px] flex items-center gap-1.5 transition-colors">
                Preview Stories <span className="text-[16px]">→</span>
              </Link>
            </motion.div>

            {/* Trust chips */}
            <motion.div variants={noMotion ? {} : fadeUp} className="flex flex-wrap gap-2">
              {["🏫 Schools in Rwanda","🌍 3 Languages","🎓 Ages 2–12","✅ Zero Ads"].map(chip => (
                <span key={chip}
                  className="inline-flex items-center font-nunito font-semibold text-[11px] text-gray-600 bg-white/80 backdrop-blur-sm border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                  {chip}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[110px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══ STATS BAR ════════════════════════════════════════════════ */}
      <section className="bg-white border-y border-gray-100">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={noMotion ? {} : stagger}
          className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
          {[
            { value: "12,000+", label: "Families Learning", emoji: "👨‍👩‍👧" },
            { value: "3",       label: "Languages",          emoji: "🌍" },
            { value: "30+",     label: "Stories Available",  emoji: "📚" },
            { value: "2–12",    label: "Ages Served",        emoji: "🎂" },
          ].map(s => (
            <motion.div key={s.label} variants={noMotion ? {} : fadeUp} className="text-center px-6 py-8">
              <p className="text-2xl mb-1">{s.emoji}</p>
              <p className="font-baloo font-black text-[var(--nimi-green)] text-[30px] leading-none">{s.value}</p>
              <p className="font-nunito text-gray-500 text-[12px] font-bold mt-1.5 uppercase tracking-wide">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ FEATURES BENTO ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-green-800 mb-4 bg-green-100 px-4 py-1.5 rounded-full border border-green-200">
                🌟 Purpose-Built for Education
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[26px] sm:text-[40px] leading-tight">
                Everything teachers need —<br /><span className="text-[var(--nimi-green)]">nothing they don&apos;t</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px] max-w-xl mx-auto leading-relaxed">
                Built for multilingual primary education in East Africa. Every feature earns its place in your classroom.
              </p>
            </motion.div>

            {/* Large bento: 2-col + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 lg:gap-6 mb-5">
              {/* Curriculum-aligned — large card */}
              <motion.div variants={noMotion ? {} : fadeUp} className="lg:row-span-2">
                <motion.div whileHover={noMotion ? {} : { y: -6 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative overflow-hidden shadow-xl flex flex-col h-full min-h-[320px] lg:min-h-[520px]"
                  style={{ background: "linear-gradient(160deg,#f0fdf4 0%,#dcfce7 50%,#f0fdf4 100%)", borderRadius: "var(--leaf-r-lg)" }}>
                  <div className="absolute -bottom-6 -right-6 text-[160px] opacity-[0.06] select-none pointer-events-none leading-none" aria-hidden>📚</div>
                  <div className="p-8 flex flex-col flex-1 relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-[32px] shadow-md">
                        📖
                      </div>
                      <div>
                        <div className="w-10 h-1.5 rounded-full bg-green-400 mb-1.5" />
                        <h3 className="font-baloo font-black text-gray-900 text-[24px]">Curriculum-Aligned Stories</h3>
                      </div>
                    </div>
                    <p className="font-nunito text-gray-600 text-[15px] leading-relaxed mb-6 max-w-[36ch]">
                      Stories structured by age group — 2–4, 5–6, 7–9, and 10+ — with progressive skill unlocking. Every story reinforces literacy, numeracy, and social-emotional learning.
                    </p>
                    <ul className="flex flex-col gap-3 mb-8">
                      {[
                        "Age-grouped progression (2–4 · 5–6 · 7–9 · 10+)",
                        "Read-along narration in EN / FR / RW",
                        "Comprehension activities after each chapter",
                        "Printable coloring pages & movement activities",
                      ].map(b => (
                        <li key={b} className="flex items-center gap-2.5 font-nunito text-[14px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-end justify-between gap-4">
                      <Image src="/themes/default/characters/nimi.png" alt="Nimi" width={110} height={110}
                        className="object-contain drop-shadow-lg" />
                      <div className="bg-white/75 backdrop-blur-sm border border-green-100 rounded-2xl px-5 py-4 shadow-sm text-right">
                        <p className="font-baloo font-black text-[18px] leading-tight text-green-700">4 age groups</p>
                        <p className="font-nunito text-gray-500 text-[12px]">Progressive learning</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Class Profiles card */}
              <motion.div variants={noMotion ? {} : fadeUp}>
                <motion.div whileHover={noMotion ? {} : { y: -5 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{ background: "linear-gradient(145deg,#eff6ff,#dbeafe)", borderRadius: "var(--leaf-r-lg)" }}>
                  <div className="absolute -bottom-4 -right-4 text-[100px] opacity-[0.07] select-none pointer-events-none leading-none" aria-hidden>👩‍🏫</div>
                  <div className="p-7 flex flex-col flex-1 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[26px] shadow-md">👩‍🏫</div>
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-blue-400 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Class Profiles</h3>
                      </div>
                    </div>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-4">
                      Create up to 30 child profiles per classroom. Each learner gets their own progress, stars, and certificates. One teacher account, the whole class covered.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Up to 30 profiles/classroom","Individual progress per child","Bulk profile creation"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>

              {/* Teacher Dashboard card */}
              <motion.div variants={noMotion ? {} : fadeUp}>
                <motion.div whileHover={noMotion ? {} : { y: -5 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{ background: "linear-gradient(145deg,#fff7ed,#ffedd5)", borderRadius: "var(--leaf-r-lg)" }}>
                  <div className="absolute -bottom-4 -right-4 text-[100px] opacity-[0.07] select-none pointer-events-none leading-none" aria-hidden>📊</div>
                  <div className="p-7 flex flex-col flex-1 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-[26px] shadow-md">📊</div>
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-orange-400 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Teacher Dashboard</h3>
                      </div>
                    </div>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-4">
                      Completion rates, star achievements, time-on-task, and weekly activity heatmaps — all in one view designed for busy educators.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Weekly & monthly reports","Class-wide heatmaps","Export to PDF for districts"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Bottom 4-feature grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
              {FEATURES.map(({ emoji, title, grad, bg, bullets }) => (
                <motion.div key={title} variants={noMotion ? {} : fadeUp}
                  className={`flex flex-col items-center text-center rounded-3xl border p-5 sm:p-6 gap-3 ${bg}`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-[28px] shadow-md shrink-0`}>
                    {emoji}
                  </div>
                  <p className="font-baloo font-black text-gray-800 text-[13px] sm:text-[15px] leading-snug">{title}</p>
                  <ul className="flex flex-col gap-1.5 w-full">
                    {bullets.map(b => (
                      <li key={b} className="flex items-center gap-1.5 font-nunito text-[11px] text-gray-600 text-left">
                        <CheckCircle2 className="w-3 h-3 text-gray-400 shrink-0" />{b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ PLANS ════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-[var(--ds-brand-primary)] mb-4 bg-[var(--ds-brand-subtle)] px-4 py-1.5 rounded-full">
                💫 Choose Your Plan
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[26px] sm:text-[42px] leading-tight">
                Simple, honest <span className="text-[var(--nimi-green)]">school pricing</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px]">
                Volume-based — the more learners, the lower the per-student cost.
              </p>
              <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-full px-5 py-2 mt-5 w-fit mx-auto">
                <span className="text-green-600 text-[14px]">🇷🇼</span>
                <span className="font-baloo font-black text-green-700 text-[13px]">Rwanda RWF pricing available on every plan</span>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6">
              {PLANS.map(p => (
                <motion.div key={p.name} variants={noMotion ? {} : fadeUp}>
                  <div className={`relative pt-5 flex flex-col h-full ${p.highlight ? "" : ""}`}>
                    {p.highlight && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                        <motion.span
                          animate={{ boxShadow: ["0 0 0 0 rgba(21,128,61,0.5)","0 0 0 8px rgba(21,128,61,0)","0 0 0 0 rgba(21,128,61,0)"] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                          className="flex items-center gap-1.5 bg-[var(--nimi-green)] text-white font-baloo font-black text-[11px] px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wide"
                          style={{ display: "inline-flex" }}>
                          ★ MOST POPULAR
                        </motion.span>
                      </div>
                    )}
                    <div className={`relative overflow-hidden shadow-xl flex flex-col flex-1 ${p.highlight ? "border-2 border-[var(--ds-border-brand)]/40" : "border border-gray-200"}`}
                      style={{ borderRadius: "var(--leaf-r-lg)" }}>
                      {/* Header */}
                      <div className={`px-7 pt-8 pb-5 flex items-center gap-4 ${p.highlight ? "bg-cta-gradient" : "bg-gradient-to-r from-gray-700 to-gray-800"}`}>
                        <span className="text-[40px]">{p.emoji}</span>
                        <div>
                          <h3 className="font-baloo font-black text-white text-[20px] leading-tight">{p.name}</h3>
                          <p className="font-nunito text-white/70 text-[12px]">{p.ideal}</p>
                        </div>
                      </div>
                      {/* Body */}
                      <div className="bg-white p-7 flex flex-col gap-5 flex-1">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-baloo font-black text-gray-900 text-[36px] leading-none">{p.price}</span>
                            {p.per && <span className="font-nunito text-gray-400 text-[14px]">{p.per}</span>}
                          </div>
                          {p.price !== "Custom" && (
                            <p className="font-nunito text-green-700 text-[11px] font-bold mt-1">🇷🇼 {p.rwf}</p>
                          )}
                        </div>
                        <ul className="flex flex-col gap-3">
                          {p.features.map(f => (
                            <li key={f} className="flex items-center gap-2.5 font-nunito text-[13px] text-gray-700">
                              <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.highlight ? "text-[var(--ds-brand-primary)]" : "text-gray-400"}`} />{f}
                            </li>
                          ))}
                        </ul>
                        <a href="#contact"
                          className="mt-auto w-full text-center text-white font-baloo font-black py-3.5 shadow-md transition-all hover:-translate-y-0.5 active:scale-95 text-[15px]"
                          style={{
                            backgroundColor: p.highlight ? "var(--nimi-green)" : "#1f2937",
                            borderRadius: "var(--leaf-r)",
                            boxShadow: p.highlight ? "0 6px 20px rgba(5,150,105,0.35)" : "none",
                          }}>
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

      {/* ══ SAFE FOR SCHOOLS ═════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28"
        style={{ background: "linear-gradient(150deg,#f0fdf4 0%,#dcfce7 45%,#f0fdf4 100%)" }}>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle,#15803d 1.5px,transparent 1.5px)", backgroundSize: "36px 36px" }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-[var(--ds-brand-primary)] mb-4 bg-white/80 backdrop-blur-sm border border-green-200 px-4 py-1.5 rounded-full shadow-sm">
                🛡️ Built for Schools
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Safe by design.<br /><span className="text-[var(--nimi-green)]">Trusted by institutions.</span>
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
              {[
                { emoji:"🚫", title:"Zero Ads",         desc:"No advertising. No distractions. Ever.",       grad:"from-red-500 to-rose-400" },
                { emoji:"🔒", title:"GDPR-Safe",         desc:"We never share student data with third parties.", grad:"from-blue-500 to-indigo-500" },
                { emoji:"👩‍🏫", title:"Educator-Reviewed", desc:"Every story approved by child development experts.", grad:"from-purple-500 to-violet-500" },
                { emoji:"✅", title:"Safe Content",      desc:"AI guardrails keep every interaction appropriate.", grad:"from-[var(--ds-brand-primary)] to-emerald-600" },
              ].map(({ emoji, title, desc, grad }) => (
                <motion.div key={title} variants={noMotion ? {} : fadeUp}>
                  <motion.div whileHover={noMotion ? {} : { y: -7, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="overflow-hidden shadow-lg flex flex-col h-full bg-white/80 backdrop-blur-sm border border-white"
                    style={{ borderRadius: "var(--leaf-r-lg)" }}>
                    <div className={`bg-gradient-to-br ${grad} p-5 flex items-center justify-center`}>
                      <span className="text-[44px]">{emoji}</span>
                    </div>
                    <div className="p-4 flex flex-col gap-1 flex-1">
                      <p className="font-baloo font-black text-gray-900 text-[15px]">{title}</p>
                      <p className="font-nunito text-gray-500 text-[12px] leading-snug">{desc}</p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ═════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28"
        style={{ background: "linear-gradient(135deg,#15803d 0%,#0f6b32 50%,#0a5228 100%)" }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-10">
              <span className="eyebrow inline-block text-green-200 mb-4 bg-white/10 px-4 py-1.5 rounded-full">
                ❤️ What Teachers Are Saying
              </span>
              <h2 className="font-baloo font-black text-white text-[28px] sm:text-[42px] leading-tight">
                From the classroom, directly.
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-3 gap-6">
              {TESTIMONIALS.map(t => (
                <motion.div key={t.name} variants={noMotion ? {} : fadeUp}>
                  <div className="bg-white/10 border border-white/20 p-7 flex flex-col gap-5 h-full backdrop-blur-sm"
                    style={{ borderRadius: "var(--leaf-r-lg)" }}>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-[18px] ${i < t.stars ? "text-yellow-300" : "text-white/20"}`}>★</span>
                      ))}
                    </div>
                    <p className="font-nunito text-white text-[14px] sm:text-[15px] leading-relaxed italic flex-1">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                        <span className="font-baloo font-black text-white text-[13px]">
                          {t.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-baloo font-black text-white text-[14px]">{t.name}</p>
                        <p className="font-nunito text-white/60 text-[11px]">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ CONTACT ══════════════════════════════════════════════════ */}
      <section id="contact" className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={noMotion ? {} : stagger}>
            <motion.div variants={noMotion ? {} : fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-gray-700 mb-4 bg-gray-100 px-4 py-1.5 rounded-full">
                🤝 Get in Touch
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[26px] sm:text-[40px] leading-tight">
                Ready to bring Nimipiko<br /><span className="text-[var(--nimi-green)]">to your school?</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px]">
                Tell us about your school and we&apos;ll reply within one business day.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-14 items-start">
              {/* Left — benefits */}
              <motion.div variants={noMotion ? {} : fadeUp} className="space-y-6">
                {[
                  { emoji:"⚡", title:"Fast setup", desc:"Get your whole school onboarded in under a day. We handle the technical side." },
                  { emoji:"🎓", title:"Onboarding session", desc:"Every institution gets a dedicated onboarding call with our education team." },
                  { emoji:"💬", title:"Ongoing support", desc:"Priority email and WhatsApp support — response within 4 hours on business days." },
                  { emoji:"📋", title:"Custom reporting", desc:"We can build district-level reports tailored to your curriculum requirements." },
                ].map(({ emoji, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-[22px] shrink-0 shadow-sm">
                      {emoji}
                    </div>
                    <div>
                      <p className="font-baloo font-black text-gray-900 text-[15px]">{title}</p>
                      <p className="font-nunito text-gray-500 text-[13px] leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Right — form */}
              <motion.div variants={noMotion ? {} : fadeUp}>
                {status === "sent" ? (
                  <div className="bg-green-50 border border-green-200 p-10 text-center"
                    style={{ borderRadius: "var(--leaf-r-lg)" }}>
                    <p className="text-5xl mb-4">🎉</p>
                    <p className="font-baloo font-black text-green-800 text-[20px]">Got it! We&apos;ll be in touch soon.</p>
                    <p className="font-nunito text-green-600 text-[13px] mt-2">Check your inbox within one business day.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="bg-white border border-gray-100 shadow-xl p-8 space-y-5"
                    style={{ borderRadius: "var(--leaf-r-lg)" }}>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-baloo font-black text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Your Name *</label>
                        <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full border border-gray-200 px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition placeholder:text-gray-300"
                          style={{ borderRadius: "var(--leaf-r)" }} placeholder="Jean-Pierre K." />
                      </div>
                      <div>
                        <label className="block font-baloo font-black text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">School Name *</label>
                        <input required value={form.school} onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                          className="w-full border border-gray-200 px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition placeholder:text-gray-300"
                          style={{ borderRadius: "var(--leaf-r)" }} placeholder="GS Kacyiru" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-baloo font-black text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Email Address *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition placeholder:text-gray-300"
                        style={{ borderRadius: "var(--leaf-r)" }} placeholder="teacher@school.rw" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-baloo font-black text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Country</label>
                        <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                          className="w-full border border-gray-200 px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition placeholder:text-gray-300"
                          style={{ borderRadius: "var(--leaf-r)" }} placeholder="Rwanda" />
                      </div>
                      <div>
                        <label className="block font-baloo font-black text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">No. of Learners</label>
                        <select value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                          className="w-full border border-gray-200 px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition bg-white"
                          style={{ borderRadius: "var(--leaf-r)" }}>
                          <option value="">Select range…</option>
                          <option>1–30</option><option>31–100</option><option>101–300</option><option>300+</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-baloo font-black text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Message (optional)</label>
                      <textarea rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition resize-none placeholder:text-gray-300"
                        style={{ borderRadius: "var(--leaf-r)" }} placeholder="Tell us about your classroom needs…" />
                    </div>
                    {status === "error" && (
                      <p className="font-nunito text-red-500 text-[12px]">
                        Something went wrong. Email us at <a href="mailto:schools@nimipiko.com" className="underline">schools@nimipiko.com</a>.
                      </p>
                    )}
                    <button type="submit" disabled={status === "sending"}
                      className="w-full text-white font-baloo font-black text-[15px] py-4 flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
                      style={{ backgroundColor: "var(--nimi-green)", borderRadius: "var(--leaf-r)", boxShadow: "0 6px 20px rgba(5,150,105,0.35)" }}>
                      <Send className="w-4 h-4" />
                      {status === "sending" ? "Sending…" : "Send Inquiry"}
                    </button>
                    <p className="text-center font-nunito text-gray-400 text-[12px]">
                      Or email: <a href="mailto:schools@nimipiko.com" className="text-[var(--nimi-green)] font-bold hover:underline">schools@nimipiko.com</a>
                    </p>
                  </form>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 px-5 sm:px-10 lg:px-14 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-10 mb-10">
            <div className="flex flex-col items-center sm:items-start gap-3">
              <Image src="/nimi-logo.png" alt="NIMIPIKO" width={56} height={56} className="object-contain" />
              <p className="font-baloo font-black text-white text-[17px]">NIMIPIKO</p>
              <p className="font-nunito text-gray-400 text-[12px] max-w-[190px] text-center sm:text-left leading-relaxed">
                Where every child becomes the hero of their own story.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-10 text-center sm:text-left">
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Product</p>
                {([["For Families","/"],["For Schools","/schools"],["Pricing","/pricing"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Company</p>
                {([["About","/about"],["Stories","/stories"],["Community","/community"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Legal</p>
                {([["Privacy Policy","/privacy"],["Terms of Use","/terms"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-nunito text-gray-500 text-[12px]">
              © {new Date().getFullYear()} Nimipiko Studio LTD. Made with ❤️ for curious kids everywhere.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-nunito text-gray-500 text-[11px]">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
