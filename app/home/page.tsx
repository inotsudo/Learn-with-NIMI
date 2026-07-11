"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { ChevronRight, Heart, Star, Flame, Play, Check, Lock } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import {
  getChildren, ensureParentRow, getStorageUrl,
  getCurrentLevel, getTotalStars,
  getWeekStreak,
  getChildAchievements, getConsecutiveStreak,
  getChildCosmetics, type ChildCosmetics,
} from "@/lib/queries";
import type { Child, ChildAchievement } from "@/lib/queries";
import { getStoryLibrary, getStorySlots, getPopularStories, type PopularStory } from "@/lib/storyRepository";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { ZoneDecorations } from "@/components/campus/ZoneDecorations";
import AppShell              from "@/components/layout/AppShell";
import WhoIsPlaying          from "@/components/home/WhoIsPlaying";
import CreateChildModal      from "@/components/home/CreateChildModal";
import CreateExplorerProfile from "@/components/home/CreateExplorerProfile";
import MagicLoader           from "@/components/magic/MagicLoader";
import { SHOP_ITEM_MAP } from "@/components/shop/_shopData";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LEVELS = [
  { label: "Seed",      icon: "🌱", maxXp: 100  },
  { label: "Explorer",  icon: "🚶", maxXp: 250  },
  { label: "Creator",   icon: "✏️",  maxXp: 500  },
  { label: "Scientist", icon: "🔬", maxXp: 800  },
  { label: "Hero",      icon: "⭐", maxXp: 1200 },
];

const ACTIVITIES = [
  { img: "/icons/story/Read.png",       label: "Read",       sub: "Stories",         href: "/stories" },
  { img: "/icons/story/create.png",     label: "Create",     sub: "Draw & Color",    href: "/missions" },
  { img: "/icons/story/play.png",       label: "Play",       sub: "Puzzles & Games", href: "/missions" },
  { img: "/icons/story/sing.png",       label: "Sing",       sub: "Songs & Rhymes",  href: "/missions" },
  { img: "/icons/story/challenges.png", label: "Challenges", sub: "Daily Missions",  href: "/treasure" },
  { img: "/icons/story/Community.png",  label: "Community",  sub: "Share & Inspire", href: "/community" },
];


const CATEGORY_VISUALS: Record<string, { emoji: string; bg: string; accent: string; label: string }> = {
  morning:   { emoji: "🎵", bg: "from-purple-50 to-pink-100",    accent: "#ec4899", label: "Morning Song"  },
  movement:  { emoji: "🤸", bg: "from-pink-50   to-red-100",     accent: "#f43f5e", label: "Move & Groove" },
  artistic:  { emoji: "🎨", bg: "from-amber-50  to-yellow-100",  accent: "#fbbf24", label: "Art Time"      },
  histoire:  { emoji: "📖", bg: "from-blue-50   to-sky-100",     accent: "#38bdf8", label: "Story Time"    },
  zoom:      { emoji: "🔍", bg: "from-green-50  to-emerald-100", accent: "#34d399", label: "Zoom In"       },
  discovery: { emoji: "🌍", bg: "from-teal-50   to-cyan-100",    accent: "#22d3ee", label: "Discover"      },
  flipflop:  { emoji: "🎧", bg: "from-violet-50 to-purple-100",  accent: "#a78bfa", label: "Flip Flop"     },
  coloring:  { emoji: "🦋", bg: "from-pink-50   to-rose-100",    accent: "#fb7185", label: "Color"         },
};



