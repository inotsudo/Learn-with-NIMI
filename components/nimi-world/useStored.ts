"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny Web-Storage-backed store read through useSyncExternalStore: SSR-safe
 * (server snapshot), survives blocked storage (in-memory fallback), and every
 * hook reading a key re-renders when it is written.
 */
type Area = "local" | "session";

const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();
const slot = (area: Area, key: string) => `${area}:${key}`;

function storageFor(area: Area): Storage | null {
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStored(area: Area, key: string): string | null {
  const k = slot(area, key);
  if (!memory.has(k)) {
    let v: string | null = null;
    try { v = storageFor(area)?.getItem(key) ?? null; } catch { /* blocked */ }
    memory.set(k, v);
  }
  return memory.get(k) ?? null;
}

export function writeStored(area: Area, key: string, value: string | null) {
  memory.set(slot(area, key), value);
  try {
    const s = storageFor(area);
    if (value === null) s?.removeItem(key);
    else s?.setItem(key, value);
  } catch { /* private mode / quota: the in-memory value still applies this session */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key) memory.delete(slot("local", e.key)); // another tab changed it
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStored(area: Area, key: string, serverValue: string | null = null): string | null {
  return useSyncExternalStore(subscribe, () => readStored(area, key), () => serverValue);
}
