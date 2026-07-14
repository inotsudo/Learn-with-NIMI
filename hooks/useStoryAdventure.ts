"use client";

// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Story Adventure React Hooks (SA-1.3)
//
//  8 hooks covering the full Story Adventure learner flow.
//  Each hook manages loading, error, and data state.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import type {
  StoryLibraryItem,
  StoryDetails,
  StorySlot,
  StoryCompletion,
  StoryCertificate,
  StoryIntroProgress,
  WeeklyChallenge,
  CompleteSlotResult,
  CompleteChallengeResult,
} from "@/lib/story-types";
import {
  getStoryLibrary,
  getCurrentStoryId,
  getStoryDetails as fetchStoryDetails,
  getStorySlots as fetchStorySlots,
  getStoryRecommendations,
} from "@/lib/storyRepository";
import {
  completeStorySlot,
  getStoryCompletion,
  getStoryIntroProgress as fetchIntroProgress,
  markIntroItemConsumed,
} from "@/lib/storyProgressRepository";
import { getStoryCertificate } from "@/lib/storyCertificateRepository";
import {
  getWeeklyChallenges as fetchChallenges,
  completeWeeklyChallenge,
} from "@/lib/weeklyChallengeRepository";

// ── 1. useCurrentStory ───────────────────────────────────────

export function useCurrentStory(childId: string | null, language: string) {
  const [storyId, setStoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!childId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getCurrentStoryId(childId, language);
        if (active) setStoryId(result);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [childId, language]);

  return { storyId, loading, error };
}

// ── 2. useStoryLibrary ───────────────────────────────────────

export function useStoryLibrary(childId: string | null, language: string) {
  const [stories, setStories] = useState<StoryLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      setStories(await getStoryLibrary(childId, language));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [childId, language]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!childId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getStoryLibrary(childId, language);
        if (active) setStories(result);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [childId, language]);

  return { stories, loading, error, refresh };
}

// ── 3. useStoryDetails ───────────────────────────────────────

export function useStoryDetails(storyId: string | null, language: string) {
  const [details, setDetails] = useState<StoryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!storyId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchStoryDetails(storyId, language);
        if (active) setDetails(result);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [storyId, language]);

  return { details, loading, error };
}

// ── 4. useStorySlots ─────────────────────────────────────────

export function useStorySlots(
  childId: string | null,
  storyId: string | null,
  language: string
) {
  const [slots, setSlots] = useState<StorySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId || !storyId) return;
    setLoading(true);
    setError(null);
    try {
      setSlots(await fetchStorySlots(childId, storyId, language));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [childId, storyId, language]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!childId || !storyId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchStorySlots(childId, storyId, language);
        if (active) setSlots(result);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [childId, storyId, language]);

  const complete = useCallback(async (missionId: string): Promise<CompleteSlotResult | null> => {
    if (!childId) return null;
    const result = await completeStorySlot(childId, missionId);
    if (result) {
      setSlots((prev) =>
        prev.map((s) =>
          s.mission_id === missionId ? { ...s, completed: true } : s
        )
      );
    }
    return result;
  }, [childId]);

  return { slots, loading, error, refresh, complete };
}

// ── 5. useStoryProgress ──────────────────────────────────────

export function useStoryProgress(
  childId: string | null,
  storyId: string | null,
  language: string
) {
  const [completion, setCompletion] = useState<StoryCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId || !storyId) return;
    setLoading(true);
    setError(null);
    try {
      setCompletion(await getStoryCompletion(childId, storyId, language));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [childId, storyId, language]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!childId || !storyId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getStoryCompletion(childId, storyId, language);
        if (active) setCompletion(result);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [childId, storyId, language]);

  return { completion, loading, error, refresh };
}

// ── 6. useStoryCertificate ───────────────────────────────────

export function useStoryCertificate(
  childId: string | null,
  storyId: string | null,
  language: string
) {
  const [certificate, setCertificate] = useState<StoryCertificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!childId || !storyId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (active) {
          setCertificate(await getStoryCertificate(childId, storyId, language));
        }
      } catch {
        if (active) setCertificate(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [childId, storyId, language]);

  return { certificate, loading };
}

// ── 7. useWeeklyChallenges ───────────────────────────────────

export function useWeeklyChallenges(
  childId: string | null,
  storyId: string | null,
  language: string
) {
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId || !storyId) return;
    setLoading(true);
    setError(null);
    try {
      setChallenges(await fetchChallenges(childId, storyId, language));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [childId, storyId, language]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!childId || !storyId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchChallenges(childId, storyId, language);
        if (active) setChallenges(result);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [childId, storyId, language]);

  const complete = useCallback(async (challengeId: string): Promise<CompleteChallengeResult | null> => {
    if (!childId) return null;
    const result = await completeWeeklyChallenge(childId, challengeId);
    if (result && !result.already_completed) {
      setChallenges((prev) =>
        prev.map((c) =>
          c.challenge_id === challengeId
            ? { ...c, completed: true, stars_earned: result.stars_earned }
            : c
        )
      );
    }
    return result;
  }, [childId]);

  return { challenges, loading, error, refresh, complete };
}

// ── 8. useStoryIntroProgress ─────────────────────────────────

export function useStoryIntroProgress(
  childId: string | null,
  storyId: string | null,
  language: string
) {
  const [items, setItems] = useState<StoryIntroProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!childId || !storyId) return;
    setLoading(true);
    try {
      setItems(await fetchIntroProgress(childId, storyId, language));
    } finally {
      setLoading(false);
    }
  }, [childId, storyId, language]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!childId || !storyId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (active) {
          setItems(await fetchIntroProgress(childId, storyId, language));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [childId, storyId, language]);

  const markConsumed = useCallback(async (slotKey: string) => {
    if (!childId || !storyId) return;
    await markIntroItemConsumed(childId, storyId, slotKey);
    setItems((prev) =>
      prev.map((item) =>
        item.slot_key === slotKey
          ? { ...item, consumed: true, consumed_at: new Date().toISOString() }
          : item
      )
    );
  }, [childId, storyId]);

  return { items, loading, refresh, markConsumed };
}
