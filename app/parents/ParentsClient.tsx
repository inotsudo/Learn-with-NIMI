"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { DURATION, EASE } from "@/lib/design-system/motion";
import { Star, CheckCircle2, Lock, ChevronRight, Plus, Loader2, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import ParentControls from "@/components/parents/ParentControls";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import CreateChildModal from "@/components/home/CreateChildModal";
import supabase from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { getChildren, getChildAchievements, getActivityDates, getTotalStars, getWeekActivityCounts, getChildCosmetics, getTodayMissions, type TodayMission, type Child, type ChildAchievement, type ChildCosmetics } from "@/lib/queries";
import { getStoryLibrary, getStorySlots } from "@/lib/storyRepository";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { getActiveSubscription } from "@/lib/payments/products";
import type { Subscription } from "@/lib/payments/types";
import { computeStreaks } from "@/lib/parentInsights";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import EditProfileSheet from "@/components/profile/EditProfileSheet";
import UpdateCardModal from "@/components/parents/UpdateCardModal";

// Lazy-loaded tab panels — only downloaded when the user opens that tab
const LearningBrainTab    = dynamic(() => import("@/components/parents/LearningBrainTab"),    { ssr: false });
const ReferralCard        = dynamic(() => import("@/components/parents/ReferralCard"),         { ssr: false });
const PushNotificationsCard = dynamic(() => import("@/components/parents/PushNotificationsCard"), { ssr: false });

const NAME_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f97316","#10b981","#3b82f6","#ef4444","#f59e0b"];
function nameToColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
}

// All known badge slugs → { label, emoji, desc }
const KNOWN_BADGES: Record<string, { label: string; emoji: string; desc: string }> = {
  // Milestone badges (auto-awarded)
  "story-explorer":   { label: "Story Explorer",   emoji: "🧭", desc: "Completed first story" },
  "story-adventurer": { label: "Story Adventurer", emoji: "🚀", desc: "Completed 3 stories"   },
  "story-champion":   { label: "Story Champion",   emoji: "🏆", desc: "Completed 5 stories"   },
  "star-collector":   { label: "Star Collector",   emoji: "⭐", desc: "Earned 50 stars"        },
  "super-star":       { label: "Super Star",       emoji: "🌟", desc: "Earned 100 stars"       },
  // Admin-awarded badges
  "star-of-the-week": { label: "Star of the Week", emoji: "⭐", desc: "Outstanding effort this week" },
  "most-improved":    { label: "Most Improved",    emoji: "📈", desc: "Great recent progress"        },
  "helper-award":     { label: "Helper Award",     emoji: "🤝", desc: "Kind and helpful"            },
  "super-effort":     { label: "Super Effort",     emoji: "💪", desc: "Tried hard on every activity" },
  "creative-spark":   { label: "Creative Spark",   emoji: "✨", desc: "Amazing creativity"           },
  "perfect-week":     { label: "Perfect Week",     emoji: "🏆", desc: "Active every day this week"   },
  // Streak shield
  "streak-shield":    { label: "Streak Shield",    emoji: "🛡️", desc: "Protected streak"            },
};

