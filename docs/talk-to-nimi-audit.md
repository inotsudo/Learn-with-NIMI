# Talk to Nimi — Feature Audit
**Date:** 2026-07-18  
**Scope:** Full-stack audit of the Talk to Nimi chat feature across page, hook, API route, and home widget.

---

## 1. File Map

| File | Role |
|------|------|
| `app/talk-to-nimi/page.tsx` | Full-page chat UI (3-column layout) |
| `hooks/useNimiChat.ts` | SSE streaming hook, TTS toggle |
| `app/api/nimi/route.ts` | Edge API route → OpenRouter |
| `components/home/TalkToNimi.tsx` | Embedded home widget (mini chat) |
| `components/home/QuickReplyChips.tsx` | Scrollable quick-reply chip row |
| `components/home/ChatQuestBanner.tsx` | Quest progress + claim UI |
| `components/home/ChatSidebar.tsx` | Today's stars, streak, badges panel |

---

## 2. Architecture Overview

```
User
 │
 ├── /talk-to-nimi (full page)
 │     └── useNimiChat hook
 │           └── fetch POST /api/nimi  (Bearer token)
 │                 └── OpenRouter → gpt-4o-mini (streaming SSE)
 │                       └── [RW only] Language Guardian rewrite pass
 │
 └── Home page widget (TalkToNimi.tsx)
       └── same useNimiChat hook
       └── after 2 exchanges → sessionStorage handoff → push("/talk-to-nimi")
```

---

## 3. Full-Page UI (`app/talk-to-nimi/page.tsx`)

### Layout
Three-column layout (desktop):
- **Left (hidden on mobile):** Nimi mascot illustration + decorative panel
- **Center:** Chat card — the main interaction surface
- **Right:** `ChatSidebar` — today's stars, chat streak, badges earned, Nimi's tip

### Data Loading
All data is loaded once on mount via `useEffect` from the child's profile:

| Data | Source |
|------|--------|
| `childName` | `children` table via Supabase |
| `childLanguage` | `children.language` |
| Current story title + emoji + progress | `get_current_story` → `story_versions` + `child_progress` |
| `slotsDone` / `slotsTotal` | `child_progress` count |
| `todayStars` | sum of `child_progress.stars_earned` where `date = today` |
| `chatStreakDays` | `chat_streaks` table |
| `badgeCount` | `child_badges` count |
| `claimedChallenges` | `claimed_daily_challenges` |

### Context Injected into Nimi's System Prompt
```
childName, childLanguage,
storyTitle, storyEmoji, storyProgress (% as fraction),
slotsDone, slotsTotal
```

### Quest System
- **Target:** `QUEST_TARGET = 3` complete exchanges (user sends + Nimi replies = 1 exchange)
- **Reward:** `QUEST_STARS = 10` stars  
- **Claim flow:** `canClaim` triggers when `exchangeCount >= QUEST_TARGET && !claimed`; claim button calls an RPC to award 10 stars, sets `claimed = true`
- **Visual:** `ChatQuestBanner` component shows progress dots + animated claim/claimed state

---

## 4. Chat Hook (`hooks/useNimiChat.ts`)

### State
```ts
messages: ChatMessage[]   // { from: "nimi" | "user"; text: string }
isTyping: boolean
isSpeaking: boolean
```

### Sending a Message
1. Appends user message + empty Nimi placeholder to `messages`
2. Calls `POST /api/nimi` with Bearer token, full message history, and context object
3. Reads response as SSE stream (`EventSource`-style via `Response.body.getReader()`)
4. On each `data:` chunk, updates the last message in place (streaming word-by-word effect)
5. On `[DONE]` sentinel, sets `isTyping = false`; calls `onExchangeComplete` callback

### Limits Enforced
| Limit | Value |
|-------|-------|
| Max message history | 20 messages |
| Max single message length | 500 characters |
| Request timeout | 20 seconds (AbortController) |

### TTS (`toggleSpeak`)
- Calls `speakText(lastNimiMessage)` / `stopSpeaking()` from the Web Speech API wrapper
- Disabled for Kinyarwanda (`language === "rw"`) — no TTS chip or button rendered

### STT (`useSpeechToText`)
- Browser Web Speech API
- Also disabled for `language === "rw"`
- `interimText` shown live in input placeholder while listening

---

## 5. API Route (`app/api/nimi/route.ts`)

### Runtime
```ts
export const runtime = "edge";
```

### Auth
- Reads `Authorization: Bearer <token>` from request header
- Calls `authClient.auth.getUser(token)` to validate
- Returns `401` if invalid — **route IS auth-gated**

### Model
- `openai/gpt-4o-mini` via OpenRouter (configurable via env `OPENROUTER_MODEL`)
- Base URL: `https://openrouter.ai/api/v1`

### System Prompt
Built dynamically from injected context:
```
You are Nimi, a friendly AI companion for children learning languages.
Child's name: {childName}
They are currently reading: {storyTitle} {storyEmoji}
Progress: {storyProgress}% ({slotsDone}/{slotsTotal} missions done)
Language: {childLanguage}
```
Plus: keep responses short, fun, age-appropriate; stay on language learning.

### Streaming Pipeline

#### English / French
```
OpenRouter SSE stream → forward chunks directly to client
```

