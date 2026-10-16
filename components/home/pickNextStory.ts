import type { StoryLibraryItem } from "@/lib/story-types";

// ── Single next eligible story (Fly Next) ──────────────────────────────────────
// Priority: (1) unlocked, in progress (started, not done, progress > 0),
// (2) unlocked, not yet started — both always exclude the Current Adventure
// story. Locked teasers and completed replays are deliberately NOT candidates:
// Fly Next shows at most ONE real next flight, never a story collection.
// Pure function (no component or data-client dependencies) so it can be
// unit-tested in isolation — see __tests__/components/pickNextStory.test.ts.
export function pickNextStory(
  stories: StoryLibraryItem[],
  curStory: StoryLibraryItem | undefined,
): StoryLibraryItem | undefined {
  const notCurrent = (s: StoryLibraryItem) => s.sid !== curStory?.sid;
  return stories.find(s => s.unlocked && !s.complete && s.progress > 0 && notCurrent(s))
      ?? stories.find(s => s.unlocked && !s.complete && s.progress === 0 && notCurrent(s));
}
