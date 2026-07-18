"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen, Globe2, Mic, Palette, Trophy, Brain,
  Heart, Users, Star, Sparkles, GraduationCap, ArrowRight, Gem,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { PageSurface } from "@/components/layout/primitives";

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const PILLARS = [
  {
    icon: Globe2,
    color: "bg-sky-50 text-sky-600",
    title: "Three Languages, One Universe",
    body: "Every story, song, and activity exists in English, French, and Kinyarwanda — simultaneously. Children switch languages mid-session without losing their progress or their place in the world.",
  },
  {
    icon: BookOpen,
    color: "bg-amber-50 text-amber-600",
    title: "Stories That Come Alive",
    body: "Interactive storybooks with professional voice actors, original music, animated videos, karaoke tracks, and printable coloring pages — the full ecosystem, not just text on a screen.",
  },
  {
    icon: Brain,
    color: "bg-indigo-50 text-indigo-600",
    title: "Nimi — The AI Learning Companion",
    body: "An AI-powered chatbot that speaks to children about the stories, characters, and values. Kid-friendly, voice-enabled, and highly visual — Nimi is designed to become a real digital friend.",
  },
  {
    icon: Trophy,
    color: "bg-green-50 text-green-600",
    title: "Champion Certificates & Treasure Gallery",
    body: "Every milestone earns a real, printable achievement certificate. Children collect them in their Champion Treasure Gallery — a growing showcase of proof that learning happened, something parents can frame.",
  },
  {
    icon: Palette,
    color: "bg-rose-50 text-rose-600",
    title: "Creative & Physical Activities",
    body: "Coloring books, movement games, and craft activities extend every story beyond the screen. Learning that lives in the body sticks longer than learning that only lives on it.",
  },
  {
    icon: Users,
    color: "bg-orange-50 text-orange-600",
    title: "Nimipiko Friends Club",
    body: "A community where children share their colored drawings, vote on the theme of the next story, and get featured as Star Artist of the Week. Creativity becomes social.",
  },
  {
    icon: GraduationCap,
    color: "bg-violet-50 text-violet-600",
    title: "Built for Schools Too",
    body: "Institutional licensing from $7/student/month gives classrooms a separate Educator Dashboard with class-wide progress tracking and district-level reporting.",
  },
];

const WHO = [
  {
    icon: "👨‍👩‍👧",
    headline: "Rwandan families",
    body: "The first platform where Kinyarwanda-speaking children see themselves as the heroes. Not an afterthought — the origin point.",
  },
  {
    icon: "🌍",
    headline: "The global African diaspora",
    body: "Children growing up abroad who deserve to stay connected to their heritage — in language, in story, in culture.",
  },
  {
    icon: "🇫🇷",
    headline: "Francophone families worldwide",
    body: "French is a mother tongue for millions of children across Africa and Europe. Nimipiko treats it as one.",
  },
  {
    icon: "🏫",
    headline: "Schools & educators",
    body: "Classrooms that need curriculum-aligned content across multiple languages — with the reporting infrastructure to prove it's working.",
  },
];

const NUMBERS = [
  { value: "3",    label: "Languages",              icon: "🌐" },
  { value: "2–10", label: "Age range",              icon: "🎂" },
  { value: "5",    label: "Child profiles per family", icon: "👶" },
  { value: "∞",   label: "Adventures waiting",     icon: "📖" },
];

