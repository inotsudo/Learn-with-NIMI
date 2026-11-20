"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import {
  getChildren, ensureParentRow,
  getCurrentLevel, getTotalStars,
  getWeekStreak, getActivityDates,
  getChildAchievements,
  getChildCosmetics, type ChildCosmetics,
  getStreakShieldsPurchased, getUsedShieldDates,
} from "@/lib/queries";
import { resolveShields } from "@/lib/streakShields";
import { computeStreaks } from "@/lib/parentInsights";
import type { Child, ChildAchievement } from "@/lib/queries";
import { getStoryLibraryStrict, getStorySlots, getPopularStories, type PopularStory } from "@/lib/storyRepository";
import { getActiveSubscription } from "@/lib/payments/products";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import WelcomeBackOverlay         from "@/components/home/WelcomeBackOverlay";
import { NimiThemeProvider }      from "@/components/nimi-world/NimiThemeProvider";
import NimiToyWorld               from "@/components/nimi-world/NimiToyWorld";
import { worldLangFor }           from "@/components/nimi-world/themes";
import { stampForBadge, type WorldData } from "@/components/nimi-world/worldData";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LEVELS = [
  { labelKey: "levelNameSeed",      icon: "🌱", maxXp: 10   },
  { labelKey: "levelNameExplorer",  icon: "🚶", maxXp: 25   },
  { labelKey: "levelNameCreator",   icon: "✏️",  maxXp: 50   },
  { labelKey: "levelNameScientist", icon: "🔬", maxXp: 80   },
  { labelKey: "levelNameHero",      icon: "⭐", maxXp: 120  },
];



interface HomeSnapshot {
  ts: number;
  stories: StoryLibraryItem[];
  slots: StorySlot[];
  level: number;
  totalStars: number;
  weekStreak: boolean[];
  achievements: ChildAchievement[];
  consecutiveStreak: number;
  popularStories: PopularStory[];
  cosmetics: ChildCosmetics;
}

function saveHomeSnapshot(key: string, snap: Omit<HomeSnapshot, "ts">) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), ...snap })); } catch { /* quota */ }
}

interface Props {
  initialChildren?: Child[];
  initialHasSubscription?: boolean;
}

function InlineToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.9 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-notification flex items-center gap-2.5 bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl shadow-2xl pointer-events-none"
    >
      <span className="text-mbase leading-none">⚠️</span>
      <span className="font-nunito font-semibold text-sml leading-snug max-w-[220px]">{message}</span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HomeClient({ initialChildren, initialHasSubscription }: Props = {}) {
  const router = useRouter();
  const { setLanguage } = useLanguage();

  const activeChildRef       = useRef<Child | null>(null);
  const switchGenRef         = useRef(0);
  const selectGenRef         = useRef(0);          // guards child-switch race
  const subscriptionLoadedRef = useRef(initialChildren !== undefined); // RSC path resolves immediately
  const silentRefreshingRef  = useRef(false);      // prevents concurrent silentRefresh calls
  const [loading,         setLoading]         = useState(true);
  const [initError,       setInitError]       = useState(false);
  const [,                setRefreshing]      = useState(false);
  const [children,        setChildren]        = useState<Child[]>([]);
  const [activeChild,     setActiveChild]     = useState<Child | null>(null);
  const [noChildrenYet,   setNoChildrenYet]   = useState(false);
  const [,                setHasSubscription] = useState(false);
  const [isTrial,           setIsTrial]           = useState(false);
  const [trialDaysLeft,     setTrialDaysLeft]     = useState(0);
  const [trialJustExpired,  setTrialJustExpired]  = useState(false);
  const [stories,          setStories]          = useState<StoryLibraryItem[]>([]);
  const [slots,            setSlots]            = useState<StorySlot[]>([]);
  const [popularStories,   setPopularStories]   = useState<PopularStory[]>([]);
  const [level,            setLevel]            = useState(1);
  const [totalStars,       setTotalStars]       = useState(0);
  const [weekStreak,         setWeekStreak]         = useState<boolean[]>([false,false,false,false,false,false,false]);
  const [achievements,       setAchievements]       = useState<ChildAchievement[]>([]);
  const [consecutiveStreak,  setConsecutiveStreak]  = useState(0);
  const [,                   setFavorites]          = useState<Set<string>>(new Set());
  const [cosmetics,          setCosmetics]          = useState<ChildCosmetics>({ nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null });
  const [welcomeBack,        setWelcomeBack]        = useState<{ show: boolean; daysAway: number }>({ show: false, daysAway: 0 });
  const [langToast,          setLangToast]          = useState<string | null>(null);
  const langToastKey = useRef(0);

  useEffect(() => { void init(); }, []);

  // Keep ref current so the language-change handler below always sees the
  // latest child without re-registering the event listener on every render.
  useEffect(() => { activeChildRef.current = activeChild; }, [activeChild]);

  // When the global language switcher fires, reload all per-language data.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      if (!lang) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
      const child = activeChildRef.current;
      if (!child) return;
      const gen = ++switchGenRef.current;
      const updated = { ...child, language: lang };
      activeChildRef.current = updated;
      setActiveChild(updated);
      setRefreshing(true);
      try {
        // Strict library fetch: a transient RPC failure must REJECT here so the
        // catch keeps the current stories on screen (with a toast) instead of
        // silently swapping in [] and rendering the empty-state card.
        const [lib, lvl, stars, streak, ach, actDates, popular, cos] = await Promise.all([
          getStoryLibraryStrict(updated.id, lang),
          getCurrentLevel(updated.id, lang),
          getTotalStars(updated.id, lang),
          getWeekStreak(updated.id, lang),
          getChildAchievements(updated.id),
          getActivityDates(updated.id, lang),
          getPopularStories(),
          getChildCosmetics(updated.id),
          getStreakShieldsPurchased(updated.id),
          getUsedShieldDates(updated.id, lang),
        ]);
        if (gen !== switchGenRef.current) return;
        const { usedDates: homeDates3 } = await resolveShields(updated.id, lang, actDates);
        if (gen !== switchGenRef.current) return;
        setStories(lib);
        setLevel(lvl);
        setTotalStars(stars);
        setWeekStreak(streak);
        setAchievements(ach);
        setConsecutiveStreak(computeStreaks(actDates, new Date(), homeDates3).current);
        setPopularStories(popular);
        setCosmetics(cos);
        const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
        if (cur) getStorySlots(updated.id, cur.sid, lang).then(setSlots).catch(() => {});
        else setSlots([]);
      } catch {
        langToastKey.current++;
        setLangToast("Couldn't load content for this language. Please try again.");
      } finally {
        if (gen === switchGenRef.current) setRefreshing(false);
      }
      }, 200);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => {
      window.removeEventListener("app:languageChange", handler as EventListener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    let visTimer: ReturnType<typeof setTimeout> | null = null;
    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || !activeChildRef.current) return;
      if (visTimer) clearTimeout(visTimer);
      visTimer = setTimeout(() => {
        if (activeChildRef.current) void silentRefresh(activeChildRef.current);
      }, 300);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (visTimer) clearTimeout(visTimer);
    };
  }, []);

  async function init() {
    try {
      if (initialChildren !== undefined) {
        setChildren(initialChildren);
        setHasSubscription(!!initialHasSubscription);
        // subscriptionLoadedRef already true (initialised from prop)
        if (initialChildren.length === 0) { router.replace("/onboarding"); return; }
        const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
        const saved = initialChildren.find(c => c.id === savedId) ?? initialChildren[0];
        await select(saved, initialChildren);
        return;
      }

      // Fire auth validation, parent-row upsert, and children fetch all in parallel.
      // All three internally call auth.getUser() which the Supabase client deduplicates.
      const [{ data: { user } }, , list] = await Promise.all([
        supabase.auth.getUser(),
        ensureParentRow(),
        getChildren(),
      ]);
      if (!user) { router.replace("/loginpage"); return; }
      setChildren(list);
      getActiveSubscription(user.id).then(async (sub) => {
        subscriptionLoadedRef.current = true;
        setHasSubscription(!!sub);
        if (sub?.payment_provider === "trial" && sub.current_period_end) {
          setIsTrial(true);
          const msLeft = new Date(sub.current_period_end).getTime() - Date.now();
          setTrialDaysLeft(Math.max(0, Math.ceil(msLeft / 86_400_000)));
        } else if (!sub) {
          const dismissed = typeof window !== "undefined"
            && localStorage.getItem("nimipiko_trial_expiry_seen") === "1";
          if (!dismissed) {
            const { data } = await supabase
              .from("nimipiko_subscriptions")
              .select("id")
              .eq("parent_id", user.id)
              .eq("payment_provider", "trial")
              .eq("status", "expired")
              .limit(1)
              .maybeSingle();
            if (data) setTrialJustExpired(true);
          }
        }
      }).catch(() => { subscriptionLoadedRef.current = true; }); // failure → treat as free plan
      if (list.length === 0) { router.replace("/onboarding"); return; }
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const saved   = list.find(c => c.id === savedId) ?? list[0];
      await select(saved, list);
    } catch (err) {
      console.error("[home] init failed:", err);
      setInitError(true);
      setLoading(false);
    }
  }

  async function select(child: Child, list?: Child[]) {
    const gen = ++selectGenRef.current;
    setActiveChild(child);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_CHILD_KEY, child.id);
      try {
        const raw = localStorage.getItem(`nimi_favs_${child.id}`);
        setFavorites(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
      } catch { setFavorites(new Set()); }

      // Welcome-back overlay: show if returning after 3+ days away.
      const visitKey  = `nimipiko_last_visit_${child.id}`;
      const todayStr  = new Date().toISOString().slice(0, 10);
      const lastVisit = localStorage.getItem(visitKey);
      if (lastVisit && lastVisit !== todayStr) {
        const diffDays = Math.round(
          (new Date(todayStr).getTime() - new Date(lastVisit).getTime()) / 86400000
        );
        if (diffDays >= 3) setWelcomeBack({ show: true, daysAway: diffDays });
      }
      localStorage.setItem(visitKey, todayStr);
    }
    setLanguage(child.language);
    if (list) setChildren(list);

    // SWR: restore last session's snapshot so returning users skip the loading skeleton.
    const snapshotKey = `nimipiko_home_${child.id}_${child.language}`;
    const TWO_HOURS   = 2 * 60 * 60 * 1000;
    let hasCachedData = false;
    if (typeof window !== "undefined") {
      try {
        const raw  = localStorage.getItem(snapshotKey);
        const snap = raw ? (JSON.parse(raw) as HomeSnapshot) : null;
        // Only restore snapshots that carry stories: an empty `stories` array is
        // indistinguishable from a poisoned snapshot (an earlier transient RPC
        // failure used to be saved as []), and restoring it rendered the
        // empty-state card on top of an active adventure. Genuinely empty
        // accounts simply fall through to the fresh load below.
        if (snap && Array.isArray(snap.stories) && snap.stories.length > 0 && Date.now() - snap.ts < TWO_HOURS) {
          setStories(snap.stories);
          setLevel(snap.level);
          setTotalStars(snap.totalStars);
          setWeekStreak(snap.weekStreak);
          setAchievements(snap.achievements);
          setConsecutiveStreak(snap.consecutiveStreak);
          setPopularStories(snap.popularStories);
          setCosmetics(snap.cosmetics);
          if (snap.slots.length > 0) setSlots(snap.slots);
          setLoading(false);
          hasCachedData = true;
        }
      } catch { /* corrupt snapshot — ignore, proceed with fresh load */ }
    }
    if (hasCachedData) setRefreshing(true);

    try {
      // Strict library fetch: a transient get_story_library_progress failure must
      // REJECT (and land in the catch below) instead of resolving to [] — a
      // silent [] swapped the Current Adventure card for the empty-state card
      // and (worse) saved an empty snapshot that re-rendered it for 2 hours.
      const [lib, lvl, stars, streak, ach, actDates, popular, cos] = await Promise.all([
        getStoryLibraryStrict(child.id, child.language),
        getCurrentLevel(child.id, child.language),
        getTotalStars(child.id, child.language),
        getWeekStreak(child.id, child.language),
        getChildAchievements(child.id),
        getActivityDates(child.id, child.language),
        getPopularStories(),
        getChildCosmetics(child.id),
        // Pre-warm resolveShields inputs so the await below is a cache-hit
        getStreakShieldsPurchased(child.id),
        getUsedShieldDates(child.id, child.language),
      ]);
      // Discard if a newer child selection was triggered while we were fetching
      if (gen !== selectGenRef.current) return;
      const { usedDates: homeDates1 } = await resolveShields(child.id, child.language, actDates);
      if (gen !== selectGenRef.current) return;
      const cStreak = computeStreaks(actDates, new Date(), homeDates1).current;
      setStories(lib);
      setLevel(lvl);
      setTotalStars(stars);
      setWeekStreak(streak);
      setAchievements(ach);
      setConsecutiveStreak(cStreak);
      setPopularStories(popular);
      setCosmetics(cos);
      if (hasCachedData) setRefreshing(false); else setLoading(false);

      // Fetch slots and save complete snapshot once slots are known.
      const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
      if (cur) {
        getStorySlots(child.id, cur.sid, child.language).then(freshSlots => {
          if (gen !== selectGenRef.current) return;
          setSlots(freshSlots);
          saveHomeSnapshot(snapshotKey, { stories: lib, slots: freshSlots, level: lvl,
            totalStars: stars, weekStreak: streak, achievements: ach,
            consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
        }).catch(() => {});
      } else {
        setSlots([]);
        saveHomeSnapshot(snapshotKey, { stories: lib, slots: [], level: lvl,
          totalStars: stars, weekStreak: streak, achievements: ach,
          consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
      }

    } catch (err) {
      console.error("[home] select failed:", err);
      if (hasCachedData) {
        // Keep the restored snapshot on screen (Current Adventure + journey)
        // and just stop the refresh indicator — a transient failure must not
        // replace known-good data with the empty-state card.
        setRefreshing(false);
      } else {
        // Nothing cached: show the retry screen rather than a misleading
        // "Choose Your Destination" empty state (the child may well have an
        // active adventure — we just failed to load it).
        setInitError(true);
        setLoading(false);
      }
    }
  }

  async function silentRefresh(child: Child) {
    if (silentRefreshingRef.current) return;
    silentRefreshingRef.current = true;
    setRefreshing(true);
    try {
    const lang = child.language;
    const [lib, lvl, stars, streak, ach, actDates, popular, cos] = await Promise.all([
      // Strict: on failure this rejects → catch keeps the current stories on
      // screen instead of silently blanking the dashboard to the empty state.
      getStoryLibraryStrict(child.id, lang),
      getCurrentLevel(child.id, lang),
      getTotalStars(child.id, lang),
      getWeekStreak(child.id, lang),
      getChildAchievements(child.id),
      getActivityDates(child.id, lang),
      getPopularStories(),
      getChildCosmetics(child.id),
      getStreakShieldsPurchased(child.id),
      getUsedShieldDates(child.id, lang),
    ]);
    const { usedDates: homeDates2 } = await resolveShields(child.id, lang, actDates);
    const cStreak = computeStreaks(actDates, new Date(), homeDates2).current;
    setStories(lib);
    setLevel(lvl);
    setTotalStars(stars);
    setWeekStreak(streak);
    setAchievements(ach);
    setConsecutiveStreak(cStreak);
    setPopularStories(popular);
    setCosmetics(cos);
    const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
    const snapshotKey = `nimipiko_home_${child.id}_${lang}`;
    if (cur) {
      getStorySlots(child.id, cur.sid, lang).then(freshSlots => {
        setSlots(freshSlots);
        saveHomeSnapshot(snapshotKey, { stories: lib, slots: freshSlots, level: lvl,
          totalStars: stars, weekStreak: streak, achievements: ach,
          consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
      }).catch(() => {});
    } else {
      setSlots([]);
      saveHomeSnapshot(snapshotKey, { stories: lib, slots: [], level: lvl,
        totalStars: stars, weekStreak: streak, achievements: ach,
        consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
    }
    } catch (err) {
      // Transient failure during a background refresh: keep whatever is
      // currently on screen (last-known-good stories) and log for debugging.
      console.error("[home] silent refresh failed (keeping current data):", err);
    } finally {
      setRefreshing(false);
      silentRefreshingRef.current = false;
    }
  }

  async function handleCreated(child: Child) {
    setNoChildrenYet(false);
    await select(child, [...children, child]);
  }

  const isFr = activeChild?.language === "fr";

  if (initError) return (
    <div className="fixed inset-0 grid place-items-center px-6" style={{ background: "linear-gradient(160deg, #06101F 0%, #1A3558 60%, #0d2244 100%)" }}>
      <div className="flex flex-col items-center gap-5 text-center">
        <motion.span className="text-7xl leading-none" animate={{ y: [-6, 6, -6] }} transition={{ duration: 3, repeat: Infinity }} aria-hidden="true">🛸</motion.span>
        <p className="font-baloo text-2xl font-black text-white">{isFr ? "Oups, la tour de contrôle ne répond pas" : "Oops, the control tower isn't answering"}</p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => { setInitError(false); setLoading(true); void init(); }}
          className="rounded-full px-8 py-4 font-baloo text-lg font-black"
          style={{ minHeight: 64, background: "linear-gradient(135deg, #C9A84C, #D4A830 60%, #c09428)", color: "#06101F", boxShadow: "0 8px 0 rgba(0,0,0,0.3)" }}
        >
          🔄 {isFr ? "Réessayer" : "Try again"}
        </motion.button>
      </div>
    </div>
  );

  if (noChildrenYet) { router.replace("/onboarding"); return null; }

  /* ─── Derived ──────────────────────────────────────────────────────────── */
  const curStory   = stories.find(s => s.unlocked && !s.complete) ?? stories[0];
  const xp         = totalStars;
  // Derive star-level: first bucket whose maxXp >= stars; -1 means stars exceeds all → last level.
  const xpLvlIdxFinal = (() => {
    const i = LEVELS.findIndex(l => xp <= l.maxXp);
    return i === -1 ? LEVELS.length - 1 : i;
  })();
  const levelInfo  = LEVELS[xpLvlIdxFinal];
  const prevMax    = xpLvlIdxFinal > 0 ? LEVELS[xpLvlIdxFinal - 1].maxXp : 0;
  const xpIn       = Math.max(0, xp - prevMax);
  const xpNeeded   = levelInfo.maxXp - prevMax;
  const xpPct      = Math.min(100, Math.round((xpIn / xpNeeded) * 100));

  // Zero-dashboard home: the learner lands in the NIMIPIKO Airways toy world.
  // Everything a child needs is a toy in that world; parent-only information
  // (trial / subscription) lives behind the Kit's long-press Parent Portal.
  const worldData: WorldData = {
    childName: activeChild?.name ?? "Explorer",
    stories: stories.map((s) => ({
      id: s.sid, slug: s.slug, title: s.title, emoji: s.theme_emoji ?? "📖", unlocked: s.unlocked, complete: s.complete, order: s.sort_order,
    })),
    currentStoryId: curStory?.sid ?? null,
    slots: slots.map((s) => ({ slotKey: s.slot_key, title: s.title, completed: s.completed })),
    stars: totalStars,
    streak: consecutiveStreak,
    level: xpLvlIdxFinal + 1,
    xpIn,
    xpNeeded,
    xpPct,
    stamps: achievements.filter((a) => a.type === "badge").map((a) => stampForBadge(a.slug)),
  };

  const parentExtras = (isTrial || trialJustExpired) ? (
    <Link
      href="/pricing"
      className="flex items-center gap-3 rounded-2xl p-3"
      style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)" }}
    >
      <span className="text-xl" aria-hidden="true">{trialJustExpired ? "⏳" : trialDaysLeft <= 2 ? "⚡" : "🎫"}</span>
      <span className="flex-1 text-sm">
        <strong className="text-white">
          {trialJustExpired
            ? (isFr ? "L'essai gratuit de 7 jours est terminé" : "Your 7-day free trial has ended")
            : isFr ? `Essai : ${trialDaysLeft} jour${trialDaysLeft === 1 ? "" : "s"} restant${trialDaysLeft === 1 ? "" : "s"}` : `Trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`}
        </strong>
        <span className="block opacity-75">{isFr ? "S'abonner pour garder l'accès complet →" : "Subscribe to keep full access →"}</span>
      </span>
      <Crown className="h-4 w-4 shrink-0" style={{ color: "#C9A84C" }} />
    </Link>
  ) : undefined;

  return (
    <NimiThemeProvider
      childId={activeChild?.id ?? null}
      childAge={activeChild?.age ?? null}
      defaultLang={worldLangFor(activeChild?.language)}
    >
      <NimiToyWorld
        data={worldData}
        loading={loading}
        kids={children.map((c) => ({ id: c.id, name: c.name, age: c.age }))}
        activeChildId={activeChild?.id ?? null}
        childAge={activeChild?.age ?? null}
        onSelectChild={(id) => {
          const next = children.find((c) => c.id === id);
          if (next && next.id !== activeChild?.id) void select(next);
        }}
        onNavigate={(href) => router.push(href)}
        parentExtras={parentExtras}
      />
      {welcomeBack.show && activeChild && (
        <WelcomeBackOverlay childName={activeChild.name} daysAway={welcomeBack.daysAway} onDismiss={() => setWelcomeBack({ show: false, daysAway: 0 })} />
      )}
      <AnimatePresence>
        {langToast && (
          <InlineToast key={`lang-toast-${langToastKey.current}`} message={langToast} onDone={() => setLangToast(null)} />
        )}
      </AnimatePresence>
    </NimiThemeProvider>
  );
}
