"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen, Globe2, Mic, Palette, Trophy, Brain,
  Heart, Users, Star, Sparkles, GraduationCap, ArrowRight, Gem,
} from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

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
    color: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    title: "Three Languages, One Universe",
    body: "Every story, song, and activity exists in English, French, and Kinyarwanda — simultaneously. Children switch languages mid-session without losing their progress or their place in the world.",
  },
  {
    icon: BookOpen,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    title: "Stories That Come Alive",
    body: "Interactive storybooks with professional voice actors, original music, animated videos, karaoke tracks, and printable coloring pages — the full ecosystem, not just text on a screen.",
  },
  {
    icon: Brain,
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    title: "Nimi — The AI Learning Companion",
    body: "An AI-powered chatbot that speaks to children about the stories, characters, and values. Kid-friendly, voice-enabled, and highly visual — Nimi is designed to become a real digital friend.",
  },
  {
    icon: Trophy,
    color: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    title: "Champion Certificates & Treasure Gallery",
    body: "Every milestone earns a real, printable achievement certificate. Children collect them in their Champion Treasure Gallery — a growing showcase of proof that learning happened, something parents can frame.",
  },
  {
    icon: Palette,
    color: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    title: "Creative & Physical Activities",
    body: "Coloring books, movement games, and craft activities extend every story beyond the screen. Learning that lives in the body sticks longer than learning that only lives on it.",
  },
  {
    icon: Users,
    color: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    title: "Nimipiko Friends Club",
    body: "A community where children share their colored drawings, vote on the theme of the next story, and get featured as Star Artist of the Week. Creativity becomes social.",
  },
  {
    icon: GraduationCap,
    color: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
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
  { value: "3", label: "Languages", icon: "🌐" },
  { value: "2–10", label: "Age range", icon: "🎂" },
  { value: "5", label: "Child profiles per family", icon: "👶" },
  { value: "∞", label: "Stories in the universe", icon: "📖" },
];

