# Nimipiko World Bible

**Version 1.0 · 2026**

> Every design decision, engineering choice, and artistic brief should be measured against what is written here. When something conflicts with this document, the document wins — or the document is updated through a deliberate design decision, never silently overridden.

---

## Table of Contents

**Identity**
1. [Brand Vision](#01-brand-vision)
2. [World Philosophy](#02-world-philosophy)
3. [The Story Tree](#03-the-story-tree)

**The World**
4. [Landmarks](#04-landmarks)
5. [Mascots](#05-mascots)
6. [Theme Variations](#06-theme-variations)

**Visual**
7. [Color System](#07-color-system)
8. [Typography](#08-typography)
9. [Signature Shape](#09-signature-shape)
10. [Illustration Style](#10-illustration-style)
11. [Decorative Elements](#11-decorative-elements)

**Experience**
12. [Motion Bible](#12-motion-bible)
13. [Sound Bible](#13-sound-bible)
14. [Language Bible](#14-language-bible)
15. [World Maps](#15-world-maps)

**Technical**
16. [Buttons & Controls](#16-buttons--controls)
17. [Accessibility](#17-accessibility)
18. [Asset Naming](#18-asset-naming)
19. [Component Rules](#19-component-rules)
20. [Future Worlds](#20-future-worlds)

---

## 01 Brand Vision

### Not an app. A world.

When a child opens Nimipiko, they do not see a product. They arrive somewhere. Every screen is a location. Every interaction is an event. The campus breathes, grows, and remembers them.

The mission in one sentence: **make learning feel like entering a story you can't put down.**

> **Core belief:** Every child deserves a world of their own — one that speaks their language, celebrates their progress, and makes them feel like the hero of their own story.

### Three founding principles

| Principle | What it means in practice |
|---|---|
| **World over product** | Every screen is a place, not a page. Name them like places. |
| **Character over chrome** | Nimi, Piko, and Zilo carry the UI. Generic icons and labels do not. |
| **Growth over gamification** | Rewards celebrate real learning. Nothing is rewarded for logging in alone. |

---

## 02 World Philosophy

### The campus is alive.

The Learning Campus is not a metaphor. It has weather, seasons, a history, and inhabitants. It grows as children grow. Areas unlock. Landmarks are built. The campus in year one is not the campus in year three.

### Five rules of the Nimipiko world

| # | Rule | Violation example |
|---|---|---|
| 1 | Every screen is a place with a name. | "Settings" — call it "My World" |
| 2 | The world has one anchor — the Story Tree. | Multiple competing hero images |
| 3 | Characters appear for a reason, not for decoration. | All three mascots standing idle on a form |
| 4 | Nothing is purely functional. Everything also tells a story. | A plain loading spinner with no context |
| 5 | The three worlds share the same campus. Only the art changes. | HP removing the Library and replacing it with something unrelated |

> The three themes — Default, Harry Potter, Ocean — are not skins. They are **parallel dimensions of the same campus.** Same landmarks, same mascots, same map. Different interpretation.

---

## 03 The Story Tree

### The anchor of the Nimipiko universe.

Every recognizable world has one object people remember: Hogwarts' castle, Mario's pipe, Pokémon's Pokéball. Nimipiko's is the Story Tree. It is ancient, enormous, and carved with letters from every language children learn here. Its roots run beneath the entire campus.

The Story Tree is always present. It appears on the homepage hero, the app icon, loading states, and every world map. It is the first thing a new artist draws and the last thing a designer removes.

### Three-world interpretation

| World | Name | Form | Character |
|---|---|---|---|
| **Default** | The Great Story Tree | Ancient oak, wide trunk, bark carved with letters in French, English, and Kinyarwanda. Warm morning light. | Wise, welcoming, rooted. The feeling of a grandmother's garden. |
| **Harry Potter** | The Enchanted Story Willow | Silver willow with branches that move, glowing bark runes, floating words drifting from leaves like embers. | Mysterious, alive, slightly dramatic. The feeling of a spell being cast. |
| **Ocean** | The Coral Story Tree | A living coral formation in deep teal water, branching like a tree, bioluminescent at night, fish threading through it. | Serene, breathing, slow. The feeling of something ancient and patient. |

### Presence rules

The Story Tree **must appear always:**
- Homepage hero
- App icon
- Splash screen
- World map

The Story Tree **must be referenced** in:
- Loading states: *"Nimi is climbing the Story Tree…"*
- Achievement descriptions: *"You unlocked a new branch!"*
- Level names: Seedling → Branch → Canopy → Crown

---

## 04 Landmarks

### Seven places that make a world.

Zones are not labels. They are locations. A child who spends time in the Library should feel they know the Library. Every landmark has a name, a permanent spot in the campus map, and a mascot assigned to it.

| Landmark | Zone | Description |
|---|---|---|
| 🌳 **The Great Story Tree** | Center · Navigation anchor | The heart of the campus. All paths start here. All paths return here. Mascot: all three together. |
| 📚 **The Library** | East · Stories & reading | A warm reading room built around the Tree's eastern roots. Bookshelves grow like branches. Mascot: Zilo arrives with new books. |
| 🌸 **The Adventure Garden** | West · Activities & missions | An outdoor classroom among flowers and stepping stones. Activities happen here. Mascot: Piko is always running. |
| 🏡 **The Trophy Treehouse** | North · Profile & achievements | Built high in the Story Tree's canopy. A personal space. Walls display earned badges. Mascot: Piko decorates. |
| ⛲ **The Friendship Fountain** | South · Community | Where children share creations, celebrate each other, and meet. The water shows recent activity. Mascot: Nimi welcomes. |
| 🛖 **The Learning Market** | Southeast · Shop & rewards | A small market at the campus edge where stars can be exchanged. Colourful, festive, never pushy. Mascot: Piko buys things. |
| 🌉 **The Discovery Bridge** | Between zones · Transitions | Appears during loading and world transitions. Crossing a bridge is an event, not a wait. Mascot: Zilo leads across. |

---

## 05 Mascots

### Characters with jobs, not decorations.

Nimi, Piko, and Zilo appearing simultaneously on the same screen dilutes all three. Each has a clear role — and equally important, clear rules for when they must **not** appear.

### Nimi — Guide · Teacher · Welcome

**Appears for:** App loading & splash · First-time welcome · Tutorial moments · Help & FAQ · Empty states · Error messages

**Never appears for:** Celebration screens · Achievement unlocks

### Piko — Celebration · Reward · Energy

**Appears for:** Badge earned · Task complete · Streak milestone · Bonus claimed · Level up · All tasks done

**Never appears for:** Loading states · Empty / quiet states

### Zilo — Explorer · Discovery · Mystery

**Appears for:** New story available · Locked content · First visit to a zone · 404 / lost pages · Discovery Bridge · New world unlock

**Never appears for:** Familiar routine UI · Celebration moments

### Required expressions (before any animation work)

| Mascot | Required expressions |
|---|---|
| **Nimi** | Standing · Waving · Explaining (pointing) · Worried · Reading quietly |
| **Piko** | Jumping · Arms wide · Holding trophy · Holding gift · Running |
| **Zilo** | Looking curious · Carrying book · Pointing into distance · Peeking · Lost (looking around) |

---

## 06 Theme Variations

### Same world. Different sky.

When a child switches to Harry Potter or Ocean, the campus does not become a different product. It becomes the same campus seen through a different lens. Every landmark exists in every world. Every mascot exists in every world. Only the art, palette, and motion personality change.

| Element | Default | Harry Potter | Ocean |
|---|---|---|---|
| Story Tree | Oak, warm light | Willow, silver runes | Coral, bioluminescent |
| Library | Wooden shelves, lanterns | Moving staircases, floating books | Seashell archive, anemone lamps |
| Sky / background | Daylight blue, clouds | Deep purple, stars, lightning | Underwater teal, light shafts |
| Motion personality | Gentle bounce | Magical snap | Slow drift |
| Sound character | Birds, paper, bells | Chimes, sparks, candles | Water, bubbles, whales |
| Decorative motifs | Flowers, leaves, stones | Wand sparks, potions, owls | Bubbles, coral, seashells |
| Nimi's outfit | Casual campus wear | Wizard robes | Diver suit with fins |

> **Rule:** Any element that changes between themes must be in the asset registry. Any element that stays the same across all three themes belongs in the base layout, never in a theme asset.

---

## 07 Color System

### Named colors, not numbers.

Never reference a color as `green-500` or `#16a34a` in design or code. Every color in the Nimipiko system has a name. The name carries meaning. The hex value is an implementation detail.

### The palette

| Name | Hex | CSS Token | Use for |
|---|---|---|---|
| **Nimi Green** | `#1aa86a` | `--nimi-green` | Campus ground, primary actions, progress, paths |
| **Story Gold** | `#e89b2a` | `--story-gold` | Achievements, rewards, highlights, XP, stars |
| **Campus Sky** | `#3db8ea` | `--campus-sky` | Hero backgrounds, open-world feeling, sky layers |
| **Parchment** | `#fdf3e0` | `--parchment` | Card backgrounds, page ground, reading areas |
| **Zilo Coral** | `#f46058` | `--zilo-coral` | Adventure CTAs, new discovery, first-visit moments |
| **Bark** | `#1c1410` | `--bark` | Primary body text, high-importance labels |

### CSS design tokens

```css
:root {
  --nimi-green:  #1aa86a;  /* campus ground, primary */
  --story-gold:  #e89b2a;  /* achievements, XP, stars */
  --campus-sky:  #3db8ea;  /* hero sky, open world */
  --parchment:   #fdf3e0;  /* page and card ground */
  --zilo-coral:  #f46058;  /* discovery, adventure CTA */
  --bark:        #1c1410;  /* primary text */
  --branch:      #4a3726;  /* secondary text */
}
```

### Usage rules

| Color | Never use for |
|---|---|
| Nimi Green | Errors, warnings, deletions |
| Story Gold | Warning states |
| Campus Sky | Dense UI elements, dark surfaces |
| Parchment | Text, icons, interactive elements |
| Zilo Coral | Error states (too cheerful) |
| Bark | Backgrounds, decorative elements |

---

## 08 Typography

### Baloo speaks. Nunito listens.

Nimipiko uses exactly two typefaces. They have different jobs and must not be swapped.

| Face | Role | Used for | Never used for |
|---|---|---|---|
| **Baloo 2** | Display, character | Page titles, section headers, hero text, character speech, button labels, zone names | Body copy, form labels, captions, metadata |
| **Nunito** | Body, functional | Body text, descriptions, subtitles, form fields, captions, XP counts, date labels | Page titles, hero text, anything that needs to shout |

### Type scale

| Name | Size | Weight | Face | Use |
|---|---|---|---|---|
| Hero | clamp(2rem, 5vw, 3rem) | 900 | Baloo 2 | Homepage greeting, world title |
| Section | 22–24px | 900 | Baloo 2 | Zone headers ("The Library") |
| Card title | 15–17px | 900 | Baloo 2 | Story title, mission name |
| Eyebrow | 9px | 700 | Nunito | Zone labels, category chips |
| Body | 14–15px | 600 | Nunito | Descriptions, subtitles |
| Caption | 11–12px | 600 | Nunito | Metadata, XP counts, dates |

> **Eyebrow labels** — the zone identifiers like "The Library" or "Activity Garden" — are always **9px Nunito, uppercase, 0.12em letter-spacing.** This is the most repeated pattern in the product and must be consistent on every screen.

---

## 09 Signature Shape

### The leaf-turn card.

Every app uses rounded rectangles. Nimipiko's signature is a single asymmetric corner: three rounded corners, one that curls slightly tighter — like a page being turned, or a leaf at its tip.

```css
/* Base leaf-turn radius tokens */
--leaf-r:    20px 20px 20px 5px;  /* standard card */
--leaf-r-sm: 14px 14px 14px 4px;  /* compact card, chip */
--leaf-r-lg: 28px 28px 28px 7px;  /* hero cards */

/* Which corner curls: always bottom-left */
/* Exception: cards anchored to the right side of the screen
   use the inverted variant (top-left curls instead):
   border-radius: 5px 20px 20px 20px */
```

> **The curling corner is always the anchor corner** — where the card meets its visual root. A story card anchored to the left shelf: bottom-left curls. A badge hanging from the right: top-right curls. The curl points toward where the object comes from.

---

## 10 Illustration Style

### Rules for every artist who draws for Nimipiko.

| # | Rule | Detail |
|---|---|---|
| 1 | **Stroke weight** | 2–3px at 512px base size. Rounded endcaps and joins only. No sharp stroke terminations. |
| 2 | **Eyes** | Large filled circle, smaller pupil circle inside. Always one white highlight dot at the 10 o'clock position. Consistent across all characters and animals. |
| 3 | **Lighting** | Single light source from top-left, warm and slightly golden. Never dramatic side-lighting. Never dark shadows — everything in Nimipiko is lit like a sunny afternoon. |
| 4 | **Shadows** | Subtle cast shadow below objects, warm brown (`#3d2c1e` at 12% opacity), soft edge. No sharp shadows. No dark environments. |
| 5 | **Color fills** | Flat with a maximum of two gradient steps. No photorealistic textures. No lens flare. |
| 6 | **Foliage** | Rounded leaf silhouettes. Always in clusters of 3–5 leaves. Never single isolated leaves. Trees have wide trunks: 2/3 trunk, 1/3 canopy in visible ratio. |
| 7 | **Clouds** | Three-bump silhouette, puffy, no sharp edges. Always in soft white or light blue-grey. Never storm-grey. |
| 8 | **Proportions** | Characters have large heads (45% of total height), short arms, large eyes, small feet. This is non-negotiable — it's what makes them Nimipiko characters, not generic cartoon characters. |

---

## 11 Decorative Elements

### The same decorations, used consistently.

| World | Permitted motifs |
|---|---|
| **Default** | Stars (⭐✨), flowers (🌸🌺🌼🌷), leaves (🍃🍀), butterflies (🦋), birds (🐦🦜), clouds (☁️), stepping stones, sparkle dots |
| **Harry Potter** | Wand sparks, magical orbs, floating stars, lightning wisps, potion bubbles, owls, enchanted books, floating candles, constellation dots |
| **Ocean** | Bubbles, seaweed, small tropical fish, coral sprigs, pearls, starfish, seahorses, wave curls, shells, soft light rays |

> All decorative elements use `pointer-events: none; user-select: none;` in code. Opacity between 0.15 and 0.55 — never fully opaque. They are background atmosphere, not foreground content.

---

## 12 Motion Bible

### Every world moves differently.

Motion is part of the brand. Someone switching from Default to Ocean should feel it in the animations before they consciously notice the art change.

### World motion personalities

**Default — Nimi World**
- Personality: Gentle. Curious. Springy.
- Everything bounces slightly on landing. Like a leaf falling. Joy without chaos.
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`

**Harry Potter**
- Personality: Magical. Elastic. Dramatic.
- Spells are instant but their effects linger. Snap, then settle.
- Easing: `cubic-bezier(0.22, 1.6, 0.36, 1)`

**Ocean**
- Personality: Slow. Drifting. Current.
- Nothing in the ocean moves quickly. Everything moves with intention.
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

### Speed scale

| Name | Default | HP | Ocean | Use for |
|---|---|---|---|---|
| Micro | 150ms | 120ms | 200ms | Button hover, icon swap |
| Standard | 300ms | 280ms | 420ms | Card enter, modal appear |
| Enter | 450ms | 400ms | 600ms | Page transition, section reveal |
| World | 700ms | 800ms | 1100ms | Theme switch, major transition |

> **Ambient animations** (floating elements, breathing effects, idle characters) use Infinity repeat with durations of 2.5–5s. They must respect `prefers-reduced-motion` — when reduced motion is set, ambient animations pause entirely.

---

## 13 Sound Bible

### Define the sound before you implement it.

| World | Character | Instruments & palette |
|---|---|---|
| **Default** | Warm, organic, morning | Soft bells, rustling paper, birdsong, gentle wind chimes, wooden percussion |
| **Harry Potter** | Magical, mysterious, ancient | Orchestral chimes, wand sparkle SFX, candle flicker, distant choir, spell whoosh |
| **Ocean** | Serene, vast, breathing | Underwater hum, soft bubble pops, whale song (distant), wave curl, reef ambience |

### Event sounds (all worlds)

| Event | Feel |
|---|---|
| Task complete | Short, bright, rising tone. Never startling. |
| Badge earned | Longer, musical, celebratory. Piko's moment. |
| Button press | Subtle, tactile. Barely audible. |
| New story | Mysterious, inviting. Zilo's moment. |
| Error | Soft, low, not alarming. Nimi's worried face, not a fire alarm. |
| Level up | Extended musical phrase. The biggest sound in the product. |

---

## 14 Language Bible

### The app speaks like a campus, not a dashboard.

Copy is world-building. Every label, every empty state, every error message is an opportunity to remind the child they are somewhere — not using software.

| Context | ~~Generic~~ | Nimipiko |
|---|---|---|
| App name | ~~the app~~ | the Learning Campus |
| Profile page | ~~Profile~~ | My Treehouse |
| Achievements | ~~Achievements~~ | Treasures |
| Settings | ~~Settings~~ | My World |
| Shop | ~~Shop~~ | Learning Market |
| Continue | ~~Continue~~ | Continue My Journey |
| Level up | ~~Level Up!~~ | You grew a new branch! |
| Stars earned | ~~+10 XP~~ | +10 Magic Stars ⭐ |
| Streak | ~~7-day streak~~ | 7-day Adventure Streak 🔥 |
| Loading | ~~Loading…~~ | Nimi is getting things ready… |
| New story | ~~New Story Available~~ | Zilo brought a new story! |
| Empty state | ~~Nothing here yet~~ | Be the first explorer in this zone! |
| Error | ~~Something went wrong~~ | Oops! Even trees need a moment. Try again. |
| Sign out | ~~Sign Out~~ | Leave the Campus |
| 404 | ~~Page not found~~ | Zilo got a little lost. Let's find the way back. |

### Voice rules

- Warm but not saccharine. Clear but not clinical.
- Never passive-voice errors ("An error occurred"). Always active ("Something bumped into us — let's try again").
- Nimi speaks in complete sentences. Piko uses exclamation points. Zilo asks questions.

---

## 15 World Maps

### The campus has a layout.

Landmarks have fixed spatial relationships. A child who knows where the Library is should be able to navigate to the Adventure Garden without thinking.

```
                    Trophy Treehouse
                           │
                           │ (north)
                           │
Library ──── (east) ── Story Tree ── (west) ── Adventure Garden
                           │
                           │ (south)
                    ┌──────┴──────┐
              Friendship      Learning
              Fountain         Market
                           │
                    Discovery Bridge
                    (appears during transitions)
```

> Every screen in the product has a physical location on this map. When adding a new feature, first ask: *where does this live on campus?*

---

## 16 Buttons & Controls

### Three button types. No more.

| Type | Use | Shape | Color |
|---|---|---|---|
| **Primary** | One per screen max. The most important action. | leaf-r, full padding | Nimi Green fill, white text |
| **Adventure** | New journey, discovery, first-time actions. | leaf-r, full padding | Story Gold fill, dark text |
| **Ghost** | Secondary options, cancel, navigation. | leaf-r, border only | Transparent fill, Bark border and text |

> Buttons use Baloo 2, font-weight 900. Never use a button label longer than three words. Labels are actions ("Start the Journey", "Claim Reward", "See All") — never nouns ("Achievements", "Library").

---

## 17 Accessibility

### The campus is for everyone.

| # | Rule | Minimum |
|---|---|---|
| 1 | **Color contrast** | 4.5:1 for all body text. 3:1 for large text (Baloo headings over 18px bold). No exceptions for decorative elements that contain text. |
| 2 | **Motion** | All ambient animations must pause when `prefers-reduced-motion: reduce` is set. |
| 3 | **Touch targets** | Minimum 44×44px for all interactive elements. Non-negotiable for a children's app. |
| 4 | **Screen readers** | All decorative images use `aria-hidden="true"`. All mascot images have descriptive alt text. All interactive elements have visible focus states. |

---

## 18 Asset Naming

### One convention. Used everywhere.

```
/public/themes/{theme-id}/
│
├── characters/
│   ├── nimi.png               # idle / default
│   ├── nimi-wave.png          # welcome, loading
│   ├── nimi-explain.png       # tutorial, help
│   ├── nimi-worried.png       # error states
│   ├── piko.png
│   ├── piko-celebrate.png     # badge, level-up, bonus
│   ├── zilo.png
│   ├── zilo-explore.png       # new content, locked
│   └── zilo-lost.png          # 404, empty state
│
├── world/
│   ├── story-tree.png         # hero anchor
│   ├── library.png
│   ├── adventure-garden.png
│   ├── treehouse.png
│   ├── friendship-fountain.png
│   └── discovery-bridge.png
│
└── decorations/
    ├── sparkle.png
    ├── corner-tl.png
    ├── corner-tr.png
    ├── floating-1.png
    └── floating-2.png
```

**Format:** WebP for all art assets, SVG for icons and decorative geometry.

**Sizes:** All character art at minimum 512×512px @2x. World art at minimum 1024px wide @2x. Deliver @1x and @2x for all assets.

---

## 19 Component Rules

### Which character. Which screen. Always.

| Screen / Component | Character | Expression |
|---|---|---|
| Splash / app loading | Nimi | Waving |
| Homepage hero | Nimi + Piko + Zilo | All standing, idle — the trio is together here |
| Loading skeleton (data fetch) | Nimi | Reading quietly (small, unobtrusive) |
| Empty state (no data) | Nimi | Looking around curiously |
| Tutorial / onboarding step | Nimi | Explaining (pointing) |
| Help & FAQ page | Nimi | Explaining |
| Error state | Nimi | Worried |
| Badge earned | Piko | Jumping / arms wide |
| Task complete | Piko | Thumbs up |
| Streak milestone (3, 7, 14, 30) | Piko | Holding trophy |
| Level up | Piko | Celebrating — the biggest reaction |
| Daily bonus claimed | Piko | Holding gift |
| New story available | Zilo | Carrying book |
| Locked content | Zilo | Looking at lock curiously |
| First visit to a zone | Zilo | Pointing into the zone |
| Discovery Bridge (loading) | Zilo | Leading across bridge |
| 404 page | Zilo | Lost (looking around) |

---

## 20 Future Worlds

### The campus expands.

Default, Harry Potter, and Ocean are the founding three. As Nimipiko grows, new worlds will open. Each one follows the same rules: same landmarks, same mascots, different art and motion personality. The Story Tree always exists.

| World | Story Tree form | Motion | Sound |
|---|---|---|---|
| **Space** | The Cosmic Story Nebula — a glowing cloud formation shaped like a tree, orbited by tiny learning moons | Zero-gravity float. Long delays, no bounce. | Sine waves, distant pulses, silence between notes |
| **Jungle** | The Ancient Story Banyan — a multi-trunked giant with roots that form archways | Elastic and alive. Everything sways and breathes. | Drums, animal calls, rain on canopy |
| **Winter** | The Frozen Story Spire — a crystalline ice formation with frozen letters visible inside each facet | Crisp, precise, brittle. Sharp easing, no bounce. | Wind across ice, bells in cold air, snow landing |

> **Before building any future world:** the Story Tree design must be approved first. The tree is the soul. Everything else follows from it.

---

*Nimipiko World Bible v1.0 · 2026*

*This is a living document. When the world changes, version it:*
- *Correction or addition within a chapter → v1.x*
- *New chapter or major structural change → v2.0*
- *New world launch → major version*
