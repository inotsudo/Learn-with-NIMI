# NIMIPIKO — Official Product Spec (source of truth)

**Status:** agreed with the product owner on 2026-11-20.
**Sources:**
- *The NIMIPIKO Learning Journey* (PDF)
- *NIMIPIKO Airways — scene prompts 1–5* (PDF)
- the brand intro video (`media-source/Intro.mp4`, kept out of git)
- the reference images in [`images/`](images/)

When code, content or older docs disagree with this file, **this file wins**. Section 9 lists where the app does not match yet.

---

## 1. Characters

| Character | Role |
|---|---|
| **Nimi** | The hero. Learns, discovers and grows together with the child. Yellow fruit-shaped head with a leaf cap, green "NIMI" T-shirt. |
| **Piko** | The travel guide and pilot of Nimipiko Airways. Welcomes the child, explains each step, announces the next mission, encourages and celebrates every success. Blue-faced drone robot. |
| **Zilo** | The protector of nature. Teaches children to love, respect and protect the planet. Leaf-and-flower hair, brown "ZILO" overalls. |
| **Nimilie** | The fourth main character, always seen with Nimi and Piko (pink dress, leaf hair clip; appears in scenes 18–23). |
| **The child** | The real learner. In references the sample child is called **Ketsia**; everywhere she appears, the actual child's name and photo are used. Ketsia is not a character. |
| **NIMI AI** | The assistant "always by their side" (see §6). |

- **Official look:** the 3D, Disney-Pixar-quality designs on the passport cover, the Kit and the scenes.
- **Older style:** the 2D drawings in `journey-infographic-older-style.png` (boy Nimi, helicopter Piko) are a retired style. Use that image for the *structure* of the journey only.

**Brand lines:**
- « Chaque histoire est une nouvelle destination. »
- « Grow with every story. »
- « Learn · Play · Explore · Grow · Become a Champion! »

---

## 2. The journey

| # | Step | What happens |
|---|---|---|
| 1 | **Welcome to Nimipiko** | One welcome video: how the NIMIPIKO Learning Method works, meet the characters, meet NIMI AI. |
| 2 | **Ready for Departure** | The parent creates the child's profile and **uploads the child's photo**. The app generates the child's **Passport** and **Boarding Pass**. |
| 3 | **First Destination** | The child boards Nimipiko Airways and flies to **Book 1 — « Nimi à l'école »**. |
| 4 | **The Learning Method** | Each book has **6 mandatory missions** (§3). |
| 5 | **Champion Rewards** | After all 6 missions: Champion Certificate, Attitude Badge, Official Travel Stamp (§4). |
| 6 | **Family Challenges** | **3 optional** family challenges. Family photos of them are kept as memories in the **Treasure Box**. |
| 7 | **My Nimipiko** | The child's private space (§5). |
| 8 | **Grand Champion** | After 12 books and 12 stamps: the ceremony (§7). |

### Airport sequence (scene prompts 1–5 + intro video)

1. **Welcome Hall:** Nimi, Piko and Zilo welcome the child and hand over the **Kit des Champions** (passport, personalised passport, boarding pass).
   VO: *« Watatawow ! Bienvenue chez Nimipiko ! Voici ton kit pour commencer ta première aventure. Ta première destination : Nimi à l'école ! »*
2. **Passport control / gate:** the child shows the passport and boarding pass at « Contrôle des voyageurs ». The **QR/barcode is scanned** to check that the passport was issued, as at a real airport (§4.4). Embarquement at gate G1.
3. **Boarding:** inside the aircraft the child discovers the six activities (cabin screen).
4. **Takeoff** toward Destination 1.
5. **Arrival:** the plane reaches the giant book « Nimi à l'école ».
   VO: *« Nous arrivons à destination… Nimi à l'école. »*
6. **Giant book:** the friends run to the book (seen from behind). The book opens and the six icons appear one by one: FlipFlop Audio, Histoire PDF, Coloriage, Bouge avec Nimi, Karaoké, Vidéo Bonus. Final page **« PRÊT ? »** then **« C'EST PARTI ! »**; the camera enters the book into **FlipFlop Audio**.

### Books

| Book | Title | Stamp icon |
|---|---|---|
| 1 | Nimi à l'école | blue backpack |
| 2 | Nimi et les visages qui parlent | emotion faces |
| 3–12 | « À découvrir ! » | trophy (placeholder) |

---

## 3. The 6 mandatory missions

| # | Mission (FR) | EN | `story_slots.slot_key` |
|---|---|---|---|
| 1 | FlipFlop Audio | FlipFlop Audio | `flipflop_audio` |
| 2 | Histoire PDF | Story PDF | `story_pdf` |
| 3 | Coloriage | Coloring | `coloring` |
| 4 | Bouge avec Nimi | Move & Explore with Nimi | `move_explore` |
| 5 | Karaoké | Karaoke | `sing_along` |
| 6 | Vidéo Bonus | Bonus Video | `bonus_video` |

