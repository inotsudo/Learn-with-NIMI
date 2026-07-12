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
import {
  getChildren, getTotalStars, getActivityDates, getWeekStreak,
  getWeekActivityCounts, getClaimedChallenges, claimChallengeReward,
} from "@/lib/queries";
import { getStoryLibrary } from "@/lib/storyRepository";
import { computeStreaks } from "@/lib/parentInsights";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import {
  WEEKLY_CHALLENGES, DAILY_CHALLENGES,
  getWeekPeriod, getDayPeriod, todayWeekIndex,
  type Challenge, type ChallengeStats,
} from "@/components/challenges/_challengeData";
import type { Language } from "@/contexts/LanguageContext";

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
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
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
      style={{ background:"var(--nimi-green)" }}
    >
      <span className="text-lg">⭐</span>{message}
    </motion.div>
  );
}

// ── Section-cleared banner ─────────────────────────────────────
function SectionCleared({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity:0, scale:0.92, y:6 }}
      animate={{ opacity:1, scale:1,   y:0 }}
      className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[var(--nimi-green)]/10 border border-[var(--nimi-green)]/30 text-[13px] font-black"
      style={{ color:"var(--nimi-green)" }}
    >
      <motion.span animate={{ rotate:[0,15,-10,0] }} transition={{ duration:0.6, delay:0.2 }}>🎉</motion.span>
      {label} — all complete!
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
  const complete = challenge.isComplete(stats);
  const pct      = challenge.progress(stats);
  const label    = challenge.progressLabel(stats);
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
          ? "border-[var(--nimi-green)] bg-ds-surface shadow-[0_0_0_3px_rgba(34,197,94,0.10),0_8px_28px_rgba(0,0,0,0.09)]"
          : premium
          ? "border-amber-300/60 bg-gradient-to-br from-amber-50/40 to-ds-surface shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          : "border-ds-border bg-ds-surface shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
      }`}
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
            premium ? "text-[15px]" : "text-[13px]"
          } ${state === "locked" ? "text-ds-muted" : "text-ds-text"}`}>
            {challenge.title}
          </p>

          {/* READY badge */}
          {state === "ready" && (
            <motion.span
              initial={{ scale:0, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              className="text-[9px] font-black px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ background:"var(--nimi-green)",
                boxShadow:"0 0 0 3px rgba(34,197,94,0.25)" }}
            >
              READY!
            </motion.span>
          )}

          {/* Premium crown */}
          {premium && state === "locked" && (
            <span className="text-[11px] shrink-0">👑</span>
          )}
        </div>

        <p className={`text-[11px] leading-snug mb-2 ${state === "locked" ? "text-ds-muted/60" : "text-ds-muted"}`}>
          {challenge.desc}
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
          <span className={`text-[10px] font-bold shrink-0 tabular-nums ${state === "locked" ? "text-ds-muted/60" : "text-ds-text"}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Right: star amount + action */}
      <div className="shrink-0 flex flex-col items-center gap-1.5 min-w-[60px]">
        <span className={`text-[12px] font-black ${state === "locked" ? "text-ds-muted/50" : "text-amber-500"}`}>
          {state === "claimed" ? `+${challenge.stars}⭐` : `⭐ +${challenge.stars}`}
        </span>

        <AnimatePresence mode="wait">
          {state === "claimed" ? (
            <motion.div key="done"
              initial={{ scale:0 }} animate={{ scale:1 }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background:"var(--nimi-green)" }}
            >
              <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
            </motion.div>
          ) : state === "ready" ? (
            <motion.button key="claim"
              initial={{ scale:0.8, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              whileHover={{ scale:1.07 }}
              whileTap={{ scale:0.93 }}
              onClick={() => onClaim(challenge)}
              disabled={claiming}
              className="text-[11px] font-black px-3 py-1.5 rounded-xl text-white shadow-md disabled:opacity-60 transition-opacity"
              style={{ background:"var(--nimi-green)" }}
            >
              {claiming ? "…" : "Claim!"}
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

// ── Main page ──────────────────────────────────────────────────
export default function ChallengesPage() {
  const router = useRouter();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const [childId, setChildId]           = useState<string | null>(null);
  const [childName, setChildName]       = useState("Explorer");
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
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }

      setChildId(child.id);
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

  const handleClaim = useCallback(async (challenge: Challenge) => {
    if (!childId || claimingId) return;
    const period = challenge.period === "weekly" ? getWeekPeriod() : getDayPeriod();
    const slug   = `${challenge.period}-${challenge.id}-${period}`;
    if (claimed.has(slug)) return;

    setClaimingId(challenge.id);
    const ok = await claimChallengeReward(childId, language, slug, challenge.stars);
    setClaimingId(null);
    if (!ok) return;

    setClaimed(prev => new Set([...prev, slug]));
    setTotalStars(prev => prev + challenge.stars);
    setShowConfetti(true);
    toastKey.current++;
    setToast(`+${challenge.stars} stars earned! Keep it up 🔥`);
  }, [childId, language, claimed, claimingId]);

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
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-28 leaf-lg" />)}
            </div>
          ) : (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              transition={{ duration:0.3 }}
              className={`space-y-6 transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`}
            >

              {/* ── HERO ─────────────────────────────────── */}
              <HeroBanner zone="achievement">
                {/* Back button */}
                <button
                  onClick={() => router.back()}
                  className="absolute top-4 left-5 z-20 flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />

                {([ {t:"12%",l:"5%",d:0},{t:"70%",l:"7%",d:0.55},{t:"18%",r:"5%",d:0.3},{t:"66%",r:"8%",d:0.9} ] as Array<{t:string;d:number;l?:string;r?:string}>).map((s,i) => (
                  <motion.span key={i}
                    className="absolute text-xl pointer-events-none select-none"
                    style={{ top:s.t, left:s.l, right:s.r }}
                    animate={{ opacity:[0.3,0.9,0.3], y:[0,-7,0], scale:[0.8,1.25,0.8] }}
                    transition={{ duration:2.5, repeat:Infinity, delay:s.d }}
                    aria-hidden
                  >⭐</motion.span>
                ))}

                <div className="relative z-10 px-5 pt-12 pb-5 sm:px-7 sm:pb-6">
                  <div className="flex items-center gap-4">
                    <motion.img src={assets.nimiCircle} alt="NIMI"
                      className="w-14 h-14 rounded-full border-2 border-white/40 shadow-xl shrink-0"
                      animate={{ y:[0,-5,0] }} transition={{ duration:2.8, repeat:Infinity }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5">
                        Challenge Arena
                      </p>
                      <h1 className="font-baloo font-black text-white text-[22px] sm:text-[28px] leading-tight drop-shadow-md">
                        {childName}&apos;s Challenges! 🏆
                      </h1>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-2.5 mt-4 flex-wrap">
                    <div className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-2 backdrop-blur-sm">
                      <span className="text-[18px]">⭐</span>
                      <span className="font-baloo font-black text-white text-[18px]">
                        <StarCount target={totalStars} />
                      </span>
                      <span className="text-white/70 text-[11px] font-bold">Total Stars</span>
                    </div>

                    {/* Progress chip */}
                    <div className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-2 backdrop-blur-sm">
                      <span className="text-[18px]">🏅</span>
                      <span className="font-baloo font-black text-white text-[18px]">{totalDone}</span>
                      <span className="text-white/70 text-[11px] font-bold">/ {totalCount} done</span>
                    </div>
                  </div>

                  {/* Overall progress bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width:0 }}
                      animate={{ width: `${(totalDone/totalCount)*100}%` }}
                      transition={{ duration:1, ease:"easeOut", delay:0.3 }}
                    />
                  </div>
                </div>
              </HeroBanner>

              {/* ── WEEKLY ───────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-black text-ds-text text-[16px]">📅 This Week</h2>
                    <p className="text-ds-muted text-[11px]">Resets every Monday</p>
                  </div>
                  <span className="text-[11px] font-black text-ds-muted bg-ds-surface border border-ds-border px-2.5 py-1 rounded-full">
                    {weeklyDone}/{WEEKLY_CHALLENGES.length}
                  </span>
                </div>

                <AnimatePresence>
                  {allWeekDone && <SectionCleared key="wc" label="This week" />}
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
                    <h2 className="font-black text-ds-text text-[16px]">☀️ Today</h2>
                    <p className="text-ds-muted text-[11px]">Resets at midnight</p>
                  </div>
                  <span className="text-[11px] font-black text-ds-muted bg-ds-surface border border-ds-border px-2.5 py-1 rounded-full">
                    {dailyDone}/{DAILY_CHALLENGES.length}
                  </span>
                </div>

                <AnimatePresence>
                  {allDayDone && <SectionCleared key="dc" label="Today" />}
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
                <p className="font-black text-ds-text text-[15px]">
                  {totalDone === totalCount
                    ? "Outstanding! All challenges complete!"
                    : `${totalCount - totalDone} challenge${totalCount - totalDone === 1 ? "" : "s"} left — you've got this!`}
                </p>
                <p className="text-ds-muted text-[11px] mt-1">New weekly challenges every Monday</p>
              </motion.div>

            </motion.div>
          )}
        </main>
      </PageSurface>
    </AppShell>
  );
}
