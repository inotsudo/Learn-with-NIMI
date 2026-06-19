"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, RefObject } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, type Child } from "@/lib/queries";
import GalleryHeader, { type GalleryFilter } from "@/components/community/GalleryHeader";
import GalleryCard from "@/components/community/GalleryCard";
import UploadModal from "@/components/community/UploadModal";
import { CelebrationBanner } from "@/components/community/CelebrationBanner";
import { ErrorToast } from "@/components/community/ErrorToast";
import type { Creation } from "@/components/community/types";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useCreationUpload } from "@/hooks/useCreationUpload";
import AuthBackground from "@/components/auth/AuthBackground";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";
const PAGE_SIZE = 12;

interface ErrorBoundaryProps {
  children: React.ReactNode;
  t: (key: string) => string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CommunityPage Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d]">
          <div className="text-center p-8 bg-white/10 backdrop-blur border-2 border-white/15 rounded-lg shadow-lg max-w-md">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-bold mb-4 text-white">{t("somethingWentWrongTitle")}</h1>
            <p className="text-purple-200 mb-6">
              {t("communityErrorBody")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-full font-medium"
            >
              {t("reloadPageBtn")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function mapCreation(c: any, currentUserId: string, unknownLabel: string): Creation {
  return {
    id: c.id,
    childName: c.child_name || unknownLabel,
    age: c.age,
    description: c.description,
    imageUrl: c.image_url,
    likes: c.likes?.length || 0,
    likedByUser: c.likes?.some((l: any) => l.user_id === currentUserId) || false,
    isPublic: c.is_public !== undefined ? c.is_public : true,
    type: c.type || "art",
    completionStatus: c.completion_status || "completed",
    createdAt: c.created_at,
    status: c.status || "approved",
  };
}

function toggleLike(list: Creation[], id: string, liked: boolean): Creation[] {
  return list.map(c => c.id === id ? { ...c, likedByUser: liked, likes: liked ? c.likes + 1 : c.likes - 1 } : c);
}

export default function CommunityPage() {
  const { t } = useLanguage();

  const [creations, setCreations] = useState<Creation[]>([]);
  const [myCreations, setMyCreations] = useState<Creation[]>([]);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [currentUser, setCurrentUser] = useState({ id: "", name: "Guest", avatar: "👤" });
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState("");
  const [hasMoreCreations, setHasMoreCreations] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingStates, setLoadingStates] = useState({
    creations: true,
    user: true,
    likes: {} as Record<string, boolean>,
    initialLoad: true,
  });
  const [loadingMine, setLoadingMine] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");

  const observerTarget = useRef<HTMLDivElement>(null);

  const triggerCelebration = useCallback((text: string) => {
    setCelebrationText(text);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  }, []);

  // Load active child (for "My Gallery")
  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      setActiveChild(list.find(c => c.id === savedId) ?? list[0] ?? null);
    })();
  }, []);

  // Load current user (for likes)
  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("parents").select("name").eq("id", user.id).maybeSingle();
          setCurrentUser({
            id: user.id,
            name: profile?.name || user.email?.split("@")[0] || "User",
            avatar: "👤",
          });
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoadingStates(prev => ({ ...prev, user: false }));
      }
    })();
  }, []);

  // Fetch community creations with pagination
  const fetchCreations = useCallback(async (pageNum: number, refresh: boolean) => {
    try {
      if (refresh) setLoadingStates(prev => ({ ...prev, creations: true }));
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("creations")
        .select(`*, likes:likes(id, user_id)`, { count: "exact" })
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formatted = (data ?? []).map((c: any) => mapCreation(c, currentUser.id, t("unknownChildLabel")));
      setCreations(prev => refresh ? formatted : [...prev, ...formatted]);
      setHasMoreCreations((count || 0) > to + 1);
    } catch (err) {
      console.error(err);
      setError(t("loadArtworkErrorMsg"));
    } finally {
      setLoadingStates(prev => ({ ...prev, creations: false, initialLoad: false }));
    }
  }, [currentUser.id, t]);

  useEffect(() => {
    fetchCreations(0, true);
  }, [fetchCreations]);

  useInfiniteScroll(observerTarget as RefObject<HTMLElement>, () => {
    if (viewMode === "all" && !loadingStates.creations && hasMoreCreations) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCreations(nextPage, false);
    }
  });

  // Fetch only the active child's own creations ("My Gallery")
  const fetchMyCreations = useCallback(async () => {
    if (!activeChild) return;
    try {
      setLoadingMine(true);
      const { data, error } = await supabase
        .from("creations")
        .select(`*, likes:likes(id, user_id)`)
        .eq("child_id", activeChild.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyCreations((data ?? []).map((c: any) => mapCreation(c, currentUser.id, t("unknownChildLabel"))));
    } catch (err) {
      console.error(err);
      setError(t("loadMyGalleryErrorMsg"));
    } finally {
      setLoadingMine(false);
    }
  }, [activeChild, currentUser.id, t]);

  // Like / unlike, with optimistic updates on whichever list is shown
  const handleLike = useCallback(async (creationId: string) => {
    const source = viewMode === "mine" ? myCreations : creations;
    const creation = source.find(c => c.id === creationId);
    if (!creation) return;

    const newLikeState = !creation.likedByUser;

    setLoadingStates(prev => ({ ...prev, likes: { ...prev.likes, [creationId]: true } }));
    setCreations(prev => toggleLike(prev, creationId, newLikeState));
    setMyCreations(prev => toggleLike(prev, creationId, newLikeState));

    try {
      if (newLikeState) {
        await supabase.from("likes").insert({ creation_id: creationId, user_id: currentUser.id });
      } else {
        await supabase.from("likes").delete().eq("creation_id", creationId).eq("user_id", currentUser.id);
      }
    } catch (err) {
      console.error(err);
      setError(t("updateLikeErrorMsg"));
      setCreations(prev => toggleLike(prev, creationId, !newLikeState));
      setMyCreations(prev => toggleLike(prev, creationId, !newLikeState));
    } finally {
      setLoadingStates(prev => ({ ...prev, likes: { ...prev.likes, [creationId]: false } }));
    }
  }, [creations, myCreations, viewMode, currentUser.id, t]);

  const { uploadForm, setUploadForm, showUploadModal, setShowUploadModal, handleUploadSubmit } = useCreationUpload({
    parentId: currentUser.id,
    childId: activeChild?.id ?? null,
    // New uploads start "pending" — they don't join the approved-only "All"
    // feed yet, but refresh "My Gallery" so the parent sees it awaiting review.
    onCreated: () => {
      if (viewMode === "mine") fetchMyCreations();
    },
    onError: setError,
    onCelebrate: triggerCelebration,
  });

  const toggleMyGallery = () => {
    if (viewMode === "all") {
      setViewMode("mine");
      if (myCreations.length === 0) fetchMyCreations();
    } else {
      setViewMode("all");
    }
  };

  const displayedCreations = useMemo(() => {
    const source = viewMode === "mine" ? myCreations : creations;
    const q = search.trim().toLowerCase();
    return source.filter(c => {
      if (filter !== "all" && c.type !== filter) return false;
      if (q) {
        const matchesDesc = c.description?.toLowerCase().includes(q);
        const matchesName = c.childName?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesName) return false;
      }
      return true;
    });
  }, [creations, myCreations, viewMode, filter, search]);

  const isInitialLoading = viewMode === "all" ? loadingStates.initialLoad : loadingMine;
  const sourceEmpty = viewMode === "all" ? creations.length === 0 : myCreations.length === 0;

  return (
    <ErrorBoundary t={t}>
      <AppShell>
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
          <AuthBackground />
          <CelebrationBanner isVisible={showCelebration} text={celebrationText} />
          <ErrorToast error={error} onDismiss={() => setError(null)} />
          <UploadModal
            open={showUploadModal}
            onClose={() => !uploadForm.isUploading && setShowUploadModal(false)}
            onSubmit={handleUploadSubmit}
            formState={uploadForm}
            setFormState={setUploadForm}
          />

          <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
            <GalleryHeader search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} />

            {isInitialLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur rounded-2xl border-2 border-white/15 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-white/10" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-2/3 bg-white/10 rounded" />
                      <div className="h-4 w-full bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedCreations.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2 py-12 mt-4">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <ImagePlus className="w-8 h-8 text-purple-200" />
                </div>
                <p className="font-black text-white">{sourceEmpty ? t("noArtworkTitle") : t("noResultsFound")}</p>
                {sourceEmpty && <p className="text-purple-200 text-sm">{t("noArtworkBody")}</p>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                  {displayedCreations.map(creation => (
                    <GalleryCard
                      key={creation.id}
                      creation={creation}
                      onLike={handleLike}
                      isLoadingLike={loadingStates.likes[creation.id] || false}
                    />
                  ))}
                </div>

                {viewMode === "all" && (
                  <div ref={observerTarget} className="h-10 flex items-center justify-center mt-6">
                    {loadingStates.creations && <Loader2 className="w-6 h-6 animate-spin text-purple-500" />}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={loadingStates.user}
                className="bg-purple-600 text-white font-black rounded-full px-6 py-2.5 shadow hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("uploadArtworkBtn")}
              </button>
              <button
                onClick={toggleMyGallery}
                className={`font-black rounded-full px-6 py-2.5 shadow transition ${
                  viewMode === "mine"
                    ? "bg-purple-600 text-white"
                    : "border-2 border-white/20 text-purple-200 bg-white/10 backdrop-blur hover:bg-white/20"
                }`}
              >
                {t("myGalleryBtn")}
              </button>
            </div>
          </main>
        </div>
      </AppShell>
    </ErrorBoundary>
  );
}
