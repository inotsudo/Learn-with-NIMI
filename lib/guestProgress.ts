import supabase from "./supabaseClient";
import { completeChildMission } from "./queries";

const GUEST_PROGRESS_KEY = "nimi_guest_progress";

export function loadGuestProgress() {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(GUEST_PROGRESS_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function saveGuestProgress(newProgress: {
  points?: number;
  completedMissions?: string[];
}) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(GUEST_PROGRESS_KEY);
  let progress = current ? JSON.parse(current) : { points: 0, completedMissions: [] };
  progress.points += newProgress.points || 0;
  progress.completedMissions = Array.from(
    new Set([...(progress.completedMissions || []), ...(newProgress.completedMissions || [])])
  );
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
}

export function clearGuestProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_PROGRESS_KEY);
}

// Sync guest mission completions to child_progress after login.
// Resolves the child internally — callers just call with no args after sign-in.
export async function syncGuestProgressToSupabase() {
  const guestProgress = loadGuestProgress();
  if (!guestProgress) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: children } = await supabase
      .from("children")
      .select("id")
      .eq("parent_id", user.id)
      .order("created_at")
      .limit(1);

    const childId = children?.[0]?.id;
    if (!childId) return;

    const missionIds: string[] = guestProgress.completedMissions || [];
    for (const missionId of missionIds) {
      await completeChildMission(childId, missionId);
    }
    clearGuestProgress();
  } catch (error) {
    console.error("Failed to sync guest progress:", error);
  }
}