export default function AboutPage() {
  const noMotion = useReducedMotion();

  return (
    <div className="min-h-screen font-nunito bg-white dark:bg-gray-950">
      <MarketingHeader />

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fdf3e0] via-white to-green-50/60 dark:from-gray-900 dark:via-gray-950 dark:to-green-950/30 px-5 sm:px-10 pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-green-200/30 dark:bg-green-800/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-amber-200/30 dark:bg-amber-800/10 rounded-full blur-3xl pointer-events-none" aria-hidden />

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center"
          initial="hidden" animate="visible" variants={noMotion ? {} : stagger}
        >
          <motion.span variants={noMotion ? {} : fadeUp}
            className="inline-block bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-5">
            Our Story
          </motion.span>

          <motion.h1 variants={noMotion ? {} : fadeUp}
            className="font-baloo font-black text-gray-900 dark:text-white text-[36px] sm:text-[52px] leading-tight mb-5"
            style={{ textWrap: "balance" }}>
            We are not selling<br />
            <span className="text-[var(--nimi-green)]">digital books.</span>
          </motion.h1>

          <motion.p variants={noMotion ? {} : fadeUp}
            className="text-gray-600 dark:text-gray-300 text-[17px] sm:text-[19px] leading-relaxed mb-3 font-semibold"
            style={{ textWrap: "balance" }}>
            We are building the <strong className="text-gray-900 dark:text-white">Nimipiko Learning Universe</strong> — an immersive world where every child becomes the hero of their own story.
          </motion.p>

          <motion.p variants={noMotion ? {} : fadeUp}
            className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed max-w-xl mx-auto">
            Three languages. AI-powered companionship. Printable certificates. Stories that live on long after the screen turns off.
          </motion.p>
        </motion.div>
      </section>

      {/* ══ ORIGIN ════════════════════════════════════════════════════ */}
      <section className="px-5 sm:px-10 py-16 sm:py-20 max-w-3xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}>
          <motion.span variants={noMotion ? {} : fadeUp}
            className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
            Why we exist
          </motion.span>

          <motion.h2 variants={noMotion ? {} : fadeUp}
            className="font-baloo font-black text-gray-900 dark:text-white text-[28px] sm:text-[36px] leading-tight mb-6"
            style={{ textWrap: "balance" }}>
            Every child deserves to learn<br />in their mother tongue.
          </motion.h2>

          <div className="space-y-5 text-gray-600 dark:text-gray-300 text-[16px] leading-relaxed">
            <motion.p variants={noMotion ? {} : fadeUp}>
              Most children's learning apps were designed for one kind of child — English-speaking, from the Global North, represented in every story they encounter. Millions of children across Africa grow up with world-class curiosity and no tools that speak back to them.
            </motion.p>
            <motion.p variants={noMotion ? {} : fadeUp}>
              Nimipiko started with one question: <em className="text-gray-800 dark:text-gray-200 font-semibold">what would an early-learning platform look like if Rwandan children were the starting point, not an edge case?</em>
            </motion.p>
            <motion.p variants={noMotion ? {} : fadeUp}>
              The answer is a platform where Kinyarwanda sits alongside French and English as an equal — where every hero looks familiar, where every certificate carries a name that fits, and where the AI companion speaks the child's language before it learns to speak yours.
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* ══ WHAT MAKES IT DIFFERENT ═══════════════════════════════════ */}
      <section className="bg-[#fdf3e0]/60 dark:bg-gray-900/60 px-5 sm:px-10 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
            className="text-center mb-12">
            <motion.span variants={noMotion ? {} : fadeUp}
              className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
              What we built
            </motion.span>
            <motion.h2 variants={noMotion ? {} : fadeUp}
              className="font-baloo font-black text-gray-900 dark:text-white text-[28px] sm:text-[36px] leading-tight"
              style={{ textWrap: "balance" }}>
              Seven pillars of the Learning Universe
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={noMotion ? {} : stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map(({ icon: Icon, color, title, body }) => (
              <motion.div key={title} variants={noMotion ? {} : fadeUp}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-baloo font-black text-gray-900 dark:text-white text-[17px] mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-[13px] leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ TWO PILLARS ═══════════════════════════════════════════════ */}
      <section className="px-5 sm:px-10 py-16 sm:py-20 max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
          className="text-center mb-12">
          <motion.span variants={noMotion ? {} : fadeUp}
            className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
            How we monetize
          </motion.span>
          <motion.h2 variants={noMotion ? {} : fadeUp}
            className="font-baloo font-black text-gray-900 dark:text-white text-[28px] sm:text-[36px] leading-tight"
            style={{ textWrap: "balance" }}>
            Two pillars. One universe.
          </motion.h2>
          <motion.p variants={noMotion ? {} : fadeUp}
            className="text-gray-500 dark:text-gray-400 text-[15px] mt-3 max-w-xl mx-auto leading-relaxed">
            Free entry, sustainable growth. No ads. No dark patterns. Just two honest products.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={noMotion ? {} : stagger}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Club */}
          <motion.div variants={noMotion ? {} : fadeUp}
            className="rounded-3xl border-2 border-[var(--nimi-green)] bg-green-50/60 dark:bg-green-950/30 p-8 flex flex-col">
            <div className="text-4xl mb-4">🌟</div>
            <span className="inline-block bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide mb-3 w-fit">
              Pillar 1
            </span>
            <h3 className="font-baloo font-black text-gray-900 dark:text-white text-[24px] mb-1">Nimipiko Club</h3>
            <p className="text-gray-500 dark:text-gray-400 text-[13px] mb-5 leading-relaxed">
              Full unlimited access to every story, song, activity, coloring book, and Champion Challenge — for up to 5 children under one family subscription.
            </p>
            <div className="mt-auto">
              <p className="font-baloo font-black text-[var(--nimi-green)] text-[32px] leading-none">$14.99<span className="text-gray-400 text-[16px] font-normal">/month</span></p>
              <p className="text-gray-400 text-[11px] mt-0.5">or 9,900 RWF · €13.99 · save 33% annually</p>
            </div>
          </motion.div>

          {/* Masterpiece */}
          <motion.div variants={noMotion ? {} : fadeUp}
            className="rounded-3xl border-2 border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 p-8 flex flex-col">
            <div className="text-4xl mb-4">👑</div>
            <span className="inline-block bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide mb-3 w-fit">
              Pillar 2
            </span>
            <h3 className="font-baloo font-black text-gray-900 dark:text-white text-[24px] mb-1">Masterpiece</h3>
            <p className="text-gray-500 dark:text-gray-400 text-[13px] mb-5 leading-relaxed">
              Your child becomes the hero of their own personalized storybook — with their photo woven into every page and a printable Champion Certificate. A keepsake memory, not a subscription.
            </p>
            <div className="mt-auto">
              <p className="font-baloo font-black text-amber-600 dark:text-amber-400 text-[32px] leading-none">$29.99<span className="text-gray-400 text-[16px] font-normal"> once</span></p>
              <p className="text-gray-400 text-[11px] mt-0.5">or 40,000 RWF · €27.99 · yours forever</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ══ WHO IT'S FOR ══════════════════════════════════════════════ */}
      <section className="bg-gray-50 dark:bg-gray-900/60 px-5 sm:px-10 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
            className="text-center mb-12">
            <motion.span variants={noMotion ? {} : fadeUp}
              className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
              Our audience
            </motion.span>
            <motion.h2 variants={noMotion ? {} : fadeUp}
              className="font-baloo font-black text-gray-900 dark:text-white text-[28px] sm:text-[36px] leading-tight"
              style={{ textWrap: "balance" }}>
              Built for children who deserve<br />to see themselves in stories.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={noMotion ? {} : stagger}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {WHO.map(({ icon, headline, body }) => (
              <motion.div key={headline} variants={noMotion ? {} : fadeUp}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex items-start gap-4 shadow-sm">
                <span className="text-4xl shrink-0 mt-0.5">{icon}</span>
                <div>
                  <h3 className="font-baloo font-black text-gray-900 dark:text-white text-[17px] mb-1">{headline}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-[13px] leading-relaxed">{body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ NUMBERS ═══════════════════════════════════════════════════ */}
      <section className="px-5 sm:px-10 py-14 sm:py-16">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={noMotion ? {} : stagger}
          className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {NUMBERS.map(({ value, label, icon }) => (
            <motion.div key={label} variants={noMotion ? {} : fadeUp} className="flex flex-col items-center gap-1">
              <span className="text-3xl mb-1">{icon}</span>
              <span className="font-baloo font-black text-[var(--nimi-green)] text-[36px] leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
              <span className="text-gray-500 dark:text-gray-400 text-[12px] font-bold uppercase tracking-wide">{label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ USER JOURNEY / FUNNEL ════════════════════════════════════ */}
      <section className="px-5 sm:px-10 py-16 sm:py-20 bg-gray-50 dark:bg-gray-900/60">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={noMotion ? {} : stagger}
            className="text-center mb-12">
            <motion.span variants={noMotion ? {} : fadeUp}
              className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
              The experience
            </motion.span>
            <motion.h2 variants={noMotion ? {} : fadeUp}
              className="font-baloo font-black text-gray-900 dark:text-white text-[28px] sm:text-[34px] leading-tight"
              style={{ textWrap: "balance" }}>
              Every story follows the same journey.
            </motion.h2>
            <motion.p variants={noMotion ? {} : fadeUp}
              className="text-gray-500 dark:text-gray-400 text-[14px] mt-3 max-w-lg mx-auto">
              Before your child reads a word, the world pulls them in.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={noMotion ? {} : stagger}
            className="relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[var(--nimi-green)] to-amber-400 opacity-30" aria-hidden />

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 relative z-10">
              {[
                { step: "1", icon: "🎬", label: "Start", sub: 'Click "Stories"' },
                { step: "2", icon: "🎵", label: "Song", sub: "30-sec lyric animation" },
                { step: "3", icon: "🦸", label: "Heroes", sub: "Meet the story cast" },
                { step: "4", icon: "📖", label: "Title", sub: "The theme revealed" },
                { step: "5", icon: "✨", label: "Action", sub: "1-min teaser animation" },
              ].map(({ step, icon, label, sub }) => (
                <motion.div key={step} variants={noMotion ? {} : fadeUp}
                  className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border-2 border-[var(--nimi-green)]/30 shadow-sm flex items-center justify-center text-3xl mb-3">
                    {icon}
                  </div>
                  <span className="font-baloo font-black text-[var(--nimi-green)] text-[18px] leading-none">{label}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-[11px] mt-1 leading-snug">{sub}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ DISCOVERY / FREE ENTRY ════════════════════════════════════ */}
      <section className="bg-[#fdf3e0]/70 dark:bg-gray-900/60 px-5 sm:px-10 py-14 sm:py-16">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={noMotion ? {} : stagger}
          className="max-w-3xl mx-auto text-center">
          <motion.span variants={noMotion ? {} : fadeUp}
            className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
            Free to start
          </motion.span>
          <motion.h2 variants={noMotion ? {} : fadeUp}
            className="font-baloo font-black text-gray-900 dark:text-white text-[26px] sm:text-[32px] leading-tight mb-4"
            style={{ textWrap: "balance" }}>
            Your first adventure is completely free.
          </motion.h2>
          <motion.p variants={noMotion ? {} : fadeUp}
            className="text-gray-500 dark:text-gray-400 text-[15px] mb-8 max-w-xl mx-auto leading-relaxed">
            No credit card. No commitment. Create an account and explore the Discovery tier — four full experiences included at no cost.
          </motion.p>
          <motion.div variants={noMotion ? {} : stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: "🎵", label: "Animated Song", sub: "Lyric video intro" },
              { icon: "📖", label: "Story Preview", sub: "Taste the content" },
              { icon: "🦸", label: "Meet the Heroes", sub: "Character intro" },
              { icon: "🏆", label: "First Challenge", sub: "Champion activity" },
            ].map(({ icon, label, sub }) => (
              <motion.div key={label} variants={noMotion ? {} : fadeUp}
                className="flex flex-col items-center gap-1.5 bg-white dark:bg-gray-900 rounded-2xl border border-green-100 dark:border-green-900/30 px-3 py-4">
                <span className="text-3xl">{icon}</span>
                <p className="font-baloo font-black text-gray-800 dark:text-gray-100 text-[13px] leading-tight">{label}</p>
                <p className="text-gray-400 text-[11px]">{sub}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={noMotion ? {} : fadeUp}>
            <Link href="/signuppage"
              className="inline-flex items-center gap-2 bg-[var(--nimi-green)] text-white font-baloo font-black text-[16px] px-8 py-4 rounded-full shadow-lg hover:brightness-105 transition">
              Start Free — No Card Required
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ══ STUDIO ════════════════════════════════════════════════════ */}
      <section className="px-5 sm:px-10 py-16 sm:py-20 max-w-3xl mx-auto text-center">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={noMotion ? {} : stagger}>
          <motion.span variants={noMotion ? {} : fadeUp}
            className="inline-block text-[11px] font-black uppercase tracking-widest text-[var(--nimi-green)] mb-4">
            The Studio
          </motion.span>
          <motion.h2 variants={noMotion ? {} : fadeUp}
            className="font-baloo font-black text-gray-900 dark:text-white text-[26px] sm:text-[32px] leading-tight mb-5"
            style={{ textWrap: "balance" }}>
            Nimipiko Studio LTD
          </motion.h2>
          <motion.div variants={noMotion ? {} : fadeUp}
            className="space-y-4 text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed text-left sm:text-center max-w-2xl mx-auto">
            <p>
              We are a small, focused studio that builds one thing: the most immersive early-learning platform for children growing up in multilingual families. Not a feature factory. Not a content aggregator. One universe, built with depth.
            </p>
            <p>
              We operate across Rwanda and internationally, with pricing localized in RWF, USD, and EUR. Every product decision starts with the same question — <em className="text-gray-800 dark:text-gray-200 font-semibold">does this make the child's learning world richer?</em>
            </p>
          </motion.div>

          <motion.div variants={noMotion ? {} : fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: Heart, label: "Educator-reviewed content" },
              { icon: Users, label: "Up to 5 child profiles" },
              { icon: Star, label: "Zero ads. Ever." },
              { icon: Sparkles, label: "AI that stays safe" },
              { icon: Mic, label: "Professional voice actors" },
              { icon: Globe2, label: "3 languages natively" },
            ].map(({ icon: Icon, label }) => (
              <span key={label}
                className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[12px] font-bold px-3 py-1.5 rounded-full">
                <Icon className="w-3.5 h-3.5 text-[var(--nimi-green)]" />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══ CTA BANNER ════════════════════════════════════════════════ */}
      <section className="px-5 sm:px-10 pb-20">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={noMotion ? {} : fadeUp}
          className="max-w-3xl mx-auto rounded-3xl overflow-hidden relative bg-gradient-to-br from-[var(--nimi-green)] to-green-800 p-10 sm:p-14 text-center text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('/themes/default/hero/hero-background.png')] bg-cover bg-center opacity-10 pointer-events-none" aria-hidden />
          <div className="relative z-10">
            <p className="font-baloo font-black text-[30px] sm:text-[38px] leading-tight mb-2" style={{ textWrap: "balance" }}>
              Nimipiko is more than stories.
            </p>
            <p className="font-baloo font-black text-amber-300 text-[24px] sm:text-[30px] leading-tight mb-4">
              It&apos;s a Digital Universe.
            </p>
            <p className="text-green-100 text-[15px] mb-8 max-w-md mx-auto leading-relaxed">
              Join families around the world building a love of reading, language, and learning — one adventure at a time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signuppage"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[var(--nimi-green)] font-baloo font-black text-[16px] px-8 py-4 rounded-full shadow-lg hover:brightness-105 transition">
                Start Free Today
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-baloo font-black text-[15px] px-8 py-4 rounded-full hover:bg-white/25 transition">
                See Pricing
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
