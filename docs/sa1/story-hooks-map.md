# SA-1.3 — Story Adventure Dependency Map

## RPC → Repository → Hook → UI Consumer

```
┌─────────────────────────────────┬──────────────────────────────┬─────────────────────────┬──────────────────────────┐
│ RPC (044_*.sql)                 │ Repository (lib/)            │ Hook                    │ UI Consumer              │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_story_library_progress      │ storyRepository              │ useStoryLibrary         │ Story Library page       │
│                                 │   .getStoryLibrary()         │                         │ Homepage story grid      │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_current_story               │ storyRepository              │ useCurrentStory         │ Homepage hero            │
│                                 │   .getCurrentStoryId()       │                         │ AppShell context         │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_unlocked_stories            │ storyRepository              │ (via useStoryLibrary)   │ Story Library lock state │
│                                 │   .getUnlockedStoryIds()     │                         │                          │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_story_details               │ storyRepository              │ useStoryDetails         │ Story detail page        │
│                                 │   .getStoryDetails()         │                         │ Intro sequence           │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_story_slots                 │ storyRepository              │ useStorySlots           │ Story mission cards      │
│                                 │   .getStorySlots()           │                         │ Homepage 6-card grid     │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ complete_story_slot             │ storyProgressRepository      │ useStorySlots.complete() │ Mission player           │
│                                 │   .completeStorySlot()       │                         │ Complete button           │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_story_completion            │ storyProgressRepository      │ useStoryProgress        │ Certificate panel        │
│                                 │   .getStoryCompletion()      │                         │ Progress bar             │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_story_certificate           │ storyCertificateRepository   │ useStoryCertificate     │ Certificate display      │
│                                 │   .getStoryCertificate()     │                         │ Download/Share           │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_weekly_challenges           │ weeklyChallengeRepository    │ useWeeklyChallenges     │ Challenge cards          │
│                                 │   .getWeeklyChallenges()     │                         │ Post-story page          │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ complete_weekly_challenge       │ weeklyChallengeRepository    │ useWeeklyChallenges     │ "I Did It!" button       │
│                                 │   .completeWeeklyChallenge() │   .complete()           │                          │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_story_intro_progress        │ storyProgressRepository      │ useStoryIntroProgress   │ Intro step indicators    │
│                                 │   .getStoryIntroProgress()   │                         │                          │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ mark_intro_item_consumed        │ storyProgressRepository      │ useStoryIntroProgress   │ Intro play button        │
│                                 │   .markIntroItemConsumed()   │   .markConsumed()       │                          │
├─────────────────────────────────┼──────────────────────────────┼─────────────────────────┼──────────────────────────┤
│ get_story_recommendations       │ storyRepository              │ (direct call)           │ Recommendations widget   │
│                                 │   .getStoryRecommendations() │                         │                          │
└─────────────────────────────────┴──────────────────────────────┴─────────────────────────┴──────────────────────────┘
```

## File Map

```
lib/
  story-types.ts              ← 12 interfaces + 2 result types + constants
  storyRepository.ts          ← 7 functions (library, current, unlocked, details, slots, recommendations, bySlug)
  storyProgressRepository.ts  ← 4 functions (complete slot, completion, intro progress, mark consumed)
  storyCertificateRepository.ts ← 1 function (get certificate)
  weeklyChallengeRepository.ts  ← 2 functions (get challenges, complete challenge)

hooks/
  useStoryAdventure.ts        ← 8 hooks (currentStory, library, details, slots, progress, certificate, challenges, intro)
```

## Optimistic Updates

| Hook | Mutation | Optimistic Behavior |
|------|----------|-------------------|
| `useStorySlots` | `.complete(missionId)` | Sets `completed=true` on the slot immediately before server confirms |
| `useWeeklyChallenges` | `.complete(challengeId)` | Sets `completed=true` and `stars_earned` immediately |
| `useStoryIntroProgress` | `.markConsumed(slotKey)` | Sets `consumed=true` and `consumed_at=now()` immediately |
