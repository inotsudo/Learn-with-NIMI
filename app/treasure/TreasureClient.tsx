"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { RefreshingBadge } from "@/components/layout/RefreshingBadge";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import {
  getChildren, getTotalStars, getActivityDates, getWeekStreak,
  getWeekActivityCounts, getClaimedChallenges, claimChallengeReward,
  type Child,
} from "@/lib/queries";
import { getStoryLibrary } from "@/lib/storyRepository";
import { computeStreaks } from "@/lib/parentInsights";
import { PageSurface } from "@/components/layout/primitives";
import {
  WEEKLY_CHALLENGES, DAILY_CHALLENGES,
  getWeekPeriod, getDayPeriod, todayWeekIndex,
  type Challenge, type ChallengeStats,
} from "@/components/challenges/_challengeData";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

// ── Animated star counter ──────────────────────────────────────
function StarCount({ target }: { target: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on("change", v => setDisplay(v));
    const ctrl = animate(count, target, { duration: 1.2, ease: "easeOut" });
    return () => { ctrl.stop(); unsub(); };
  }, [target, count, rounded]);

  return <span>{display}</span>;
}

// ── Confetti ───────────────────────────────────────────────────
const CONFETTI_COLORS = ["#22c55e","#f59e0b","#3b82f6","#a855f7","#ec4899","#f97316"];
function Confetti({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-max overflow-hidden">
      {Array.from({ length: 32 }).map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-[2px]"
          style={{
            width: 8 + (i % 4) * 3, height: 8 + (i % 3) * 3,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            left: `${10 + (i * 73 % 80)}%`, top: -20,
          }}
          animate={{ y: ["0vh","115vh"], x: [0, (i%2===0?1:-1)*(30 + i*43%70)], rotate: [0, 360*(i%2===0?1:-1)], opacity:[1,1,0.3,0] }}
          transition={{ duration: 1.9 + (i%5)*0.18, ease:"easeIn", delay: i*0.032 }}
        />
      ))}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div
      initial={{ opacity:0, y:52, scale:0.88 }}
      animate={{ opacity:1, y:0,  scale:1 }}
      exit={{   opacity:0, y:24, scale:0.95 }}
      transition={{ type:"spring", stiffness:380, damping:26 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl font-black text-sm text-white whitespace-nowrap"
      style={{ background: "linear-gradient(135deg, #F5C842, #C9A84C)", color: "#07111F" }}
    >
      <span className="text-lg">⭐</span>{message}
    </motion.div>
  );
}

// ── Section-cleared banner ─────────────────────────────────────
function SectionCleared({ label }: { label: string }) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity:0, scale:0.92, y:6 }}
      animate={{ opacity:1, scale:1,   y:0 }}
      className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sml font-black"
      style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.30)", color: "var(--airways-gold-text, #E8BC56)" }}
    >
      <motion.span animate={{ rotate:[0,15,-10,0] }} transition={{ duration:0.6, delay:0.2 }}>🎉</motion.span>
      {label} — {t("treasureAllComplete")}
      <motion.span animate={{ rotate:[0,-15,10,0] }} transition={{ duration:0.6, delay:0.3 }}>🎉</motion.span>
    </motion.div>
  );
}

