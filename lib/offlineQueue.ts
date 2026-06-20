import { completeCurriculumMission, notifyPushOnCompletion } from "./queries";

const QUEUE_KEY = "nimi_offline_completions";

export interface QueuedCompletion {
  childId: string;
  missionId: string;
  category: string;
  queuedAt: number;
}

function readQueue(): QueuedCompletion[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedCompletion[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedCompletion[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueOfflineCompletion(entry: QueuedCompletion) {
  const queue = readQueue();
  if (queue.some((q) => q.missionId === entry.missionId && q.childId === entry.childId)) return;
  queue.push(entry);
  writeQueue(queue);
}

export function getQueuedCompletions(): QueuedCompletion[] {
  return readQueue();
}

function removeQueuedCompletion(missionId: string) {
  writeQueue(readQueue().filter((q) => q.missionId !== missionId));
}

// Replays queued mission completions in order; stops at the first one that
// still fails (offline or flaky connectivity) so the rest stay queued for
// the next trigger rather than being attempted out of order.
export async function flushOfflineQueue(): Promise<void> {
  for (const item of readQueue()) {
    const result = await completeCurriculumMission(item.childId, item.missionId);
    if (!result) break;
    removeQueuedCompletion(item.missionId);
    void notifyPushOnCompletion(item.childId, item.category, result);
  }
}
