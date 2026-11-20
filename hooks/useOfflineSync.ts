"use client";

import { useEffect } from "react";
import { flushOfflineSlotQueue } from "@/lib/offlineSlotQueue";

function flushAll() {
  void flushOfflineSlotQueue();
}

// Replays any story-mission completions that were queued while offline — once on
// mount (covers reopening the app already back online) and again whenever
// the browser fires the `online` event.
export function useOfflineSync() {
  useEffect(() => {
    flushAll();
    window.addEventListener("online", flushAll);
    return () => window.removeEventListener("online", flushAll);
  }, []);
}
