"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getChildren,
  getWeekStreak, getWeekActivityCounts, getTotalStars,
  getActivityDates, getChildBadges, getChildCertificates, updateChild,
  getConsecutiveStreak, getCompletedStoriesCount, awardMilestoneBadges,
  getBadgeImages,
  type Child,
} from "@/lib/queries";
import type { ChildAchievement } from "@/lib/queries/types";
import { getMilestoneBadgeMeta } from "@/lib/milestoneBadges";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { RefreshingBadge } from "@/components/layout/RefreshingBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import ProgressHeader, { type ProgressTab } from "@/components/profile/ProgressHeader";
import StatsRow from "@/components/profile/StatsRow";
import WeeklyActivityChart from "@/components/profile/WeeklyActivityChart";
import StreaksTab from "@/components/profile/StreaksTab";
import { PageSurface } from "@/components/layout/primitives";
import EditProfileSheet from "@/components/profile/EditProfileSheet";
import supabase from "@/lib/supabaseClient";
import { getActiveSubscription } from "@/lib/payments/products";
import { Crown, Download, Loader2 } from "lucide-react";
import NextMilestoneCard from "@/components/profile/NextMilestoneCard";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

function starsToLevel(stars: number): number {
  if (stars >= 500) return 5;
  if (stars >= 300) return 4;
  if (stars >= 150) return 3;
  if (stars >= 50)  return 2;
  return 1;
}

function computeLastActiveDaysAgo(dates: Set<string>): number | null {
  if (dates.size === 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sorted = Array.from(dates).sort((a, b) => b.localeCompare(a));
  const latest = new Date(sorted[0]);
  latest.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - latest.getTime()) / 86_400_000);
}

// ── Badge image: Supabase Storage URL → emoji fallback ───────────────
function BadgeImg({ slug, emoji, imageUrl, size = "w-full h-full" }: {
  slug: string; emoji: string; imageUrl?: string; size?: string
}) {
  const [imgOk, setImgOk] = useState(true);

  if (imageUrl && imgOk) {
    return <img src={imageUrl} alt={slug} className={`${size} object-contain`} onError={() => setImgOk(false)} />;
  }
  return <span className="text-2xl leading-none">{emoji}</span>;
}