// ── Challenge card ─────────────────────────────────────────────
function ChallengeCard({
  challenge, stats, claimed, claiming, onClaim, index, premium,
}: {
  challenge: Challenge;
  stats: ChallengeStats;
  claimed: boolean;
  claiming: boolean;
  onClaim: (c: Challenge) => void;
  index: number;
  premium?: boolean;
}) {
  const { t } = useLanguage();
  const complete = challenge.isComplete(stats);
  const pct      = challenge.progress(stats);
  const rawLabel = challenge.progressLabel(stats);
  const label    = pct >= 1 ? t("challengeDone") : pct === 0 ? t("challengeNotYet") : rawLabel;
  const state: "locked"|"ready"|"claimed" = claimed ? "claimed" : complete ? "ready" : "locked";

  return (
    <motion.div
      initial={{ opacity:0, y:28, scale:0.95 }}
      animate={{ opacity:1, y:0,  scale:1 }}
      transition={{ type:"spring", stiffness:280, damping:26, delay: index * 0.065 }}
      whileHover={state !== "locked" ? { y:-2, scale:1.01 } : {}}
      className={`relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border transition-colors duration-300 ${
        state === "claimed"
          ? "border-ds-border bg-ds-surface/50 opacity-60"
          : state === "ready"
          ? "bg-ds-surface shadow-[0_0_0_3px_rgba(201,168,76,0.15),0_8px_28px_rgba(0,0,0,0.09)]"
          : premium
          ? "border-amber-300/60 bg-gradient-to-br from-amber-50/40 to-ds-surface shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          : "border-ds-border bg-ds-surface shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
      }`}
      style={state === "ready" ? { borderColor: "rgba(201,168,76,0.55)" } : undefined}
    >
      {/* Left accent stripe */}
      <div className={`absolute left-0 inset-y-0 w-1 rounded-l-2xl bg-gradient-to-b ${challenge.bg} ${state === "locked" ? "opacity-30" : "opacity-100"}`} />

      {/* Emoji circle */}
      <div className={`shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br ${challenge.bg} shadow-md ${
        premium ? "w-16 h-16 text-4xl" : "w-14 h-14 text-3xl"
      } ${state === "locked" ? "opacity-40 grayscale" : ""}`}>
        <motion.span
          animate={state==="ready" ? { scale:[1,1.14,1], rotate:[0,8,-6,0] } : {}}
          transition={{ duration:1.6, repeat:Infinity, ease:"easeInOut" }}
        >
          {state === "claimed" ? "✅" : challenge.emoji}
        </motion.span>
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`font-black leading-tight ${
            premium ? "text-mbase" : "text-sml"
          } ${state === "locked" ? "text-ds-muted" : "text-ds-text"}`}>
            {t(challenge.titleKey)}
          </p>

          {/* READY badge */}
          {state === "ready" && (
            <motion.span
              initial={{ scale:0, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              className="text-4xs font-black px-2 py-0.5 rounded-full shrink-0"
              style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", boxShadow: "0 0 0 3px rgba(201,168,76,0.25)" }}
            >
              {t("treasureReady")}
            </motion.span>
          )}

          {/* Premium crown */}
          {premium && state === "locked" && (
            <span className="text-2xs shrink-0">👑</span>
          )}
        </div>

        <p className={`text-2xs leading-snug mb-2 ${state === "locked" ? "text-ds-muted/60" : "text-ds-muted"}`}>
          {t(challenge.descKey)}
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-ds-border overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${challenge.bg}`}
              initial={{ width:0 }}
              animate={{ width:`${pct * 100}%` }}
              transition={{ duration:0.9, ease:"easeOut", delay: index * 0.065 + 0.25 }}
            />
          </div>
          <span className={`text-3xs font-bold shrink-0 tabular-nums ${state === "locked" ? "text-ds-muted/60" : "text-ds-text"}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Right: star amount + action */}
      <div className="shrink-0 flex flex-col items-center gap-1.5 min-w-[60px]">
        <span className={`text-xs font-black ${state === "locked" ? "text-ds-muted/50" : "text-amber-500"}`}>
          {state === "claimed" ? `+${challenge.stars}⭐` : `⭐ +${challenge.stars}`}
        </span>

        <AnimatePresence mode="wait">
          {state === "claimed" ? (
            <motion.div key="done"
              initial={{ scale:0 }} animate={{ scale:1 }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)" }}
            >
              <Check className="w-4 h-4" style={{ color: "#07111F" }} strokeWidth={2.5} />
            </motion.div>
          ) : state === "ready" ? (
            <motion.button key="claim"
              initial={{ scale:0.8, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              whileHover={{ scale:1.07 }}
              whileTap={{ scale:0.93 }}
              onClick={() => onClaim(challenge)}
              disabled={claiming}
              className="text-2xs font-black px-3 py-1.5 rounded-xl shadow-md disabled:opacity-60 transition-opacity"
              style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}
            >
              {claiming ? "…" : t("treasureClaim")}
            </motion.button>
          ) : (
            <motion.div key="lock"
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="w-8 h-8 rounded-full bg-ds-border/50 flex items-center justify-center"
            >
              <Lock className="w-3.5 h-3.5 text-ds-muted" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animated glow ring when ready */}
      {state === "ready" && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ boxShadow:["0 0 0 0px rgba(34,197,94,0)", "0 0 0 5px rgba(34,197,94,0.18)", "0 0 0 0px rgba(34,197,94,0)"] }}
          transition={{ duration:2.2, repeat:Infinity }}
        />
      )}
    </motion.div>
  );
}

