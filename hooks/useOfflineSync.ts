"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/lib/offlineQueue";

// Replays any mission completions that were queued while offline — once on
// mount (covers reopening the app already back online) and again whenever
// the browser fires the `online` event.
export function useOfflineSync() {
  useEffect(() => {
    void flushOfflineQueue();
    const onOnline = () => void flushOfflineQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
}
