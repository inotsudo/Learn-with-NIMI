"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Star, Trophy, Shield, Bell, Clock, CheckCircle2, Lock, Eye, ChevronRight, Plus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import CreateChildModal from "@/components/home/CreateChildModal";
import MagicBackground from "@/components/magic/MagicBackground";
import MagicLoader from "@/components/magic/MagicLoader";
import supabase from "@/lib/supabaseClient";
import { getChildren, getChildAchievements, getActivityDates, type Child, type ChildAchievement } from "@/lib/queries";
import { getStoryLibrary, getStorySlots } from "@/lib/storyRepository";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { computeStreaks } from "@/lib/parentInsights";

interface ChildData {
  child: Child;
  stories: StoryLibraryItem[];
  currentSlots: StorySlot[];
  achievements: ChildAchievement[];
  streak: number;
  totalStars: number;
}

export default function ParentsZonePage() {
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState("Parent");
  const [childrenData, setChildrenData] = useState<ChildData[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: parentRow } = await supabase.from("parents").select("name").eq("id", user.id).maybeSingle();
      if (parentRow?.name) setParentName(parentRow.name);

      const children = await getChildren();
      if (children.length === 0) { setLoading(false); return; }

      const results: ChildData[] = [];
      for (const child of children) {
        const [stories, achievements, dates] = await Promise.all([
          getStoryLibrary(child.id, child.language),
          getChildAchievements(child.id),
          getActivityDates(child.id, child.language),
        ]);
        const current = stories.find(s => s.unlocked && !s.complete) ?? stories[stories.length - 1];
        const slots = current ? await getStorySlots(child.id, current.sid, child.language) : [];
        results.push({
          child, stories, currentSlots: slots, achievements,
          streak: computeStreaks(dates).current,
          totalStars: achievements.filter(a => a.type === "badge").length * 50,
        });
      }
      setChildrenData(results);
      setSelectedChild(results[0]?.child.id ?? null);
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
        <div className="min-h-screen theme-bg flex flex-col items-center justify-center gap-4 px-4">
          <span className="text-5xl">👶</span>
          <p className="theme-text font-bold text-center text-[16px]">No children profiles yet</p>
          <Link href="/" className="bg-green-500 text-white font-black rounded-full px-6 py-3 shadow-lg text-[14px]">
            Create a Profile
          </Link>
        </div>
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

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden theme-bg flex flex-col">
        <MagicBackground variant="castle" />
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">

          {/* ═══ HEADER ═══ */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-black text-white text-[24px] sm:text-[30px] leading-tight">Parents Zone</h1>
              <p className="theme-text text-[13px]">Welcome, {parentName} 💜</p>
            </div>
            <div className="bg-green-500/15 border border-green-400/25 rounded-full px-3 py-1.5 flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-[10px] font-black">SAFE</span>
            </div>
          </div>

          {/* ═══ PLANS & PRICING BANNER ═══ */}
          <Link href="/pricing">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="mb-6 rounded-[20px] overflow-hidden border-2 border-yellow-400/30 cursor-pointer shadow-xl shadow-yellow-500/10">
              <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/15 to-pink-500/20 p-5 flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0">
                  👑
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-baloo font-black text-white text-[18px]">Plans & Pricing</p>
                  <p className="theme-text-muted text-[12px] mt-0.5">Unlock Story Packs, Family Bundles, Nimipiko Club & more</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-400 text-black font-black text-[12px] px-4 py-2 rounded-full shrink-0">
                  View Plans <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* ═══ CHILD SELECTOR ═══ */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {childrenData.map((d, i) => (
              <motion.button key={d.child.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelectedChild(d.child.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[14px] transition shrink-0 ${
                  d.child.id === selectedChild
                    ? "theme-accent text-white border-2 theme-border-strong/40 shadow-lg shadow-purple-500/20"
                    : "theme-card theme-text border-2 theme-border hover:theme-border-strong/30"
                }`}>
                {d.child.avatar_url && !d.child.avatar_url.startsWith("http") ? (
                  <span className="text-2xl">{d.child.avatar_url}</span>
                ) : (
                  <img src={d.child.avatar_url ?? "/nimi-logo-circle.png"} alt="" className="w-8 h-8 rounded-full" />
                )}
                <div className="text-left">
                  <p className="font-black">{d.child.name}</p>
                  <p className={`text-[10px] ${d.child.id === selectedChild ? "theme-text" : "theme-text-muted"}`}>
                    {d.stories.filter(s => s.complete).length}/{d.stories.length} stories
                  </p>
                </div>
              </motion.button>
            ))}
            {/* Add Kid button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: childrenData.length * 0.08 }}
              onClick={() => setShowAddChild(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-[14px] bg-green-500/15 text-green-300 border-2 border-dashed border-green-400/30 hover:bg-green-500/25 transition shrink-0">
              <Plus className="w-5 h-5" />
              Add Kid
            </motion.button>
          </div>

          {active && (
            <>
              {/* ═══ STATS ═══ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: "📚", label: "Stories", value: `${storiesComplete}/${totalStories}`, color: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/20" },
                  { icon: "⭐", label: "Stars", value: String(active.totalStars), color: "from-yellow-400 to-amber-500", glow: "shadow-yellow-500/20" },
                  { icon: "🏆", label: "Badges", value: String(badges.length), color: "from-pink-500 to-fuchsia-600", glow: "shadow-pink-500/20" },
                  { icon: "🔥", label: "Streak", value: `${active.streak}d`, color: "from-orange-500 to-red-600", glow: "shadow-orange-500/20" },
                ].map((stat, i) => (
                  <motion.div key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08, type: "spring" }}
                    className={`theme-card border-2 theme-border rounded-[20px] p-4 shadow-xl ${stat.glow}`}>
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mb-3 shadow-lg text-2xl`}>
                      {stat.icon}
                    </div>
                    <p className="font-black text-white text-[24px] leading-none">{stat.value}</p>
                    <p className="theme-text-muted text-[12px] font-bold mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* ═══ CURRENT STORY ═══ */}
              <div className="theme-card border-2 theme-border rounded-[20px] p-5 mb-5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📖</span>
                  <h2 className="font-black text-white text-[18px]">Current Story</h2>
                </div>
                {currentStory ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-black text-white text-[20px]">{currentStory.theme_emoji} {currentStory.title}</p>
                        <p className="theme-text text-[12px] mt-0.5">Story {currentStory.sort_order} of {totalStories}</p>
                      </div>
                      <div className="bg-yellow-500/15 border border-yellow-400/20 rounded-full px-4 py-2">
                        <span className="text-yellow-300 font-black text-[14px]">{missionsComplete}/{totalMissions}</span>
                      </div>
                    </div>
                    {/* Mission grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                      {active.currentSlots.map(slot => {
                        const iconMap: Record<string, string> = {
                          flipflop_audio: "flipflop", story_pdf: "pdf", coloring: "coloring",
                          move_explore: "move", sing_along: "sing", bonus_video: "video",
                        };
                        return (
                          <div key={slot.slot_key}
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition ${
                              slot.completed
                                ? "bg-green-500/10 border-green-400/25"
                                : "theme-accent-soft theme-border"
                            }`}>
                            <img src={`/assets/icon-${iconMap[slot.slot_key] ?? "flipflop"}.svg`}
                              alt="" className="w-8 h-8 rounded-lg shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-[12px] font-bold truncate ${slot.completed ? "text-white" : "theme-text-muted"}`}>
                                {slot.title || slot.slot_key.replace(/_/g, " ")}
                              </p>
                            </div>
                            {slot.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 theme-border-strong/30 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress */}
                    <div className="theme-darker rounded-full h-4 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-green-400 to-green-500 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${totalMissions > 0 ? (missionsComplete / totalMissions) * 100 : 0}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-4xl">🎉</span>
                    <p className="text-white font-black text-[16px] mt-2">All stories completed!</p>
                    <p className="theme-text-muted text-[12px]">Amazing work by {active.child.name}!</p>
                  </div>
                )}
              </div>

              {/* ═══ STORY LIBRARY ═══ */}
              <div className="theme-card border-2 theme-border rounded-[20px] p-5 mb-5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📚</span>
                  <h2 className="font-black text-white text-[18px]">All Stories</h2>
                </div>
                <div className="space-y-2">
                  {active.stories.map((story, i) => (
                    <motion.div key={story.sid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${
                        story.complete ? "bg-green-500/8 border-green-400/20"
                          : story.unlocked ? "bg-yellow-500/5 border-yellow-400/15"
                          : "theme-darker theme-border opacity-50"
                      }`}>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[18px] font-black shadow-lg ${
                        story.complete ? "bg-green-500 text-white" : story.unlocked ? "bg-yellow-500 text-white" : "theme-card-active theme-text-muted"
                      }`}>
                        {story.sort_order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-[14px] truncate ${story.unlocked ? "text-white" : "theme-text-muted"}`}>
                          {story.theme_emoji} {story.title}
                        </p>
                        {story.unlocked && !story.complete && (
                          <div className="mt-1 theme-darker rounded-full h-2 overflow-hidden w-32">
                            <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${story.progress * 100}%` }} />
                          </div>
                        )}
                      </div>
                      {story.complete && <span className="text-green-400 text-[12px] font-black">✅ Done</span>}
                      {story.unlocked && !story.complete && <span className="text-yellow-300 text-[11px] font-black">{Math.round(story.progress * 100)}%</span>}
                      {!story.unlocked && <Lock className="w-4 h-4 theme-text-muted shrink-0" />}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ═══ TWO COLUMNS: ACHIEVEMENTS + CONTROLS ═══ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

                {/* Achievements */}
                <div className="theme-card border-2 theme-border rounded-[20px] p-5 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🏆</span>
                    <h2 className="font-black text-white text-[18px]">Achievements</h2>
                  </div>
                  {badges.length > 0 || certs.length > 0 ? (
                    <div className="space-y-2">
                      {badges.map(b => (
                        <div key={b.slug} className="flex items-center gap-3 bg-yellow-500/8 border border-yellow-400/15 rounded-2xl p-3">
                          <img src="/assets/badge-explorer.svg" alt="" className="w-10 h-10" />
                          <div className="flex-1">
                            <p className="text-white text-[13px] font-black capitalize">{b.slug.replace(/-/g, " ")}</p>
                            <p className="theme-text-muted text-[10px]">{new Date(b.earned_at).toLocaleDateString()}</p>
                          </div>
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        </div>
                      ))}
                      {certs.map(c => (
                        <div key={c.slug} className="flex items-center gap-3 bg-green-500/8 border border-green-400/15 rounded-2xl p-3">
                          <img src="/assets/trophy.svg" alt="" className="w-10 h-10" />
                          <div className="flex-1">
                            <p className="text-white text-[13px] font-black capitalize">{c.slug.replace(/-/g, " ")}</p>
                            <p className="theme-text-muted text-[10px]">{new Date(c.earned_at).toLocaleDateString()}</p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <img src="/assets/star-mascot.svg" alt="" className="w-16 h-16 mx-auto mb-3 opacity-40" />
                      <p className="theme-text-muted text-[13px] font-bold">No achievements yet</p>
                      <p className="theme-text-muted text-[11px] mt-1">Encourage {active.child.name} to complete missions!</p>
                    </div>
                  )}
                </div>

                {/* Controls — functional */}
                <ParentControls childName={active.child.name} childLanguage={active.child.language} />
              </div>

              {/* ═══ TIPS ═══ */}
              <div className="theme-card border-2 theme-border rounded-[20px] p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">💡</span>
                  <h2 className="font-black text-white text-[18px]">Keep {active.child.name} Engaged</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { emoji: "📖", title: "Read Together", desc: "Join story time and read the FlipFlop pages together. Kids love shared reading!", color: "from-blue-500/15 to-blue-600/5", border: "border-blue-400/15" },
                    { emoji: "🎵", title: "Sing Along", desc: "Play story songs during car rides or playtime. Repetition builds confidence.", color: "from-pink-500/15 to-pink-600/5", border: "border-pink-400/15" },
                    { emoji: "🎨", title: "Print & Color", desc: "Print coloring pages and let them create art from the story characters.", color: "from-orange-500/15 to-orange-600/5", border: "border-orange-400/15" },
                    { emoji: "🏆", title: "Celebrate Wins", desc: "When they complete a mission, make it a big deal! Clap, cheer, high-five.", color: "from-yellow-500/15 to-yellow-600/5", border: "border-yellow-400/15" },
                  ].map(tip => (
                    <motion.div key={tip.title} whileHover={{ scale: 1.02 }}
                      className={`flex gap-3 p-4 bg-gradient-to-br ${tip.color} rounded-2xl border-2 ${tip.border} cursor-default`}>
                      <span className="text-3xl shrink-0">{tip.emoji}</span>
                      <div>
                        <p className="text-white text-[14px] font-black">{tip.title}</p>
                        <p className="theme-text text-[11px] mt-1 leading-snug">{tip.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
        {showAddChild && (
          <CreateChildModal
            onCreated={async (child) => {
              setShowAddChild(false);
              const [stories, achievements, dates] = await Promise.all([
                getStoryLibrary(child.id, child.language),
                getChildAchievements(child.id),
                getActivityDates(child.id, child.language),
              ]);
              const current = stories.find(s => s.unlocked && !s.complete) ?? stories[stories.length - 1];
              const slots = current ? await getStorySlots(child.id, current.sid, child.language) : [];
              setChildrenData(prev => [...prev, {
                child, stories, currentSlots: slots, achievements,
                streak: computeStreaks(dates).current,
                totalStars: achievements.filter(a => a.type === "badge").length * 50,
              }]);
              setSelectedChild(child.id);
            }}
            onClose={() => setShowAddChild(false)}
          />
        )}
      </div>
    </AppShell>
  );
}

const PREFS_KEY = "nimipiko-parent-prefs";

function loadPrefs(): Record<string, number | boolean> {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") } catch { return {} }
}

function savePrefs(p: Record<string, number | boolean>) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

function ParentControls({ childName, childLanguage }: { childName: string; childLanguage: string }) {
  const [prefs, setPrefs] = useState<Record<string, number | boolean>>({
    dailyGoal: 2, reminders: true, screenTime: 30, sharing: true,
  });

  useEffect(() => {
    const stored = loadPrefs();
    setPrefs(prev => ({ ...prev, ...stored }));
  }, []);

  const toggle = (key: string) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      savePrefs(next);
      return next;
    });
  };

  const setNum = (key: string, val: number) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: val };
      savePrefs(next);
      return next;
    });
  };

  const dailyGoal = (prefs.dailyGoal as number) || 2;
  const screenTime = (prefs.screenTime as number) || 30;
  const langLabel = childLanguage === "en" ? "English" : childLanguage === "fr" ? "Français" : "Kinyarwanda";

  return (
    <div className="theme-card border-2 theme-border rounded-[20px] p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚙️</span>
        <h2 className="font-black text-white text-[18px]">Controls</h2>
      </div>
      <div className="space-y-2.5">
        {/* Daily Goal */}
        <div className="flex items-center gap-3 p-3 theme-accent-soft rounded-2xl border theme-border">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-lg shadow-lg shrink-0">📖</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-black">Daily Goal</p>
            <p className="theme-text-muted text-[10px]">{dailyGoal} missions per day</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setNum("dailyGoal", Math.max(1, dailyGoal - 1))}
              className="w-8 h-8 rounded-lg theme-accent/50 text-white font-bold text-[16px] flex items-center justify-center hover:theme-accent/50 transition">−</button>
            <span className="text-white font-black text-[18px] w-6 text-center">{dailyGoal}</span>
            <button onClick={() => setNum("dailyGoal", Math.min(10, dailyGoal + 1))}
              className="w-8 h-8 rounded-lg theme-accent/50 text-white font-bold text-[16px] flex items-center justify-center hover:theme-accent/50 transition">+</button>
          </div>
        </div>

        {/* Reminders */}
        <div className="flex items-center gap-3 p-3 theme-accent-soft rounded-2xl border theme-border">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl flex items-center justify-center text-lg shadow-lg shrink-0">🔔</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-black">Reminders</p>
            <p className="theme-text-muted text-[10px]">Daily story reminder</p>
          </div>
          <button onClick={() => toggle("reminders")}
            className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors ${prefs.reminders ? "bg-green-500" : "theme-accent/50"}`}>
            <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${prefs.reminders ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {/* Screen Time */}
        <div className="flex items-center gap-3 p-3 theme-accent-soft rounded-2xl border theme-border">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center text-lg shadow-lg shrink-0">⏰</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-black">Screen Time</p>
            <p className="theme-text-muted text-[10px]">Daily limit</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setNum("screenTime", Math.max(10, screenTime - 10))}
              className="w-8 h-8 rounded-lg theme-accent/50 text-white font-bold text-[14px] flex items-center justify-center hover:theme-accent/50 transition">−</button>
            <span className="text-white font-black text-[14px] w-10 text-center">{screenTime}m</span>
            <button onClick={() => setNum("screenTime", Math.min(120, screenTime + 10))}
              className="w-8 h-8 rounded-lg theme-accent/50 text-white font-bold text-[14px] flex items-center justify-center hover:theme-accent/50 transition">+</button>
          </div>
        </div>

        {/* Sharing */}
        <div className="flex items-center gap-3 p-3 theme-accent-soft rounded-2xl border theme-border">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center text-lg shadow-lg shrink-0">👁️</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-black">Community Sharing</p>
            <p className="theme-text-muted text-[10px]">Allow sharing achievements</p>
          </div>
          <button onClick={() => toggle("sharing")}
            className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors ${prefs.sharing ? "bg-green-500" : "theme-accent/50"}`}>
            <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${prefs.sharing ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {/* Language */}
        <div className="flex items-center gap-3 p-3 theme-accent-soft rounded-2xl border theme-border">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center text-lg shadow-lg shrink-0">🌐</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-black">Language</p>
            <p className="theme-text-muted text-[10px]">{childName}&apos;s learning language</p>
          </div>
          <span className="text-white font-black text-[12px] theme-accent/50 px-3 py-1.5 rounded-full">{langLabel}</span>
        </div>
      </div>
    </div>
  );
}