A book is complete when these **6** are done. The 3 family challenges are optional and must not block completion.

---

## 4. Rewards and personalised products

**Personalised** with the child's photo and name: Passport, Boarding Pass, PDF Story, Champion Certificate, Attitude Badge, Song. Also the **Kit des Champions** visual.

**Not personalised:** Official Travel Stamps.

### 4.1 Boarding pass — « Carte d'embarquement »

| Field | Value |
|---|---|
| Champion | name + photo |
| Âge | e.g. 3 ans |
| Statut | PETIT CHAMPION |
| Vol | `NMP1` + book number in two digits → NMP101 |
| Destination | book title |
| Livre | book number |
| Siège | age + "A" → 3A |
| Porte | `G` + book number → G1 |
| Embarquement | OUVERT |

- Bottom of the card: the passport-check code with « Scanne pour débuter ton voyage » and « Bon voyage, Petit Champion ! ».
- Stamp: « République des Champions — Passe de départ ».

### 4.2 Passport — « Passeport Voyage Nimipiko »

- **Cover:** navy and gold, with Nimi, Piko and Zilo around a globe and an open book.
- **Identity page — « Identité du Champion »:**
  - photo
  - Nom du champion
  - **Numéro du champion**, e.g. `KET-A-001` (first 3 letters of the name, book letter, sibling rank)
  - date de création
  - QR « Scanne pour voir ton profil Nimipiko »
- **One page per destination:**
  - Livre N with its icon
  - the Attitude Badge
  - Date de validation
  - « Nimipiko — Officiellement validé » seal
  - **« Visa d'entrée autorisé pour le Livre N+1 »** with the next book's cover and « Signature du champion »

### 4.3 Attitude Badge — « Attitude du Champion »

- Holographic badge, one per book, e.g. **SUPER CURIEUX / SUPER CURIEUSE** — « Nimi à l'école · Champion du Livre 1 ».
- The personalised version shows the child's photo and name (« Ketsia à l'école »).
- The French adjective agrees with the child (Curieux / Curieuse).

### 4.4 Passport-check code (QR / barcode)

The QR or barcode on the passport, boarding pass and Kit is a **token proving the passport was issued**. Passport control scans it, as at a real airport. It must not expose private data.

### 4.5 Official Travel Stamps — « Collection Officielle des Timbres de Voyage »

- 12 histoires · 12 destinations · 12 souvenirs inoubliables.
- One stamp per finished book, **earned on completion**, with « Date de validation » and the « Officiellement validé » seal.
- Not personalised. Books not yet done show « À découvrir ! ».
- The last page (p. 13/13) shows « Félicitations Grand Champion ! », 12 stars, 12 destinations / 12 badges / 12 histoires.

### 4.6 Kit des Champions — « Champion Kit / Champion Carry-On »

A toy suitcase with:
- the child's photo window
- the passport and boarding pass behind glass
- « TIREZ » pull tab
- buttons (book / music / mic / leaf)
- « Clic / Scanne Destination secrète » (the passport-check code, §4.4)
- the Nimi, Piko and Zilo figures
- « nimipiko.com »

---

## 5. My Nimipiko (private space)

