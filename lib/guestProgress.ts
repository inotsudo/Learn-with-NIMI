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
// Requires the active childId to be passed in.
export async function syncGuestProgressToSupabase(userId: string, childId?: string) {
  const guestProgress = loadGuestProgress();
  if (!guestProgress || !childId) return;

  try {
    const missionIds: string[] = guestProgress.completedMissions || [];
    for (const missionId of missionIds) {
      await completeChildMission(childId, missionId);
    }
    clearGuestProgress();
  } catch (error) {
    console.error("Failed to sync guest progress:", error);
  }
}