export default function AboutPage() {
  const noMotion = useReducedMotion();

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 w-full content-enter space-y-10">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <motion.div initial="hidden" animate="visible" variants={noMotion ? {} : stagger}
            className="relative overflow-hidden px-6 py-14 sm:py-20 text-center"
            style={{ borderRadius: "var(--leaf-r-lg)", background: "linear-gradient(135deg, #fdf3e0 0%, #fff 50%, #f0fdf4 100%)" }}>
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-green-200/30 rounded-full blur-3xl pointer-events-none" aria-hidden />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" aria-hidden />
            <div className="relative z-10 max-w-2xl mx-auto">
              <motion.span variants={noMotion ? {} : fadeUp}
                className="inline-block bg-green-100 text-green-800 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-5">
                Our Story
              </motion.span>
              <motion.h1 variants={noMotion ? {} : fadeUp}
                className="font-baloo font-black text-ds-text text-[34px] sm:text-[48px] leading-tight mb-5"
                style={{ textWrap: "balance" }}>
                We are not selling<br />
                <span className="text-[var(--nimi-green)]">digital books.</span>
              </motion.h1>
              <motion.p variants={noMotion ? {} : fadeUp}
                className="text-ds-text text-[16px] sm:text-[18px] leading-relaxed mb-3 font-semibold"
                style={{ textWrap: "balance" }}>
                We are building the <strong>Nimipiko Learning Universe</strong> — an immersive world where every child becomes the hero of their own story.
              </motion.p>
              <motion.p variants={noMotion ? {} : fadeUp}
                className="text-ds-muted text-[14px] leading-relaxed max-w-xl mx-auto">
                Three languages. AI-powered companionship. Printable certificates. Stories that live on long after the screen turns off.
              </motion.p>
            </div>
          </motion.div>

          {/* ── Origin ───────────────────────────────────────────── */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}>
            <motion.span variants={noMotion ? {} : fadeUp}
              className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
              Why we exist
            </motion.span>
            <motion.h2 variants={noMotion ? {} : fadeUp}
              className="font-baloo font-black text-ds-text text-[26px] sm:text-[34px] leading-tight mb-6"
              style={{ textWrap: "balance" }}>
              Every child deserves to learn<br />in their mother tongue.
            </motion.h2>
            <div className="space-y-5 text-ds-text text-[15px] leading-relaxed">
              <motion.p variants={noMotion ? {} : fadeUp}>
                Most children&apos;s learning apps were designed for one kind of child — English-speaking, from the Global North, represented in every story they encounter. Millions of children across Africa grow up with world-class curiosity and no tools that speak back to them.
              </motion.p>
              <motion.p variants={noMotion ? {} : fadeUp}>
                Nimipiko started with one question: <em className="text-ds-text font-semibold">what would an early-learning platform look like if Rwandan children were the starting point, not an edge case?</em>
              </motion.p>
              <motion.p variants={noMotion ? {} : fadeUp}>
                The answer is a platform where Kinyarwanda sits alongside French and English as an equal — where every hero looks familiar, where every certificate carries a name that fits, and where the AI companion speaks the child&apos;s language before it learns to speak yours.
              </motion.p>
            </div>
          </motion.div>

          {/* ── Seven pillars ────────────────────────────────────── */}
          <div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
              className="text-center mb-8">
              <motion.span variants={noMotion ? {} : fadeUp}
                className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
                What we built
              </motion.span>
              <motion.h2 variants={noMotion ? {} : fadeUp}
                className="font-baloo font-black text-ds-text text-[26px] sm:text-[34px] leading-tight"
                style={{ textWrap: "balance" }}>
                Seven pillars of the Learning Universe
              </motion.h2>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
              variants={noMotion ? {} : stagger}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PILLARS.map(({ icon: Icon, color, title, body }) => (
                <motion.div key={title} variants={noMotion ? {} : fadeUp}
                  className="bg-ds-card border border-ds-border shadow-ds-card p-6 hover:shadow-ds-hover transition-shadow"
                  style={{ borderRadius: "var(--leaf-r)" }}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-baloo font-black text-ds-text text-[16px] mb-2">{title}</h3>
                  <p className="text-ds-muted text-[13px] leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* ── Two pillars ──────────────────────────────────────── */}
          <div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
              className="text-center mb-8">
              <motion.span variants={noMotion ? {} : fadeUp}
                className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
                Our products
              </motion.span>
              <motion.h2 variants={noMotion ? {} : fadeUp}
                className="font-baloo font-black text-ds-text text-[26px] sm:text-[34px] leading-tight"
                style={{ textWrap: "balance" }}>
                Two pillars. One universe.
              </motion.h2>
              <motion.p variants={noMotion ? {} : fadeUp}
                className="text-ds-muted text-[14px] mt-3 max-w-xl mx-auto leading-relaxed">
                Free entry, sustainable growth. No ads. No dark patterns. Just two honest products.
              </motion.p>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
              variants={noMotion ? {} : stagger}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <motion.div variants={noMotion ? {} : fadeUp}
                className="border-2 border-[var(--nimi-green)] bg-green-50/60 p-8 flex flex-col"
                style={{ borderRadius: "var(--leaf-r-lg)" }}>
                <div className="text-4xl mb-4">🌟</div>
                <span className="inline-block bg-green-100 text-green-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide mb-3 w-fit">
                  Pillar 1
                </span>
                <h3 className="font-baloo font-black text-ds-text text-[22px] mb-1">Nimipiko Club</h3>
                <p className="text-ds-muted text-[13px] mb-5 leading-relaxed">
                  Full unlimited access to every story, song, activity, coloring book, and Champion Challenge — for up to 5 children under one family subscription.
                </p>
                <div className="mt-auto">
                  <p className="font-baloo font-black text-[var(--nimi-green)] text-[30px] leading-none">$14.99<span className="text-ds-muted text-[15px] font-normal">/month</span></p>
                  <p className="text-ds-muted text-[11px] mt-0.5">or 9,900 RWF · €13.99 · save 33% annually</p>
                </div>
              </motion.div>

              <motion.div variants={noMotion ? {} : fadeUp}
                className="border-2 border-amber-400 bg-amber-50/60 p-8 flex flex-col"
                style={{ borderRadius: "var(--leaf-r-lg)" }}>
                <div className="text-4xl mb-4">👑</div>
                <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide mb-3 w-fit">
                  Pillar 2
                </span>
                <h3 className="font-baloo font-black text-ds-text text-[22px] mb-1">Masterpiece</h3>
                <p className="text-ds-muted text-[13px] mb-5 leading-relaxed">
                  Your child becomes the hero of their own personalized storybook — with their photo woven into every page and a printable Champion Certificate. A keepsake memory, not a subscription.
                </p>
                <div className="mt-auto">
                  <p className="font-baloo font-black text-amber-600 text-[30px] leading-none">$29.99<span className="text-ds-muted text-[15px] font-normal"> once</span></p>
                  <p className="text-ds-muted text-[11px] mt-0.5">or 40,000 RWF · €27.99 · yours forever</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* ── Who it's for ─────────────────────────────────────── */}
          <div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
              className="text-center mb-8">
              <motion.span variants={noMotion ? {} : fadeUp}
                className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
                Our audience
              </motion.span>
              <motion.h2 variants={noMotion ? {} : fadeUp}
                className="font-baloo font-black text-ds-text text-[26px] sm:text-[34px] leading-tight"
                style={{ textWrap: "balance" }}>
                Built for children who deserve<br />to see themselves in stories.
              </motion.h2>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
              variants={noMotion ? {} : stagger}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WHO.map(({ icon, headline, body }) => (
                <motion.div key={headline} variants={noMotion ? {} : fadeUp}
                  className="bg-ds-card border border-ds-border shadow-ds-card p-6 flex items-start gap-4"
                  style={{ borderRadius: "var(--leaf-r)" }}>
                  <span className="text-4xl shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <h3 className="font-baloo font-black text-ds-text text-[16px] mb-1">{headline}</h3>
                    <p className="text-ds-muted text-[13px] leading-relaxed">{body}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* ── Numbers ──────────────────────────────────────────── */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={noMotion ? {} : stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {NUMBERS.map(({ value, label, icon }) => (
              <motion.div key={label} variants={noMotion ? {} : fadeUp}
                className="bg-ds-card border border-ds-border shadow-ds-card flex flex-col items-center py-6 px-4 text-center"
                style={{ borderRadius: "var(--leaf-r)" }}>
                <span className="text-3xl mb-2">{icon}</span>
                <span className="font-baloo font-black text-[var(--nimi-green)] text-[34px] leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
                <span className="text-ds-muted text-[11px] font-bold uppercase tracking-wide mt-1">{label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* ── User journey ─────────────────────────────────────── */}
          <div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
              className="text-center mb-8">
              <motion.span variants={noMotion ? {} : fadeUp}
                className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
                The experience
              </motion.span>
              <motion.h2 variants={noMotion ? {} : fadeUp}
                className="font-baloo font-black text-ds-text text-[26px] sm:text-[32px] leading-tight"
                style={{ textWrap: "balance" }}>
                Every story follows the same journey.
              </motion.h2>
              <motion.p variants={noMotion ? {} : fadeUp}
                className="text-ds-muted text-[13px] mt-3 max-w-lg mx-auto">
                Before your child reads a word, the world pulls them in.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
              variants={noMotion ? {} : stagger}
              className="relative">
              <div className="hidden sm:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[var(--nimi-green)] to-amber-400 opacity-30" aria-hidden />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-5 relative z-10">
                {[
                  { step: "1", icon: "🎬", label: "Start",  sub: 'Click "Stories"' },
                  { step: "2", icon: "🎵", label: "Song",   sub: "30-sec lyric animation" },
                  { step: "3", icon: "🦸", label: "Heroes", sub: "Meet the story cast" },
                  { step: "4", icon: "📖", label: "Title",  sub: "The theme revealed" },
                  { step: "5", icon: "✨", label: "Action", sub: "1-min teaser animation" },
                ].map(({ step, icon, label, sub }) => (
                  <motion.div key={step} variants={noMotion ? {} : fadeUp}
                    className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-ds-card border-2 border-[var(--nimi-green)]/30 shadow-ds-card flex items-center justify-center text-3xl mb-3"
                      style={{ borderRadius: "var(--leaf-r)" }}>
                      {icon}
                    </div>
                    <span className="font-baloo font-black text-[var(--nimi-green)] text-[17px] leading-none">{label}</span>
                    <span className="text-ds-muted text-[11px] mt-1 leading-snug">{sub}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Free entry ───────────────────────────────────────── */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={noMotion ? {} : stagger}
            className="bg-ds-card border border-ds-border shadow-ds-card px-6 py-10 text-center"
            style={{ borderRadius: "var(--leaf-r-lg)" }}>
            <motion.span variants={noMotion ? {} : fadeUp}
              className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
              Free to start
            </motion.span>
            <motion.h2 variants={noMotion ? {} : fadeUp}
              className="font-baloo font-black text-ds-text text-[24px] sm:text-[30px] leading-tight mb-4"
              style={{ textWrap: "balance" }}>
              Your first adventure is completely free.
            </motion.h2>
            <motion.p variants={noMotion ? {} : fadeUp}
              className="text-ds-muted text-[14px] mb-8 max-w-xl mx-auto leading-relaxed">
              No credit card. No commitment. Create an account and explore the Discovery tier — four full experiences included at no cost.
            </motion.p>
            <motion.div variants={noMotion ? {} : stagger}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { icon: "🎵", label: "A full song",      sub: "Sing along in 3 languages" },
                { icon: "📖", label: "A real story",     sub: "Read it together, free" },
                { icon: "🦸", label: "Meet Zilo & Nimi", sub: "Your child's new friends" },
                { icon: "🏆", label: "First challenge",  sub: "Win your first badge" },
              ].map(({ icon, label, sub }) => (
                <motion.div key={label} variants={noMotion ? {} : fadeUp}
                  className="flex flex-col items-center gap-1.5 bg-ds-page border border-ds-border px-3 py-4"
                  style={{ borderRadius: "var(--leaf-r)" }}>
                  <span className="text-3xl">{icon}</span>
                  <p className="font-baloo font-black text-ds-text text-[13px] leading-tight">{label}</p>
                  <p className="text-ds-muted text-[11px]">{sub}</p>
                </motion.div>
              ))}
            </motion.div>
            <motion.div variants={noMotion ? {} : fadeUp}>
              <Link href="/signuppage"
                className="inline-flex items-center gap-2 bg-[var(--nimi-green)] text-white font-baloo font-black text-[15px] px-8 py-4 rounded-full shadow-ds-cta hover:brightness-105 transition">
                Start Free — No Card Required
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* ── Studio ───────────────────────────────────────────── */}
          <div className="text-center max-w-2xl mx-auto">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
              variants={noMotion ? {} : stagger}>
              <motion.span variants={noMotion ? {} : fadeUp}
                className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
                The Studio
              </motion.span>
              <motion.h2 variants={noMotion ? {} : fadeUp}
                className="font-baloo font-black text-ds-text text-[24px] sm:text-[30px] leading-tight mb-5"
                style={{ textWrap: "balance" }}>
                Nimipiko Studio LTD
              </motion.h2>
              <motion.div variants={noMotion ? {} : fadeUp}
                className="space-y-4 text-ds-text text-[14px] leading-relaxed text-left sm:text-center">
                <p>
                  We are a small, focused studio that builds one thing: the most immersive early-learning platform for children growing up in multilingual families. Not a feature factory. Not a content aggregator. One universe, built with depth.
                </p>
                <p>
                  We operate across Rwanda and internationally, with pricing localized in RWF, USD, and EUR. Every product decision starts with the same question — <em className="text-ds-text font-semibold">does this make the child&apos;s learning world richer?</em>
                </p>
              </motion.div>
              <motion.div variants={noMotion ? {} : fadeUp}
                className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {[
                  { icon: Heart,    label: "Educator-reviewed content" },
                  { icon: Users,    label: "Up to 5 child profiles" },
                  { icon: Star,     label: "Zero ads. Ever." },
                  { icon: Sparkles, label: "AI that stays safe" },
                  { icon: Mic,      label: "Professional voice actors" },
                  { icon: Globe2,   label: "3 languages natively" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label}
                    className="inline-flex items-center gap-1.5 bg-ds-page border border-ds-border text-ds-text text-[12px] font-bold px-3 py-1.5 rounded-full">
                    <Icon className="w-3.5 h-3.5 text-[var(--nimi-green)]" />
                    {label}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* ── CTA banner ───────────────────────────────────────── */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={noMotion ? {} : fadeUp}
            className="relative overflow-hidden p-10 sm:p-14 text-center text-white shadow-ds-cta"
            style={{ borderRadius: "var(--leaf-r-lg)", background: "linear-gradient(135deg, var(--nimi-green) 0%, #166534 100%)" }}>
            <div className="absolute inset-0 bg-[url('/themes/default/hero/hero-background.png')] bg-cover bg-center opacity-10 pointer-events-none" aria-hidden />
            <div className="relative z-10">
              <p className="font-baloo font-black text-[28px] sm:text-[36px] leading-tight mb-2" style={{ textWrap: "balance" }}>
                Nimipiko is more than stories.
              </p>
              <p className="font-baloo font-black text-amber-300 text-[22px] sm:text-[28px] leading-tight mb-4">
                It&apos;s a Digital Universe.
              </p>
              <p className="text-green-100 text-[14px] mb-8 max-w-md mx-auto leading-relaxed">
                Join families around the world building a love of reading, language, and learning — one adventure at a time.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signuppage"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[var(--nimi-green)] font-baloo font-black text-[15px] px-8 py-4 rounded-full shadow-lg hover:brightness-105 transition">
                  Start Free Today
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-baloo font-black text-[14px] px-8 py-4 rounded-full hover:bg-white/25 transition">
                  See Pricing
                </Link>
              </div>
            </div>
          </motion.div>

        </main>
      </PageSurface>
    </AppShell>
  );
}
