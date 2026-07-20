import supabase from "./supabaseClient";
import { qinvalidate, lsinvalidate } from "./queryCache";

const SLOT_QUEUE_KEY = "nimi_offline_slot_completions";

export interface QueuedSlotCompletion {
  childId: string;
  missionId: string;
  queuedAt: number;
}

function readSlotQueue(): QueuedSlotCompletion[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SLOT_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedSlotCompletion[];
  } catch {
    return [];
  }
}

function writeSlotQueue(queue: QueuedSlotCompletion[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SLOT_QUEUE_KEY, JSON.stringify(queue));
}

export function queueOfflineSlotCompletion(entry: QueuedSlotCompletion) {
  const queue = readSlotQueue();
  if (queue.some((q) => q.missionId === entry.missionId && q.childId === entry.childId)) return;
  queue.push(entry);
  writeSlotQueue(queue);
}

export function getQueuedSlotCompletions(): QueuedSlotCompletion[] {
  return readSlotQueue();
}

function removeQueuedSlotCompletion(missionId: string) {
  writeSlotQueue(readSlotQueue().filter((q) => q.missionId !== missionId));
}

// Replays queued slot completions in order; stops at the first one that still
// fails so the rest stay queued for the next trigger rather than being
// attempted out of order.
export async function flushOfflineSlotQueue(): Promise<void> {
  for (const item of readSlotQueue()) {
    const { error } = await supabase.rpc("complete_story_slot", {
      p_child_id: item.childId,
      p_mission_id: item.missionId,
    });
    if (error) break;
    removeQueuedSlotCompletion(item.missionId);
    lsinvalidate(`progressRows:${item.childId}`);
    qinvalidate(`storySlots:${item.childId}`);
    qinvalidate(`storyLibrary:${item.childId}`);
    qinvalidate(`storyProgressStars:${item.childId}`);
    qinvalidate(`totalStars:${item.childId}`);
    qinvalidate(`childBadges:${item.childId}`);
    qinvalidate(`completedMissionIds:${item.childId}`);
  }
}