const CAT_BADGE_DISPLAY: Record<string, { emoji: string; label: string; from: string; to: string; glow: string }> = {
  morning:   { emoji: "🎵", label: "Music Master",   from: "#ec4899", to: "#db2777", glow: "#ec4899" },
  movement:  { emoji: "🤸", label: "Move Champion",  from: "#f43f5e", to: "#e11d48", glow: "#f43f5e" },
  artistic:  { emoji: "🎨", label: "Art Star",       from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" },
  histoire:  { emoji: "📖", label: "Story Master",   from: "#38bdf8", to: "#0ea5e9", glow: "#38bdf8" },
  zoom:      { emoji: "🔍", label: "Zoom Explorer",  from: "#34d399", to: "#10b981", glow: "#34d399" },
  discovery: { emoji: "🌍", label: "Discoverer",     from: "#22d3ee", to: "#06b6d4", glow: "#22d3ee" },
  flipflop:  { emoji: "🎧", label: "Audio Legend",   from: "#a78bfa", to: "#7c3aed", glow: "#a78bfa" },
  coloring:  { emoji: "🦋", label: "Color Expert",   from: "#fb7185", to: "#e11d48", glow: "#fb7185" },
};

function parseBadgeSlug(slug: string): { emoji: string; label: string; from: string; to: string; glow: string } {
  if (slug.startsWith("trilingual-story-"))
    return { emoji: "🌐", label: "Trilingual!", from: "#14b8a6", to: "#0d9488", glow: "#14b8a6" };
  if (slug.startsWith("story-streak-")) {
    const n = slug.split("-")[2] ?? "5";
    return { emoji: "🔥", label: `${n}-Story Streak`, from: "#f97316", to: "#ea580c", glow: "#f97316" };
  }
  if (slug.startsWith("story-") && slug.includes("-complete-"))
    return { emoji: "📚", label: "Story Complete", from: "#818cf8", to: "#6366f1", glow: "#818cf8" };
  if (slug.startsWith("level-") && slug.includes("-complete-")) {
    const n = slug.split("-")[1] ?? "1";
    return { emoji: "⭐", label: `Level ${n} Champ`, from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" };
  }
  const cat = slug.split("-")[0] ?? "";
  return CAT_BADGE_DISPLAY[cat] ?? { emoji: "🏅", label: "Achievement", from: "#818cf8", to: "#6366f1", glow: "#818cf8" };
}

const LOCKED_BADGE_PLACEHOLDERS = [
  { emoji: "🎨", label: "Art Star",    from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" },
  { emoji: "🧩", label: "Puzzle Pro",  from: "#818cf8", to: "#6366f1", glow: "#818cf8" },
  { emoji: "🔥", label: "Streak Hero", from: "#f97316", to: "#ea580c", glow: "#f97316" },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Ambient campus decorations — pushed to page edges so they never compete with content.
// World Bible §11: opacity 0.15–0.55, pointer-events-none. Fewer, better-placed.
const NATURE_ELEMENTS = [
  /* ── Stars ── */
  { emoji: "⭐", top: "8%",  left: "5%",  size: 17, delay: 0,   dur: 3.2, spin: false },
  { emoji: "✨", top: "28%", left: "96%", size: 15, delay: 0.7, dur: 2.8, spin: false },
  { emoji: "⭐", top: "50%", left: "4%",  size: 16, delay: 1.1, dur: 3.6, spin: false },
  { emoji: "✨", top: "70%", left: "94%", size: 14, delay: 0.4, dur: 3.0, spin: false },
  { emoji: "⭐", top: "88%", left: "8%",  size: 15, delay: 1.3, dur: 2.9, spin: false },
  /* ── Flowers ── */
  { emoji: "🌸", top: "14%", left: "3%",  size: 17, delay: 0.5, dur: 3.8, spin: true  },
  { emoji: "🌺", top: "38%", left: "96%", size: 19, delay: 1.0, dur: 4.1, spin: true  },
  { emoji: "🌼", top: "60%", left: "4%",  size: 15, delay: 0.3, dur: 3.4, spin: true  },
  { emoji: "🌷", top: "80%", left: "95%", size: 17, delay: 1.2, dur: 3.9, spin: true  },
  /* ── Butterflies ── */
  { emoji: "🦋", top: "22%", left: "95%", size: 18, delay: 0.8, dur: 3.5, spin: true  },
  { emoji: "🦋", top: "55%", left: "5%",  size: 20, delay: 1.5, dur: 4.0, spin: true  },
  /* ── Leaves ── */
  { emoji: "🍃", top: "44%", left: "97%", size: 15, delay: 0.6, dur: 3.3, spin: true  },
  { emoji: "🍀", top: "74%", left: "3%",  size: 16, delay: 1.1, dur: 3.6, spin: true  },
];


function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const up      = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const } } };
const pop     = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

// Stepping-stone path marker between campus zones (purely decorative)
function CampusConnector() {
  return (
    <div className="-mt-2 flex items-center justify-center gap-2 mb-5 pointer-events-none select-none" aria-hidden>
      <div className="w-6 h-px bg-emerald-200 rounded-full opacity-50" />
      <motion.span className="text-[11px] opacity-25" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>🌿</motion.span>
      <div className="flex items-center gap-1 opacity-30">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <div className="w-5 h-px bg-emerald-300 rounded-full" />
        <div className="w-2 h-2 rounded-full bg-emerald-300" />
        <div className="w-5 h-px bg-emerald-300 rounded-full" />
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </div>
      <motion.span className="text-[11px] opacity-25" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>🌿</motion.span>
      <div className="w-6 h-px bg-emerald-200 rounded-full opacity-50" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const m = useThemeMotion();
  const { setLanguage, t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const [mounted,         setMounted]         = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [children,        setChildren]        = useState<Child[]>([]);
  const [activeChild,     setActiveChild]     = useState<Child | null>(null);
  const [showPicker,      setShowPicker]      = useState(false);
  const [noChildrenYet,   setNoChildrenYet]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stories,          setStories]          = useState<StoryLibraryItem[]>([]);
  const [slots,            setSlots]            = useState<StorySlot[]>([]);
  const [popularStories,   setPopularStories]   = useState<PopularStory[]>([]);
  const [level,            setLevel]            = useState(1);
  const [totalStars,       setTotalStars]       = useState(0);
  const [weekStreak,         setWeekStreak]         = useState<boolean[]>([false,false,false,false,false,false,false]);
  const [communityCreations, setCommunityCreations] = useState<Array<{ id: string; imageUrl: string; childName: string; type: string }>>([]);
  const [achievements,       setAchievements]       = useState<ChildAchievement[]>([]);
  const [consecutiveStreak,  setConsecutiveStreak]  = useState(0);
  const [favorites,          setFavorites]          = useState<Set<string>>(new Set());
  const [cosmetics,          setCosmetics]          = useState<ChildCosmetics>({ nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null });

  useEffect(() => { setMounted(true); void init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/loginpage"); return; }
    await ensureParentRow();
    const list = await getChildren();
    setChildren(list);
    if (list.length === 0) { router.replace("/onboarding"); return; }
    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const saved   = list.find(c => c.id === savedId);
    if (saved) await select(saved, list);
    else       { setShowPicker(true); setLoading(false); }
  }

  async function select(child: Child, list?: Child[]) {
    setActiveChild(child);
    setShowPicker(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_CHILD_KEY, child.id);
      // Favorites
      try {
        const raw = localStorage.getItem(`nimi_favs_${child.id}`);
        setFavorites(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
      } catch { setFavorites(new Set()); }
      // Daily claim — check DB
    }
    setLanguage(child.language);
    if (list) setChildren(list);
    const [lib, lvl, stars, streak, ach, consStreak, popular, cos] = await Promise.all([
      getStoryLibrary(child.id, child.language),
      getCurrentLevel(child.id, child.language),
      getTotalStars(child.id, child.language),
      getWeekStreak(child.id, child.language),
      getChildAchievements(child.id),
      getConsecutiveStreak(child.id, child.language),
      getPopularStories(),
      getChildCosmetics(child.id),
    ]);
    setStories(lib);
    setLevel(lvl);
    setTotalStars(stars);
    setWeekStreak(streak);
    setAchievements(ach);
    setConsecutiveStreak(consStreak);
    setPopularStories(popular);
    setCosmetics(cos);
    const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
    if (cur) setSlots(await getStorySlots(child.id, cur.sid, child.language));

    // Community creations — best-effort, never blocks
    supabase
      .from("creations")
      .select("id, image_url, child_name, type")
      .eq("is_public", true)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setCommunityCreations(
          data.map((r: any) => ({ id: r.id, imageUrl: r.image_url, childName: r.child_name, type: r.type }))
        );
      });

    setLoading(false);
  }

  async function handleCreated(child: Child) {
    setShowCreateModal(false);
    setNoChildrenYet(false);
    await select(child, [...children, child]);
  }

  if (!mounted) return null;
  if (noChildrenYet) return <AppShell><CreateExplorerProfile onCreated={handleCreated} /></AppShell>;
  if (showPicker) return (
    <>
      <WhoIsPlaying children={children} onSelect={c => select(c)}
        onAddChild={() => { setShowPicker(false); setShowCreateModal(true); }} />
      {showCreateModal && (
        <CreateChildModal onCreated={handleCreated} onClose={() => { setShowCreateModal(false); setShowPicker(true); }} />
      )}
    </>
  );

  /* ─── Derived ──────────────────────────────────────────────────────────── */
  const curStory   = stories.find(s => s.unlocked && !s.complete) ?? stories[0];
  const doneSlots  = slots.filter(s => s.completed).length;
  const totalSlots = slots.length;
  const pct        = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;
  const xp         = totalStars * 10;
  const lvlIdx     = Math.min(level - 1, LEVELS.length - 1);
  const levelInfo  = LEVELS[lvlIdx];
  const prevMax    = lvlIdx > 0 ? LEVELS[lvlIdx - 1].maxXp : 0;
  const xpIn       = Math.max(0, xp - prevMax);
  const xpNeeded   = levelInfo.maxXp - prevMax;
  const xpPct      = Math.min(100, Math.round((xpIn / xpNeeded) * 100));
  // 0 = Mon … 6 = Sun, matching the weekStreak array order
  const todayIdx  = (new Date().getDay() + 6) % 7;

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <AppShell>
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <MagicLoader variant="home" fullPage={false} />
        </div>
      ) : (
        <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #ecfdf5 0%, #f4fef6 8%, #f9fafb 20%, #ffffff 36%)" }}>

          {/* ════════════════════════════════ HERO ══════════════════════════ */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="relative">

            {/* ═══════════════════════ HERO: WORLD STAGE ═══════════════════════ */}
            <div className="relative overflow-hidden" style={{ minHeight: 460 }}>

              {/* ── Layer 1: Bright daytime sky → lush ground ── */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(180deg, #0ea5e9 0%, #38bdf8 25%, #7dd3fc 50%, #d1fae5 72%, #4ade80 88%, #22c55e 100%)"
              }} />
              {/* Warm sun glow high up */}
              <div className="absolute inset-x-0 top-0 h-[45%] pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 55% at 50% 0%, rgba(254,240,138,0.30) 0%, transparent 70%)" }} />

              {/* ── Sky decorations: clouds, stars, birds ── */}
              {/* Clouds */}
              <motion.div className="absolute top-[6%] left-[18%] text-[36px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, 18, 0], y: [0, -4, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.div>
              <motion.div className="absolute top-[3%] left-[52%] text-[28px] pointer-events-none select-none leading-none opacity-70"
                animate={{ x: [0, -14, 0], y: [0, -3, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>☁️</motion.div>
              <motion.div className="absolute top-[8%] right-[20%] text-[32px] pointer-events-none select-none leading-none opacity-75"
                animate={{ x: [0, 12, 0], y: [0, -5, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>⛅</motion.div>
              {/* Stars in sky */}
              <motion.div className="absolute top-[4%] left-[28%] text-[20px] pointer-events-none select-none leading-none"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>⭐</motion.div>
              <motion.div className="absolute top-[2%] right-[30%] text-[16px] pointer-events-none select-none leading-none"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}>✨</motion.div>
              <motion.div className="absolute top-[10%] left-[42%] text-[14px] pointer-events-none select-none leading-none"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>⭐</motion.div>
              {/* Birds flying */}
              <motion.div className="absolute top-[12%] left-[32%] text-[20px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, 30, 60, 90], y: [0, -6, 2, -4], opacity: [0, 0.8, 0.8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}>🐦</motion.div>
              <motion.div className="absolute top-[18%] right-[35%] text-[18px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, -25, -50, -75], y: [0, -5, 3, -3], opacity: [0, 0.8, 0.8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>🦅</motion.div>
              {/* Butterflies near flowers */}
              <motion.div className="absolute bottom-[22%] left-[18%] text-[22px] pointer-events-none select-none leading-none opacity-85"
                animate={{ x: [0, 12, -8, 0], y: [0, -8, -14, 0], rotate: [0, 15, -10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>🦋</motion.div>
              <motion.div className="absolute bottom-[20%] right-[18%] text-[20px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, -10, 8, 0], y: [0, -10, -6, 0], rotate: [0, -12, 8, 0] }}
                transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}>🦋</motion.div>
              {/* Flowers near ground */}
              <motion.div className="absolute bottom-[14%] left-[22%] text-[18px] pointer-events-none select-none leading-none opacity-80"
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>🌸</motion.div>
              <motion.div className="absolute bottom-[12%] right-[22%] text-[20px] pointer-events-none select-none leading-none opacity-80"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.12, 1] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>🌺</motion.div>
              <motion.div className="absolute bottom-[16%] left-[28%] text-[16px] pointer-events-none select-none leading-none opacity-70"
                animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>🌼</motion.div>
              <motion.div className="absolute bottom-[13%] right-[28%] text-[16px] pointer-events-none select-none leading-none opacity-70"
                animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>🌷</motion.div>

              {/* ── Layer 2: World environment assets ── */}
              {/* Left forest edge */}
              <img src="/themes/default/world/tree-2.png" alt="" aria-hidden
                className="absolute bottom-0 left-0 h-[230px] w-auto object-contain pointer-events-none select-none" />
              <img src="/themes/default/world/tree-1.png" alt="" aria-hidden
                className="absolute bottom-0 left-[7%] h-[175px] w-auto object-contain pointer-events-none select-none opacity-85" />
              <img src="/themes/default/world/birdhouse.png" alt="" aria-hidden
                className="absolute bottom-14 left-[14%] h-[90px] w-auto object-contain pointer-events-none select-none opacity-90" />
              {/* Right forest edge */}
              <img src="/themes/default/world/greenhouse.png" alt="" aria-hidden
                className="absolute bottom-0 right-0 h-[210px] w-auto object-contain pointer-events-none select-none" />
              <img src="/themes/default/world/tree-4.png" alt="" aria-hidden
                className="absolute bottom-0 right-[7%] h-[170px] w-auto object-contain pointer-events-none select-none opacity-85" />
              <img src="/themes/default/world/tree-3.png" alt="" aria-hidden
                className="absolute bottom-0 right-[15%] h-[145px] w-auto object-contain pointer-events-none select-none opacity-75" />
              {/* Ground flowers + stones */}
              <img src="/themes/default/world/flower-garden.png" alt="" aria-hidden
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[65px] w-auto object-contain pointer-events-none select-none opacity-80" />
              <img src="/themes/default/world/stepping-stones.png" alt="" aria-hidden
                className="absolute bottom-0 left-[38%] h-[42px] w-auto object-contain pointer-events-none select-none opacity-60" />

              {/* ── Corner art frames ── */}
              <img src="/themes/default/decorations/corner-tl.png" alt="" aria-hidden
                className="absolute top-0 left-0 w-[110px] pointer-events-none select-none opacity-55" />
              <img src="/themes/default/decorations/corner-tr.png" alt="" aria-hidden
                className="absolute top-0 right-0 w-[110px] pointer-events-none select-none opacity-55" />

              {/* ── Floating magical orbs ── */}
              <motion.img src="/themes/default/decorations/floating-1.png" alt="" aria-hidden
                className="absolute top-10 left-[36%] w-12 pointer-events-none select-none"
                animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }} />
              <motion.img src="/themes/default/decorations/floating-2.png" alt="" aria-hidden
                className="absolute top-14 right-[36%] w-10 pointer-events-none select-none"
                animate={{ y: [0, -8, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} />
              <motion.img src="/themes/default/decorations/floating-3.png" alt="" aria-hidden
                className="absolute top-7 left-1/2 -translate-x-1/2 w-9 pointer-events-none select-none"
                animate={{ y: [0, -13, 0] }}
                transition={{ duration: 5.1, repeat: Infinity, ease: "easeInOut", delay: 1.4 }} />

              {/* ── Confetti — kept inside the safe center band [33%–67%] ── */}
              <div className="absolute top-6  left-[34%]  w-2   h-6  bg-rose-400    rounded-sm rotate-12  opacity-90 pointer-events-none" />
              <div className="absolute top-4  left-[40%]  w-1.5 h-5  bg-yellow-300  rounded-sm -rotate-8  opacity-85 pointer-events-none" />
              <div className="absolute top-10 left-[46%]  w-3   h-3  bg-emerald-300 rounded-full           opacity-85 pointer-events-none" />
              <div className="absolute top-5  right-[34%] w-2   h-7  bg-pink-300    rounded-sm rotate-18  opacity-85 pointer-events-none" />
              <div className="absolute top-9  right-[40%] w-3   h-3  bg-orange-300  rounded-full           opacity-80 pointer-events-none" />
              <div className="absolute top-7  right-[46%] w-1.5 h-5  bg-cyan-300    rounded-sm -rotate-10 opacity-85 pointer-events-none" />
              <img src="/themes/default/decorations/sparkle.png" alt="" aria-hidden
                className="absolute top-5 left-[38%] w-8 opacity-80 pointer-events-none select-none" />
              <img src="/themes/default/decorations/sparkle.png" alt="" aria-hidden
                className="absolute top-8 right-[38%] w-6 opacity-70 pointer-events-none select-none" />

              {/* ══════════════════════════════════════════════════════════════
                   Layer 3 — CONTENT (3 columns, items aligned to bottom)
              ══════════════════════════════════════════════════════════════ */}
              <div className="relative z-10 flex flex-col items-center justify-end px-4 sm:px-6 pb-14 sm:pb-18 pt-5 sm:pt-8 max-w-[900px] mx-auto min-h-[420px]">

                {/* ── LEFT: Continue Your Story card ─────────────────────── */}
                <motion.div variants={up}
                  className="hidden">
                  {curStory ? (
                    <div className="relative rounded-3xl p-5 overflow-hidden"
                      style={{
                        background: "linear-gradient(150deg,#34d399 0%,#10b981 28%,#059669 60%,#047857 100%)",
                        boxShadow: "0 24px 64px rgba(5,150,105,0.50), 0 2px 0 rgba(255,255,255,0.18) inset",
                        border: "1.5px solid rgba(255,255,255,0.18)",
                      }}>

                      {/* Top-right glow blob */}
                      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }} />

                      {/* Stars */}
                      <motion.span className="absolute top-3 right-4 text-[26px] pointer-events-none select-none drop-shadow-lg"
                        animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>⭐</motion.span>
                      <motion.span className="absolute top-7 right-[52px] text-[16px] pointer-events-none select-none opacity-80"
                        animate={{ y: [0, -4, 0], scale: [1, 1.3, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>✨</motion.span>

                      <p className="font-baloo font-black text-white text-[16px] mb-4 pr-16 drop-shadow">
                        Continue Your Story
                      </p>

                      {/* Cover + info */}
                      <div className="flex gap-3 mb-4">
                        <div className="relative w-[110px] h-[110px] rounded-2xl overflow-hidden shrink-0"
                          style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.3), 0 8px 24px rgba(0,0,0,0.35)" }}>
                          <img src={curStory.cover_url ? getStorageUrl(curStory.cover_url) : "/current-story.png"}
                            alt={curStory.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl">
                              <Play className="w-4 h-4 fill-violet-600 text-violet-600 ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                          <p className="font-baloo font-black text-white text-[17px] leading-tight line-clamp-2 drop-shadow">
                            {curStory.title}
                          </p>
                          <p className="font-nunito text-white/65 text-[12px]">
                            Page {doneSlots} of {totalSlots || "?"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-3 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.18)" }}>
                              <motion.div className="h-full rounded-full"
                                style={{ background: "linear-gradient(90deg, var(--ds-brand-soft), var(--ds-brand-primary))" }}
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }} />
                            </div>
                            <span className="font-baloo font-black text-white text-[13px] shrink-0">{pct}%</span>
                          </div>
                        </div>
                      </div>

                      <Link href={`/stories/${curStory.slug}`}
                        className="flex items-center justify-center gap-2 w-full font-baloo font-black text-amber-900 text-[16px] py-3.5 leaf transition-all hover:-translate-y-0.5 active:scale-95"
                        style={{
                          background: "linear-gradient(135deg,#fcd34d,#f59e0b)",
                          boxShadow: "0 4px 20px rgba(245,158,11,0.5), 0 1px 0 rgba(255,255,255,0.4) inset",
                        }}>
                        Continue My Journey
                        <Play className="w-[15px] h-[15px] fill-amber-900 stroke-0" />
                      </Link>
                    </div>
                  ) : (
                    <div className="relative rounded-3xl p-5 shadow-2xl overflow-hidden"
                      style={{ background: "linear-gradient(150deg,#34d399 0%,#059669 45%,#047857 100%)" }}>
                      <motion.span className="absolute top-3 right-5 text-2xl pointer-events-none select-none"
                        animate={{ y: [0, -5, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>🔭</motion.span>
                      <p className="font-baloo font-black text-white text-[17px] mb-1 pr-10">Your story awaits!</p>
                      <p className="font-nunito text-white/80 text-[13px] mb-5">Zilo found some great ones at the Library.</p>
                      <Link href="/stories"
                        className="flex items-center justify-center gap-2 w-full font-baloo font-black text-amber-900 text-[16px] py-3.5 leaf shadow-xl transition-all hover:-translate-y-0.5 active:scale-95"
                        style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
                        Start Your Journey <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </motion.div>

                {/* ── CENTER: Greeting glass card + Characters ─────────── */}
                <div className="w-full flex flex-col items-center justify-end gap-0">

                  {/* Greeting */}
                  <motion.div variants={up}
                    className="mb-4 px-6 py-3.5 rounded-2xl border border-white/50 shadow-2xl text-center"
                    style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(18px)" }}>
                    <h1 className="font-baloo font-black text-sky-900"
                      style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", lineHeight: 1.1 }}>
                      Hi there, {activeChild?.name ?? "Explorer"}! 👋
                    </h1>
                    {cosmetics.title_badge && SHOP_ITEM_MAP[cosmetics.title_badge] && (
                      <span className={`inline-flex items-center gap-1.5 text-[13px] font-black px-3 py-1 rounded-full mt-1 mb-0.5 shadow-sm ${SHOP_ITEM_MAP[cosmetics.title_badge].titleColor ?? "bg-gray-100 text-gray-600"}`}>
                        {SHOP_ITEM_MAP[cosmetics.title_badge].emoji} {t(SHOP_ITEM_MAP[cosmetics.title_badge].nameKey)}
                      </span>
                    )}
                    <p className="font-nunito font-bold text-sky-800 text-[14px] mt-0.5">
                      Ready for today&apos;s{" "}
                      <span className="font-extrabold text-emerald-600">story adventure?</span>
                    </p>
                    {/* Streak + Stars strip */}
                    <div className="flex items-center justify-center gap-4 mt-2.5">
                      <span className="flex items-center gap-1.5 font-baloo font-black text-orange-500 text-[13px]">
                        <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
                        {consecutiveStreak} day streak
                      </span>
                      <span className="w-px h-4 bg-sky-200" />
                      <span className="flex items-center gap-1.5 font-baloo font-black text-amber-500 text-[13px]">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {totalStars} stars
                      </span>
                    </div>
                  </motion.div>

                  {/* Characters on their world stage */}
                  <motion.div variants={up} className="relative flex items-end justify-center">
                    {/* Stage spotlight — warm glow rising from ground under characters */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] sm:w-[440px] h-[110px] pointer-events-none"
                      style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(251,191,36,0.30) 0%, rgba(52,211,153,0.14) 50%, transparent 75%)" }} />

                    {/* NIMI with outfit badge */}
                    <div className="relative">
                      <motion.img src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi"
                        className="h-[185px] sm:h-[225px] lg:h-[265px] w-auto object-contain drop-shadow-2xl select-none"
                        animate={{ y: [0, -9, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {cosmetics.nimi_outfit && SHOP_ITEM_MAP[cosmetics.nimi_outfit] && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute bottom-6 right-0 text-4xl drop-shadow-xl leading-none pointer-events-none select-none"
                          title={t(SHOP_ITEM_MAP[cosmetics.nimi_outfit].nameKey)}
                        >
                          {SHOP_ITEM_MAP[cosmetics.nimi_outfit].emoji}
                        </motion.span>
                      )}
                    </div>

                    {/* PIKO with outfit badge */}
                    <div className="relative mx-2">
                      <motion.img src={`/themes/${themeId}/characters/piko.png`} alt="Piko"
                        className="h-[165px] sm:h-[200px] lg:h-[235px] w-auto object-contain drop-shadow-2xl select-none"
                        animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {cosmetics.piko_outfit && SHOP_ITEM_MAP[cosmetics.piko_outfit] && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute bottom-6 right-0 text-4xl drop-shadow-xl leading-none pointer-events-none select-none"
                          title={t(SHOP_ITEM_MAP[cosmetics.piko_outfit].nameKey)}
                        >
                          {SHOP_ITEM_MAP[cosmetics.piko_outfit].emoji}
                        </motion.span>
                      )}
                    </div>

                    <motion.img src={`/themes/${themeId}/characters/zilo.png`} alt="Zilo"
                      className="h-[175px] sm:h-[215px] lg:h-[250px] w-auto object-contain drop-shadow-2xl select-none"
                      animate={{ y: [0, -8, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </motion.div>
                </div>

                {/* ── RIGHT: Trust + Streak + Level ───────────────────── */}
                <motion.div variants={up}
                  className="hidden">

                  {/* Latest Achievement — only shown when the child has at least one badge */}
                  {achievements.length > 0 && (() => {
                    const latest = achievements[achievements.length - 1];
                    const badge  = parseBadgeSlug(latest.slug);
                    const today  = new Date().toDateString();
                    return (
                      <div className="px-4 py-3.5 rounded-2xl border border-white/50 shadow-2xl"
                        style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(18px)" }}>
                        <p className="font-baloo font-black text-sky-700 text-[11px] uppercase tracking-widest mb-2.5">Latest Badge</p>
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[28px] shadow-lg"
                              style={{ background: `linear-gradient(145deg,${badge.from},${badge.to})` }}>
                              {badge.emoji}
                            </div>
                            <motion.div
                              className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-md"
                              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
                              <Star className="w-2.5 h-2.5 fill-white text-white" />
                            </motion.div>
                          </div>
                          <div>
                            <p className="font-baloo font-black text-amber-600 text-[15px] leading-tight">{badge.label}</p>
                            <p className="font-nunito font-bold text-emerald-600 text-[11px]">
                              {new Date(latest.earned_at).toDateString() === today ? "Earned today 🎉" : "Recently earned ✨"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Streak card — frosted */}
                  <div className="rounded-2xl p-4 shadow-xl border border-amber-200/60"
                    style={{ background: "rgba(254,243,199,0.92)", backdropFilter: "blur(14px)" }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                      <span className="font-baloo font-black text-orange-600 text-[17px]">{consecutiveStreak} Day Streak!</span>
                    </div>
                    <p className="font-nunito font-bold text-amber-700 text-[12px] mb-3">
                      {consecutiveStreak >= 7 ? "Unstoppable! 🏆" : consecutiveStreak >= 3 ? "You're on fire! 🔥" : consecutiveStreak > 0 ? "Keep it up! 💪" : "Start your streak! 🌟"}
                    </p>
                    <div className="flex justify-between">
                      {WEEK_DAYS.map((day, i) => {
                        const done    = weekStreak[i];
                        const isToday = i === todayIdx;
                        const future  = i > todayIdx;
                        return (
                          <div key={day} className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
                              done    ? "bg-emerald-500 shadow-emerald-200" :
                              isToday ? "bg-amber-100 border-2 border-amber-400" :
                              future  ? "bg-amber-50 border border-amber-100 opacity-40" :
                                        "bg-amber-100/60 border border-amber-200"
                            }`}>
                              {done    ? <Check className="w-4 h-4 text-white" strokeWidth={2.5} /> :
                               isToday ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-300" /> :
                                         null}
                            </div>
                            <span className={`font-nunito font-bold text-[9px] ${
                              done ? "text-emerald-700" : isToday ? "text-amber-600 font-black" : "text-amber-400"
                            }`}>{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </motion.div>

              </div>{/* end 3-column */}

              {/* ── Wave bottom transition ─────────────────────────────────── */}
              <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ lineHeight: 0 }}>
                <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg"
                  className="w-full block" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveGradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d1fae5" stopOpacity="0" />
                      <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.55" />
                    </linearGradient>
                  </defs>
                  {/* Wave 1 — deep back, airy */}
                  <path
                    d="M0,38 C240,76 480,8 720,42 C960,78 1200,12 1440,46 L1440,110 L0,110 Z"
                    fill="rgba(209,250,229,0.22)" />
                  {/* Wave 2 — mid layer, gradient */}
                  <path
                    d="M0,57 C180,92 360,22 540,58 C720,94 900,20 1080,55 C1260,90 1380,34 1440,58 L1440,110 L0,110 Z"
                    fill="url(#waveGradA)" />
                  {/* Wave 3 — front, solid mint */}
                  <path
                    d="M0,76 C200,46 400,104 600,74 C800,44 1000,100 1200,72 C1320,56 1400,82 1440,76 L1440,110 L0,110 Z"
                    fill="#d1fae5" />
                </svg>
              </div>

            </div>{/* end hero card */}
          </motion.div>

          {/* ── Campus Welcome Strip ──────────────────────────────────────── */}
          <div className="relative z-10 -mt-5 px-4 sm:px-6 pb-2 max-w-[1400px] mx-auto">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/85 backdrop-blur-sm rounded-2xl shadow-sm border border-emerald-100 w-fit">
              <motion.img
                src={assets.nimiCircle}
                alt="Nimi"
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-emerald-200"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="font-baloo font-black text-emerald-700 text-[12px] sm:text-[13px]">The Learning Campus is open!</span>
              <span className="font-nunito text-emerald-500 text-[11px] hidden sm:inline">
                • {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* ════════════════════════════ BELOW HERO ════════════════════════ */}
          <div className="relative">

            {/* ── Campus walkway — subtle dashed thread through all zones ── */}
            <div
              className="absolute inset-y-0 pointer-events-none select-none hidden xl:block"
              aria-hidden
              style={{
                left: 22,
                width: 2,
                background: "repeating-linear-gradient(to bottom, #86efac 0px, #86efac 5px, transparent 5px, transparent 17px)",
                opacity: 0.14,
              }}
            />

            {/* ── Nature elements scattered across below-hero ── */}
            {NATURE_ELEMENTS.map((el, i) => (
              <motion.div key={`ne-${i}`}
                className="absolute pointer-events-none z-0 select-none leading-none"
                style={{ top: el.top, left: el.left, fontSize: el.size, opacity: 0.22 }}
                animate={{
                  y: [0, -12, 0],
                  rotate: el.spin ? [0, 14, -10, 0] : [0, 0, 0],
                  scale: [1, 1.08, 1],
                }}
                transition={{ duration: el.dur, repeat: Infinity, ease: "easeInOut", delay: el.delay }}>
                {el.emoji}
              </motion.div>
            ))}

            {/* ── Main flex grid ──────────────────────────────────────────── */}
            <div className="relative z-10 flex flex-col xl:flex-row gap-6 px-4 lg:px-6 py-6 max-w-[1400px] mx-auto">

              {/* ══ MAIN COLUMN ══════════════════════════════════════════════ */}
              <main className="flex-1 min-w-0 space-y-10">

                {/* ── YOUR ADVENTURE ─────────────────────────────────────── */}
                <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="relative">
                  <motion.div variants={up} className="leaf-lg overflow-hidden border border-white/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">

                    {/* Header band */}
                    <div className="relative px-5 py-4 overflow-hidden"
                      style={{ background: curStory?.complete
                        ? "linear-gradient(135deg,#fbbf24 0%,#f59e0b 55%,#f97316 100%)"
                        : "linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%)" }}>
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                      <motion.span className="absolute top-3 right-5 text-2xl select-none pointer-events-none"
                        animate={{ y: [0,-5,0], rotate: [0,10,0] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
                        {curStory?.complete ? "🏆" : "⭐"}
                      </motion.span>
                      <p className="font-nunito text-white/65 text-[10px] uppercase tracking-widest mb-0.5">📖 Your Adventure</p>
                      <h2 className="font-baloo font-black text-white text-[22px] sm:text-[24px] leading-tight">
                        {curStory
                          ? curStory.complete ? "Adventure Complete! 🎉" : "Continue the Journey!"
                          : "Your Adventure Awaits!"}
                      </h2>
                    </div>

                    {/* Content */}
                    {curStory ? (
                      <div className="flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white">

                        {/* Story cover */}
                        <Link href={`/stories/${curStory.slug}`}
                          className="relative rounded-2xl overflow-hidden shrink-0 transition-transform hover:scale-[1.03] active:scale-[0.97]"
                          style={{
                            width: 130, height: 130,
                            boxShadow: "0 0 0 3px rgba(5,150,105,0.22), 0 8px 24px rgba(0,0,0,0.26)",
                          }}>
                          {curStory.cover_url
                            ? <img src={getStorageUrl(curStory.cover_url)} alt={curStory.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-5xl">
                                {curStory.theme_emoji ?? "📖"}
                              </div>
                          }
                          <div className="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/25 transition">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl">
                              <Play className="w-4 h-4 fill-emerald-600 text-emerald-600 ml-0.5" />
                            </div>
                          </div>
                        </Link>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="font-nunito font-bold text-emerald-600 text-[11px] uppercase tracking-widest mb-1">
                              {curStory.complete ? "✅ Completed!" : `Mission ${doneSlots} of ${totalSlots || 6}`}
                            </p>
                            <h3 className="font-baloo font-black text-gray-800 text-[19px] sm:text-[21px] leading-tight line-clamp-2">
                              {curStory.title}
                            </h3>
                          </div>

                          {/* Mission dots */}
                          {!curStory.complete && slots.length > 0 && (
                            <div className="flex items-center gap-2 my-2 flex-wrap">
                              {slots.map((slot, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black shadow-sm transition-all ${
                                  slot.completed
                                    ? "bg-emerald-500 text-white shadow-emerald-200"
                                    : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                                }`}>
                                  {slot.completed ? "⭐" : i + 1}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Progress bar */}
                          {!curStory.complete && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-nunito font-bold text-gray-400 text-[11px]">Progress</span>
                                <span className="font-baloo font-black text-emerald-600 text-[12px]">{pct}%</span>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div className="h-full rounded-full"
                                  style={{ background: "linear-gradient(90deg,#34d399,#059669)" }}
                                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
                              </div>
                            </div>
                          )}

                          {/* CTA button */}
                          <Link href={`/stories/${curStory.slug}`}
                            className="flex items-center justify-center gap-2 font-baloo font-black text-[15px] sm:text-[16px] py-3 leaf shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
                            style={{
                              background: curStory.complete
                                ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                                : "linear-gradient(135deg,#059669,#047857)",
                              color: curStory.complete ? "#78350f" : "white",
                              boxShadow: curStory.complete
                                ? "0 4px 18px rgba(245,158,11,0.4)"
                                : "0 4px 18px rgba(5,150,105,0.4)",
                            }}>
                            {curStory.complete ? "⭐ View My Certificate" : "Keep Going!"}
                            <Play className="w-4 h-4" fill="currentColor" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 p-8 text-center bg-white">
                        <motion.span className="text-[56px] leading-none select-none"
                          animate={{ y: [0,-8,0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>🔭</motion.span>
                        <div>
                          <p className="font-baloo font-black text-gray-800 text-[20px]">Your story awaits!</p>
                          <p className="font-nunito text-gray-500 text-[14px] mt-1">Zilo found some great adventures at the Library.</p>
                        </div>
                        <Link href="/stories"
                          className="flex items-center gap-2 font-baloo font-black text-white text-[16px] px-8 py-3.5 leaf shadow-xl transition-all hover:-translate-y-0.5 active:scale-95"
                          style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 6px 22px rgba(5,150,105,0.4)" }}>
                          Start Your Journey <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </motion.section>

                {/* ── STORY LIBRARY ─────────────────────────────────────────── */}
                {stories.length > 0 && (
                  <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger} className="relative">
                    <div className="leaf-lg border border-white/80 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/60 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:p-5">
                      <ZoneDecorations zone="library" />
                      <CampusConnector />
                      <motion.div variants={up} className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-[22px] shrink-0 shadow-sm">📚</div>
                          <div>
                            <p className="font-nunito text-[9px] uppercase tracking-widest text-sky-400 leading-none mb-0.5">The Library</p>
                            <h2 className="font-baloo font-black text-[21px] sm:text-[23px] text-gray-800 leading-tight">Story Library</h2>
                          </div>
                        </div>
                        <Link href="/stories" className="flex items-center gap-1 font-nunito font-bold text-sky-500 text-[13px] hover:underline">
                          See all <ChevronRight className="w-4 h-4" />
                        </Link>
                      </motion.div>
                      <motion.div variants={stagger} className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
                        {stories.map((story) => {
                          const isActive = !story.complete && story.unlocked && story.sid === curStory?.sid;
                          const pctDone  = Math.round((story.progress ?? 0) * 100);
                          return (
                            <motion.div key={story.sid} variants={pop} className="shrink-0 w-[155px] sm:w-[172px]">
                              {story.unlocked ? (
                                <Link href={`/stories/${story.slug}`}
                                  className="group block leaf overflow-hidden shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]"
                                  style={{ border: isActive ? "2px solid rgba(5,150,105,0.45)" : "1px solid rgba(219,234,254,0.8)" }}>
                                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
                                    {story.cover_url
                                      ? <img src={getStorageUrl(story.cover_url)} alt={story.title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                      : <div className="w-full h-full flex items-center justify-center text-5xl"
                                          style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}>
                                          {story.theme_emoji ?? "📖"}
                                        </div>
                                    }
                                    {story.complete && (
                                      <div className="absolute inset-0 flex items-end justify-center pb-2 bg-emerald-600/20">
                                        <span className="bg-emerald-500 text-white font-baloo font-black text-[10px] px-3 py-1 rounded-full shadow-md">✓ Complete!</span>
                                      </div>
                                    )}
                                    {isActive && !story.complete && (
                                      <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                                        <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="bg-white px-3 pt-2 pb-3">
                                    <p className="font-baloo font-black text-gray-800 text-[13px] leading-tight line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">
                                      {story.title}
                                    </p>
                                    {pctDone > 0 && !story.complete ? (
                                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all"
                                          style={{ width: `${pctDone}%`, background: "linear-gradient(90deg,#34d399,#059669)" }} />
                                      </div>
                                    ) : story.complete ? (
                                      <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span className="font-nunito font-bold text-emerald-600 text-[11px]">All done!</span>
                                      </div>
                                    ) : (
                                      <span className="font-nunito font-bold text-sky-500 text-[11px]">Start reading →</span>
                                    )}
                                  </div>
                                </Link>
                              ) : (
                                <div className="leaf overflow-hidden border border-gray-100 opacity-55">
                                  <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
                                    {story.cover_url
                                      ? <img src={getStorageUrl(story.cover_url)} alt={story.title}
                                          className="w-full h-full object-cover grayscale" />
                                      : <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-100">
                                          {story.theme_emoji ?? "📖"}
                                        </div>
                                    }
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                        <Lock className="w-5 h-5 text-gray-600" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 px-3 pt-2 pb-3">
                                    <p className="font-baloo font-black text-gray-400 text-[12px] leading-tight line-clamp-2 mb-1">{story.title}</p>
                                    <p className="font-nunito text-gray-400 text-[10px]">Finish the previous story to unlock</p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </div>
                  </motion.section>
                )}

              </main>

              {/* ══ RIGHT PANEL ════════════════════════════════════════════════ */}
              <aside className="flex flex-col gap-5 w-full xl:w-[284px] xl:shrink-0">
                <div className="xl:sticky xl:top-[80px] flex flex-col gap-5">

                  {/* ── Story Journey ───────────────────────────────────────── */}
                  <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                    <div className="relative px-5 pt-5 pb-5 overflow-hidden"
                      style={{ background: curStory?.complete
                        ? "linear-gradient(135deg,#f59e0b 0%,#d97706 55%,#b45309 100%)"
                        : "linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%)" }}>
                      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
                      <div className="flex items-center gap-3">
                        {curStory?.cover_url ? (
                          <img src={getStorageUrl(curStory.cover_url)} alt={curStory.title}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-white/40 shadow-md shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-[22px] shrink-0 shadow-md">
                            {curStory?.theme_emoji ?? "📖"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest mb-0.5">
                            {curStory?.complete ? "Completed! 🎉" : "Your Journey"}
                          </p>
                          <h3 className="font-baloo font-black text-white text-[15px] leading-tight line-clamp-1">
                            {curStory?.title ?? "Start Your Story"}
                          </h3>
                        </div>
                      </div>
                      {curStory && (
                        <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-white rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((curStory.progress ?? 0) * 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }} />
                        </div>
                      )}
                    </div>

                    {/* Mission dots */}
                    <div className="bg-white px-4 py-3">
                      {slots.length > 0 ? (
                        <>
                          <div className="flex gap-1.5 justify-center mb-3">
                            {slots.map((slot, i) => (
                              <motion.div key={slot.slot_key}
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 20 }}
                                className={`flex-1 h-2 rounded-full transition-all ${
                                  slot.completed ? "bg-emerald-500" : "bg-gray-200"
                                }`} />
                            ))}
                          </div>
                          <p className="text-center font-nunito font-semibold text-gray-500 text-[11px] mb-3">
                            {slots.filter(s => s.completed).length}/{slots.length} missions complete
                          </p>
                        </>
                      ) : (
                        <p className="text-center font-nunito text-gray-400 text-[12px] py-2 mb-2">
                          Choose a story to begin your adventure!
                        </p>
                      )}

                      {curStory ? (
                        <Link href={`/stories/${curStory.slug}`}
                          className="flex items-center justify-center gap-2 w-full font-baloo font-black text-white text-[13px] py-3 leaf transition-all hover:-translate-y-0.5 active:scale-95"
                          style={{
                            background: curStory.complete
                              ? "linear-gradient(135deg,#f59e0b,#d97706)"
                              : "linear-gradient(135deg,#059669,#10b981)",
                            boxShadow: curStory.complete
                              ? "0 4px 14px rgba(245,158,11,0.3)"
                              : "0 4px 14px rgba(5,150,105,0.3)",
                          }}>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          {curStory.complete ? "See Certificate 🏆" : "Continue Story"}
                        </Link>
                      ) : (
                        <Link href="/stories"
                          className="flex items-center justify-center gap-2 w-full font-baloo font-black text-white text-[13px] py-3 leaf transition-all hover:-translate-y-0.5 active:scale-95"
                          style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 4px 14px rgba(5,150,105,0.3)" }}>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          Start First Story
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* ── Week Streak ─────────────────────────────────────────── */}
                  <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                    <div className="relative px-5 pt-4 pb-3 overflow-hidden"
                      style={{ background: "linear-gradient(135deg,#f97316 0%,#ea580c 60%,#dc2626 100%)" }}>
                      <div className="absolute -top-6 -right-6 w-22 h-22 rounded-full bg-white/10 pointer-events-none" />
                      <div className="flex items-center gap-3">
                        <motion.span className="text-[28px] leading-none"
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}>🔥</motion.span>
                        <div>
                          <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest leading-none mb-0.5">Learning Streak</p>
                          <p className="font-baloo font-black text-white text-[20px] leading-tight">
                            {consecutiveStreak} {consecutiveStreak === 1 ? "day" : "days"}
                          </p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span className="font-baloo font-black text-white text-[12px]">{totalStars}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <div className="flex justify-between gap-1">
                        {["M","T","W","T","F","S","S"].map((day, i) => {
                          const todayIdx = new Date().getDay();
                          const adjustedToday = todayIdx === 0 ? 6 : todayIdx - 1;
                          const isFuture = i > adjustedToday;
                          const done = weekStreak[i] ?? false;
                          const isToday = i === adjustedToday;
                          return (
                            <div key={i} className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-full aspect-square max-w-[32px] rounded-full flex items-center justify-center text-[11px] transition-all ${
                                done ? "bg-orange-500 shadow-md shadow-orange-200" :
                                isToday ? "bg-orange-100 border-2 border-orange-300" :
                                isFuture ? "bg-gray-100" : "bg-gray-100"
                              }`}>
                                {done ? "🔥" : isToday ? "·" : ""}
                              </div>
                              <span className={`font-nunito font-bold text-[9px] ${isToday ? "text-orange-500" : "text-gray-400"}`}>{day}</span>
                            </div>
                          );
                        })}
                      </div>
                      {consecutiveStreak === 0 && (
                        <p className="text-center font-nunito text-gray-400 text-[11px] mt-2.5">
                          Complete a story activity to start your streak! 🔥
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── My Achievements ─────────────────────────────────────── */}
                  <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                    <div className="relative flex items-center justify-between px-5 pt-5 pb-3 overflow-hidden"
                      style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b,#f97316)" }}>
                      <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
                      <div>
                        <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest mb-0.5">Trophy Room</p>
                        <h3 className="font-baloo font-black text-white text-[18px]">My Treasures</h3>
                      </div>
                      <Link href="/user-profile" className="flex items-center gap-0.5 font-nunito font-bold text-white/80 text-[11px] hover:text-white">
                        All <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    {/* Wave between header and body */}
                    <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="w-full h-4 block"
                      style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b,#f97316)" }}>
                      <path d="M0,8 C50,0 100,16 150,8 C200,0 250,16 300,8 L300,16 L0,16 Z" fill="#fffbeb" />
                    </svg>
                    <div className="bg-gradient-to-b from-amber-50 to-orange-50 px-4 py-4">
                      <div className="flex justify-around gap-2">
                        {Array.from({ length: 3 }).map((_, i) => {
                          const ach    = achievements[achievements.length - 1 - i];
                          const badge  = ach ? parseBadgeSlug(ach.slug) : LOCKED_BADGE_PLACEHOLDERS[i] ?? LOCKED_BADGE_PLACEHOLDERS[0];
                          const earned = !!ach;
                          return (
                            <div key={i} className={`flex flex-col items-center gap-2 flex-1 transition-all ${earned ? "" : "opacity-40 grayscale"}`}>
                              <motion.div
                                className="w-[78px] h-[78px] rounded-2xl flex items-center justify-center text-[40px] shadow-lg"
                                style={{ background: `linear-gradient(145deg,${badge.from},${badge.to})`, boxShadow: earned ? `0 6px 24px ${badge.glow}55` : undefined }}
                                animate={earned ? { scale: [1, 1.04, 1] } : undefined}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                                {badge.emoji}
                              </motion.div>
                              {earned
                                ? <span className="bg-emerald-100 text-emerald-700 font-nunito font-black text-[9px] px-2 py-0.5 rounded-full">★ Earned</span>
                                : <span className="bg-gray-100 text-gray-400 font-nunito font-black text-[9px] px-2 py-0.5 rounded-full">🔒 Locked</span>
                              }
                              <p className="font-nunito font-bold text-gray-600 text-[10px] text-center leading-tight">{badge.label}</p>
                            </div>
                          );
                        })}
                      </div>
                      {/* Trophy Room ambient atmosphere */}
                      <div className="flex justify-center gap-4 mt-3 opacity-20 pointer-events-none select-none" aria-hidden>
                        <motion.span className="text-[13px]" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>🎀</motion.span>
                        <motion.span className="text-[15px]" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>⭐</motion.span>
                        <motion.span className="text-[13px]" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.0 }}>✨</motion.span>
                      </div>
                    </div>
                  </div>

                  {/* ── Community Creations ─────────────────────────────────── */}
                  {true && (
                    <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                      <div className="relative flex items-center justify-between px-5 pt-5 pb-3 overflow-hidden"
                        style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488,#0891b2)" }}>
                        <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
                        <div>
                          <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest mb-0.5">Community Square</p>
                          <h3 className="font-baloo font-black text-white text-[18px]">Community Creations</h3>
                        </div>
                        <Link href="/community" className="flex items-center gap-0.5 font-nunito font-bold text-white/80 text-[11px] hover:text-white">
                          All <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      {/* Wave between header and body */}
                      <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="w-full h-4 block"
                        style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488,#0891b2)" }}>
                        <path d="M0,8 C50,0 100,16 150,8 C200,0 250,16 300,8 L300,16 L0,16 Z" fill="#f0fdf4" />
                      </svg>
                      <div className="bg-gradient-to-b from-teal-50 to-cyan-50 p-4 relative">
                        {communityCreations.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {communityCreations.map((c) => (
                              <Link key={c.id} href="/community"
                                className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                                <img src={getStorageUrl(c.imageUrl)} alt={c.childName}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-1 right-1 text-[10px]">🎨</div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-5 px-3 text-center">
                            <motion.span className="text-[38px] leading-none"
                              animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>🔭</motion.span>
                            <p className="font-baloo font-black text-teal-700 text-[13px] leading-tight mt-1">Be the first explorer!</p>
                            <p className="font-nunito text-teal-500 text-[11px] leading-relaxed">Share your masterpiece and inspire the whole campus.</p>
                            <Link href="/community"
                              className="mt-2 font-baloo font-black text-white text-[12px] px-5 py-2 leaf transition-all hover:-translate-y-0.5 active:scale-95"
                              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)", boxShadow: "0 4px 14px rgba(20,184,166,0.35)" }}>
                              Visit Community Square
                            </Link>
                          </div>
                        )}
                        {/* Community Square ambient atmosphere */}
                        <div className="flex justify-center gap-4 mt-3 opacity-20 pointer-events-none select-none" aria-hidden>
                          <motion.span className="text-[13px]" animate={{ y: [0, -4, 0] }} transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut" }}>🎈</motion.span>
                          <motion.span className="text-[13px]" animate={{ x: [0, 5, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}>🐦</motion.span>
                          <motion.span className="text-[13px]" animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>🌳</motion.span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Masterpiece Studio ──────────────────────────────── */}
                  <div className="overflow-hidden leaf-lg border border-white/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                    <div className="relative flex items-center justify-between px-5 pt-5 pb-3 overflow-hidden"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#d97706,#92400e)" }}>
                      <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
                      <div>
                        <p className="font-nunito text-white/60 text-[9px] uppercase tracking-widest mb-0.5">Story Forge</p>
                        <h3 className="font-baloo font-black text-white text-[18px]">My Masterpiece</h3>
                      </div>
                      <Link href="/masterpiece" className="flex items-center gap-0.5 font-nunito font-bold text-white/80 text-[11px] hover:text-white">
                        Create <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="w-full h-4 block"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#d97706,#92400e)" }}>
                      <path d="M0,8 C50,0 100,16 150,8 C200,0 250,16 300,8 L300,16 L0,16 Z" fill="#fffbeb" />
                    </svg>
                    <div className="bg-gradient-to-b from-amber-50 to-yellow-50 p-4 relative flex flex-col items-center gap-3 text-center">
                      <motion.span className="text-[44px] leading-none"
                        animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
                        👑
                      </motion.span>
                      <div>
                        <p className="font-baloo font-black text-amber-800 text-[13px] leading-tight">Become the Hero!</p>
                        <p className="font-nunito text-amber-600 text-[11px] leading-relaxed mt-0.5">Create a personalized story book starring your child.</p>
                      </div>
                      <Link href="/masterpiece"
                        className="font-baloo font-black text-white text-[12px] px-5 py-2 leaf transition-all hover:-translate-y-0.5 active:scale-95"
                        style={{ background: "linear-gradient(135deg,#d97706,#b45309)", boxShadow: "0 4px 14px rgba(217,119,6,0.35)" }}>
                        Create Masterpiece ✨
                      </Link>
                      <div className="flex justify-center gap-4 mt-1 opacity-20 pointer-events-none select-none" aria-hidden>
                        <motion.span className="text-[13px]" animate={{ y: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>📖</motion.span>
                        <motion.span className="text-[13px]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>✨</motion.span>
                        <motion.span className="text-[13px]" animate={{ y: [0, -3, 0] }} transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut", delay: 1.0 }}>🎭</motion.span>
                      </div>
                    </div>
                  </div>

                </div>
              </aside>

            </div>{/* end main flex */}
          </div>{/* end relative wrapper */}

        </div>
      )}

      {showCreateModal && (
        <CreateChildModal onCreated={handleCreated} onClose={() => setShowCreateModal(false)} />
      )}
    </AppShell>
  );
}