Passport · Boarding Pass · Progress · Treasure Box (family-challenge memories) · Gallery (the child's creations) · Personalised Passport · Personalised PDF Story · Personalised Song.

Everything here is **private to the family**.

---

## 6. Rules

### Privacy
- The child's photo is private and only used in the family's own items.
- Nothing leaves the private space unless a parent chooses to share it.

### Nimi Community
- Everything is **private by default**.
- **Parents decide** what to share.
- Every shared item also passes an **automatic kid-safety check** before it is visible.

### NIMI AI
- **With children:** answers learning questions **grounded in the app's own stories**.
- **With parents:** may also use **outside sources** for parenting questions (how to raise a child and related topics).
- **Conversations are private.**

---

## 7. Grand Champion ceremony

After **12 books and 12 Official Travel Stamps** the child becomes a **Grand Champion**:
- an official **Citizen of the République des Champions de Nimipiko**: « Citoyenneté accordée à… », date, « Signature du Grand Champion », gold « République des Champions » seal;
- recites the oath;
- receives a **brand-new Passport with 12 new destinations**;
- new level: new worlds and vehicles (train, hot-air balloon), reinforced learning.

**« Mon serment de Champion Pionnier Mondial »**
1. Je dis les mots magiques : Bonjour, Merci, S'il te plaît, Pardon et Au revoir, avec mon plus grand sourire !
2. Je réfléchis bien pour faire des super bons choix, comme un vrai grand chef !
3. Je regarde, j'écoute et j'explore toutes les destinations et toutes les histoires !
4. Je range mes jouets, je recycle et je protège la nature et les petites fleurs !
5. Je partage, j'aide mon Papa et ma Maman et je fais des chatouilles pour faire sourire tout le monde !
6. J'éteins les écrans quand le chrono fait BIP et je rends gentiment le téléphone sans larmichettes !
7. Je vais jouer dehors pour courir, sauter et faire reposer mes petits yeux de super-héros !
8. J'aime et je respecte tout le monde, tous les enfants et tous les grands de la Terre !

**République des Champions:**
- flag: purple and green, with the Nimi stamp emblem;
- places: Palais des Champions, Port des voyages, Arbre de la connaissance, Chaque bibliothèque Nimipiko;
- signposts: Apprendre · Explorer · Créer · S'amuser · Grandir · Devenir un champion.

---

## 8. Reference images

| File | Shows |
|---|---|
| `passport-cover.jpg` | Passport cover |
| `passport-spread-template.jpg` / `passport-spread-personalised-example.jpg` | Identity + Destination 1 pages (generic / with photo) |
| `boarding-pass-template.jpg` / `boarding-pass-personalised-example.jpg` | Boarding pass (generic / with photo) |
| `attitude-badge-template.jpg` | Attitude Badge « Super Curieux » |
| `stamps-collection-officielle.jpg` | 12-stamp collection page |
| `kit-des-champions-*.jpg` | The Kit (three variants) |
| `scene-passport-control-with-boarding-pass.jpg` | Tarmac: passport control with the boarding pass in hand |
| `grand-champion-oath-and-citizenship.jpg` | Oath + Grand Champion / citizenship page |
| `republique-des-champions-poster.jpg` | The République world |
| `journey-infographic-older-style.png` | Journey structure (older character style) |

The airport scenes used by the app are in `public/now/scenes/` (scene-1 … scene-25).

---

## 9. Where the app does not match yet (2026-11-20)

| Area | Spec | App today | Where |
|---|---|---|---|
| Welcome | One welcome video + method + characters + NIMI AI | Two intros: the world intro clip, plus the admin intro on the story page | `components/nimi-world/WorldOverlays.tsx` (IntroCinematic), `app/stories/[slug]/page.tsx` (onboarding phase) |
| Ready for Departure | Photo upload at signup; passport + boarding pass generated | Signup uses a drawn avatar; photo upload only in profile edit | `app/onboarding/page.tsx`, `components/profile/EditProfileSheet.tsx` |
| Book order | Book 1 = Nimi à l'école, Book 2 = visages qui parlent | Book 1 in the database = "Nimi and the Talking Faces" | `stories` table, admin Story Studio |
| Kit in the hall | Passport + boarding pass already in the Kit | The boarding pass is "issued" at the gate | `components/nimi-world/JourneyDesk.tsx` |
| Passport control | Scan the passport-check code | Stamps a "Destination N" visa | `components/nimi-world/JourneyDesk.tsx` |
| Passport-check code | Token, no private data | Barcode prints the raw `childId|storyNumber` | `lib/airways/barcode.ts` |
| Book opening | « PRÊT ? » → « C'EST PARTI ! » → FlipFlop Audio | « PRÊT ? » only; the child picks a mission | `components/nimi-world/NimiToyWorld.tsx` |
| Completion | 6 missions | Every slot counts, including challenge slots | `_sa_is_story_complete` (migration 044) |
| Travel stamps | 12 book stamps, earned on completion | PDF ✓; the world's passport shows badge-based stamps | `lib/airways/buildStampsSvg.ts` ✓, `components/nimi-world/worldData.ts` ✗ |
| Attitude badge | Gendered adjective | No gender stored for the child | `children` table, `lib/airways/buildAttitudeBadge.ts` |
| Certificate | One certificate | Three generators | `/api/certificate`, `lib/certificateImage.ts`, `/api/airways/certificate` |
| Family challenges | Optional, photo memories in the Treasure Box | Count toward completion; Treasure page is a stars arena | `app/treasure/` |
| My Nimipiko | One private space | Spread over `/user-profile`, `/parents`, `/treasure`, `/certificates` | — |
| Community | Private by default, parent approval + kid-safety check | Removed (the old one auto-published) | git history before `b809c29` |
| NIMI AI (children) | Answers from the app's stories | May web-search (filtered) on non-story questions | `lib/knowledgeRouter/` |
| NIMI AI privacy | Conversations private | Admins can read conversation summaries | `app/admin/ConversationHistoryManager.tsx` |
| Grand Champion | After 12 books | Status turns "Grand Champion" at 7 | `lib/airways/formatters.ts` (`statusLabel`) |
| Photos | Private | Child photos in a public storage bucket (`avatars`, `masterpieces`) | `components/profile/EditProfileSheet.tsx`, `app/masterpiece/` |
| Characters | Nimi, Piko, Zilo, Nimilie | Zilo and Nimilie have no app art yet (they exist in the scenes) | `lib/design-system/assetRegistry.ts` |
| Printed QR codes | — | Pointed to the removed `/missions`; now redirect to the story | `next.config.mjs` ✓ |