interface Props {
  initialChildren?: Child[];
}

// ── Main page ──────────────────────────────────────────────────
export default function TreasureClient({ initialChildren }: Props = {}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const [childName, setChildName]       = useState("");
  const [language, setLanguage]         = useState<Language>("en");
  const [stats, setStats]               = useState<ChallengeStats | null>(null);
  const [totalStars, setTotalStars]     = useState(0);
  const [claimed, setClaimed]           = useState<Set<string>>(new Set());
  const [claimingId, setClaimingId]     = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [toast, setToast]               = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const toastKey     = useRef(0);
  const childRef     = useRef<{ id: string; name: string; language: Language } | null>(null);
  const switchGenRef = useRef(0);

  const loadData = useCallback(async (child: { id: string; name: string; language: Language }, lang: Language, silent = false) => {
    const gen = silent ? ++switchGenRef.current : 0;
    if (silent) setRefreshing(true); else setLoading(true);

    const [activityDates, weekStreak, weekCounts, stories, stars, claimedSet] = await Promise.all([
      getActivityDates(child.id, lang),
      getWeekStreak(child.id, lang),
      getWeekActivityCounts(child.id, lang),
      getStoryLibrary(child.id, lang),
      getTotalStars(child.id, lang),
      getClaimedChallenges(child.id, lang),
    ]);

    if (silent && gen !== switchGenRef.current) return;
    const todayIdx = todayWeekIndex();
    setStats({
      currentStreak:    computeStreaks(activityDates).current,
      weekActive:       weekStreak.filter(Boolean).length,
      weekTotal:        weekCounts.reduce((a, b) => a + b, 0),
      weekMaxDay:       Math.max(...weekCounts, 0),
      completedStories: stories.filter(s => s.complete).length,
      todayCount:       weekCounts[todayIdx] ?? 0,
    });
    setTotalStars(stars);
    setClaimed(claimedSet);
    if (silent) setRefreshing(false); else setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      const list = initialChildren !== undefined ? initialChildren : await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }

      setChildName(child.name);
      setLanguage(child.language);
      childRef.current = { id: child.id, name: child.name, language: child.language };

      await loadData(child, child.language, false);
    })();
  }, [loadData]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      if (!lang) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const child = childRef.current;
        if (!child) return;
        const updated = { ...child, language: lang };
        childRef.current = updated;
        setLanguage(lang);
        await loadData(updated, lang, true);
      }, 200);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => {
      window.removeEventListener("app:languageChange", handler as EventListener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [loadData]);

  // Refresh when the browser tab regains focus
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      const child = childRef.current;
      if (child) void loadData(child, child.language, true);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [loadData]);

  const handleClaim = useCallback(async (challenge: Challenge) => {
    const child = childRef.current;
    if (!child || claimingId) return;
    const period = challenge.period === "weekly" ? getWeekPeriod() : getDayPeriod();
    const slug   = `${challenge.period}-${challenge.id}-${period}`;
    if (claimed.has(slug)) return;

    setClaimingId(challenge.id);
    const ok = await claimChallengeReward(child.id, language, slug);
    setClaimingId(null);
    if (!ok) return;

    setClaimed(prev => new Set([...prev, slug]));
    setTotalStars(prev => prev + challenge.stars);
    setShowConfetti(true);
    toastKey.current++;
    setToast(`+${challenge.stars} ${t("treasureStarsEarned")}`);
  }, [language, claimed, claimingId, t]);

  const weekPeriod = getWeekPeriod();
  const dayPeriod  = getDayPeriod();
  const isClaimed = (c: Challenge) => claimed.has(`${c.period}-${c.id}-${c.period === "weekly" ? weekPeriod : dayPeriod}`);

  const weeklyDone  = WEEKLY_CHALLENGES.filter(isClaimed).length;
  const dailyDone   = DAILY_CHALLENGES.filter(isClaimed).length;
  const allWeekDone = stats ? WEEKLY_CHALLENGES.every(c => isClaimed(c)) : false;
  const allDayDone  = stats ? DAILY_CHALLENGES.every(c => isClaimed(c)) : false;

  const allChallenges = [...WEEKLY_CHALLENGES, ...DAILY_CHALLENGES];
  const totalDone   = weeklyDone + dailyDone;
  const totalCount  = allChallenges.length;
  const remaining   = totalCount - totalDone;

  return (
    <AppShell>
      <RefreshingBadge show={refreshing} />
      <PageSurface>
        <AnimatePresence>
          {showConfetti && <Confetti key="confetti" onDone={() => setShowConfetti(false)} />}
          {toast && (
            <Toast key={`toast-${toastKey.current}`} message={toast} onDone={() => setToast(null)} />
          )}
        </AnimatePresence>

        <main className="max-w-2xl mx-auto px-4 sm:px-5 py-4 sm:py-6 pb-28 flex-1 w-full">
          {loading ? (
            <div className="space-y-6 py-2">
              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="leaf border border-ds-border p-4 space-y-2 text-center">
                    <Bone className="w-10 h-10 rounded-xl mx-auto" />
                    <Bone className="h-5 w-16 mx-auto" />
                    <Bone className="h-3 w-12 mx-auto" />
                  </div>
                ))}
              </div>
              {/* Badge grid */}
              <div className="leaf-lg border border-ds-border p-5 space-y-4">
                <Bone className="h-6 w-36" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="leaf border border-ds-border p-4 flex flex-col items-center gap-2">
                      <Bone className="w-16 h-16 rounded-2xl" />
                      <Bone className="h-4 w-3/4" />
                      <Bone className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Streak row */}
              <div className="leaf-lg border border-ds-border p-5 space-y-4">
                <Bone className="h-6 w-28" />
                <div className="flex items-center justify-between">
                  {Array.from({ length: 7 }).map((_, i) => <Bone key={i} className="w-10 h-10 rounded-2xl" />)}
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              transition={{ duration:0.3 }}
              className={`space-y-6 transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`}
            >

              {/* ── HERO ─────────────────────────────────── */}
              <section className="relative overflow-hidden -mx-4 sm:-mx-5 -mt-4 sm:-mt-6 mb-6 bg-[#0b2f6e]" style={{ minHeight: 240 }}>
                <img src="/airport-hero.png" alt="" aria-hidden
                  className="absolute inset-0 h-full w-full object-cover object-center select-none pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(100deg,rgba(255,255,255,.93) 0%,rgba(255,255,255,.72) 48%,rgba(255,255,255,.15) 68%,transparent 82%)" }} />
                <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
                  style={{ background: "linear-gradient(to top, #f8f2e7, transparent)" }} />

                {/* Left content */}
                <div className="relative z-10 flex min-h-[240px] flex-col justify-end px-5 pb-10 pt-8 sm:px-10">
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-baloo text-[11px] font-black -rotate-1 mb-2 self-start"
                    style={{ background:"#ffd331", color:"#092d78" }}>
                    {t("treasureChallengeArena")} ⚡
                  </span>
                  <h1 className="font-baloo font-black text-[#0e368b] leading-tight drop-shadow-[0_2px_0_rgba(255,255,255,.95)]"
                    style={{ fontSize: "clamp(1.8rem,5vw,2.6rem)" }}>
                    {childName}&apos;s Challenges! 🏆
                  </h1>
                  <p className="mt-1 font-baloo font-bold text-[15px] text-[#123a87] drop-shadow-[0_1px_0_rgba(255,255,255,.85)]">
                    Earn stars · Complete missions · Climb the ranks
                  </p>
                  <div className="mt-2 h-[3px] w-44 -rotate-[3deg] rounded-full bg-[#ffc400]" />
                  {/* Stat chips */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-full px-3.5 py-1.5 shadow-sm"
                      style={{ background:"rgba(255,255,255,0.88)", border:"1.5px solid #f5d142" }}>
                      <span className="text-base leading-none">⭐</span>
                      <span className="font-baloo font-black text-base leading-none" style={{ color:"#7a5800" }}><StarCount target={totalStars} /></span>
                      <span className="font-baloo text-[10px] font-bold" style={{ color:"#7a580099" }}>{t("treasureTotalStars")}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full px-3.5 py-1.5 shadow-sm"
                      style={{ background:"rgba(255,255,255,0.88)", border:"1.5px solid #c8d9ef" }}>
                      <span className="text-base leading-none">🏅</span>
                      <span className="font-baloo font-black text-base leading-none" style={{ color:"#082b78" }}>
                        {totalDone} <span className="font-normal opacity-60 text-sm">/ {totalCount}</span>
                      </span>
                      <span className="font-baloo text-[10px] font-bold" style={{ color:"#082b7899" }}>{t("treasureDone")}</span>
                    </div>
                  </div>
                </div>

                {/* Nimi jumping in celebration — contextual pose for challenges */}
                <div className="absolute right-1 bottom-0 z-10 flex items-end pb-0">
                  <motion.img src="/nimi/happy.png" alt="Nimi cheering"
                    className="h-[165px] sm:h-[200px] w-auto object-contain drop-shadow-2xl select-none"
                    animate={{ y:[0,-10,0], rotate:[0,2,-2,0] }}
                    transition={{ duration:2.5, repeat:Infinity, ease:"easeInOut" }}
                    draggable={false} />
                </div>
              </section>

              {/* ── WEEKLY ───────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-black text-base" style={{ color: "#082b78" }}>📅 {t("treasureWeeklyTitle")}</h2>
                    <p className="text-2xs" style={{ color: "#7791b3" }}>{t("treasureWeeklyReset")}</p>
                  </div>
                  <span className="text-2xs font-black px-2.5 py-1 rounded-full" style={{ color: "#7791b3", background: "rgba(8,43,120,0.06)", border: "1px solid #c8d9ef" }}>
                    {weeklyDone}/{WEEKLY_CHALLENGES.length}
                  </span>
                </div>

                <AnimatePresence>
                  {allWeekDone && <SectionCleared key="wc" label={t("treasureWeeklyTitle")} />}
                </AnimatePresence>

                {stats && (
                  <div className={`space-y-2.5 ${allWeekDone ? "mt-3" : ""}`}>
                    {WEEKLY_CHALLENGES.map((c, i) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        stats={stats}
                        claimed={isClaimed(c)}
                        claiming={claimingId === c.id}
                        onClaim={handleClaim}
                        index={i}
                        premium={c.id === "streak7"}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── DAILY ────────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-black text-base" style={{ color: "#082b78" }}>☀️ {t("treasureDailyTitle")}</h2>
                    <p className="text-2xs" style={{ color: "#7791b3" }}>{t("treasureDailyReset")}</p>
                  </div>
                  <span className="text-2xs font-black px-2.5 py-1 rounded-full" style={{ color: "#7791b3", background: "rgba(8,43,120,0.06)", border: "1px solid #c8d9ef" }}>
                    {dailyDone}/{DAILY_CHALLENGES.length}
                  </span>
                </div>

                <AnimatePresence>
                  {allDayDone && <SectionCleared key="dc" label={t("treasureDailyTitle")} />}
                </AnimatePresence>

                {stats && (
                  <div className={`space-y-2.5 ${allDayDone ? "mt-3" : ""}`}>
                    {DAILY_CHALLENGES.map((c, i) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        stats={stats}
                        claimed={isClaimed(c)}
                        claiming={claimingId === c.id}
                        onClaim={handleClaim}
                        index={WEEKLY_CHALLENGES.length + i}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── FOOTER ───────────────────────────────── */}
              <motion.div
                initial={{ opacity:0, y:12 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:0.7 }}
                className="text-center py-2"
              >
                <motion.div
                  animate={{ y:[0,-6,0], scale:[1,1.08,1] }}
                  transition={{ duration:2.4, repeat:Infinity }}
                  className="text-4xl mb-2"
                >
                  {totalDone === totalCount ? "🎊" : "🌟"}
                </motion.div>
                <p className="font-baloo font-black text-mbase" style={{ color: "#082b78" }}>
                  {totalDone === totalCount
                    ? t("treasureFooterAllDone")
                    : `${remaining} ${t("treasureChallengeLabel")}${remaining !== 1 ? "s" : ""} ${t("treasureFooterRemaining")}`}
                </p>
                <p className="text-2xs mt-1" style={{ color: "#7791b3" }}>{t("treasureFooterReset")}</p>
              </motion.div>

            </motion.div>
          )}
        </main>
      </PageSurface>
    </AppShell>
  );
}