function resolveBadgeMeta(slug: string): { label: string; emoji: string; desc: string } {
  if (KNOWN_BADGES[slug]) return KNOWN_BADGES[slug];
  // streak-shield-used-YYYY-MM-DD
  if (slug.startsWith("streak-shield-used")) {
    const datePart = slug.replace("streak-shield-used-", "").replace(/-/g, " ").trim();
    const d = new Date(slug.slice(-10));
    const formatted = isNaN(d.getTime()) ? datePart : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return { label: "Streak Shield Used", emoji: "🛡️", desc: formatted };
  }
  // story-<anything>-complete or story-<id>-complete
  if (slug.startsWith("story-") && slug.endsWith("-complete")) {
    return { label: "Story Complete", emoji: "📖", desc: "Finished a story" };
  }
  // story-new-story-<id>-complete
  if (slug.startsWith("story-new-story-")) {
    return { label: "Story Complete", emoji: "📖", desc: "Finished a story" };
  }
  // generic clean-up: replace dashes, capitalise
  const clean = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return { label: clean, emoji: "🎖️", desc: "" };
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getWeeklyInsight(data: ChildData | undefined, hasActivity: boolean): string {
  if (!data) return "Welcome to your Family Hub 🏡";
  const activeDays = data.weekActivity.filter(Boolean).length;
  const name = data.child.name;
  if (!hasActivity) return `${name} hasn't started today yet — let's go! 🚀`;
  if (activeDays >= 5) return `Amazing week! ${name} has been active ${activeDays} days 🔥`;
  if (activeDays >= 3) return `${name} is on a roll — ${activeDays} active days this week 📚`;
  return `${name} studied today — keep the streak going! ⭐`;
}

interface ChildData {
  child: Child;
  stories: StoryLibraryItem[];
  currentSlots: StorySlot[];
  achievements: ChildAchievement[];
  streak: number;
  totalStars: number;
  weekActivity: number[];
  cosmetics: ChildCosmetics;
  activityDates: Set<string>;
}

interface Props {
  initialChildren?: Child[];
  initialUserId?: string;
}

export default function ParentsClient({ initialChildren, initialUserId }: Props = {}) {
  const router = useRouter();
  const { themeId } = useAppTheme();
  const { t } = useLanguage();
  const m = useThemeMotion();
  const assets = getThemeAssets(themeId);
  const push = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState("");
  const [childrenData, setChildrenData] = useState<ChildData[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showManageSub, setShowManageSub] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [cancelSubError, setCancelSubError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [feelings, setFeelings] = useState<{ story_id: string; title: string; feeling: string; felt_at: string }[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralRewards, setReferralRewards] = useState(0);
  const [referralCodeError, setReferralCodeError] = useState(false);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [parentTab, setParentTab] = useState<"overview" | "stories" | "achievements" | "learning" | "airways" | "settings">("overview");
  const [airwaysDownloading, setAirwaysDownloading] = useState<string | null>(null);
  const [airwaysError, setAirwaysError] = useState<string | null>(null);
  const [boardingPassPreview, setBoardingPassPreview] = useState<string | null>(null);
  const [boardingPassPreviewLoading, setBoardingPassPreviewLoading] = useState(false);
  const boardingPassPreviewUrlRef = useRef<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [parentAvatarUrl, setParentAvatarUrl] = useState<string | null>(null);
  const [editParentOpen, setEditParentOpen] = useState(false);
  const [playingChildId, setPlayingChildId] = useState<string | null>(null);
  const [switched, setSwitched] = useState(false);
  const [todayActivity, setTodayActivity] = useState<TodayMission[]>([]);
  const [shareToast, setShareToast] = useState(false);

  const switchPlaying = (childId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nimipiko_active_child", childId);
      window.dispatchEvent(new CustomEvent("app:childSwitch", { detail: { childId } }));
    }
    setPlayingChildId(childId);
    setSelectedChild(childId);
    setParentTab("overview");
    setSwitched(true);
    setTimeout(() => setSwitched(false), 2500);
  };

  const handleAddKid = useCallback(() => {
    if (childrenData.length >= 1 && !hasSubscription) {
      router.push("/pricing?reason=add-child");
      return;
    }
    setShowAddChild(true);
  }, [childrenData.length, hasSubscription, router]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setEditingName(false); return; }
    setSavingName(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("parents").upsert({ id: user.id, name: trimmed }, { onConflict: "id" });
    }
    setParentName(trimmed);
    setSavingName(false);
    setEditingName(false);
  };

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("nimipiko-parent-avatar") : null;
    if (stored) setParentAvatarUrl(stored);
  }, []);

  useEffect(() => {
    void (async () => {
      let userId: string;
      if (initialUserId) {
        userId = initialUserId;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;
      }
      setParentUserId(userId);

      // Fan out all independent top-level queries in parallel
      const [parentRow, sub, children, codeRes, redemptionsRes] = await Promise.all([
        supabase.from("parents").select("name").eq("id", userId).maybeSingle(),
        getActiveSubscription(userId),
        initialChildren !== undefined ? Promise.resolve(initialChildren) : getChildren(),
        authedFetch("/api/referral").then(r => r.json()).catch(() => ({ _error: true })),
        supabase.from("referral_redemptions").select("id, reward_granted_at").eq("referrer_id", userId),
      ]);

      if (parentRow.data?.name) setParentName(parentRow.data.name);

      setHasSubscription(!!sub);
      setSubscription(sub);
      if (sub?.payment_provider === "trial" && sub.current_period_end) {
        setIsTrial(true);
        const msLeft = new Date(sub.current_period_end).getTime() - Date.now();
        setTrialDaysLeft(Math.max(0, Math.ceil(msLeft / 86_400_000)));
      }

      if (codeRes.code) {
        setReferralCode(codeRes.code);
        setReferralCodeError(false);
      } else if (codeRes._error || !codeRes.code) {
        setReferralCodeError(true);
      }
      const redemptions = redemptionsRes.data ?? [];
      setReferralCount(redemptions.length);
      setReferralRewards(redemptions.filter(r => r.reward_granted_at).length);

      if (children.length === 0) { setLoading(false); return; }

      // Load all children in parallel, and within each child load story slots
      // in the same Promise.all as the rest of the child's data
      const results = await Promise.all(
        children.map(async (child) => {
          const [stories, achievements, dates, stars, weekActivity, cos] = await Promise.all([
            getStoryLibrary(child.id, child.language),
            getChildAchievements(child.id),
            getActivityDates(child.id, child.language),
            getTotalStars(child.id, child.language),
            getWeekActivityCounts(child.id, child.language),
            getChildCosmetics(child.id),
          ]);
          const current = stories.find(s => s.unlocked && !s.complete) ?? stories[stories.length - 1];
          const slots = current ? await getStorySlots(child.id, current.sid, child.language) : [];
          return {
            child, stories, currentSlots: slots, achievements,
            streak: computeStreaks(dates).current,
            totalStars: stars,
            weekActivity,
            cosmetics: cos,
            activityDates: dates,
          } satisfies ChildData;
        })
      );

      setChildrenData(results);
      const activeId = typeof window !== "undefined" ? localStorage.getItem("nimipiko_active_child") : null;
      const pid = results.find(r => r.child.id === activeId)?.child.id ?? results[0]?.child.id ?? null;
      setPlayingChildId(pid);
      setSelectedChild(pid ?? results[0]?.child.id ?? null);

      // Fetch recent story feelings — can run after children are known
      const childIds = results.map(r => r.child.id);
      const { data: feelingRows } = await supabase
        .from("story_feelings")
        .select("story_id, feeling, felt_at, stories(title)")
        .in("child_id", childIds)
        .order("felt_at", { ascending: false })
        .limit(10);
      if (feelingRows) {
        setFeelings(feelingRows.map(r => ({
          story_id: ((r as Record<string, unknown>).story_id as string | null) ?? "",
          title: ((r as Record<string, unknown>).stories as Record<string,unknown> | null)?.title as string ?? "Story",
          feeling: r.feeling as string,
          felt_at: r.felt_at as string,
        })));
      }

      setLoading(false);
    })();
  }, []);

  // Refresh today's activity whenever the parent switches to a different child.
  useEffect(() => {
    if (!selectedChild) return;
    const data = childrenData.find(d => d.child.id === selectedChild);
    if (!data) return;
    void getTodayMissions(selectedChild, data.child.language as "en" | "fr" | "rw")
      .then(setTodayActivity);
  }, [selectedChild, childrenData]);

  // Fetch boarding pass preview PNG when Airways tab opens (subscribers only).
  // AbortController cancels in-flight fetches when deps change — prevents a stale
  // child's preview from overwriting the new child's slot if the user switches quickly.
  useEffect(() => {
    if (parentTab !== "airways" || !hasSubscription || !selectedChild || boardingPassPreview) return;
    const ctrl = new AbortController();
    setBoardingPassPreviewLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/airways/boarding-pass?childId=${selectedChild}&format=png`, {
          signal: ctrl.signal,
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!res.ok) return;
        const blob = await res.blob();
        if (ctrl.signal.aborted) return;
        const objUrl = URL.createObjectURL(blob);
        boardingPassPreviewUrlRef.current = objUrl;
        setBoardingPassPreview(objUrl);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        // other errors are non-critical for a preview
      } finally {
        if (!ctrl.signal.aborted) setBoardingPassPreviewLoading(false);
      }
    })();
    return () => { ctrl.abort(); setBoardingPassPreviewLoading(false); };
  }, [parentTab, hasSubscription, selectedChild, boardingPassPreview]);

  // Reset preview when child switches, revoking the stale blob URL to free memory
  useEffect(() => {
    if (boardingPassPreviewUrlRef.current) {
      URL.revokeObjectURL(boardingPassPreviewUrlRef.current);
      boardingPassPreviewUrlRef.current = null;
    }
    setBoardingPassPreview(null);
  }, [selectedChild]);

  // Close the Switch Child popover when the user presses Escape
  useEffect(() => {
    if (!showSwitchMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSwitchMenu(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showSwitchMenu]);

  const handleCancelSub = async (action: "cancel" | "reactivate") => {
    setCancellingSubscription(true);
    setCancelSubError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/account/subscription", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        setCancelSubError(j.error ?? "Something went wrong");
        return;
      }
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: action === "cancel" } : prev);
    } catch {
      setCancelSubError("Network error — please try again");
    } finally {
      setCancellingSubscription(false);
    }
  };

  const active = childrenData.find(d => d.child.id === selectedChild);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-5 pb-24 space-y-4">
          <div className="flex items-center gap-3">
            <Bone className="w-16 h-16 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Bone className="h-5 w-40" />
              <Bone className="h-3 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-20 leaf-lg" />)}
          </div>
          <Bone className="h-52 leaf-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Bone className="h-36 leaf-lg" />
            <Bone className="h-36 leaf-lg" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (childrenData.length === 0) {
    return (
      <AppShell>
        <PageSurface className="items-center justify-center gap-4 px-4">
          <span className="text-5xl" aria-hidden="true">👶</span>
          <p className="text-ds-text font-bold text-center text-base">No learner profiles yet</p>
          <Link href="/home" className="font-black px-6 py-3 shadow-lg text-sm" style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", borderRadius: 'var(--leaf-r-sm)' }}>
            Create a Profile
          </Link>
        </PageSurface>
      </AppShell>
    );
  }

  const storiesComplete = active?.stories.filter(s => s.complete).length ?? 0;
  const totalStories = active?.stories.length ?? 0;
  const missionsComplete = active?.currentSlots.filter(s => s.completed).length ?? 0;
  const totalMissions = active?.currentSlots.length ?? 6;
  const badges = active?.achievements.filter(a => a.type === "badge") ?? [];
  const certs = active?.achievements.filter(a => a.type === "certificate") ?? [];
  const currentStory = active?.stories.find(s => s.unlocked && !s.complete);

  const parentInitial = (parentName[0] ?? "P").toUpperCase();
  const parentColor  = nameToColor(parentName);

  return (
    <AppShell>
      <PageSurface className="content-enter">

        {/* ═══ HERO ═══ */}
        <HeroBanner zone="familyHub" className="shadow-ds-card">
          <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-[var(--ds-surface-card)]/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-[var(--ds-surface-card)]/8 pointer-events-none" />
          {/* Floating particles */}
          {[
            { top: "10%", left:  "8%",  emoji: "📚", size: 14, delay: 0    },
            { top: "65%", left:  "5%",  emoji: "⭐", size: 12, delay: 0.8  },
            { top: "15%", right: "6%",  emoji: "🏆", size: 16, delay: 0.35 },
            { top: "60%", right: "8%",  emoji: "🌟", size: 11, delay: 1.1  },
            { top: "38%", left:  "2%",  emoji: "💡", size: 12, delay: 0.55 },
            { top: "35%", right: "3%",  emoji: "🎯", size: 13, delay: 0.9  },
          ].map((d, i) => (
            <motion.span
              key={i}
              className="absolute pointer-events-none select-none"
              style={{ top: d.top, left: (d as { left?: string }).left, right: (d as { right?: string }).right, fontSize: d.size }}
              animate={m.reduced ? { opacity: 0.3 } : { opacity: [0.25, 0.9, 0.25], y: [0, -6, 0], scale: [0.8, 1.15, 0.8] }}
              transition={m.reduced ? {} : { duration: 2.6, repeat: Infinity, delay: d.delay }}
              aria-hidden
            >
              {d.emoji}
            </motion.span>
          ))}
          <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6 flex items-center gap-4">

            {/* Parent avatar */}
            <div className="relative shrink-0">
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full bg-[var(--ds-surface-card)]/30"
                animate={m.reduced ? { scale: 1, opacity: 0.3 } : { scale: [1, 1.14, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={m.reduced ? {} : { duration: 3, repeat: Infinity }}
              />

              {/* Avatar button */}
              <motion.button
                onClick={() => setEditParentOpen(true)}
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white/50 shadow-2xl overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition-transform active:scale-95"
                style={{ backgroundColor: parentAvatarUrl ? undefined : parentColor }}
                whileTap={{ scale: 0.93 }}
                aria-label="Edit your profile"
              >
                {parentAvatarUrl ? (
                  <ChildAvatar avatarUrl={parentAvatarUrl} name={parentName} size={80} className="translate-y-[4px]" />
                ) : (
                  <span className="font-baloo font-black text-white text-3.5xl sm:text-4xl select-none">
                    {parentInitial}
                  </span>
                )}
              </motion.button>

              {/* Edit pencil badge — decorative, parent avatar button handles the click */}
              <motion.div
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--ds-surface-card)] flex items-center justify-center shadow-lg border-2 border-white pointer-events-none"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={parentColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </motion.div>
            </div>

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-3xs font-nunito font-bold uppercase tracking-[0.14em] mb-0.5">
                {getTimeGreeting()} 👋
              </p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value.slice(0, 32))}
                    onKeyDown={e => { if (e.key === "Enter") void handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="font-baloo font-black text-1.5xl bg-[var(--ds-surface-card)]/20 text-white placeholder-white/50 border-b-2 border-white/60 focus:outline-none focus:border-white rounded px-1 min-w-0 flex-1"
                    placeholder={parentName}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => void handleSaveName()}
                    disabled={savingName}
                    className="shrink-0 px-3 py-1 rounded-full bg-[var(--ds-surface-card)]/25 text-white text-xs font-black hover:bg-[var(--ds-surface-card)]/35 transition disabled:opacity-50"
                  >
                    {savingName ? "…" : "Save"}
                  </button>
                  <button onClick={() => setEditingName(false)} className="shrink-0 text-white/60 hover:text-white text-xs">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setNameInput(parentName); setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 60); }}
                  aria-label={`Edit name: ${parentName}`}
                  className="group flex items-center gap-2"
                >
                  <p className="font-baloo font-black text-white text-2xl sm:text-3.5xl leading-tight truncate">
                    {parentName}
                  </p>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-70 transition-opacity shrink-0">
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              <p className="text-white/75 text-xs font-nunito mt-1 leading-snug">
                {getWeeklyInsight(childrenData.find(d => d.child.id === selectedChild) ?? childrenData[0], (todayActivity.length > 0))}
              </p>
              <p className="text-white/45 text-3xs font-nunito mt-1">
                {childrenData.length} {childrenData.length === 1 ? "learner" : "learners"} · Family Hub
              </p>
            </div>

            {/* Sub status pill */}
            {hasSubscription && !isTrial ? (
              <Link href="/pricing" className="shrink-0">
                <div className="bg-[var(--ds-surface-card)]/20 border border-white/30 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                  <span aria-hidden="true" className="text-sm">👑</span>
                  <span className="text-white text-3xs font-black">CLUB</span>
                </div>
              </Link>
            ) : isTrial ? (
              <Link href="/pricing" className="shrink-0">
                <div className="bg-amber-400/90 border border-amber-300/60 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-amber-400 transition">
                  <span aria-hidden="true" className="text-sm">⏳</span>
                  <span className="text-amber-900 text-3xs font-black">{trialDaysLeft}d LEFT</span>
                </div>
              </Link>
            ) : (
              <Link href="/pricing" className="shrink-0">
                <div className="bg-[var(--ds-surface-card)]/20 border border-white/30 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-[var(--ds-surface-card)]/30 transition">
                  <span aria-hidden="true" className="text-sm">🚀</span>
                  <span className="text-white text-3xs font-black">UPGRADE</span>
                </div>
              </Link>
            )}
          </div>
        </HeroBanner>

        {/* ═══ Switched toast ═══ */}
        <AnimatePresence>
          {switched && (
            <motion.div
              key="switched"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ds-brand-primary)] text-[var(--ds-nav-bg)] text-sml font-black shadow-xl"
            >
              {`🎮 Switched to ${childrenData.find(d => d.child.id === playingChildId)?.child.name ?? "learner"} — whole app updated!`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Airways download error toast ═══ */}
        <AnimatePresence>
          {airwaysError && (
            <motion.div
              key="airways-error"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 text-white text-sml font-black shadow-xl max-w-sm text-center"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {airwaysError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ PAGE BODY: sidebar + content ═══ */}
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 pt-5 pb-24 flex-1 w-full">

          {/* Subscription banner — full on mobile, hidden on desktop (in sidebar) */}
          <div className="lg:hidden mb-5">
            {hasSubscription && !isTrial && subscription?.status === "past_due" ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden border border-red-200 bg-red-50 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl shrink-0">⚠️</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-red-800 text-mbase">Payment failed</p>
                    <p className="text-red-600 text-2xs font-bold">Your Club access is on hold — please update your payment to continue</p>
                  </div>
                </div>
                <div className="px-4 pb-4 border-t border-red-100 pt-3 flex gap-2">
                  <a href="/pricing" className="flex-1 text-center py-2 text-xs font-black text-[var(--ds-nav-bg)] transition"
                    style={{ backgroundColor: "var(--ds-brand-primary)", borderRadius: "var(--leaf-r)" }}>
                    Resubscribe →
                  </a>
                  {subscription?.payment_provider === "cybersource" && (
                    <button onClick={() => setShowUpdateCard(true)}
                      className="flex-1 py-2 text-xs font-black text-red-700 bg-[var(--ds-surface-card)] border border-red-200 hover:bg-red-50 transition"
                      style={{ borderRadius: "var(--leaf-r)" }}>
                      Update card
                    </button>
                  )}
                </div>
              </motion.div>
            ) : hasSubscription && !isTrial ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden border border-ds-club bg-ds-club-subtle shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-ds-club rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0">👑</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-ds-text text-mbase">NIMIPIKO Club Active</p>
                    {subscription?.cancel_at_period_end ? (
                      <p className="text-ds-danger text-2xs font-bold">
                        Cancels {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                    ) : subscription?.current_period_end ? (
                      <p className="text-ds-club-text text-2xs font-bold">
                        Renews {new Date(subscription.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    ) : (
                      <p className="text-ds-club-text text-2xs font-bold">All premium stories unlocked ✓</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowManageSub(s => !s); setConfirmCancel(false); }}
                    aria-label={showManageSub ? "Hide subscription options" : "Show subscription options"}
                    aria-expanded={showManageSub}
                    className="text-ds-club hover:opacity-75 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-1 rounded"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${showManageSub ? "rotate-90" : ""}`} />
                  </button>
                </div>
                {showManageSub && (
                  <div className="px-4 pb-4 border-t border-ds-club pt-3 space-y-2">
                    {cancelSubError && (
                      <p className="text-ds-danger text-2xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {cancelSubError}
                      </p>
                    )}
                    {subscription?.cancel_at_period_end ? (
                      <button
                        onClick={() => void handleCancelSub("reactivate")}
                        disabled={cancellingSubscription}
                        className="w-full py-2 text-xs font-black text-ds-club-text bg-ds-club-subtle hover:opacity-90 transition flex items-center justify-center gap-2"
                        style={{ borderRadius: "var(--leaf-r)" }}
                      >
                        {cancellingSubscription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Reactivate Subscription
                      </button>
                    ) : confirmCancel ? (
                      <div className="space-y-2">
                        {/* Retention offer */}
                        <div className="bg-ds-warn-surface border border-ds-warn p-3 text-2xs" style={{ borderRadius: "var(--leaf-r)" }}>
                          <p className="font-black text-ds-warn mb-1">💛 Before you go...</p>
                          <p className="text-ds-warn mb-2 opacity-90">Use code <strong>STAY20</strong> for 20% off your next renewal — keep everything you love.</p>
                          <a
                            href="/pricing?code=STAY20"
                            className="block w-full text-center py-1.5 font-black text-2xs text-white bg-[var(--ds-warn-icon)] hover:opacity-90 transition"
                            style={{ borderRadius: "var(--leaf-r)" }}
                          >
                            Claim 20% Off →
                          </a>
                        </div>
                        <div className="bg-ds-danger-surface border border-ds-danger p-3 text-2xs space-y-1.5" style={{ borderRadius: "var(--leaf-r)" }}>
                          <p className="font-black text-ds-danger">You&apos;ll lose access to:</p>
                          <ul className="text-ds-danger/80 space-y-0.5 list-none">
                            <li>📚 All premium stories (locked after period ends)</li>
                            <li>🤖 Unlimited Nimi AI chats (back to 10/day)</li>
                            <li>🏆 Certificate downloads for premium stories</li>
                            <li>👨‍👩‍👦 Multiple learner profiles</li>
                          </ul>
                        </div>
                        <button
                          onClick={() => setConfirmCancel(false)}
                          className="w-full py-2 text-xs font-black text-ds-club-text bg-ds-club-subtle hover:opacity-90 transition"
                          style={{ borderRadius: "var(--leaf-r)" }}
                        >
                          Keep Subscription
                        </button>
                        <button
                          onClick={() => { void handleCancelSub("cancel"); setConfirmCancel(false); }}
                          disabled={cancellingSubscription}
                          className="w-full py-1.5 text-2xs font-semibold text-red-500 hover:text-red-700 transition flex items-center justify-center gap-1.5"
                        >
                          {cancellingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Cancel anyway
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmCancel(true)}
                        disabled={cancellingSubscription}
                        className="w-full py-2 text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-2"
                        style={{ borderRadius: "var(--leaf-r)" }}
                      >
                        Cancel at Period End
                      </button>
                    )}
                    {!confirmCancel && (
                      <p className="text-3xs text-ds-muted text-center">
                        {subscription?.cancel_at_period_end
                          ? "Your access continues until the period ends."
                          : "You won't be charged again. Access continues until period end."}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : isTrial ? (
              <Link href="/pricing">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }} whileTap={m.buttonPress}
                  className="overflow-hidden shadow-ds-card cursor-pointer" style={{ borderRadius: 'var(--leaf-r-lg)', border: '1px solid var(--ds-warn-icon)' }}>
                  <div className="p-4 flex items-center gap-3 bg-ds-warn-surface">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0">⏳</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-baloo font-black text-ds-text text-mbase">Free Trial — {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left</p>
                      <p className="text-amber-700 text-2xs font-bold">
                        {trialDaysLeft <= 2
                          ? "Trial ends soon — upgrade to keep access!"
                          : "Enjoying Club? Subscribe to keep it going."}
                      </p>
                    </div>
                    <span className="bg-amber-400 text-amber-900 font-black text-2xs px-3 py-1 shrink-0" style={{ borderRadius: 'var(--leaf-r-sm)' }}>Upgrade</span>
                  </div>
                </motion.div>
              </Link>
            ) : (
              <Link href="/pricing">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }} whileTap={m.buttonPress}
                  className="overflow-hidden border border-yellow-200/80 bg-gradient-to-r from-yellow-50/95 to-orange-50/90 shadow-ds-card cursor-pointer" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0">🚀</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-baloo font-black text-ds-text text-mbase">{t("unlockPremium")}</p>
                      <p className="text-[var(--ds-text-secondary)] text-2xs">{t("allStoriesAllLanguages")}</p>
                    </div>
                    <span className="bg-yellow-400 text-black font-black text-2xs px-3 py-1 shrink-0" style={{ borderRadius: 'var(--leaf-r-sm)' }}>{t("seePlans")}</span>
                  </div>
                </motion.div>
              </Link>
            )}
          </div>

          {/* Mobile child selector chips */}
          <div className="lg:hidden flex gap-3 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {childrenData.map((d, i) => {
              const isPlaying = d.child.id === playingChildId;
              const isSelected = d.child.id === selectedChild;
              return (
                <div key={d.child.id} className="shrink-0 flex flex-col gap-1">
                  <motion.button
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    onClick={() => { setSelectedChild(d.child.id); setParentTab("overview"); }}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 font-bold text-sml transition border-2 ${
                      isSelected ? "text-white shadow-sm" : "bg-[var(--ds-surface-card)] text-ds-text border-ds-border hover:bg-[var(--ds-surface-card-hover)]"
                    }`}
                    style={{ borderRadius: 'var(--leaf-r)', ...(isSelected ? { backgroundColor: 'var(--ds-brand-primary)', borderColor: 'var(--ds-brand-primary)' } : {}) }}>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[var(--ds-surface-card)]/20 flex items-center justify-center">
                      <ChildAvatar avatarUrl={d.child.avatar_url} name={d.child.name} size={32} />
                      {isPlaying && (
                        <span className="absolute -bottom-0.5 -right-0.5 text-3xs leading-none">🎮</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-black leading-none">{d.child.name}</p>
                      <p className={`text-3xs mt-0.5 ${isSelected ? "text-white/75" : "text-[var(--ds-text-tertiary)]"}`}>
                        {isPlaying ? t("nowPlaying") : `${d.stories.filter(s => s.complete).length}/${d.stories.length} stories`}
                      </p>
                    </div>
                  </motion.button>
                  {/* Switch button — only show on non-playing child when there's more than one */}
                  {!isPlaying && childrenData.length > 1 && (
                    <button
                      onClick={() => switchPlaying(d.child.id)}
                      className="text-3xs font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/40 px-2 py-1 text-center hover:bg-[var(--ds-brand-primary)] hover:text-[var(--ds-nav-bg)] transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-1"
                      style={{ borderRadius: 'var(--leaf-r-sm)' }}
                    >
                      {t("switchToThisKid")}
                    </button>
                  )}
                </div>
              );
            })}
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: childrenData.length * 0.07 }}
              onClick={handleAddKid}
              className="flex items-center gap-2 px-3.5 py-2.5 font-black text-sml bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] border-2 border-dashed border-[var(--ds-border-brand)]/40 transition shrink-0 self-start"
              style={{ borderRadius: 'var(--leaf-r)' }}>
              {childrenData.length >= 1 && !hasSubscription ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {t("addKid")}
            </motion.button>
          </div>

          {/* ── Desktop: sidebar + main ── */}
          <div className="lg:flex lg:gap-6 lg:items-start">

            {/* ─── SIDEBAR (desktop only) ─── */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 shrink-0 gap-4 sticky top-20">

              {/* Subscription */}
              {hasSubscription && !isTrial && subscription?.status === "past_due" ? (
                <div className="overflow-hidden border border-red-200 bg-red-50 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-base shrink-0">⚠️</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-red-800 text-sml">Payment failed</p>
                      <p className="text-red-600 text-3xs font-bold leading-tight">Club access on hold</p>
                    </div>
                  </div>
                  <div className="px-3 pb-3 border-t border-red-100 pt-2 space-y-1.5">
                    <a href="/pricing" className="block text-center py-1.5 text-2xs font-black text-[var(--ds-nav-bg)] transition"
                      style={{ backgroundColor: "var(--ds-brand-primary)", borderRadius: "var(--leaf-r)" }}>
                      Resubscribe →
                    </a>
                    {subscription?.payment_provider === "cybersource" && (
                      <button onClick={() => setShowUpdateCard(true)}
                        className="w-full py-1.5 text-2xs font-black text-red-700 bg-[var(--ds-surface-card)] border border-red-200 hover:bg-red-50 transition"
                        style={{ borderRadius: "var(--leaf-r)" }}>
                        Update card
                      </button>
                    )}
                  </div>
                </div>
              ) : hasSubscription && !isTrial ? (
                <div className="overflow-hidden border border-ds-club bg-ds-club-subtle shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-ds-club rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0">👑</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-ds-text text-sml">{t("clubActive")}</p>
                      {subscription?.cancel_at_period_end ? (
                        <p className="text-ds-danger text-3xs font-bold">
                          Cancels {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                        </p>
                      ) : subscription?.current_period_end ? (
                        <p className="text-ds-club-text text-3xs font-bold">
                          Renews {new Date(subscription.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      ) : (
                        <p className="text-ds-club-text text-3xs font-bold">{t("allStoriesUnlocked")}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowManageSub(s => !s); setConfirmCancel(false); }}
                      aria-label={showManageSub ? "Hide subscription options" : "Show subscription options"}
                      aria-expanded={showManageSub}
                      className="text-ds-club hover:opacity-75 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-1 rounded"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${showManageSub ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                  {showManageSub && (
                    <div className="px-3 pb-3 border-t border-ds-club pt-2.5 space-y-2">
                      {cancelSubError && (
                        <p className="text-ds-danger text-3xs font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> {cancelSubError}
                        </p>
                      )}
                      {subscription?.cancel_at_period_end ? (
                        <button
                          onClick={() => void handleCancelSub("reactivate")}
                          disabled={cancellingSubscription}
                          className="w-full py-1.5 text-2xs font-black text-ds-club-text bg-ds-club-subtle hover:opacity-90 transition flex items-center justify-center gap-1.5"
                          style={{ borderRadius: "var(--leaf-r)" }}
                        >
                          {cancellingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Reactivate
                        </button>
                      ) : confirmCancel ? (
                        <div className="space-y-2">
                          {/* Retention offer */}
                          <div className="bg-ds-warn-surface border border-ds-warn p-2.5 text-3xs" style={{ borderRadius: "var(--leaf-r)" }}>
                            <p className="font-black text-ds-warn mb-1">💛 Before you go...</p>
                            <p className="text-ds-warn opacity-90 mb-1.5">Code <strong>STAY20</strong> = 20% off next renewal</p>
                            <a
                              href="/pricing?code=STAY20"
                              className="block w-full text-center py-1 font-black text-3xs text-white bg-[var(--ds-warn-icon)] hover:opacity-90 transition"
                              style={{ borderRadius: "var(--leaf-r)" }}
                            >
                              Claim 20% Off →
                            </a>
                          </div>
                          <div className="bg-ds-danger-surface border border-ds-danger p-2.5 text-3xs space-y-1" style={{ borderRadius: "var(--leaf-r)" }}>
                            <p className="font-black text-ds-danger">You&apos;ll lose:</p>
                            <ul className="text-ds-danger/80 space-y-0.5">
                              <li>📚 All premium stories</li>
                              <li>🤖 Unlimited Nimi AI chats</li>
                              <li>🏆 Premium certificates</li>
                              <li>👨‍👩‍👦 Multiple profiles</li>
                            </ul>
                          </div>
                          <button
                            onClick={() => setConfirmCancel(false)}
                            className="w-full py-1.5 text-2xs font-black text-ds-club-text bg-ds-club-subtle hover:opacity-90 transition"
                            style={{ borderRadius: "var(--leaf-r)" }}
                          >
                            Keep Subscription
                          </button>
                          <button
                            onClick={() => { void handleCancelSub("cancel"); setConfirmCancel(false); }}
                            disabled={cancellingSubscription}
                            className="w-full py-1 text-3xs font-semibold text-ds-danger hover:opacity-80 transition flex items-center justify-center gap-1"
                          >
                            {cancellingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Cancel anyway
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancel(true)}
                          disabled={cancellingSubscription}
                          className="w-full py-1.5 text-2xs font-black text-red-600 bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-1.5"
                          style={{ borderRadius: "var(--leaf-r)" }}
                        >
                          Cancel at period end
                        </button>
                      )}
                      {!confirmCancel && (
                        <p className="text-4xs text-ds-muted text-center leading-tight">
                          {subscription?.cancel_at_period_end
                            ? "Access continues until period ends."
                            : "Access continues until your current period ends."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : isTrial ? (
                <Link href="/pricing">
                  <div className="overflow-hidden shadow-ds-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition" style={{ borderRadius: 'var(--leaf-r-lg)', border: '1px solid #fbbf24', background: 'linear-gradient(to right, #fffbeb, #fef3c7)' }}>
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0">⏳</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-ds-text text-sml">Trial — {trialDaysLeft}d left</p>
                      <p className="text-3xs font-bold" style={{ color: trialDaysLeft <= 2 ? '#dc2626' : '#b45309' }}>
                        {trialDaysLeft <= 2 ? "Expires soon — upgrade!" : "Upgrade to keep access"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                  </div>
                </Link>
              ) : (
                <Link href="/pricing">
                  <div className="overflow-hidden border border-yellow-200/80 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-ds-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                    <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0">🚀</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-ds-text text-sml">{t("goPremium")}</p>
                      <p className="text-[var(--ds-text-secondary)] text-3xs">{t("allStoriesAllLanguages")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-yellow-600 shrink-0" />
                  </div>
                </Link>
              )}

              {/* Child cards */}
              <div className="bg-[var(--ds-surface-card)] border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                <div className="px-4 pt-4 pb-2">
                  <p className="text-3xs font-black text-ds-muted uppercase tracking-widest">{t("myKids")}</p>
                </div>
                <div className="px-2 pb-2 space-y-1">
                  {childrenData.map((d, i) => {
                    const isActive = d.child.id === selectedChild;
                    const isPlaying = d.child.id === playingChildId;
                    const done = d.stories.filter(s => s.complete).length;
                    const total = d.stories.length;
                    return (
                      <div key={d.child.id} className="space-y-0.5">
                        <motion.button
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                          onClick={() => { setSelectedChild(d.child.id); setParentTab("overview"); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left ${
                            isActive
                              ? "bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/40"
                              : "hover:bg-[var(--ds-surface-card-hover)] border border-transparent"
                          }`}
                          style={{ borderRadius: "var(--leaf-r)" }}
                        >
                          <div className={`relative w-10 h-10 rounded-full overflow-visible shrink-0 flex items-center justify-center`}>
                            <div className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition-all ${isActive ? "ring-[var(--ds-brand-primary)]/40" : "ring-gray-200"}`}>
                              <ChildAvatar avatarUrl={d.child.avatar_url} name={d.child.name} size={40} />
                            </div>
                            {isPlaying && (
                              <span className="absolute -bottom-0.5 -right-0.5 text-2xs leading-none bg-[var(--ds-surface-card)] rounded-full p-0.5 shadow-sm">🎮</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`font-black text-sm leading-tight truncate ${isActive ? "text-[var(--ds-brand-primary)]" : "text-ds-text"}`}>
                                {d.child.name}
                              </p>
                              {isPlaying && (
                                <span className="shrink-0 text-4xs font-black text-[var(--ds-text-brand)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)] px-1.5 py-0.5 rounded-full leading-none">
                                  PLAYING
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="flex-1 h-1.5 bg-[var(--ds-surface-card-active)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[var(--ds-brand-primary)] transition-all duration-500"
                                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-3xs font-bold text-ds-muted shrink-0">{done}/{total}</span>
                            </div>
                            {/* Today's sessions + streak */}
                            <div className="flex items-center gap-2 mt-1">
                              {(() => {
                                const todayIdx = (new Date().getDay() + 6) % 7;
                                const todaySessions = d.weekActivity[todayIdx] ?? 0;
                                return (
                                  <>
                                    <span className={`text-4xs font-black px-1.5 py-0.5 rounded-full leading-none ${
                                      todaySessions > 0
                                        ? "bg-[var(--ds-brand-subtle)] text-[var(--ds-text-brand)] border border-[var(--ds-border-brand)]"
                                        : "bg-[var(--ds-surface-card-hover)] text-[var(--ds-text-tertiary)] border border-[var(--ds-border-primary)]"
                                    }`}>
                                      {todaySessions > 0 ? `${todaySessions} today` : "0 today"}
                                    </span>
                                    {d.streak > 0 && (
                                      <span className="text-4xs font-black text-orange-600">🔥 {d.streak}</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </motion.button>
                        {/* Switch button for non-playing children */}
                        {!isPlaying && childrenData.length > 1 && (
                          <button
                            onClick={() => switchPlaying(d.child.id)}
                            className="w-full text-3xs font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/30 px-3 py-1.5 hover:bg-[var(--ds-brand-primary)] hover:text-[var(--ds-nav-bg)] transition text-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-1"
                            style={{ borderRadius: "var(--leaf-r)" }}
                          >
                            {t("switchToChild").replace("{name}", d.child.name)}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-2 pb-3">
                  <button
                    onClick={handleAddKid}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-[var(--ds-border-brand)]/40 text-[var(--ds-brand-primary)] font-black text-xs hover:bg-[var(--ds-brand-subtle)] transition"
                    style={{ borderRadius: "var(--leaf-r)" }}
                  >
                    {childrenData.length >= 1 && !hasSubscription ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {t("addKid")}
                  </button>
                </div>
              </div>
            </aside>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex-1 min-w-0">
          {active && (
            <>
              {/* ═══ MOBILE STICKY VIEWING BAR ═══ */}
              <div className="lg:hidden sticky top-16 z-10 -mx-3 sm:-mx-4 mb-4 px-3 sm:px-4 py-2.5 bg-[var(--ds-surface-card)]/90 backdrop-blur-md border-b border-ds-border flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[var(--ds-surface-card-active)]">
                  <ChildAvatar avatarUrl={active.child.avatar_url} name={active.child.name} size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-ds-text text-sml leading-none truncate">{active.child.name}</p>
                  <p className="text-ds-muted text-3xs font-semibold mt-0.5">
                    {storiesComplete}/{totalStories} stories · {active.streak}🔥 · {active.totalStars}⭐
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-[var(--ds-surface-card-active)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--ds-brand-primary)]"
                      style={{ width: `${totalStories > 0 ? (storiesComplete / totalStories) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ═══ TAB NAV ═══ */}
              <div
                role="tablist"
                aria-label="Parent hub navigation"
                className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide"
              >
                {([
                  { id: "overview",     emoji: "📊", label: t("tabOverview"), badge: null },
                  { id: "stories",      emoji: "📚", label: t("tabStories"),  badge: totalStories > 0 ? `${storiesComplete}/${totalStories}` : null },
                  { id: "achievements", emoji: "🏆", label: t("tabWins"),     badge: (badges.length + certs.length) > 0 ? String(badges.length + certs.length) : null },
                  { id: "learning",     emoji: "🧠", label: "Learning",       badge: null },
                  { id: "airways",      emoji: "✈️", label: "Journey",        badge: null },
                  { id: "settings",     emoji: "⚙️", label: t("tabSettings"), badge: null },
                ] as { id: typeof parentTab; emoji: string; label: string; badge: string | null }[]).map(tab => (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={parentTab === tab.id}
                    aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => setParentTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sml font-baloo font-black transition-all shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-2 ${
                      parentTab === tab.id
                        ? "bg-ds-action text-[var(--ds-nav-bg)] shadow-sm"
                        : "bg-[var(--ds-surface-card)] border border-ds-border text-[var(--ds-text-secondary)] hover:text-ds-text hover:bg-[var(--ds-surface-card-hover)]"
                    }`}
                  >
                    <span aria-hidden="true">{tab.emoji}</span>
                    {tab.label}
                    {tab.badge && (
                      <span className={`ml-0.5 text-4xs font-black px-1.5 py-0.5 rounded-full leading-none ${
                        parentTab === tab.id ? "bg-[var(--ds-surface-card)]/25 text-[var(--ds-nav-bg)]" : "bg-[var(--ds-brand-primary)] text-[var(--ds-nav-bg)]"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ═══ TAB CONTENT ═══ */}
              <AnimatePresence mode="wait">

                {/* ── OVERVIEW TAB ── */}
                {parentTab === "overview" && (
                  <motion.div key="overview"
                    id="tabpanel-overview"
                    role="tabpanel"
                    aria-labelledby="tab-overview"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* ── Family snapshot — top context, multi-child only ── */}
                    {childrenData.length > 1 && (
                      <div>
                        <p className="text-3xs font-black text-ds-muted uppercase tracking-widest mb-2">All Learners</p>
                        <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {childrenData.map((d, i) => {
                            const isPlaying = d.child.id === playingChildId;
                            const isViewing = d.child.id === selectedChild;
                            const done = d.stories.filter(s => s.complete).length;
                            const total = d.stories.length;
                            const pct = total > 0 ? done / total : 0;
                            return (
                              <motion.button
                                key={d.child.id}
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                onClick={() => { setSelectedChild(d.child.id); setParentTab("overview"); }}
                                className={`shrink-0 flex flex-col items-center gap-2 p-3 border-2 transition w-[110px] ${
                                  isViewing
                                    ? "bg-[var(--ds-brand-subtle)] border-[var(--ds-border-brand)]/50"
                                    : "bg-[var(--ds-surface-card)] border-ds-border hover:border-[var(--ds-border-brand)]/40 hover:bg-[var(--ds-surface-card-hover)]"
                                }`}
                                style={{ borderRadius: "var(--leaf-r-lg)" }}
                              >
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-1 ring-[var(--ds-brand-primary)]/30">
                                    <ChildAvatar avatarUrl={d.child.avatar_url} name={d.child.name} size={48} />
                                  </div>
                                  {isPlaying && (
                                    <span className="absolute -bottom-0.5 -right-0.5 text-2xs leading-none bg-[var(--ds-surface-card)] rounded-full p-0.5 shadow-sm">🎮</span>
                                  )}
                                </div>
                                <p className="font-baloo font-black text-xs text-ds-text truncate w-full text-center leading-tight">{d.child.name}</p>
                                <div className="w-full">
                                  <div className="flex justify-between text-4xs font-bold text-ds-muted mb-1">
                                    <span>⭐ {d.totalStars}</span>
                                    <span>🔥 {d.streak}</span>
                                  </div>
                                  <div className="h-1.5 bg-[var(--ds-surface-card-active)] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-[var(--ds-brand-primary)] transition-all" style={{ width: `${pct * 100}%` }} />
                                  </div>
                                  <p className="text-4xs text-ds-muted font-semibold mt-0.5 text-center">{done}/{total} stories</p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── SECTION: TODAY'S SNAPSHOT ── */}
                    <div className="flex items-center gap-3">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">TODAY&apos;S SNAPSHOT</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>

                    {/* Stat strip — calm, consistent */}
                    <div className="bg-[var(--ds-surface-card)] border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4">
                        {[
                          { emoji: "⭐", value: active.totalStars.toLocaleString(), label: "Stars", sub: "all time", numColor: "text-amber-600" },
                          { emoji: "🔥", value: active.streak, label: "Day Streak", sub: active.streak === 1 ? "day in a row" : "days in a row", numColor: "text-orange-600" },
                          { emoji: "📚", value: `${storiesComplete}/${totalStories}`, label: "Adventures", sub: "complete", numColor: "text-[var(--ds-brand-primary)]" },
                          { emoji: "🏆", value: badges.length + certs.length, label: "Wins", sub: `${badges.length} badges · ${certs.length} certs`, numColor: "text-[var(--ds-brand-primary)]" },
                        ].map((s, i) => (
                          <motion.div key={s.label}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className={`flex flex-col items-center justify-center text-center p-4 gap-0.5 border-[var(--ds-border-primary)] ${
                              i % 2 !== 0 ? "border-l" : ""
                            } ${i >= 2 ? "border-t sm:border-t-0" : ""} ${
                              i > 0 ? "sm:border-l" : ""
                            }`}
                          >
                            <span aria-hidden="true" className="text-xl leading-none">{s.emoji}</span>
                            <p className={`font-baloo font-black text-3xl leading-none mt-1 ${s.numColor}`}>{s.value}</p>
                            <p className="font-baloo font-bold text-ds-text text-2xs mt-0.5">{s.label}</p>
                            <p className="text-ds-muted text-4xs font-semibold">{s.sub}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* ── SECTION: LEARNING PROGRESS ── */}
                    <div className="flex items-center gap-3">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">LEARNING PROGRESS</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>

                    {/* LEARNING PROGRESS — grouped container */}
                    <div className="overflow-hidden border border-ds-border shadow-ds-card divide-y divide-[var(--ds-border-primary)]" style={{ borderRadius: "var(--leaf-r-lg)" }}>

                    {/* Weekly Performance Summary */}
                    {(() => {
                      const totalSessions = active.weekActivity.reduce((a, b) => a + b, 0);
                      const activeDays = active.weekActivity.filter(Boolean).length;
                      const estMinutes = totalSessions * 5;
                      const estDisplay = estMinutes >= 60
                        ? `${Math.floor(estMinutes / 60)}h ${estMinutes % 60}m`
                        : `${estMinutes}m`;
                      const perfStars = activeDays >= 5 ? 3 : activeDays >= 3 ? 2 : activeDays >= 1 ? 1 : 0;
                      const perfLabel = ["Not started 😴", "Getting going 🌱", "On track 📈", "On fire! 🔥"][perfStars];
                      const perfColor = ["text-[var(--ds-text-tertiary)]", "text-[var(--ds-text-brand)]", "text-amber-600", "text-orange-600"][perfStars];
                      const perfBg = ["bg-[var(--ds-surface-card-hover)]", "bg-[var(--ds-brand-subtle)]", "bg-amber-50", "bg-orange-50"][perfStars];
                      const perfBorder = ["border-[var(--ds-border-primary)]", "border-[var(--ds-border-brand)]/40", "border-amber-200", "border-orange-200"][perfStars];
                      return (
                        <div className={`${perfBg} p-5`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-baloo font-black text-ds-text text-mbase"><span aria-hidden="true">📅 </span>This Week&apos;s Report</p>
                            <div className="flex items-center gap-2">
                              <span className={`font-black text-xs ${perfColor}`}>{perfLabel}</span>
                              <button
                                onClick={async () => {
                                  const name = active.child.name;
                                  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
                                  const dayLines = active.weekActivity.map((c, i) => c > 0 ? `  ${days[i]}: ${c} session${c !== 1 ? "s" : ""}` : null).filter(Boolean).join("\n");
                                  const text = [
                                    `📊 ${name}'s Weekly Learning Report — NIMIPIKO`,
                                    ``,
                                    `⏱️  ~${estDisplay} of quality learning`,
                                    `📆  ${activeDays}/7 days active`,
                                    `🎯  ${totalSessions} total sessions`,
                                    `🔥  ${active.streak} day streak`,
                                    `⭐  ${active.totalStars} stars earned`,
                                    dayLines ? `\nBreakdown:\n${dayLines}` : "",
                                    ``,
                                    `nimipiko.com`,
                                  ].filter(l => l !== undefined).join("\n");
                                  try {
                                    if (navigator.share) await navigator.share({ title: `${name}'s Weekly Report`, text });
                                    else { await navigator.clipboard.writeText(text); setShareToast(true); setTimeout(() => setShareToast(false), 2500); }
                                  } catch { /* cancelled */ }
                                }}
                                className="flex items-center gap-1 text-2xs font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/30 px-2.5 py-1 rounded-full hover:opacity-80 transition"
                              >
                                {shareToast ? "✅ Copied!" : "📤 Share"}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: "Sessions",  value: totalSessions, icon: "🎯" },
                              { label: "Learning",  value: estDisplay,    icon: "⏱️" },
                              { label: "Days active", value: `${activeDays}/7`,  icon: "📆" },
                            ].map(s => (
                              <div key={s.label} className="text-center">
                                <p className="text-xl leading-none" aria-hidden="true">{s.icon}</p>
                                <p className="font-baloo font-black text-ds-text text-lg mt-1 leading-none">{s.value}</p>
                                <p className="text-ds-muted text-4xs font-semibold mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          {totalSessions === 0 && (
                            <p className="mt-3 text-center text-ds-muted text-2xs font-semibold">
                              No sessions logged yet — open NIMIPIKO together to begin! 🚀
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Today's Activity — daily digest card */}
                    {(() => {
                      const CAT_EMOJI: Record<string, string> = {
                        morning: "🎵", movement: "🤸", artistic: "🎨",
                        histoire: "📖", zoom: "🔍", discovery: "🌍",
                        flipflop: "🎧", coloring: "🦋",
                      };
                      const CAT_LABEL: Record<string, string> = {
                        morning: "Morning Song", movement: "Move & Groove",
                        artistic: "Arts & Crafts", histoire: "Story Time",
                        zoom: "Zoom In", discovery: "Discover",
                        flipflop: "Flip Flop", coloring: "Coloring",
                      };
                      const totalStarsToday = todayActivity.reduce((s, m) => s + m.stars_earned, 0);

                      const handleShare = async () => {
                        const name = active.child.name;
                        const lines = todayActivity.map(m =>
                          `${CAT_EMOJI[m.category] ?? "⭐"} ${CAT_LABEL[m.category] ?? m.category}${m.story_title ? ` — ${m.story_title}` : ""} (+${m.stars_earned}⭐)`
                        );
                        const text = [
                          `${name}'s NIMIPIKO learning today 🌟`,
                          ...lines,
                          `Total: ${totalStarsToday} stars! 🏆`,
                          `nimipiko.com`,
                        ].join("\n");
                        try {
                          if (navigator.share) {
                            await navigator.share({ text });
                          } else {
                            await navigator.clipboard.writeText(text);
                            setShareToast(true);
                            setTimeout(() => setShareToast(false), 2500);
                          }
                        } catch { /* user cancelled */ }
                      };

                      return (
                        <div className="bg-[var(--ds-surface-card)] p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true" className="text-xl">📚</span>
                              <h2 className="font-black text-ds-text text-lg">Today&apos;s Learning</h2>
                            </div>
                            {todayActivity.length > 0 && (
                              <button
                                onClick={handleShare}
                                className="flex items-center gap-1.5 text-xs font-bold text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/30 px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                              >
                                {shareToast ? "✅ Copied!" : "📤 Share"}
                              </button>
                            )}
                          </div>

                          {todayActivity.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-3 text-center">
                              <span aria-hidden="true" className="text-3xl">🌅</span>
                              <p className="font-nunito text-ds-muted text-sml">
                                Nothing yet today — open NIMIPIKO to start the adventure!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {todayActivity.map((m, i) => (
                                <motion.div
                                  key={m.mission_id}
                                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.06 }}
                                  className="flex items-center gap-3 bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/20 px-3.5 py-2.5"
                                  style={{ borderRadius: "var(--leaf-r)" }}
                                >
                                  <span className="text-1.5xl shrink-0">{CAT_EMOJI[m.category] ?? "⭐"}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-black text-ds-text text-sml leading-tight">
                                      {CAT_LABEL[m.category] ?? m.category}
                                    </p>
                                    {m.story_title && (
                                      <p className="font-nunito text-ds-muted text-2xs truncate">{m.story_title}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span className="font-black text-amber-700 text-sml">+{m.stars_earned}</span>
                                  </div>
                                </motion.div>
                              ))}
                              <div className="flex items-center justify-between pt-1 px-0.5">
                                <span className="font-nunito text-ds-muted text-xs">
                                  {todayActivity.length} {todayActivity.length === 1 ? "activity" : "activities"} completed
                                </span>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span className="font-black text-amber-700 text-sm">{totalStarsToday} today</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Today's Learning Goal */}
                    {(() => {
                      const todayIdx = (new Date().getDay() + 6) % 7;
                      const todaySessions = active.weekActivity[todayIdx] ?? 0;
                      const goalPrefs = (() => { try { return JSON.parse(localStorage.getItem("nimipiko-parent-prefs") ?? "{}"); } catch { return {}; } })();
                      const dailyGoal = (goalPrefs.dailyGoal as number) || 2;
                      const pct = Math.min(1, todaySessions / dailyGoal);
                      const done = todaySessions >= dailyGoal;
                      const C = 2 * Math.PI * 28; // r=28
                      return (
                        <div className="bg-[var(--ds-surface-card)] p-5">
                          <div className="flex items-center gap-4">
                            {/* Circular ring */}
                            <div className="relative shrink-0 w-[72px] h-[72px] flex items-center justify-center">
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="36" cy="36" r="28" fill="none" stroke="var(--ds-surface-card-active)" strokeWidth="6" />
                                <motion.circle
                                  cx="36" cy="36" r="28"
                                  fill="none"
                                  stroke="var(--ds-brand-primary)"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                  strokeDasharray={`${C} ${C}`}
                                  initial={{ strokeDashoffset: C }}
                                  animate={{ strokeDashoffset: C * (1 - pct) }}
                                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                />
                              </svg>
                              <div className="text-center z-10">
                                <p className="font-baloo font-black text-[var(--ds-brand-primary)] text-lg leading-none">
                                  {todaySessions}
                                </p>
                                <p className="text-ds-muted text-4xs font-bold leading-none">/{dailyGoal}</p>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-baloo font-black text-ds-text text-base leading-tight">
                                {done ? "🎉 Goal Complete!" : "🎯 Today's Goal"}
                              </p>
                              <p className="text-ds-muted text-xs font-semibold mt-0.5">
                                {done
                                  ? `${active.child.name} hit ${dailyGoal} sessions — great day!`
                                  : `${Math.max(0, dailyGoal - todaySessions)} more ${dailyGoal - todaySessions === 1 ? "session" : "sessions"} to reach the daily target`}
                              </p>
                              {!done && (
                                <div className="mt-2 h-1.5 bg-[var(--ds-surface-card-active)] rounded-full overflow-hidden w-full">
                                  <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-[#2D7A4F] to-[#C9A84C]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct * 100}%` }}
                                    transition={{ duration: 0.7, ease: "easeOut" }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    </div>{/* end LEARNING PROGRESS grouped container */}

                    {/* ── SECTION: CURRENT ADVENTURE ── */}
                    <div className="flex items-center gap-3">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">CURRENT ADVENTURE</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>

                    {/* Current Adventure */}
                    <div className="bg-[var(--ds-surface-card)] border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      {currentStory ? (
                        <>
                          {/* Journey header */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.14em] mb-0.5">
                                <span aria-hidden="true">✈️ </span>Adventure {(active?.stories.findIndex(s => s.unlocked && !s.complete) ?? 0) + 1} of {totalStories}
                              </p>
                              <h2 className="font-baloo font-black text-ds-text text-xl leading-tight">
                                <span aria-hidden="true">{currentStory.theme_emoji} </span>{currentStory.title}
                              </h2>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-baloo font-black text-[var(--ds-brand-primary)] text-2xl leading-none">{missionsComplete}<span className="text-ds-muted font-bold text-lg">/{totalMissions}</span></p>
                              <p className="text-ds-muted text-3xs font-bold mt-0.5">stops done</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                            {active.currentSlots.map(slot => {
                              const iconMap: Record<string, string> = {
                                flipflop_audio: "flipflop", story_pdf: "pdf", coloring: "coloring",
                                move_explore: "move", sing_along: "sing", bonus_video: "video",
                              };
                              return (
                                <div key={slot.slot_key}
                                  className={`flex items-center gap-2.5 p-3 border-2 transition ${
                                    slot.completed
                                      ? "bg-[var(--ds-brand-subtle)] border-[var(--ds-border-brand)]/30"
                                      : "bg-[var(--ds-surface-card-hover)] border-ds-border"
                                  }`}
                                  style={{ borderRadius: 'var(--leaf-r)' }}>
                                  <Image src={`/assets/icon-${iconMap[slot.slot_key] ?? "flipflop"}.svg`}
                                    alt="" width={32} height={32} className="w-8 h-8 rounded-lg shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold truncate ${slot.completed ? "text-ds-text" : "text-[var(--ds-text-tertiary)]"}`}>
                                      {slot.title || slot.slot_key.replace(/_/g, " ")}
                                    </p>
                                  </div>
                                  {slot.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-[var(--ds-brand-primary)] shrink-0" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-ds-border shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="bg-[var(--ds-surface-card-active)] rounded-full h-4 overflow-hidden">
                            <motion.div
                              className="bg-cta-gradient h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${totalMissions > 0 ? (missionsComplete / totalMissions) * 100 : 0}%` }}
                              transition={{ duration: DURATION.loopSpark }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.14em] mb-3">
                            <span aria-hidden="true">✈️ </span>Journey Status
                          </p>
                          <span aria-hidden="true" className="text-4xl">🎉</span>
                          <p className="text-ds-text font-black text-base mt-2">{t("allStoriesCompleted")}</p>
                          <p className="text-[var(--ds-text-secondary)] text-xs">{t("amazingWorkBy").replace("{name}", active.child.name)}</p>
                        </div>
                      )}
                    </div>

                    {/* ── SECTION: WEEKLY ACTIVITY ── */}
                    <div className="flex items-center gap-3">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">WEEKLY ACTIVITY</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>

                    {/* This Week */}
                    <div className="bg-[var(--ds-surface-card)] border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className="text-xl">📅</span>
                          <h2 className="font-black text-ds-text text-lg">This Week</h2>
                        </div>
                        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                          <span aria-hidden="true" className="text-orange-500">🔥</span>
                          <span className="font-black text-orange-700 text-sml">{active.streak}d streak</span>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
                          const count = active.weekActivity[i] ?? 0;
                          const todayIdx = (new Date().getDay() + 6) % 7;
                          const isFuture = i > todayIdx;
                          const isToday = i === todayIdx;
                          const intensity = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3;
                          const bgColors = ["bg-[var(--ds-surface-card-active)]", "bg-[var(--ds-brand-soft)]", "bg-[var(--ds-brand-primary)]/60", "bg-[var(--ds-brand-primary)]"];
                          const textColors = ["text-[var(--ds-text-tertiary)]", "text-[var(--ds-text-brand)]", "text-[var(--ds-nav-bg)]", "text-[var(--ds-nav-bg)]"];
                          return (
                            <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.05, type: "spring" }}
                                className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                                  isFuture ? "bg-[var(--ds-surface-card-hover)] border-2 border-dashed border-[var(--ds-border-primary)]"
                                  : bgColors[intensity]
                                } ${isToday && !isFuture ? "ring-2 ring-offset-1 ring-[var(--ds-brand-primary)]" : ""}`}
                                title={`${count} activities`}>
                                {!isFuture && (
                                  count === 0 ? <span className="text-[var(--ds-text-tertiary)] text-3xs">—</span>
                                  : <span className={textColors[intensity]}>{count}</span>
                                )}
                              </motion.div>
                              <span className={`font-nunito font-bold text-4xs sm:text-3xs ${isToday ? "text-[var(--ds-brand-primary)]" : "text-[var(--ds-text-tertiary)]"}`}>
                                {day}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Summary callout */}
                      {(() => {
                        const activeDays = active.weekActivity.filter(Boolean).length;
                        const totalSessions = active.weekActivity.reduce((a, b) => a + b, 0);
                        if (activeDays === 0) return (
                          <div className="mt-3 flex items-center gap-2 p-3 bg-orange-50 border border-orange-200" style={{ borderRadius: "var(--leaf-r)" }}>
                            <span aria-hidden="true" className="text-xl">🌅</span>
                            <p className="text-orange-700 text-xs font-semibold">No activity yet this week — encourage {active.child.name} to start a story!</p>
                          </div>
                        );
                        if (activeDays >= 5) return (
                          <div className="mt-3 flex items-center gap-2 p-3 bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]" style={{ borderRadius: "var(--leaf-r)" }}>
                            <span aria-hidden="true" className="text-xl">🏆</span>
                            <p className="text-[var(--ds-text-brand)] text-xs font-semibold">{activeDays}/7 days active · {totalSessions} total sessions — incredible week!</p>
                          </div>
                        );
                        return (
                          <div className="mt-3 flex items-center gap-2 p-3 bg-[var(--ds-surface-card)] border border-[var(--ds-border-primary)]" style={{ borderRadius: "var(--leaf-r)" }}>
                            <span aria-hidden="true" className="text-xl">📊</span>
                            <p className="text-[var(--ds-text-secondary)] text-xs font-semibold">{activeDays}/7 days active this week · {totalSessions} sessions completed</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Monthly Activity Calendar */}
                    {(() => {
                      const dates = active.activityDates;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const toStr = (d: Date) =>
                        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      // Build 10 weeks × 7 days grid (70 days back)
                      const WEEKS = 10;
                      const todayDow = (today.getDay() + 6) % 7; // Mon=0
                      const gridStart = new Date(today);
                      gridStart.setDate(today.getDate() - todayDow - (WEEKS - 1) * 7);
                      const weeks: { str: string; active: boolean; future: boolean; today: boolean }[][] = [];
                      for (let w = 0; w < WEEKS; w++) {
                        const week: { str: string; active: boolean; future: boolean; today: boolean }[] = [];
                        for (let d = 0; d < 7; d++) {
                          const day = new Date(gridStart);
                          day.setDate(gridStart.getDate() + w * 7 + d);
                          const str = toStr(day);
                          week.push({ str, active: dates.has(str), future: day > today, today: str === toStr(today) });
                        }
                        weeks.push(week);
                      }
                      const totalActive = Array.from({ length: WEEKS * 7 }, (_, i) => {
                        const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return toStr(d);
                      }).filter(s => dates.has(s)).length;
                      const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
                      return (
                        <div className="bg-[var(--ds-surface-card)] border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true" className="text-xl">🗓️</span>
                              <h2 className="font-black text-ds-text text-lg">Activity Calendar</h2>
                            </div>
                            <span className="text-2xs font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] px-2.5 py-1 rounded-full border border-[var(--ds-border-brand)]/30">
                              {totalActive} {totalActive === 1 ? "day" : "days"} active
                            </span>
                          </div>
                          {/* Grid */}
                          <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                            {/* Day labels column */}
                            <div className="flex flex-col gap-1 shrink-0 pt-5">
                              {DAY_LABELS.map((l, i) => (
                                <div key={i} className="h-5 flex items-center">
                                  <span className="text-4xs font-bold text-ds-muted w-3">{i % 2 === 0 ? l : ""}</span>
                                </div>
                              ))}
                            </div>
                            {weeks.map((week, wi) => {
                              const weekStart = week[0];
                              const showMonth = wi === 0 || new Date(weekStart.str).getDate() <= 7;
                              return (
                                <div key={wi} className="flex flex-col gap-1 shrink-0">
                                  <div className="h-4 flex items-end justify-center">
                                    <span className="text-5xs font-bold text-ds-muted leading-none">
                                      {showMonth ? new Date(weekStart.str).toLocaleString("default", { month: "short" }) : ""}
                                    </span>
                                  </div>
                                  {week.map((day, di) => (
                                    <motion.div
                                      key={di}
                                      title={day.str}
                                      initial={{ scale: 0.7, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: (wi * 7 + di) * 0.003 }}
                                      className={`w-5 h-5 rounded-sm transition-all ${
                                        day.future
                                          ? "bg-[var(--ds-surface-card-hover)] border border-dashed border-[var(--ds-border-primary)]"
                                          : day.active
                                            ? "bg-[var(--ds-brand-primary)] shadow-[0_2px_6px_var(--ds-brand-primary)/40]"
                                            : "bg-[var(--ds-surface-card-active)]"
                                      } ${day.today ? "ring-2 ring-[var(--ds-brand-primary)] ring-offset-1" : ""}`}
                                    />
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                          {/* Legend */}
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ds-border">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--ds-brand-primary)]" />
                              <span className="text-3xs text-ds-muted font-semibold">Active day</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--ds-surface-card-active)]" />
                              <span className="text-3xs text-ds-muted font-semibold">No activity</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-sm ring-2 ring-[var(--ds-brand-primary)] ring-offset-1" />
                              <span className="text-3xs text-ds-muted font-semibold">Today</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── SECTION: ACHIEVEMENTS & WINS ── */}
                    <div className="flex items-center gap-3">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">ACHIEVEMENTS &amp; WINS</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>
                    <div className="bg-[var(--ds-surface-card)] border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                      {/* Recognition strip */}
                      <div className="p-5">
                        <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.12em] mb-3">
                          <span aria-hidden="true">🏆 </span>{active.child.name}&apos;s progress at a glance
                        </p>
                        <div className="flex items-center gap-0 divide-x divide-[var(--ds-border-primary)]">
                          {[
                            { emoji: "⭐", value: active.totalStars.toLocaleString(), label: "Stars" },
                            { emoji: "🏅", value: badges.length, label: badges.length === 1 ? "Badge" : "Badges" },
                            { emoji: "🎓", value: certs.length, label: certs.length === 1 ? "Certificate" : "Certificates" },
                          ].map(item => (
                            <div key={item.label} className="flex-1 flex flex-col items-center gap-1 py-1 text-center">
                              <span aria-hidden="true" className="text-2xl leading-none">{item.emoji}</span>
                              <p className="font-baloo font-black text-[var(--ds-brand-primary)] text-2xl leading-none">{item.value}</p>
                              <p className="text-ds-muted text-3xs font-bold">{item.label}</p>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setParentTab("achievements")}
                          className="mt-4 w-full text-2xs font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/30 py-2 hover:bg-[var(--ds-brand-soft)] transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-1"
                          style={{ borderRadius: "var(--leaf-r)" }}
                        >
                          View all achievements →
                        </button>
                      </div>
                      {/* Feelings — only if available */}
                      {feelings.length > 0 && (
                        <div className="px-5 pb-5 border-t border-[var(--ds-border-primary)] pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span aria-hidden="true" className="text-lg">💭</span>
                            <p className="font-black text-ds-text text-sml">How {active.child.name} felt</p>
                            <span className="ml-auto text-2xs text-ds-muted font-semibold">After each story</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {feelings.slice(0, 4).map((f, i) => (
                              <motion.div key={i}
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.06 }}
                                className="flex items-center gap-3 bg-pink-50 border border-pink-100 px-3 py-2.5"
                                style={{ borderRadius: "var(--leaf-r)" }}
                              >
                                <span className="text-2.5xl shrink-0 leading-none">{f.feeling}</span>
                                <div className="min-w-0">
                                  <p className="font-black text-ds-text text-xs truncate leading-tight">{f.title}</p>
                                  <p className="text-pink-400 text-3xs font-semibold mt-0.5">
                                    {new Date(f.felt_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── SECTION: FOR YOU TO DO ── */}
                    <div className="flex items-center gap-3">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">FOR YOU TO DO</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>

                    {/* Smart Coaching Tip */}
                    {(() => {
                      const todayIdx = (new Date().getDay() + 6) % 7;
                      const todaySessions = active.weekActivity[todayIdx] ?? 0;
                      const goalPrefs = (() => { try { return JSON.parse(localStorage.getItem("nimipiko-parent-prefs") ?? "{}"); } catch { return {}; } })();
                      const dailyGoal = (goalPrefs.dailyGoal as number) || 2;
                      let tip: { emoji: string; title: string; desc: string; cta: string; href: string; bg: string; border: string; text: string };
                      if (todaySessions >= dailyGoal) {
                        tip = { emoji: "🎉", title: "Daily goal reached!", desc: `${active.child.name} completed all ${dailyGoal} sessions today. Celebrate this win!`, cta: "See achievements →", href: "#", bg: "bg-[var(--ds-brand-subtle)]", border: "border-[var(--ds-border-brand)]", text: "text-[var(--ds-text-brand)]" };
                      } else if (todaySessions === 0) {
                        tip = { emoji: "⏰", title: "Start today's learning", desc: `${active.child.name} hasn't practiced yet. Even 10 minutes makes a big difference.`, cta: "Open Stories →", href: "/stories", bg: "bg-[var(--ds-surface-card)]", border: "border-ds-border", text: "text-ds-text" };
                      } else if (active.streak === 0) {
                        tip = { emoji: "🔥", title: "Build a streak today!", desc: `Complete one more activity to start a learning streak — learners love seeing that flame grow.`, cta: "Continue learning →", href: "/stories", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" };
                      } else if (active.streak >= 7) {
                        tip = { emoji: "🌟", title: `${active.streak}-day streak — incredible!`, desc: `${active.child.name} has been consistent all week. Keep going — streaks build lifelong habits.`, cta: "Keep the streak →", href: "/stories", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" };
                      } else {
                        tip = { emoji: "💡", title: `${active.child.name} is making progress!`, desc: `${storiesComplete} ${storiesComplete === 1 ? "story" : "stories"} completed · ${active.totalStars} stars earned. Keep encouraging daily reading.`, cta: "View stories →", href: "/stories", bg: "bg-[var(--ds-brand-subtle)]", border: "border-[var(--ds-border-brand)]", text: "text-[var(--ds-text-brand)]" };
                      }
                      return (
                        <div className={`${tip.bg} border ${tip.border} p-4 flex items-start gap-3`} style={{ borderRadius: "var(--leaf-r-lg)" }}>
                          <span aria-hidden="true" className="text-3.5xl leading-none shrink-0 mt-0.5">{tip.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-baloo font-black text-mbase ${tip.text}`}>{tip.title}</p>
                            <p className="text-ds-muted text-xs font-semibold mt-0.5 leading-snug">{tip.desc}</p>
                            {tip.href !== "#" && (
                              <Link href={tip.href} className={`inline-block mt-2 text-2xs font-black ${tip.text} hover:underline`}>
                                {tip.cta}
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { emoji: "📖", label: "Go to Stories", href: "/stories", color: "bg-[var(--ds-surface-card)] border-ds-border text-ds-text hover:bg-[var(--ds-surface-card-hover)]" },
                        { emoji: "🤖", label: "Talk to Nimi", href: "/talk-to-nimi", color: "bg-[var(--ds-brand-subtle)] border-[var(--ds-border-brand)] text-[var(--ds-text-brand)] hover:bg-[var(--ds-brand-soft)]" },
                        { emoji: "🎯", label: "Challenges", href: "/treasure", color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" },
                      ].map((a, i) => (
                        <motion.a
                          key={a.label} href={a.href}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`flex items-center gap-2 px-4 py-2.5 border font-baloo font-black text-xs shrink-0 transition min-h-[44px] ${a.color}`}
                          style={{ borderRadius: "var(--leaf-r)" }}
                        >
                          <span aria-hidden="true" className="text-base">{a.emoji}</span>
                          {a.label}
                        </motion.a>
                      ))}
                      {childrenData.length > 1 && (
                        <div className="relative shrink-0">
                          <motion.button
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                            onClick={() => setShowSwitchMenu(v => !v)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--ds-border-brand)] bg-[var(--ds-brand-subtle)] text-[var(--ds-text-brand)] hover:bg-[var(--ds-brand-soft)] font-baloo font-black text-xs transition min-h-[44px]"
                            style={{ borderRadius: "var(--leaf-r)" }}
                          >
                            <span aria-hidden="true" className="text-base">🔄</span>
                            Switch Learner
                            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showSwitchMenu ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
                          </motion.button>
                          <AnimatePresence>
                            {showSwitchMenu && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowSwitchMenu(false)} />
                                <motion.div
                                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full left-0 mt-1.5 z-50 bg-[var(--ds-surface-card)] border border-ds-border shadow-xl overflow-hidden min-w-[200px]"
                                  style={{ borderRadius: "var(--leaf-r-lg)" }}
                                >
                                  <p className="px-3 pt-2.5 pb-1 text-4xs font-black text-ds-muted uppercase tracking-widest">Switch learner to</p>
                                  {childrenData
                                    .filter(d => d.child.id !== playingChildId)
                                    .map(d => (
                                      <button
                                        key={d.child.id}
                                        onClick={() => { switchPlaying(d.child.id); setShowSwitchMenu(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--ds-brand-subtle)] transition text-left"
                                      >
                                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[var(--ds-surface-card-active)] flex items-center justify-center">
                                          <ChildAvatar avatarUrl={d.child.avatar_url} name={d.child.name} size={32} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-black text-ds-text text-sml leading-tight truncate">{d.child.name}</p>
                                          <p className="text-ds-muted text-3xs font-semibold">{d.stories.filter(s => s.complete).length}/{d.stories.length} stories · {d.streak}🔥</p>
                                        </div>
                                      </button>
                                    ))
                                  }
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Referral teaser — only if parent has never referred anyone */}
                    {referralCode && referralCount === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/70 p-4 flex items-center gap-4"
                        style={{ borderRadius: "var(--leaf-r-lg)" }}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--ds-brand-primary)] to-[#C9A84C] flex items-center justify-center text-2xl shadow-md shrink-0" aria-hidden="true">🎁</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-baloo font-black text-ds-text text-mbase">Know another parent?</p>
                          <p className="text-ds-muted text-xs font-semibold mt-0.5">Share your code <strong className="text-[var(--ds-brand-primary)]">{referralCode}</strong> — you both get 1 free month when they subscribe!</p>
                        </div>
                        <button
                          onClick={async () => {
                            const text = `Try NIMIPIKO for kids — my invite link: nimipiko.com/invite/${referralCode} 🌿 We both get 1 free month!`;
                            try {
                              if (navigator.share) await navigator.share({ text });
                              else { await navigator.clipboard.writeText(text); setShareToast(true); setTimeout(() => setShareToast(false), 2500); }
                            } catch { /* cancelled */ }
                          }}
                          className="shrink-0 px-3 py-2 min-h-[44px] bg-[var(--ds-brand-primary)] text-[var(--ds-nav-bg)] font-black text-2xs hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-1"
                          style={{ borderRadius: "var(--leaf-r)" }}
                        >
                          {shareToast ? "✅ Copied!" : "Invite"}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ── STORIES TAB ── */}
                {parentTab === "stories" && (
                  <motion.div key="stories"
                    id="tabpanel-stories"
                    role="tabpanel"
                    aria-labelledby="tab-stories"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Journey Progress Header */}
                    {(() => {
                      const pct = totalStories > 0 ? storiesComplete / totalStories : 0;
                      const C = 2 * Math.PI * 36;
                      const langLabel = active.child.language === "fr" ? "French" : active.child.language === "rw" ? "Kinyarwanda" : "English";
                      const milestones = [
                        { at: 0.25, label: "Explorer",  emoji: "🧭" },
                        { at: 0.5,  label: "Halfway",   emoji: "⭐" },
                        { at: 0.75, label: "Champion",  emoji: "🏆" },
                        { at: 1,    label: "Legend",    emoji: "👑" },
                      ];
                      const nextMilestone = milestones.find(m => pct < m.at);
                      return (
                        <div className="bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/40 p-5 flex items-center gap-5 shadow-sm" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                          {/* Ring */}
                          <div className="relative shrink-0 w-[88px] h-[88px] flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="44" cy="44" r="36" fill="none" stroke="var(--ds-brand-soft)" strokeWidth="7" />
                              <motion.circle
                                cx="44" cy="44" r="36"
                                fill="none" stroke="var(--ds-brand-primary)" strokeWidth="7" strokeLinecap="round"
                                strokeDasharray={`${C} ${C}`}
                                initial={{ strokeDashoffset: C }}
                                animate={{ strokeDashoffset: C * (1 - pct) }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                              />
                            </svg>
                            <div className="text-center z-10">
                              <p className="font-baloo font-black text-[var(--ds-brand-primary)] text-xl leading-none">{Math.round(pct * 100)}%</p>
                              <p className="text-[var(--ds-text-brand)] text-4xs font-bold leading-none mt-0.5">done</p>
                            </div>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-baloo font-black text-ds-text text-base leading-tight">
                              {active.child.name}&apos;s {langLabel} Journey
                            </p>
                            <p className="text-[var(--ds-text-brand)] font-bold text-xs mt-0.5">
                              {storiesComplete} of {totalStories} {totalStories === 1 ? "adventure" : "adventures"} complete
                            </p>
                            {nextMilestone && pct < 1 && (
                              <div className="mt-2 flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-[var(--ds-brand-soft)] rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-[var(--ds-brand-primary)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(pct / nextMilestone.at) * 100}%` }}
                                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
                                  />
                                </div>
                                <span className="text-3xs font-black text-[var(--ds-text-brand)] shrink-0">
                                  {nextMilestone.emoji} Next: {nextMilestone.label}
                                </span>
                              </div>
                            )}
                            {pct >= 1 && (
                              <p className="mt-1 text-xs font-black text-[var(--ds-text-brand)]">👑 Full curriculum complete!</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const completed   = active.stories.filter(s => s.complete);
                      const inProgress  = active.stories.filter(s => s.unlocked && !s.complete);
                      const upcoming    = active.stories.filter(s => !s.unlocked);

                      const StoryRow = ({ story, i, isFirst }: { story: typeof active.stories[0]; i: number; isFirst?: boolean }) => {
                        const approxDone = Math.round(story.progress * 6);
                        const approxTotal = 6;
                        return (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className={`flex items-center gap-3 p-3 border-2 ${
                              story.complete
                                ? "bg-[var(--ds-brand-subtle)] border-[var(--ds-border-brand)]/30"
                                : story.unlocked
                                  ? "bg-yellow-50 border-yellow-200"
                                  : "bg-[var(--ds-surface-card-hover)] border-ds-border"
                            }`}
                            style={{ borderRadius: "var(--leaf-r)" }}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shadow-sm shrink-0 ${
                              story.complete ? "bg-[var(--ds-brand-primary)] text-[var(--ds-nav-bg)]" : story.unlocked ? "bg-yellow-500 text-white" : "bg-[var(--ds-border-primary)] text-[var(--ds-text-tertiary)]"
                            }`}>
                              {story.sort_order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-black text-sml truncate leading-tight ${story.unlocked ? "text-ds-text" : "text-[var(--ds-text-tertiary)]"}`}>
                                <span aria-hidden="true">{story.theme_emoji} </span>{story.title}
                              </p>
                              {story.unlocked && !story.complete && (
                                <div className="mt-1.5 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-[var(--ds-surface-card-active)] rounded-full overflow-hidden">
                                      <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${story.progress * 100}%` }} />
                                    </div>
                                    <span className="text-3xs font-black text-yellow-600 shrink-0">~{approxDone}/{approxTotal} activities</span>
                                  </div>
                                </div>
                              )}
                              {!story.unlocked && isFirst && (
                                <p className="text-3xs text-[var(--ds-text-tertiary)] mt-0.5">Unlocks after completing the previous adventure</p>
                              )}
                            </div>
                            {story.complete && (
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span className="text-[var(--ds-text-brand)] text-2xs font-black">✅ Complete</span>
                              </div>
                            )}
                            {!story.unlocked && <Lock className="w-3.5 h-3.5 text-[var(--ds-text-tertiary)] shrink-0" aria-label="Locked" />}
                          </motion.div>
                        );
                      };

                      const Section = ({ label, emoji, children }: { label: string; emoji: string; color?: string; children: React.ReactNode }) => (
                        <div className="bg-[var(--ds-surface-card)] border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-[var(--ds-border-primary)]">
                            <span aria-hidden="true" className="text-base leading-none">{emoji}</span>
                            <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em]">{label}</p>
                          </div>
                          <div className="p-4 space-y-2">{children}</div>
                        </div>
                      );

                      return (
                        <div className="space-y-4">
                          {inProgress.length > 0 && (
                            <Section label={`In Progress · ${inProgress.length}`} emoji="📖" color="text-yellow-700">
                              {inProgress.map((s, i) => <StoryRow key={s.sid} story={s} i={i} />)}
                            </Section>
                          )}
                          {completed.length > 0 && (
                            <Section label={`Completed · ${completed.length}`} emoji="✅" color="text-[var(--ds-text-brand)]">
                              {completed.map((s, i) => <StoryRow key={s.sid} story={s} i={i} />)}
                            </Section>
                          )}
                          {upcoming.length > 0 && (
                            <Section label={`Coming Up · ${upcoming.length}`} emoji="🔒" color="text-[var(--ds-text-secondary)]">
                              {upcoming.map((s, i) => <StoryRow key={s.sid} story={s} i={i} isFirst={i === 0} />)}
                            </Section>
                          )}
                          {active.stories.length === 0 && (
                            <div className="bg-[var(--ds-surface-card)] border border-ds-border p-8 text-center shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                              <p className="text-4xl mb-3" aria-hidden="true">📚</p>
                              <p className="font-black text-ds-text text-mbase">No adventures yet</p>
                              <p className="text-ds-muted text-xs mt-1">Adventures will appear as {active.child.name} starts learning.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}

                {/* ── ACHIEVEMENTS TAB ── */}
                {parentTab === "achievements" && (
                  <motion.div key="achievements"
                    id="tabpanel-achievements"
                    role="tabpanel"
                    aria-labelledby="tab-achievements"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* ── Wins summary header ── */}
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/60 p-5 shadow-sm" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                      <p className="text-3xs font-black text-amber-700 uppercase tracking-[0.14em] mb-3">
                        <span aria-hidden="true">🏆 </span>{active.child.name}&apos;s Achievements
                      </p>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="font-baloo font-black text-2xl text-[var(--ds-brand-primary)] leading-none">{active.totalStars.toLocaleString()}</p>
                          <p className="text-3xs font-bold text-amber-700 mt-0.5"><span aria-hidden="true">⭐</span> Stars</p>
                        </div>
                        <div className="w-px h-8 bg-amber-200" />
                        <div className="text-center">
                          <p className="font-baloo font-black text-2xl text-amber-600 leading-none">{badges.length}</p>
                          <p className="text-3xs font-bold text-amber-700 mt-0.5"><span aria-hidden="true">🏅</span> {badges.length === 1 ? "Badge" : "Badges"}</p>
                        </div>
                        <div className="w-px h-8 bg-amber-200" />
                        <div className="text-center">
                          <p className="font-baloo font-black text-2xl text-amber-600 leading-none">{certs.length}</p>
                          <p className="text-3xs font-bold text-amber-700 mt-0.5"><span aria-hidden="true">🎓</span> {certs.length === 1 ? "Certificate" : "Certificates"}</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Visual badge showcase ── */}
                    <div className="bg-[var(--ds-surface-card)] border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className="text-xl">🏅</span>
                          <h2 className="font-black text-ds-text text-lg">Badges Earned</h2>
                        </div>
                        <span className="text-xs font-bold text-ds-muted">{badges.length} badge{badges.length !== 1 ? "s" : ""}</span>
                      </div>
                      {badges.length > 0 ? (
                        <>
                          {/* Celebration bar */}
                          <div className="w-full h-1.5 bg-[var(--ds-surface-card-active)] rounded-full mb-5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (badges.length / Math.max(badges.length + 2, 5)) * 100)}%` }}
                              transition={{ duration: 0.9, ease: "easeOut" }}
                            />
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {badges.map((b, i) => {
                              const meta = resolveBadgeMeta(b.slug);
                              return (
                              <motion.div key={b.slug + i}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 18 }}
                                className="flex flex-col items-center gap-2 text-center"
                              >
                                <motion.div
                                  animate={m.reduced ? {} : { y: [0, -3, 0] }}
                                  transition={m.reduced ? {} : { duration: 2.8, repeat: Infinity, delay: i * 0.2 }}
                                  className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-amber-300 to-yellow-500 ring-[3px] ring-amber-400 shadow-[0_6px_20px_rgba(251,191,36,0.45)] relative"
                                >
                                  <span className="text-3xl leading-none select-none" aria-hidden="true">{meta.emoji}</span>
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--ds-brand-primary)] rounded-full flex items-center justify-center shadow-sm">
                                    <span className="text-5xs text-white font-black">✓</span>
                                  </div>
                                </motion.div>
                                <p className="font-nunito font-bold text-2xs text-ds-text leading-tight max-w-[72px]">{meta.label}</p>
                                <p className="text-4xs text-ds-muted">
                                  {new Date(b.earned_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </p>
                              </motion.div>
                              );
                            })}
                            {/* "Next" placeholder */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: badges.length * 0.06 + 0.1, type: "spring" }}
                              className="flex flex-col items-center gap-2 text-center"
                            >
                              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--ds-surface-card-active)] ring-[3px] ring-gray-200 ring-dashed opacity-60">
                                <span className="text-2xl" aria-hidden="true">🔒</span>
                              </div>
                              <p className="font-nunito font-bold text-2xs text-ds-muted leading-tight">Next badge</p>
                              <p className="text-4xs text-ds-muted">Keep learning!</p>
                            </motion.div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <motion.div
                            animate={m.reduced ? {} : { rotate: [0, -8, 8, 0] }}
                            transition={m.reduced ? {} : { duration: 2, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Image src={assets.starMascot} alt="" width={64} height={64} className="w-16 h-16 mx-auto mb-3 opacity-40" />
                          </motion.div>
                          <p className="text-ds-text font-black text-mbase mb-1">No badges yet</p>
                          <p className="text-[var(--ds-text-tertiary)] text-xs font-nunito">
                            Complete adventures to earn the first badge!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Certificates ── */}
                    {certs.length > 0 && (
                      <div className="bg-[var(--ds-surface-card)] border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <span aria-hidden="true" className="text-xl">🎓</span>
                          <h2 className="font-black text-ds-text text-lg">Certificates</h2>
                          <span className="ml-auto text-xs font-bold text-ds-muted">{certs.length} earned</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {certs.map((c, i) => {
                            const withoutLang = c.slug.replace(/-(?:en|fr|rw)$/, "");
                            const withoutCert = withoutLang.replace(/-certificate$/, "");
                            const withoutStory = withoutCert.replace(/^story-/, "");
                            const certLabel = withoutStory.replace(/-/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());
                            return (
                            <motion.div key={c.slug}
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                              className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60"
                              style={{ borderRadius: "var(--leaf-r)" }}
                            >
                              {/* Mini cert thumbnail */}
                              <div className="w-11 h-14 rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 flex flex-col items-center justify-center gap-0.5 shrink-0 shadow-sm border border-amber-400/40">
                                <span className="text-white text-xl leading-none">🎓</span>
                                <div className="w-7 h-px bg-[var(--ds-surface-card)]/60" />
                                <div className="w-5 h-px bg-[var(--ds-surface-card)]/40" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-ds-text text-sml font-black leading-tight truncate">{certLabel}</p>
                                <p className="text-amber-600 text-3xs font-semibold mt-0.5 uppercase">{c.language}</p>
                                <p className="text-ds-muted text-3xs mt-0.5">{new Date(c.earned_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                            </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── How They Felt ── */}
                    {feelings.length > 0 && (
                      <div className="bg-[var(--ds-surface-card)] border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <span aria-hidden="true" className="text-xl">💭</span>
                          <h2 className="font-black text-ds-text text-lg">How They Felt</h2>
                          <span className="text-[var(--ds-text-tertiary)] text-xs font-semibold ml-auto">After each story</span>
                        </div>
                        <div className="space-y-2">
                          {feelings.map((f, i) => (
                            <motion.div key={i}
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-3 bg-pink-50 border border-pink-100 px-4 py-3"
                              style={{ borderRadius: 'var(--leaf-r)' }}>
                              <span className="text-3xl shrink-0">{f.feeling}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-ds-text text-sml truncate">{f.title}</p>
                                <p className="text-[var(--ds-text-tertiary)] text-2xs">{new Date(f.felt_at).toLocaleDateString()}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}

                {/* ── LEARNING TAB ── */}
                {parentTab === "learning" && (
                  <div id="tabpanel-learning" role="tabpanel" aria-labelledby="tab-learning">
                    <LearningBrainTab
                      childId={active.child.id}
                      language={active.child.language}
                      childName={active.child.name}
                    />
                  </div>
                )}

                {/* ── AIRWAYS TAB ── */}
                {parentTab === "airways" && (
                  <motion.div key="airways"
                    id="tabpanel-airways"
                    role="tabpanel"
                    aria-labelledby="tab-airways"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* ── Journey monitoring section ── */}
                    {(() => {
                      const completed  = active.stories.filter(s => s.complete);
                      const current    = active.stories.find(s => s.unlocked && !s.complete);
                      const next       = active.stories.find(s => !s.unlocked);
                      const pct        = totalStories > 0 ? storiesComplete / totalStories : 0;
                      const C          = 2 * Math.PI * 28;
                      return (
                        <div className="bg-[var(--ds-surface-card)] border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true" className="text-xl">🗺️</span>
                              <h2 className="font-baloo font-black text-ds-text text-base">{active.child.name}&apos;s Learning Journey</h2>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                              <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--ds-brand-soft)" strokeWidth="5" />
                                <motion.circle cx="32" cy="32" r="28" fill="none" stroke="var(--ds-brand-primary)"
                                  strokeWidth="5" strokeLinecap="round"
                                  strokeDasharray={`${C} ${C}`}
                                  initial={{ strokeDashoffset: C }}
                                  animate={{ strokeDashoffset: C * (1 - pct) }}
                                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                />
                              </svg>
                              <div className="text-right" style={{ marginLeft: -44, zIndex: 1, position: "relative" }}>
                                <p className="font-baloo font-black text-[var(--ds-brand-primary)] text-base leading-none">{Math.round(pct * 100)}%</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {/* Completed */}
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-[var(--ds-brand-subtle)] border-2 border-[var(--ds-border-brand)]/50 flex items-center justify-center shrink-0">
                                <span aria-hidden="true" className="text-base">✅</span>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-3xs font-black text-[var(--ds-text-brand)] uppercase tracking-[0.12em]">Completed</p>
                                {completed.length > 0 ? (
                                  <p className="text-sml font-bold text-ds-text mt-0.5">{completed.length} {completed.length === 1 ? "adventure" : "adventures"} done</p>
                                ) : (
                                  <p className="text-sml text-[var(--ds-text-tertiary)] mt-0.5">None yet</p>
                                )}
                              </div>
                            </div>
                            {/* Current */}
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center shrink-0">
                                <span aria-hidden="true" className="text-base">📖</span>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-3xs font-black text-yellow-700 uppercase tracking-[0.12em]">Current Adventure</p>
                                {current ? (
                                  <>
                                    <p className="text-sml font-bold text-ds-text mt-0.5 truncate">
                                      <span aria-hidden="true">{current.theme_emoji} </span>{current.title}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-yellow-100 rounded-full overflow-hidden">
                                        <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${current.progress * 100}%` }} />
                                      </div>
                                      <span className="text-3xs font-black text-yellow-600 shrink-0">{Math.round(current.progress * 100)}%</span>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-sml text-[var(--ds-text-tertiary)] mt-0.5">No active adventure</p>
                                )}
                              </div>
                            </div>
                            {/* Next */}
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-[var(--ds-surface-card-hover)] border-2 border-[var(--ds-border-primary)] flex items-center justify-center shrink-0 opacity-60">
                                <span aria-hidden="true" className="text-base">🔒</span>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-3xs font-black text-[var(--ds-text-tertiary)] uppercase tracking-[0.12em]">Up Next</p>
                                {next ? (
                                  <p className="text-sml font-bold text-[var(--ds-text-secondary)] mt-0.5 truncate opacity-70">
                                    <span aria-hidden="true">{next.theme_emoji} </span>{next.title}
                                  </p>
                                ) : pct >= 1 ? (
                                  <p className="text-sml font-black text-[var(--ds-text-brand)] mt-0.5"><span aria-hidden="true">👑 </span>All adventures complete!</p>
                                ) : (
                                  <p className="text-sml text-[var(--ds-text-tertiary)] mt-0.5">Nothing locked yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Travel Documents header ── */}
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">Travel Documents</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>

                    {/* Boarding pass inline preview */}
                    {hasSubscription && (
                      <div className="overflow-hidden border border-[var(--ds-border-primary)] bg-[var(--ds-surface-card)]" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                        <div className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--ds-border)]">
                          <p className="font-black text-ds-text text-4xs uppercase tracking-widest">Boarding Pass Preview</p>
                          {boardingPassPreviewLoading && (
                            <Loader2 className="w-3 h-3 animate-spin text-[var(--ds-text-secondary)]" />
                          )}
                        </div>
                        {boardingPassPreview ? (
                          <img
                            src={boardingPassPreview}
                            alt={`${active.child.name}'s boarding pass`}
                            className="w-full block"
                            style={{ maxHeight: 340, objectFit: "contain", background: "#f9f9f9" }}
                          />
                        ) : boardingPassPreviewLoading ? (
                          <div className="h-40 flex items-center justify-center text-[var(--ds-text-secondary)] text-4xs">
                            Generating preview…
                          </div>
                        ) : (
                          <div className="h-40 flex flex-col items-center justify-center gap-2 text-[var(--ds-text-secondary)]">
                            <span className="text-3xl" aria-hidden="true">🎫</span>
                            <p className="text-4xs">Boarding pass preview</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subscription gate notice */}
                    {!hasSubscription && (
                      <div className="flex items-start gap-3 px-4 py-3 border border-amber-200 bg-amber-50" style={{ borderRadius: "var(--leaf-r-lg)" }}>
                        <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-amber-800 font-black text-xs">Premium feature</p>
                          <p className="text-amber-700 text-4xs mt-0.5">Subscribe to download {active.child.name}&apos;s passport, boarding pass, and stamp collection.</p>
                        </div>
                      </div>
                    )}

                    {/* Document cards */}
                    {([
                      {
                        key:    "passport",
                        emoji:  "📘",
                        title:  "Passport",
                        desc:   `${storiesComplete > 0 ? storiesComplete : "0"} spread${storiesComplete !== 1 ? "s" : ""} · stamp collection inside`,
                        href:   `/api/airways/passport?childId=${active.child.id}`,
                        accent: "#1A7A3E",
                        bg:     "from-[var(--ds-brand-primary)]/10 to-teal-500/5",
                        border: "border-[var(--ds-border-brand)]/70",
                        slow:   true,
                      },
                      {
                        key:    "boarding-pass",
                        emoji:  "🎫",
                        title:  "Boarding Pass",
                        desc:   "Personalised travel card",
                        href:   `/api/airways/boarding-pass?childId=${active.child.id}`,
                        accent: "#1A3558",
                        bg:     "from-sky-500/10 to-blue-500/5",
                        border: "border-sky-200/70",
                        slow:   false,
                      },
                      {
                        key:    "stamps",
                        emoji:  "📮",
                        title:  "Stamp Collection",
                        desc:   `${storiesComplete} of ${totalStories} stamps earned`,
                        href:   `/api/airways/stamps?childId=${active.child.id}`,
                        accent: "#1A3558",
                        bg:     "from-[#1A3558]/10 to-[#06101F]/5",
                        border: "border-[#1A3558]/30",
                        slow:   false,
                      },
                      {
                        key:    "badge",
                        emoji:  "🏅",
                        title:  "Attitude Badge",
                        desc:   "Champion portrait badge",
                        href:   `/api/airways/badge?childId=${active.child.id}`,
                        accent: "#C9A84C",
                        bg:     "from-amber-500/10 to-yellow-500/5",
                        border: "border-amber-200/70",
                        slow:   true,
                        warn:   active.child.attitude ? undefined : "No custom attitude set — Story 1 default used. Customize in Admin → Curriculum → Stories.",
                      },
                      {
                        key:    "kit",
                        emoji:  "🧳",
                        title:  "Champion Kit",
                        desc:   "Full identity card — name, story, barcode",
                        href:   `/api/airways/kit?childId=${active.child.id}`,
                        accent: "#0D1B30",
                        bg:     "from-slate-500/10 to-gray-500/5",
                        border: "border-slate-200/70",
                        slow:   false,
                      },
                    ] as { key: string; emoji: string; title: string; desc: string; href: string; accent: string; bg: string; border: string; slow: boolean; warn?: string }[]).map(doc => {
                      const locked = !hasSubscription;
                      const busy   = airwaysDownloading === doc.key;
                      return (
                        <div key={doc.key}
                          className={`flex items-center gap-4 p-4 border bg-gradient-to-br ${doc.bg} ${doc.border}`}
                          style={{ borderRadius: "var(--leaf-r-lg)" }}
                        >
                          <div className="text-3xl shrink-0" aria-hidden="true">{doc.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-ds-text text-sml leading-none">{doc.title}</p>
                            <p className="text-[var(--ds-text-secondary)] text-4xs mt-0.5">{doc.desc}</p>
                            {doc.slow && (
                              <p className="text-[var(--ds-text-secondary)] text-4xs mt-0.5 opacity-60">May take ~30 s to generate</p>
                            )}
                            {doc.warn && (
                              <p className="text-amber-600 dark:text-amber-400 text-4xs mt-1 leading-snug">{doc.warn}</p>
                            )}
                          </div>
                          <button
                            disabled={locked || busy}
                            onClick={async () => {
                              if (locked) return;
                              setAirwaysDownloading(doc.key);
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                const res = await fetch(doc.href, {
                                  headers: session?.access_token
                                    ? { Authorization: `Bearer ${session.access_token}` }
                                    : {},
                                });
                                if (!res.ok) {
                                  let msg = "Download failed";
                                  try { const j = await res.json(); msg = j.error ?? msg; } catch {}
                                  throw new Error(msg);
                                }
                                const blob = await res.blob();
                                const url  = URL.createObjectURL(blob);
                                const a    = document.createElement("a");
                                a.href     = url;
                                const cd   = res.headers.get("Content-Disposition") ?? "";
                                const m    = cd.match(/filename="([^"]+)"/);
                                a.download = m?.[1] ?? `${doc.key}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                // Delay revoke — Firefox reads the blob URL asynchronously
                                // after click(); revoking synchronously produces an empty file.
                                setTimeout(() => URL.revokeObjectURL(url), 1000);
                              } catch (e) {
                                const msg = e instanceof Error ? e.message : "Download failed";
                                setAirwaysError(msg);
                                setTimeout(() => setAirwaysError(null), 6000);
                              } finally {
                                setAirwaysDownloading(null);
                              }
                            }}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-white text-4xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary)] focus-visible:ring-offset-1 ${
                              locked ? "bg-gray-300 cursor-not-allowed opacity-60"
                              : busy  ? "opacity-70 cursor-wait"
                              : "hover:opacity-90 active:scale-95"
                            }`}
                            style={locked ? { borderRadius: "var(--leaf-r)" } : { background: doc.accent, borderRadius: "var(--leaf-r)" }}
                          >
                            {locked ? (
                              <><Lock className="w-3 h-3" /> Locked</>
                            ) : busy ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                            ) : (
                              <><span aria-hidden="true">⬇</span> Download</>
                            )}
                          </button>
                        </div>
                      );
                    })}

                  </motion.div>
                )}

                {/* ── SETTINGS TAB ── */}
                {parentTab === "settings" && (
                  <motion.div key="settings"
                    id="tabpanel-settings"
                    role="tabpanel"
                    aria-labelledby="tab-settings"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Section heading */}
                    <div className="flex items-center gap-3">
                      <p className="text-3xs font-black text-ds-muted uppercase tracking-[0.16em] shrink-0">Controls & Preferences</p>
                      <div className="flex-1 h-px bg-[var(--ds-border-primary)]" />
                    </div>
                    {/* Controls */}
                    <ParentControls
                      childId={active.child.id}
                      parentId={parentUserId ?? ""}
                      childName={active.child.name}
                      childLanguage={active.child.language as "en" | "fr" | "rw"}
                      onLanguageChange={(lang) => {
                        setChildrenData(prev => prev.map(d =>
                          d.child.id === active.child.id
                            ? { ...d, child: { ...d.child, language: lang } }
                            : d
                        ));
                      }}
                    />

                    {/* Learning Reminders */}
                    <PushNotificationsCard push={push} childName={active.child.name} />

                    {/* Referral */}
                    <ReferralCard
                      code={referralCode}
                      referralCount={referralCount}
                      rewardsEarned={referralRewards}
                      codeError={referralCodeError}
                      onRetry={async () => {
                        setReferralCodeError(false);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session?.access_token) return;
                          const res = await fetch("/api/referral", {
                            headers: { Authorization: `Bearer ${session.access_token}` },
                          });
                          const json = await res.json();
                          if (json.code) { setReferralCode(json.code); setReferralCodeError(false); }
                          else setReferralCodeError(true);
                        } catch { setReferralCodeError(true); }
                      }}
                    />
                  </motion.div>
                )}

              </AnimatePresence>
            </>
          )}
            </div>{/* end main content */}
          </div>{/* end lg:flex */}
        </div>{/* end page body */}

        {/* ── Parent profile editor ── */}
        <EditProfileSheet
          isOpen={editParentOpen}
          onClose={() => setEditParentOpen(false)}
          onSave={async (newName, newAvatarUrl) => {
            localStorage.setItem("nimipiko-parent-avatar", newAvatarUrl);
            setParentAvatarUrl(newAvatarUrl);
            const trimmed = newName.trim();
            if (trimmed && trimmed !== parentName) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from("parents").upsert({ id: user.id, name: trimmed }, { onConflict: "id" });
              }
              setParentName(trimmed);
            }
          }}
          initialName={parentName}
          initialAvatarUrl={parentAvatarUrl}
        />

        {showAddChild && (
          <CreateChildModal
            onCreated={async (child) => {
              setShowAddChild(false);
              const [stories, achievements, dates, stars, weekActivity] = await Promise.all([
                getStoryLibrary(child.id, child.language),
                getChildAchievements(child.id),
                getActivityDates(child.id, child.language),
                getTotalStars(child.id, child.language),
                getWeekActivityCounts(child.id, child.language),
              ]);
              const current = stories.find(s => s.unlocked && !s.complete) ?? stories[stories.length - 1];
              const slots = current ? await getStorySlots(child.id, current.sid, child.language) : [];
              setChildrenData(prev => [...prev, {
                child, stories, currentSlots: slots, achievements,
                streak: computeStreaks(dates).current,
                totalStars: stars,
                weekActivity,
                cosmetics: { nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null },
              activityDates: new Set<string>(),
              }]);
              setSelectedChild(child.id);
            }}
            onClose={() => setShowAddChild(false)}
          />
        )}
        {showUpdateCard && (
          <UpdateCardModal
            onClose={() => setShowUpdateCard(false)}
            onSuccess={() => {
              // Refresh subscription status after card update
              setSubscription(prev => prev ? { ...prev, status: "active" } : null);
            }}
          />
        )}
      </PageSurface>
    </AppShell>
  );
}