// ── Helpers for earned achievements ──────────────────────────────────
function slugToTitle(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function badgeLabelFromSlug(slug: string) {
  const meta = getMilestoneBadgeMeta(slug);
  if (meta) return meta.label;
  const parts = slug.split("-");
  const lang = parts[parts.length - 1];
  const stripped = ["en", "fr", "rw"].includes(lang) ? parts.slice(0, -1).join("-") : slug;
  return slugToTitle(stripped);
}

function certLabelFromSlug(slug: string) {
  // story-emotion-detective-certificate-en → Emotion Detective
  const withoutLang = slug.replace(/-(?:en|fr|rw)$/, "");
  const withoutCert = withoutLang.replace(/-certificate$/, "");
  const withoutStory = withoutCert.replace(/^story-/, "");
  return slugToTitle(withoutStory);
}

// ── Earned achievements card ──────────────────────────────────────────
function EarnedAchievementsCard({
  earnedSlugs,
  imageMap,
  certificates,
  hasSubscription,
  childName,
}: {
  earnedSlugs: string[];
  imageMap: Record<string, string>;
  certificates: ChildAchievement[];
  hasSubscription: boolean;
  childName: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const hasAny = earnedSlugs.length > 0 || certificates.length > 0;

  const downloadCert = async (cert: ChildAchievement) => {
    if (!hasSubscription) {
      router.push("/pricing?reason=certificate");
      return;
    }
    setDownloading(cert.id);
    setDownloadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const title = certLabelFromSlug(cert.slug);
      const params = new URLSearchParams({
        child: childName,
        story: title,
        lang: cert.language,
        format: "pdf",
      });
      const res = await fetch(`/api/certificate?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setDownloadError("Download failed — please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${childName.replace(/\s+/g, "_")}_certificate.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card p-5" style={{ borderRadius: "var(--leaf-r)" }}>
      <h2 className="font-baloo font-black text-ds-text text-[17px] mb-4">
        🏆 {t("myAchievementsTitle")}
      </h2>

      {!hasAny && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-5 flex flex-col items-center gap-3 text-center"
        >
          {/* Ghost badge row */}
          <div className="flex gap-3 opacity-30 pointer-events-none select-none">
            {["⭐", "🏅", "🎖️"].map((e, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                className="w-12 h-12 rounded-full bg-ds-border/70 flex items-center justify-center text-2xl"
              >
                {e}
              </motion.div>
            ))}
          </div>
          <p className="font-baloo font-black text-ds-text text-[14px]">No achievements yet</p>
          <p className="text-ds-muted text-[11px] font-semibold max-w-[200px] leading-snug">
            Complete stories to earn badges and certificates!
          </p>
          <Link
            href="/stories"
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white font-baloo font-black text-[12px] transition hover:-translate-y-0.5"
            style={{ background: "var(--ds-brand-primary)" }}
          >
            📖 Read a Story →
          </Link>
        </motion.div>
      )}

      {earnedSlugs.length > 0 && (
        <div className="mb-4">
          <p className="text-ds-muted font-bold text-[11px] uppercase tracking-wider mb-3">
            {t("badgesLabel")} · {earnedSlugs.length}
          </p>
          <div className="flex flex-wrap gap-3">
            {earnedSlugs.map((slug, i) => {
              const meta = getMilestoneBadgeMeta(slug);
              const imageUrl = imageMap[slug];
              const label = badgeLabelFromSlug(slug);
              return (
                <motion.div
                  key={slug}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-1.5 w-16 text-center"
                  title={meta?.desc ?? label}
                >
                  <div className="w-14 h-14 rounded-full ring-2 ring-amber-400 shadow-[0_4px_14px_rgba(251,191,36,0.35)] flex items-center justify-center overflow-hidden bg-gradient-to-b from-amber-400/20 to-yellow-500/10">
                    <BadgeImg slug={slug} emoji={meta?.emoji ?? "🏅"} imageUrl={imageUrl} />
                  </div>
                  <p className="font-nunito font-bold text-[10px] leading-tight text-ds-text">{label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {downloadError && (
        <p className="text-red-500 text-[11px] font-semibold text-center mt-2 mb-1">{downloadError}</p>
      )}

      {certificates.length > 0 && (
        <div>
          {earnedSlugs.length > 0 && <div className="border-t border-ds-border my-3" />}
          <p className="text-ds-muted font-bold text-[11px] uppercase tracking-wider mb-3">
            {t("certificatesLabel")} · {certificates.length}
          </p>
          <div className="space-y-2">
            {certificates.map((cert, i) => {
              const isDownloading = downloading === cert.id;
              return (
                <motion.div
                  key={cert.slug}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 px-3 py-2.5 rounded-xl"
                >
                  {/* Certificate mini-thumbnail */}
                  <div className="w-10 h-12 rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 flex flex-col items-center justify-center gap-0.5 shrink-0 shadow-sm overflow-hidden border border-amber-400/40">
                    <span className="text-white text-[18px] leading-none">🎓</span>
                    <div className="w-6 h-px bg-white/60" />
                    <div className="w-5 h-px bg-white/40" />
                    <div className="w-4 h-px bg-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-nunito font-black text-ds-text text-[13px] leading-tight truncate">
                      {certLabelFromSlug(cert.slug)}
                    </p>
                    <p className="text-ds-muted text-[10px] font-medium mt-0.5">
                      {cert.earned_at ? new Date(cert.earned_at).toLocaleDateString() : ""}
                      {cert.language && <span className="ml-1.5 uppercase">{cert.language}</span>}
                    </p>
                  </div>

                  {/* Download / upgrade CTA */}
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => void downloadCert(cert)}
                    disabled={isDownloading}
                    className={`flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 rounded-xl shrink-0 transition ${
                      hasSubscription
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-violet-100 text-violet-700 hover:bg-violet-200"
                    } disabled:opacity-60`}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : hasSubscription ? (
                      <><Download className="w-3 h-3" /> PDF</>
                    ) : (
                      <><Crown className="w-3 h-3" /> Club</>
                    )}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [hasChildren, setHasChildren] = useState(true);
  const [activeTab, setActiveTab] = useState<ProgressTab>("overview");
  const [childName, setChildName] = useState("");
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [weekStreak, setWeekStreak] = useState<boolean[]>(Array(7).fill(false));
  const [weekCounts, setWeekCounts] = useState<number[]>(Array(7).fill(0));
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [badgeCount, setBadgeCount] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [storiesCompleted, setStoriesCompleted] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [earnedBadgeSlugs, setEarnedBadgeSlugs] = useState<string[]>([]);
  const [badgeImageMap, setBadgeImageMap] = useState<Record<string, string>>({});
  const [certificates, setCertificates] = useState<ChildAchievement[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const activeChildRef = useRef<Child | null>(null);
  const switchGenRef   = useRef(0);

  const loadProgress = useCallback(async (targetChildId?: string, silent = false) => {
    const gen = silent ? ++switchGenRef.current : 0;
    if (silent) setRefreshing(true); else setLoading(true);
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      setLoading(false);
      return;
    }

    const savedId = targetChildId
      ?? (typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null);
    const child = list.find(c => c.id === savedId) ?? list[0];
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_CHILD_KEY, child.id);

    // Fire milestone-badge check in parallel with display data — don't block render.
    const milestonePromise = awardMilestoneBadges(child.id, child.language);

    // Resolve user first so subscription check can join the parallel batch.
    const authData = await supabase.auth.getUser();
    const [wStreak, wCounts, stars, dates, badges, streak, stories, imageMap, certs, sub] = await Promise.all([
      getWeekStreak(child.id, child.language),
      getWeekActivityCounts(child.id, child.language),
      getTotalStars(child.id, child.language),
      getActivityDates(child.id, child.language),
      getChildBadges(child.id, child.language),
      getConsecutiveStreak(child.id, child.language),
      getCompletedStoriesCount(child.id, child.language),
      getBadgeImages(),
      getChildCertificates(child.id, child.language),
      authData.data.user ? getActiveSubscription(authData.data.user.id) : Promise.resolve(null),
    ]);
    setHasSubscription(!!sub);

    if (silent && gen !== switchGenRef.current) return;

    setChildName(child.name);
    setActiveChild(child);
    activeChildRef.current = child;

    setWeekStreak(wStreak);
    setWeekCounts(wCounts);
    setTotalStars(stars);
    setActivityDates(dates);
    setBadgeCount(badges.length);
    setEarnedBadgeSlugs(badges.map(b => b.badge_slug));
    setBadgeImageMap(imageMap);
    setCertificates(certs);
    setCurrentStreak(streak);
    setStoriesCompleted(stories);
    if (silent) setRefreshing(false); else setLoading(false);

    // Silently refresh badges if any milestones just landed.
    const newSlugs = await milestonePromise;
    if (newSlugs.length > 0) {
      const fresh = await getChildBadges(child.id, child.language);
      setBadgeCount(fresh.length);
      setEarnedBadgeSlugs(fresh.map(b => b.badge_slug));
    }
  }, []);

  const handleSaveProfile = async (newName: string, newAvatarUrl: string) => {
    if (!activeChild) return;
    await updateChild(activeChild.id, { name: newName, avatar_url: newAvatarUrl });
    window.dispatchEvent(new CustomEvent("app:profileUpdate", {
      detail: { childId: activeChild.id, name: newName, avatarUrl: newAvatarUrl },
    }));
    await loadProgress(activeChild.id, true);
  };

  useEffect(() => {
    void loadProgress();

    const handleVisibility = () => {
      if (document.visibilityState === "visible")
        void loadProgress(activeChildRef.current?.id, true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadProgress]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const child = activeChildRef.current;
        if (!child) return;
        await loadProgress(child.id, true);
      }, 200);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => {
      window.removeEventListener("app:languageChange", handler as EventListener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [loadProgress]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto w-full pb-24 px-4 space-y-4 pt-2">
          <div className="rounded-3xl border border-gray-100 p-5 flex items-center gap-4">
            <Bone className="w-16 h-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-36" />
              <Bone className="h-3 w-24" />
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 p-5 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Bone className="h-7 w-12 mx-auto" />
                <Bone className="h-2.5 w-10 mx-auto" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-9 flex-1 rounded-full" />)}
          </div>
          <div className="rounded-3xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-4">
              <Bone className="w-[72px] h-[72px] rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1">
                <Bone className="w-6 h-6 rounded-lg shrink-0" />
                <Bone className="h-3 flex-1" />
                <Bone className="w-5 h-5 rounded-full shrink-0" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Bone className="h-28 rounded-3xl" />
            <Bone className="h-28 rounded-3xl" />
          </div>
          <div className="rounded-3xl border border-gray-100 p-5 space-y-3">
            <Bone className="h-4 w-28" />
            <Bone className="h-2 w-full rounded-full" />
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <Bone key={i} className="aspect-square rounded-full" />)}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!hasChildren) {
    return (
      <AppShell>
        <PageSurface className="relative overflow-hidden items-center justify-center gap-4 text-center px-4">
          <p className="relative z-10 text-ds-text font-semibold">{t("noChildrenYet")}</p>
          <Link href="/home" className="relative z-10 text-white font-black px-6 py-2.5 shadow transition" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}>
            {t("goHomeBtn")}
          </Link>
        </PageSurface>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RefreshingBadge show={refreshing} />
      <PageSurface>
        <main className={`max-w-lg mx-auto px-4 sm:px-5 py-4 pb-28 flex-1 w-full content-enter transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`}>
          <ProgressHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
            childName={childName}
            avatarUrl={activeChild?.avatar_url}
            onEditProfile={() => setEditOpen(true)}
            level={starsToLevel(totalStars)}
            totalStars={totalStars}
            lastActiveDaysAgo={computeLastActiveDaysAgo(activityDates)}
          />

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 mt-5"
              >
                <StatsRow
                  starsCollected={totalStars}
                  badgesEarned={badgeCount}
                  storiesCompleted={storiesCompleted}
                  currentStreak={currentStreak}
                />
                <WeeklyActivityChart weekCounts={weekCounts} />
                <NextMilestoneCard
                  earnedSlugs={earnedBadgeSlugs}
                  storiesCompleted={storiesCompleted}
                  totalStars={totalStars}
                  imageMap={badgeImageMap}
                />
                <EarnedAchievementsCard earnedSlugs={earnedBadgeSlugs} imageMap={badgeImageMap} certificates={certificates} hasSubscription={hasSubscription} childName={childName} />
              </motion.div>
            )}

            {activeTab === "streaks" && activeChild && (
              <motion.div key="streaks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <StreaksTab
                  activityDates={activityDates}
                  weekStreak={weekStreak}
                  childId={activeChild.id}
                  language={activeChild.language as "en" | "fr" | "rw"}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </PageSurface>
      <EditProfileSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveProfile}
        initialName={childName}
        initialAvatarUrl={activeChild?.avatar_url}
        childId={activeChild?.id ?? ""}
      />
    </AppShell>
  );
}