#### Kinyarwanda (2-pass)
```
Pass 1: Generate full response in English → collect complete text
Pass 2: Send to "Kinyarwanda Language Guardian" system prompt for full rewrite
        → split result into words → simulate word-by-word stream at ~25ms/word
```
This ensures Kinyarwanda responses are culturally accurate and grammatically correct, not raw AI translationese.

---

## 6. Home Widget (`components/home/TalkToNimi.tsx`)

### Purpose
A mini-chat card embedded on the home page — lets the child have a quick exchange with Nimi without navigating away.

### Handoff Behavior
- After `EXCHANGES_BEFORE_FULL_CHAT = 2` exchanges, the next send:
  1. Serializes current `messages` + pending input into `sessionStorage[NIMI_CHAT_HANDOFF_KEY]`
  2. Navigates to `/talk-to-nimi`
  3. Full page picks up the handoff and pre-populates chat history

### Greeting
Always starts with: `"Hello {childName}! 👋 How was your adventure today?"`  
Resets on `childName` change.

---

## 7. Quick Reply Chips (`components/home/QuickReplyChips.tsx`)

Six hardcoded prompt keys (all translated):
```
quickReplySong, quickReplyJoke, quickReplyDraw,
quickReplyAnimal, quickReplyColor, quickReplyDay
```

- `size="sm"` (home widget): horizontal scroll, no arrows
- `size="md"` (full page): scroll arrows + scroll-progress indicator bar

---

## 8. What Works Well

| Strength | Detail |
|----------|--------|
| Auth gated | Bearer token validated server-side on every request |
| Kinyarwanda quality pipeline | 2-pass generation + Language Guardian rewrite |
| Streaming UX | SSE chunks update message in-place; typing indicator |
| Context injection | Child name, story, progress all fed to system prompt |
| Quest system | Incentivizes 3 exchanges with 10 bonus stars |
| Mic/TTS disabled for RW | Avoids broken speech for unsupported locale |
| Home widget → full page handoff | Seamless conversation continuity via sessionStorage |
| Message limits | 20 msgs / 500 chars enforced in hook |

---

## 9. Gaps vs. Vision

The vision is **Story Companion** — Nimi as a deep, knowledgeable guide for the specific story the child is reading, not a general chatbot.

### 9.1 Context is Shallow
**Current:** Nimi only knows story title, emoji, and a `progress` fraction.  
**Missing:** Nimi has zero knowledge of actual story content — no characters, plot, vocabulary, lesson objectives, or slot-level details.  
**Impact:** Nimi cannot ask comprehension questions, cannot discuss what happened in the story, cannot reinforce specific vocabulary from the lesson.

### 9.2 No Conversation Persistence
**Current:** Message history lives only in React state. Closing the tab erases everything.  
**Missing:** No DB storage for conversations. No "remember last time" capability.  
**Impact:** Every session starts cold. Nimi cannot follow up on previous conversations or track a child's growing vocabulary.

### 9.3 Full History Sent Every Turn
**Current:** All `messages` are sent in every API call.  
**Risk:** As conversation grows toward the 20-message limit, token usage grows linearly. No summarization or windowing.

### 9.4 No Proactive Story Prompting
**Current:** Nimi waits for the child to speak first (greeting only).  
**Missing:** Nimi should surface questions tied to what the child just completed — "I saw you finished the Animal Friends mission! What was your favorite animal?" — driven by real slot completion data.

### 9.5 Quest is Not Story-Linked
**Current:** Quest rewards 3 generic exchanges.  
**Missing:** Quest should incentivize story-specific exchanges — "Ask Nimi about 3 words from today's story."

### 9.6 TTS / Mic Coverage
**Current:** Both disabled for Kinyarwanda.  
**Missing:** RW children get a text-only experience. No read-aloud of Nimi's responses even though TTS exists for EN/FR.

### 9.7 No Vocabulary Tracking Integration
**Current:** Nimi's responses don't feed back into the child's vocabulary progress.  
**Missing:** Words introduced in conversation could be logged as "encountered" in the child's vocabulary record.

### 9.8 Model is Minimal
**Current:** `gpt-4o-mini` — capable but small.  
**Consideration:** For rich story comprehension and nuanced child-safe responses, a more capable model (e.g., GPT-4o or Claude) may improve quality, especially for the RW Language Guardian pass.

---

## 10. Recommended Next Steps (Priority Order)

1. **Feed real story content into context** — Pull the active story's `story_version` body text, character list, vocabulary list, and slot descriptions into the system prompt. This is the highest-leverage single change.

2. **Slot-aware entry point** — When a child completes a slot and taps "Talk to Nimi," pass the completed slot's content as context so Nimi can ask about it immediately.

3. **Story-linked quick replies** — Replace (or augment) the generic 6 chips with dynamic chips derived from the current story: "Who is your favorite character?", "What did {character} do?", "Teach me a word from the story."

4. **Conversation persistence** — Add a `nimi_conversations` table (child_id, created_at, messages JSONB). Store sessions so Nimi can reference prior conversations.

5. **Proactive prompting from slot completion** — When `slotsDone` changes (detected via polling or realtime), have Nimi surface a story-related question unprompted.

6. **Vocabulary loop** — Track nouns/words Nimi uses in conversation against the story's vocabulary list; surface "new words learned via Nimi" on the profile page.

7. **RW TTS** — Investigate browser TTS support for `rw` or use a TTS API (e.g., ElevenLabs) for Kinyarwanda so RW children can hear Nimi's voice.
