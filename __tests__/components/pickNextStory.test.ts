/**
 * pickNextStory — Fly Next single-story selection logic (Phase 2.20B).
 *
 * Verifies the recommendation-selection helper used by the Home World's
 * Fly Next strip against isolated test data (no database, no fabrication
 * of production stories):
 *   a) an eligible in-progress story is preferred,
 *   b) with no in-progress alternative, an eligible unstarted story is used,
 *   c) only locked/completed alternatives → no candidate,
 *   d) an empty story list → no candidate,
 * plus: the Current Adventure story is always excluded, and array order
 * decides between equal-priority candidates.
 */
import { describe, it, expect } from "vitest";
import { pickNextStory } from "@/components/home/pickNextStory";
import type { StoryLibraryItem } from "@/lib/story-types";

function story(overrides: Partial<StoryLibraryItem> & { sid: string }): StoryLibraryItem {
  return {
    slug: overrides.sid,
    title: overrides.sid,
    cover_url: null,
    sort_order: 0,
    theme_emoji: null,
    category: null,
    age_min: null,
    age_max: null,
    unlocked: true,
    complete: false,
    progress: 0,
    is_free: true,
    ...overrides,
  };
}

describe("pickNextStory", () => {
  const cur = story({ sid: "cur", progress: 40 });

  it("a) prefers the first unlocked, in-progress (progress > 0) story, excluding curStory", () => {
    const unstarted = story({ sid: "fresh" });           // eligible but lower priority
    const inProgress1 = story({ sid: "wip-1", progress: 55 });
    const inProgress2 = story({ sid: "wip-2", progress: 10 });
    expect(pickNextStory([cur, unstarted, inProgress1, inProgress2], cur)?.sid).toBe("wip-1");
  });

  it("a') in-progress beats an unstarted story that appears earlier in the array", () => {
    const unstarted = story({ sid: "fresh" });
    const inProgress = story({ sid: "wip", progress: 5 });
    expect(pickNextStory([unstarted, inProgress], cur)?.sid).toBe("wip");
  });

  it("b) falls back to the first unlocked, unstarted (progress === 0) story", () => {
    const fresh1 = story({ sid: "fresh-1" });
    const fresh2 = story({ sid: "fresh-2" });
    expect(pickNextStory([cur, fresh1, fresh2], cur)?.sid).toBe("fresh-1");
  });

  it("c) returns undefined when the only alternatives are locked or completed", () => {
    const locked = story({ sid: "locked", unlocked: false, progress: 0 });
    const lockedWip = story({ sid: "locked-wip", unlocked: false, progress: 80 });
    const done = story({ sid: "done", complete: true, progress: 100 });
    expect(pickNextStory([cur, locked, lockedWip, done], cur)).toBeUndefined();
  });

  it("d) returns undefined for an empty story list", () => {
    expect(pickNextStory([], cur)).toBeUndefined();
    expect(pickNextStory([], undefined)).toBeUndefined();
  });

  it("always excludes the Current Adventure story, even when it would otherwise match", () => {
    // cur is unlocked, incomplete, in progress — and must never be picked.
    expect(pickNextStory([cur], cur)).toBeUndefined();
    expect(pickNextStory([cur], undefined)?.sid).toBe("cur"); // no curStory → cur is a normal candidate
  });

  it("still picks a candidate when curStory is undefined", () => {
    const only = story({ sid: "solo" });
    expect(pickNextStory([only], undefined)?.sid).toBe("solo");
  });
});
