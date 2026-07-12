"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { DURATION, EASE } from "@/lib/design-system/motion";
import { Star, CheckCircle2, Lock, ChevronRight, Plus } from "lucide-react";
import ParentControls from "@/components/parents/ParentControls";
import ReferralCard from "@/components/parents/ReferralCard";
import AppShell from "@/components/layout/AppShell";
import CreateChildModal from "@/components/home/CreateChildModal";
import MagicLoader from "@/components/magic/MagicLoader";
import supabase from "@/lib/supabaseClient";
import { getChildren, getChildAchievements, getActivityDates, getTotalStars, getWeekActivityCounts, getChildCosmetics, type Child, type ChildAchievement, type ChildCosmetics } from "@/lib/queries";
import { getStoryLibrary, getStorySlots } from "@/lib/storyRepository";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { getActiveSubscription } from "@/lib/payments/products";
import { computeStreaks } from "@/lib/parentInsights";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import EditProfileSheet from "@/components/profile/EditProfileSheet";

const NAME_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f97316","#10b981","#3b82f6","#ef4444","#f59e0b"];
function nameToColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
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
}

export default function ParentsZonePage() {
  const { themeId } = useAppTheme();
  const m = useThemeMotion();
  const assets = getThemeAssets(themeId);
  const push = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState("Parent");
  const [childrenData, setChildrenData] = useState<ChildData[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [feelings, setFeelings] = useState<{ story_id: string; title: string; feeling: string; felt_at: string }[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralRewards, setReferralRewards] = useState(0);
  const [parentTab, setParentTab] = useState<"overview" | "stories" | "achievements" | "settings">("overview");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [parentAvatarUrl, setParentAvatarUrl] = useState<string | null>(null);
  const [editParentOpen, setEditParentOpen] = useState(false);
  const [playingChildId, setPlayingChildId] = useState<string | null>(null);
  const [switched, setSwitched] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: parentRow } = await supabase.from("parents").select("name").eq("id", user.id).maybeSingle();
      if (parentRow?.name) setParentName(parentRow.name);

      // Subscription status
      const sub = await getActiveSubscription(user.id);
      setHasSubscription(!!sub);

      const children = await getChildren();
      if (children.length === 0) { setLoading(false); return; }

      const results: ChildData[] = [];
      for (const child of children) {
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
        results.push({
          child, stories, currentSlots: slots, achievements,
          streak: computeStreaks(dates).current,
          totalStars: stars,
          weekActivity,
          cosmetics: cos,
        });
      }
      setChildrenData(results);
      const activeId = typeof window !== "undefined" ? localStorage.getItem("nimipiko_active_child") : null;
      const pid = results.find(r => r.child.id === activeId)?.child.id ?? results[0]?.child.id ?? null;
      setPlayingChildId(pid);
      setSelectedChild(pid ?? results[0]?.child.id ?? null);

      // Fetch recent story feelings across all children
      if (results.length > 0) {
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
      }

      // Referral code + stats
      const [codeRes, redemptionsRes] = await Promise.all([
        fetch("/api/referral").then(r => r.json()).catch(() => ({})),
        supabase
          .from("referral_redemptions")
          .select("id, reward_granted_at")
          .eq("referrer_id", user.id),
      ]);
      if (codeRes.code) setReferralCode(codeRes.code);
      const redemptions = redemptionsRes.data ?? [];
      setReferralCount(redemptions.length);
      setReferralRewards(redemptions.filter(r => r.reward_granted_at).length);

      setLoading(false);
    })();
  }, []);

  const active = childrenData.find(d => d.child.id === selectedChild);

  if (loading) {
    return (
      <AppShell>
        <MagicLoader variant="default" />
      </AppShell>
    );
  }

  if (childrenData.length === 0) {
    return (
      <AppShell>
        <PageSurface className="items-center justify-center gap-4 px-4">
          <span className="text-5xl">👶</span>
          <p className="text-ds-text font-bold text-center text-[16px]">No children profiles yet</p>
          <Link href="/home" className="text-white font-black px-6 py-3 shadow-lg text-[14px]" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}>
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
      <PageSurface>

        {/* ═══ HERO ═══ */}
        <HeroBanner zone="familyHub" className="shadow-ds-card">
          <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-white/8 pointer-events-none" />
          <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6 flex items-center gap-4">

            {/* Parent avatar */}
            <div className="relative shrink-0">
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full bg-white/30"
                animate={{ scale: [1, 1.14, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
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
                  <span className="font-baloo font-black text-white text-[28px] sm:text-[34px] select-none">
                    {parentInitial}
                  </span>
                )}
              </motion.button>

              {/* Edit pencil badge */}
              <motion.button
                onClick={() => setEditParentOpen(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform"
                whileHover={{ rotate: -10 }}
                aria-label="Edit profile"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={parentColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </motion.button>
            </div>

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-white/55 text-[10px] font-nunito font-bold uppercase tracking-[0.14em] mb-0.5">Family Hub</p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value.slice(0, 32))}
                    onKeyDown={e => { if (e.key === "Enter") void handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="font-baloo font-black text-[22px] bg-white/20 text-white placeholder-white/50 border-b-2 border-white/60 focus:outline-none focus:border-white rounded px-1 min-w-0 flex-1"
                    placeholder={parentName}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => void handleSaveName()}
                    disabled={savingName}
                    className="shrink-0 px-3 py-1 rounded-full bg-white/25 text-white text-[12px] font-black hover:bg-white/35 transition disabled:opacity-50"
                  >
                    {savingName ? "…" : "Save"}
                  </button>
                  <button onClick={() => setEditingName(false)} className="shrink-0 text-white/60 hover:text-white text-[12px]">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setNameInput(parentName); setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 60); }}
                  className="group flex items-center gap-2"
                >
                  <h1 className="font-baloo font-black text-white text-[24px] sm:text-[28px] leading-tight truncate">
                    {parentName}
                  </h1>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-70 transition-opacity shrink-0">
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              <p className="text-white/70 text-[13px] font-nunito mt-0.5">
                {childrenData.length} {childrenData.length === 1 ? "learner" : "learners"} · Parents Zone
              </p>
            </div>

            {/* Sub status pill */}
            {hasSubscription ? (
              <Link href="/pricing" className="shrink-0">
                <div className="bg-white/20 border border-white/30 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                  <span className="text-[14px]">👑</span>
                  <span className="text-white text-[10px] font-black">CLUB</span>
                </div>
              </Link>
            ) : (
              <Link href="/pricing" className="shrink-0">
                <div className="bg-white/20 border border-white/30 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/30 transition">
                  <span className="text-[14px]">🚀</span>
                  <span className="text-white text-[10px] font-black">UPGRADE</span>
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
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-[13px] font-black shadow-xl"
            >
              {`🎮 Switched to ${childrenData.find(d => d.child.id === playingChildId)?.child.name ?? "kid"} — whole app updated!`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ PAGE BODY: sidebar + content ═══ */}
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 pt-5 pb-24 flex-1 w-full">

          {/* Subscription banner — full on mobile, hidden on desktop (in sidebar) */}
          <div className="lg:hidden mb-5">
            {hasSubscription ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden border border-violet-200/80 bg-gradient-to-r from-violet-50/95 to-purple-50/90 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0">👑</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-ds-text text-[15px]">NIMIPIKO Club Active</p>
                    <p className="text-violet-600 text-[11px] font-bold">All premium stories unlocked ✓</p>
                  </div>
                  <Link href="/pricing"><ChevronRight className="w-4 h-4 text-violet-500" /></Link>
                </div>
              </motion.div>
            ) : (
              <Link href="/pricing">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }} whileTap={m.buttonPress}
                  className="overflow-hidden border border-yellow-200/80 bg-gradient-to-r from-yellow-50/95 to-orange-50/90 shadow-ds-card cursor-pointer" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0">🚀</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-baloo font-black text-ds-text text-[15px]">Unlock Premium</p>
                      <p className="text-gray-500 text-[11px]">All stories · All languages</p>
                    </div>
                    <span className="bg-yellow-400 text-black font-black text-[11px] px-3 py-1 shrink-0" style={{ borderRadius: 'var(--leaf-r-sm)' }}>See Plans</span>
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
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 font-bold text-[13px] transition border-2 ${
                      isSelected ? "text-white shadow-sm" : "bg-white text-ds-text border-ds-border hover:bg-gray-50"
                    }`}
                    style={{ borderRadius: 'var(--leaf-r)', ...(isSelected ? { backgroundColor: 'var(--nimi-green)', borderColor: 'var(--nimi-green)' } : {}) }}>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/20 flex items-center justify-center">
                      <ChildAvatar avatarUrl={d.child.avatar_url} name={d.child.name} size={32} />
                      {isPlaying && (
                        <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">🎮</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-black leading-none">{d.child.name}</p>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? "text-white/75" : "text-gray-400"}`}>
                        {isPlaying ? "Now playing" : `${d.stories.filter(s => s.complete).length}/${d.stories.length} stories`}
                      </p>
                    </div>
                  </motion.button>
                  {/* Switch button — only show on non-playing child when there's more than one */}
                  {!isPlaying && childrenData.length > 1 && (
                    <button
                      onClick={() => switchPlaying(d.child.id)}
                      className="text-[10px] font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/40 px-2 py-1 text-center hover:bg-[var(--ds-brand-primary)] hover:text-white transition"
                      style={{ borderRadius: 'var(--leaf-r-sm)' }}
                    >
                      Switch to this kid
                    </button>
                  )}
                </div>
              );
            })}
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: childrenData.length * 0.07 }}
              onClick={() => setShowAddChild(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 font-black text-[13px] bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] border-2 border-dashed border-[var(--ds-border-brand)]/40 transition shrink-0 self-start"
              style={{ borderRadius: 'var(--leaf-r)' }}>
              <Plus className="w-4 h-4" /> Add Kid
            </motion.button>
          </div>

          {/* ── Desktop: sidebar + main ── */}
          <div className="lg:flex lg:gap-6 lg:items-start">

            {/* ─── SIDEBAR (desktop only) ─── */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 shrink-0 gap-4 sticky top-20">

              {/* Subscription */}
              {hasSubscription ? (
                <div className="overflow-hidden border border-violet-200/80 bg-gradient-to-r from-violet-50 to-purple-50 shadow-ds-card p-4 flex items-center gap-3" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0">👑</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-ds-text text-[13px]">Club Active</p>
                    <p className="text-violet-600 text-[10px] font-bold">All stories unlocked ✓</p>
                  </div>
                  <Link href="/pricing"><ChevronRight className="w-4 h-4 text-violet-400" /></Link>
                </div>
              ) : (
                <Link href="/pricing">
                  <div className="overflow-hidden border border-yellow-200/80 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-ds-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                    <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0">🚀</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-ds-text text-[13px]">Go Premium</p>
                      <p className="text-gray-500 text-[10px]">All stories · All languages</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-yellow-600 shrink-0" />
                  </div>
                </Link>
              )}

              {/* Child cards */}
              <div className="bg-white border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-black text-ds-muted uppercase tracking-widest">My Kids</p>
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
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                            isActive
                              ? "bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/40"
                              : "hover:bg-gray-50 border border-transparent"
                          }`}
                        >
                          <div className={`relative w-10 h-10 rounded-full overflow-visible shrink-0 flex items-center justify-center`}>
                            <div className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition-all ${isActive ? "ring-[var(--ds-brand-primary)]/40" : "ring-gray-200"}`}>
                              <ChildAvatar avatarUrl={d.child.avatar_url} name={d.child.name} size={40} />
                            </div>
                            {isPlaying && (
                              <span className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none bg-white rounded-full p-0.5 shadow-sm">🎮</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`font-black text-[14px] leading-tight truncate ${isActive ? "text-[var(--ds-brand-primary)]" : "text-ds-text"}`}>
                                {d.child.name}
                              </p>
                              {isPlaying && (
                                <span className="shrink-0 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full leading-none">
                                  PLAYING
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[var(--nimi-green)] transition-all duration-500"
                                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-ds-muted shrink-0">{done}/{total}</span>
                            </div>
                          </div>
                        </motion.button>
                        {/* Switch button for non-playing children */}
                        {!isPlaying && childrenData.length > 1 && (
                          <button
                            onClick={() => switchPlaying(d.child.id)}
                            className="w-full text-[10px] font-black text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/30 px-3 py-1.5 rounded-lg hover:bg-[var(--ds-brand-primary)] hover:text-white transition text-center"
                          >
                            🔄 Switch to {d.child.name}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-2 pb-3">
                  <button
                    onClick={() => setShowAddChild(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[var(--ds-border-brand)]/40 text-[var(--ds-brand-primary)] font-black text-[12px] hover:bg-[var(--ds-brand-subtle)] transition"
                  >
                    <Plus className="w-4 h-4" /> Add Kid
                  </button>
                </div>
              </div>
            </aside>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex-1 min-w-0">
          {active && (
            <>
              {/* ═══ MOBILE STICKY VIEWING BAR ═══ */}
              <div className="lg:hidden sticky top-16 z-10 -mx-3 sm:-mx-4 mb-4 px-3 sm:px-4 py-2.5 bg-white/90 backdrop-blur-md border-b border-ds-border flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gray-100">
                  <ChildAvatar avatarUrl={active.child.avatar_url} name={active.child.name} size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-ds-text text-[13px] leading-none truncate">{active.child.name}</p>
                  <p className="text-ds-muted text-[10px] font-semibold mt-0.5">
                    {storiesComplete}/{totalStories} stories · {active.streak}🔥 · {active.totalStars}⭐
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--nimi-green)]"
                      style={{ width: `${totalStories > 0 ? (storiesComplete / totalStories) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ═══ TAB NAV ═══ */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                {([
                  { id: "overview",      emoji: "📊", label: "Overview" },
                  { id: "stories",       emoji: "📚", label: "Stories"  },
                  { id: "achievements",  emoji: "🏆", label: "Wins"     },
                  { id: "settings",      emoji: "⚙️", label: "Settings" },
                ] as { id: typeof parentTab; emoji: string; label: string }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setParentTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-baloo font-black transition-all shrink-0 ${
                      parentTab === tab.id
                        ? "bg-ds-action text-white shadow-sm"
                        : "bg-white border border-ds-border text-gray-500 hover:text-ds-text hover:bg-gray-50"
                    }`}
                  >
                    <span>{tab.emoji}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ═══ TAB CONTENT ═══ */}
              <AnimatePresence mode="wait">

                {/* ── OVERVIEW TAB ── */}
                {parentTab === "overview" && (
                  <motion.div key="overview"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Compact stat strip (4 pills in a row) */}
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { emoji: "⭐", label: "Stars", value: active.totalStars },
                        { emoji: "🏆", label: "Badges", value: badges.length },
                        { emoji: "🎓", label: "Certs", value: certs.length },
                        { emoji: "🔥", label: "Streak", value: `${active.streak}d` },
                      ].map((s, i) => (
                        <motion.div key={s.label}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-2 bg-white border border-ds-border px-3.5 py-2 shadow-sm" style={{ borderRadius: 'var(--leaf-r)' }}>
                          <span className="text-base">{s.emoji}</span>
                          <span className="font-black text-ds-text text-[15px]">{s.value}</span>
                          <span className="text-ds-muted text-[11px] font-semibold">{s.label}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Today's Learning Goal */}
                    {(() => {
                      const todayIdx = (new Date().getDay() + 6) % 7;
                      const todaySessions = active.weekActivity[todayIdx] ?? 0;
                      const goalPrefs = (() => { try { return JSON.parse(localStorage.getItem("nimipiko-parent-prefs") ?? "{}"); } catch { return {}; } })();
                      const dailyGoal = (goalPrefs.dailyGoal as number) || 2;
                      const pct = Math.min(100, (todaySessions / dailyGoal) * 100);
                      const done = todaySessions >= dailyGoal;
                      return (
                        <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0 ${done ? "bg-[var(--nimi-green)]" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                              {done ? "✅" : "🎯"}
                            </div>
                            <div className="flex-1">
                              <p className="font-black text-ds-text text-[16px] leading-tight">Today&apos;s Goal</p>
                              <p className="text-ds-muted text-[12px] font-semibold">
                                {done
                                  ? `${active.child.name} hit the goal today! 🎉`
                                  : `${todaySessions} of ${dailyGoal} sessions done`}
                              </p>
                            </div>
                            <span className={`font-baloo font-black text-[22px] shrink-0 ${done ? "text-[var(--nimi-green)]" : "text-ds-text"}`}>
                              {todaySessions}/{dailyGoal}
                            </span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${done ? "bg-[var(--nimi-green)]" : "bg-gradient-to-r from-blue-400 to-indigo-500"}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* This Week */}
                    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          <h2 className="font-black text-ds-text text-[18px]">This Week</h2>
                        </div>
                        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                          <span className="text-orange-500">🔥</span>
                          <span className="font-black text-orange-700 text-[13px]">{active.streak}d streak</span>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
                          const count = active.weekActivity[i] ?? 0;
                          const todayIdx = (new Date().getDay() + 6) % 7;
                          const isFuture = i > todayIdx;
                          const isToday = i === todayIdx;
                          const intensity = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3;
                          const bgColors = ["bg-gray-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"];
                          const textColors = ["text-gray-400", "text-emerald-800", "text-white", "text-white"];
                          return (
                            <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.05, type: "spring" }}
                                className={`w-full aspect-square rounded-xl flex items-center justify-center text-[14px] font-black transition-all ${
                                  isFuture ? "bg-gray-50 border-2 border-dashed border-gray-200"
                                  : bgColors[intensity]
                                } ${isToday && !isFuture ? "ring-2 ring-offset-1 ring-[var(--ds-brand-primary)]" : ""}`}
                                title={`${count} activities`}>
                                {!isFuture && (
                                  count === 0 ? <span className="text-gray-300 text-[10px]">—</span>
                                  : <span className={textColors[intensity]}>{count}</span>
                                )}
                              </motion.div>
                              <span className={`font-nunito font-bold text-[9px] sm:text-[10px] ${isToday ? "text-[var(--ds-brand-primary)]" : "text-gray-400"}`}>
                                {day}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {active.weekActivity.every(c => c === 0) && (
                        <p className="text-center text-gray-400 text-[12px] mt-3 font-nunito">
                          No activity yet this week — encourage {active.child.name} to start a story! 🚀
                        </p>
                      )}
                    </div>

                    {/* Current Story */}
                    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">📖</span>
                        <h2 className="font-black text-ds-text text-[18px]">Current Story</h2>
                      </div>
                      {currentStory ? (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-black text-ds-text text-[20px]">{currentStory.theme_emoji} {currentStory.title}</p>
                              <p className="text-gray-500 text-[12px] mt-0.5">Story {currentStory.sort_order} of {totalStories}</p>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2">
                              <span className="text-yellow-700 font-black text-[14px]">{missionsComplete}/{totalMissions}</span>
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
                                      : "bg-gray-50 border-ds-border"
                                  }`}
                                  style={{ borderRadius: 'var(--leaf-r)' }}>
                                  <Image src={`/assets/icon-${iconMap[slot.slot_key] ?? "flipflop"}.svg`}
                                    alt="" width={32} height={32} className="w-8 h-8 rounded-lg shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[12px] font-bold truncate ${slot.completed ? "text-ds-text" : "text-gray-400"}`}>
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
                          <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                            <motion.div
                              className="bg-cta-gradient h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${totalMissions > 0 ? (missionsComplete / totalMissions) * 100 : 0}%` }}
                              transition={{ duration: DURATION.loopSpark }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <span className="text-4xl">🎉</span>
                          <p className="text-ds-text font-black text-[16px] mt-2">All stories completed!</p>
                          <p className="text-gray-500 text-[12px]">Amazing work by {active.child.name}!</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── STORIES TAB ── */}
                {parentTab === "stories" && (
                  <motion.div key="stories"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">📚</span>
                        <h2 className="font-black text-ds-text text-[18px]">All Stories</h2>
                        <span className="ml-auto text-[12px] font-bold text-ds-muted">{storiesComplete}/{totalStories} done</span>
                      </div>
                      {/* Progress bar */}
                      <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden mb-4">
                        <motion.div
                          className="bg-cta-gradient h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${totalStories > 0 ? (storiesComplete / totalStories) * 100 : 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <div className="space-y-2">
                        {active.stories.map((story, i) => (
                          <motion.div key={story.sid}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex items-center gap-3 p-3 border-2 ${
                              story.complete ? "bg-[var(--ds-brand-subtle)] border-[var(--ds-border-brand)]/30"
                                : story.unlocked ? "bg-yellow-50 border-yellow-200"
                                : "bg-gray-100 border-ds-border opacity-60"
                            }`}
                            style={{ borderRadius: 'var(--leaf-r)' }}>
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[18px] font-black shadow-md shrink-0 ${
                              story.complete ? "bg-[var(--nimi-green)] text-white" : story.unlocked ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-400"
                            }`}>
                              {story.sort_order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-black text-[14px] truncate ${story.unlocked ? "text-ds-text" : "text-gray-400"}`}>
                                {story.theme_emoji} {story.title}
                              </p>
                              {story.unlocked && !story.complete && (
                                <div className="mt-1 bg-gray-100 rounded-full h-2 overflow-hidden w-32">
                                  <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${story.progress * 100}%` }} />
                                </div>
                              )}
                            </div>
                            {story.complete && <span className="text-[var(--ds-brand-primary)] text-[12px] font-black shrink-0">✅ Done</span>}
                            {story.unlocked && !story.complete && <span className="text-yellow-600 text-[11px] font-black shrink-0">{Math.round(story.progress * 100)}%</span>}
                            {!story.unlocked && <Lock className="w-4 h-4 text-gray-400 shrink-0" />}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── ACHIEVEMENTS TAB ── */}
                {parentTab === "achievements" && (
                  <motion.div key="achievements"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* ── Visual badge showcase ── */}
                    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🏅</span>
                          <h2 className="font-black text-ds-text text-[18px]">Badges Earned</h2>
                        </div>
                        <span className="text-[12px] font-bold text-ds-muted">{badges.length} badge{badges.length !== 1 ? "s" : ""}</span>
                      </div>
                      {badges.length > 0 ? (
                        <>
                          {/* Celebration bar */}
                          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (badges.length / Math.max(badges.length + 2, 5)) * 100)}%` }}
                              transition={{ duration: 0.9, ease: "easeOut" }}
                            />
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {badges.map((b, i) => (
                              <motion.div key={b.slug}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 18 }}
                                className="flex flex-col items-center gap-2 text-center"
                              >
                                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-amber-300 to-yellow-500 ring-[3px] ring-amber-400 shadow-[0_6px_20px_rgba(251,191,36,0.45)] relative">
                                  <Image src={assets.badgeExplorer} alt="" width={40} height={40} className="w-10 h-10" />
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="text-[8px] text-white font-black">✓</span>
                                  </div>
                                </div>
                                <p className="font-nunito font-bold text-[11px] text-ds-text leading-tight capitalize">
                                  {b.slug.replace(/-/g, " ")}
                                </p>
                                <p className="text-[9px] text-ds-muted">
                                  {new Date(b.earned_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </p>
                              </motion.div>
                            ))}
                            {/* "Next" placeholder */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: badges.length * 0.06 + 0.1, type: "spring" }}
                              className="flex flex-col items-center gap-2 text-center"
                            >
                              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100 ring-[3px] ring-gray-200 ring-dashed opacity-60">
                                <span className="text-2xl">🔒</span>
                              </div>
                              <p className="font-nunito font-bold text-[11px] text-ds-muted leading-tight">Next badge</p>
                              <p className="text-[9px] text-ds-muted">Keep learning!</p>
                            </motion.div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <motion.div
                            animate={{ rotate: [0, -8, 8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Image src={assets.starMascot} alt="" width={64} height={64} className="w-16 h-16 mx-auto mb-3 opacity-40" />
                          </motion.div>
                          <p className="text-ds-text font-black text-[15px] mb-1">No badges yet</p>
                          <p className="text-gray-400 text-[12px] font-nunito">
                            Complete missions to earn the first badge!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Certificates ── */}
                    {certs.length > 0 && (
                      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">🎓</span>
                          <h2 className="font-black text-ds-text text-[18px]">Certificates</h2>
                          <span className="ml-auto text-[12px] font-bold text-ds-muted">{certs.length} earned</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {certs.map((c, i) => (
                            <motion.div key={c.slug}
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                              className="flex items-center gap-3 p-4 bg-gradient-to-r from-[var(--ds-brand-subtle)] to-emerald-50 border border-[var(--ds-border-brand)]/30"
                              style={{ borderRadius: 'var(--leaf-r)' }}
                            >
                              <div className="w-12 h-12 bg-[var(--nimi-green)] rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0">🎓</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-ds-text text-[14px] font-black capitalize leading-tight">{c.slug.replace(/-/g, " ")}</p>
                                <p className="text-ds-muted text-[11px] mt-0.5">{new Date(c.earned_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-[var(--ds-brand-primary)] shrink-0" />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── How They Felt ── */}
                    {feelings.length > 0 && (
                      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">💭</span>
                          <h2 className="font-black text-ds-text text-[18px]">How They Felt</h2>
                          <span className="text-gray-400 text-[12px] font-semibold ml-auto">After each story</span>
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
                                <p className="font-black text-ds-text text-[13px] truncate">{f.title}</p>
                                <p className="text-gray-400 text-[11px]">{new Date(f.felt_at).toLocaleDateString()}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Tips ── */}
                    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">💡</span>
                        <h2 className="font-black text-ds-text text-[18px]">Keep {active.child.name} Engaged</h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { emoji: "📖", title: "Read Together", desc: "Join story time and read the FlipFlop pages together. Kids love shared reading!", bg: "bg-blue-50", border: "border-blue-200" },
                          { emoji: "🎵", title: "Sing Along", desc: "Play story songs during car rides or playtime. Repetition builds confidence.", bg: "bg-pink-50", border: "border-pink-200" },
                          { emoji: "🎨", title: "Print & Color", desc: "Print coloring pages and let them create art from the story characters.", bg: "bg-orange-50", border: "border-orange-200" },
                          { emoji: "🏆", title: "Celebrate Wins", desc: "When they complete a mission, make it a big deal! Clap, cheer, high-five.", bg: "bg-yellow-50", border: "border-yellow-200" },
                        ].map(tip => (
                          <motion.div key={tip.title} whileHover={{ scale: 1.02 }}
                            className={`flex gap-3 p-4 ${tip.bg} border ${tip.border} cursor-default`}
                            style={{ borderRadius: 'var(--leaf-r)' }}>
                            <span className="text-3xl shrink-0">{tip.emoji}</span>
                            <div>
                              <p className="text-ds-text text-[14px] font-black">{tip.title}</p>
                              <p className="text-gray-600 text-[11px] mt-1 leading-snug">{tip.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── SETTINGS TAB ── */}
                {parentTab === "settings" && (
                  <motion.div key="settings"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Controls */}
                    <ParentControls childName={active.child.name} childLanguage={active.child.language} />

                    {/* Learning Reminders */}
                    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🔔</span>
                        <h2 className="font-black text-ds-text text-[18px]">Learning Reminders</h2>
                        <span className="ml-auto text-[11px] text-gray-400 font-semibold">5 PM daily</span>
                      </div>
                      {!push.supported ? (
                        <p className="text-gray-500 text-[13px] font-nunito">Push notifications are not supported in this browser. Try opening the app from your phone's home screen.</p>
                      ) : (
                        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100" style={{ borderRadius: 'var(--leaf-r)' }}>
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0">
                            🔔
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-ds-text text-[14px]">
                              {push.isSubscribed ? "Reminders are on" : "Daily learning reminders"}
                            </p>
                            <p className="text-gray-500 text-[11px] mt-0.5 font-nunito">
                              {push.isSubscribed
                                ? `We'll nudge ${active?.child.name ?? "your child"} to practice at 5 PM every day`
                                : "Get a daily nudge at 5 PM to keep the learning streak going"}
                            </p>
                            {push.error && <p className="text-red-500 text-[11px] mt-1 font-nunito">{push.error}</p>}
                          </div>
                          <button
                            onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                            disabled={push.loading}
                            className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors disabled:opacity-50 ${push.isSubscribed ? "bg-[var(--nimi-green)]" : "bg-gray-300"}`}>
                            <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${push.isSubscribed ? "translate-x-5" : ""}`} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Referral */}
                    <ReferralCard
                      code={referralCode}
                      referralCount={referralCount}
                      rewardsEarned={referralRewards}
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
              }]);
              setSelectedChild(child.id);
            }}
            onClose={() => setShowAddChild(false)}
          />
        )}
      </PageSurface>
    </AppShell>
  );
}

