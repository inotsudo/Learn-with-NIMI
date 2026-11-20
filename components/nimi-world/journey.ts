"use client";

import { readStored, useStored, writeStored } from "./useStored";

/**
 * The NIMIPIKO Airways journey for one destination (story), in the order of
 * the brand intro video:
 *
 *   Welcome Hall → passport control (stamped) → boarding (boarding pass)
 *   → flight → landed at the storybook → the 6 missions.
 *
 * Progress is kept per child + story in localStorage, so a child who comes back
 * resumes at the book, and each new destination starts the trip again. The
 * story page reads the same record so the child never boards twice.
 */
export type JourneyStep = "control" | "stamped" | "boarded" | "landed";

const ORDER: JourneyStep[] = ["control", "stamped", "boarded", "landed"];

export const journeyKey = (childId: string | null | undefined, storyId: string) =>
  `nimipiko_journey:${childId || "guest"}:${storyId}`;

function parse(v: string | null): JourneyStep | null {
  return v && (ORDER as string[]).includes(v) ? (v as JourneyStep) : null;
}

/** True once the journey has reached (or passed) `step`. */
export function hasReached(current: JourneyStep | null, step: JourneyStep): boolean {
  return current !== null && ORDER.indexOf(current) >= ORDER.indexOf(step);
}

export function readJourney(childId: string | null | undefined, storyId: string | null | undefined): JourneyStep | null {
  if (!storyId) return null;
  return parse(readStored("local", journeyKey(childId, storyId)));
}

/** Moves the journey forward to `step` (never backwards). */
export function advanceJourney(childId: string | null | undefined, storyId: string | null | undefined, step: JourneyStep) {
  if (!storyId) return;
  const current = readJourney(childId, storyId);
  if (hasReached(current, step)) return;
  writeStored("local", journeyKey(childId, storyId), step);
}

/** Reactive read for components. */
export function useJourney(childId: string | null | undefined, storyId: string | null | undefined): JourneyStep | null {
  const v = useStored("local", storyId ? journeyKey(childId, storyId) : "nimipiko_journey:none");
  return storyId ? parse(v) : null;
}
