// Asset map for the toy world: every file lives under public/now/ (served at /now/...).
import type { WorldLang } from "./themes";

export type WorldZoneId = "hall" | "tarmac" | "cabin" | "islands";

export const ZONE_ORDER: WorldZoneId[] = ["hall", "tarmac", "cabin", "islands"];

const scene = (n: number) => `/now/scenes/scene-${n}.png`;

export type HotspotKind = "kit" | "piko" | "next" | "story";

/**
 * A glowing aura placed *on the artwork*. x/y/r are fractions of the square
 * 1080×1080 scene image, so the aura stays registered to the illustrated
 * object at every viewport size (see .nw-cover in world.css).
 */
export interface SceneHotspot { kind: HotspotKind; x: number; y: number; r: number }

export interface ZoneDef {
  id: WorldZoneId;
  name: Record<WorldLang, string>;
  emoji: string;
  /** Full-bleed scene (100vw × 100vh, object-cover). */
  plate: string;
  /**
   * object-position of the cover crop. A square image only overflows on one
   * axis: fx picks the column kept on portrait phones, fy the band kept on
   * landscape screens. Tuned so every hotspot below stays on screen.
   */
  fx: number;
  fy: number;
  hotspots: SceneHotspot[];
  /** Zone the "next" hotspot (gate / plane / screen) flies to. */
  next: WorldZoneId;
  /** Mission runway tiles along the bottom edge of this floor, aligned away from the illustrated Kit. */
  runway: "start" | "end" | null;
}

export const ZONES: Record<WorldZoneId, ZoneDef> = {
  hall: {
    id: "hall",
    name: { fr: "Hall d'accueil", en: "Welcome Hall" },
    emoji: "🏛️",
    plate: scene(1),
    fx: 0.59, fy: 0.6,
    hotspots: [
      { kind: "kit", x: 0.555, y: 0.76, r: 0.12 },
      { kind: "piko", x: 0.725, y: 0.32, r: 0.085 },
    ],
    next: "tarmac",
    runway: null,
  },
  tarmac: {
    id: "tarmac",
    name: { fr: "Porte G1", en: "Gate G1" },
    emoji: "🛫",
    plate: scene(3),
    fx: 0.44, fy: 0.75,
    hotspots: [
      { kind: "kit", x: 0.3, y: 0.8, r: 0.1 },
      { kind: "piko", x: 0.43, y: 0.55, r: 0.07 },
      { kind: "next", x: 0.66, y: 0.4, r: 0.07 },
    ],
    next: "cabin",
    runway: "end",
  },
  cabin: {
    id: "cabin",
    name: { fr: "Cabine Dorée", en: "Golden Cabin" },
    emoji: "💺",
    plate: scene(10),
    fx: 0.593, fy: 0.6,
    hotspots: [
      { kind: "kit", x: 0.72, y: 0.79, r: 0.1 },
      { kind: "piko", x: 0.75, y: 0.33, r: 0.085 },
      { kind: "next", x: 0.4, y: 0.36, r: 0.09 },
    ],
    next: "islands",
    runway: "start",
  },
  islands: {
    id: "islands",
    name: { fr: "Île Destination", en: "Destination Island" },
    emoji: "🏝️",
    plate: scene(14),
    fx: 0.5, fy: 0.55,
    hotspots: [
      { kind: "story", x: 0.66, y: 0.38, r: 0.12 },
      { kind: "kit", x: 0.36, y: 0.77, r: 0.085 },
      { kind: "piko", x: 0.58, y: 0.71, r: 0.06 },
      { kind: "next", x: 0.33, y: 0.5, r: 0.08 },
    ],
    next: "hall",
    runway: null,
  },
};

/** Short cinematic reels built from the scene stills. */
export const REELS = {
  /** Plane gliding past the story book through the clouds (cabin → destination). */
  takeoff: [scene(11), scene(12), scene(13)],
  /** "PRÊT ?" — the big open book, shown for a beat before a mission launches. */
  ready: scene(17),
  /** Characters on the open story book — the plate while data arrives. */
  loading: scene(19),
};

export const INTRO_VIDEO = {
  /**
   * 16.5 s muted 1080p cut of /now/videos/Intro.mp4 (welcome hall → tarmac →
   * boarding stairs). The full trailer is 371 MB / 4 min — too heavy to stream
   * as a child's intro.
   */
  src: "/now/videos/intro-boarding.mp4",
  poster: "/now/videos/intro-boarding-poster.jpg",
};

/** All world copy in one place. Little Explorers never see these (icons + voice only), but the voice reads them aloud. */
export const COPY = {
  fr: {
    hello: (name: string) => `Bonjour ${name} ! Touche ta valise qui brille pour ouvrir ton Kit des Champions !`,
    helloLittle: (name: string) => `Coucou ${name} ! Touche la valise magique !`,
    tarmac: "Choisis une dalle dorée pour ta mission, ou monte dans l'avion !",
    tarmacLittle: "Touche la valise qui brille !",
    cabin: "Touche l'écran pour décoller vers ta destination !",
    islands: "Touche le grand livre pour ouvrir ton histoire !",
    islandsGlobe: "Touche le grand livre, ou fais tourner le globe dans ton Kit !",
    kit: "Kit des Champions",
    passport: "Passeport Voyage Nimipiko",
    globe: "Globe de vol",
    stamps: (n: number) => `${n} tampon${n > 1 ? "s" : ""}`,
    continue: "Continuer l'aventure",
    stories: "Histoires",
    create: "Atelier",
    talk: "Parler à Nimi",
    piko: "Piko, ton guide",
    toTarmac: "Vers la Porte G1",
    toCabin: "Monter à bord",
    toIslands: "Décoller vers ta destination",
    toHall: "Rentrer au hall",
    story: "Ouvrir l'histoire",
    worlds: "Mondes",
    versions: "Versions",
    destinations: "Destinations",
    language: "Langue",
    wing: "Ailes Nimipiko",
    wingHold: "Maintiens 3 secondes pour l'espace parents",
    level: (n: number) => `Niveau ${n}`,
    close: "Fermer",
    tapKit: "Touche la valise pour l'ouvrir",
    tapPassport: "Touche le passeport pour l'ouvrir",
    spinGlobe: "Fais tourner le globe",
    skip: "Passer",
    loading: "Préparation du vol…",
    demo: "Mode démo : connecte-toi pour embarquer !",
    locked: "Bientôt débloquée",
    noStory: "Ta première destination arrive bientôt !",
  },
  en: {
    hello: (name: string) => `Hello ${name}! Tap your glowing suitcase to open your Champions Kit!`,
    helloLittle: (name: string) => `Hi ${name}! Tap the magic suitcase!`,
    tarmac: "Pick a golden tile for your mission, or board the plane!",
    tarmacLittle: "Tap the shining suitcase!",
    cabin: "Tap the screen to take off to your destination!",
    islands: "Tap the big book to open your story!",
    islandsGlobe: "Tap the big book, or spin the globe in your Kit!",
    kit: "Champions Kit",
    passport: "Nimipiko Travel Passport",
    globe: "Flight globe",
    stamps: (n: number) => `${n} stamp${n === 1 ? "" : "s"}`,
    continue: "Continue the adventure",
    stories: "Stories",
    create: "Workshop",
    talk: "Talk to Nimi",
    piko: "Piko, your guide",
    toTarmac: "To Gate G1",
    toCabin: "Board the plane",
    toIslands: "Take off to your destination",
    toHall: "Fly back to the hall",
    story: "Open the story",
    worlds: "Worlds",
    versions: "Versions",
    destinations: "Destinations",
    language: "Language",
    wing: "Nimipiko wings",
    wingHold: "Hold 3 seconds for the parent area",
    level: (n: number) => `Level ${n}`,
    close: "Close",
    tapKit: "Tap the suitcase to open it",
    tapPassport: "Tap the passport to open it",
    spinGlobe: "Spin the globe",
    skip: "Skip",
    loading: "Preparing your flight…",
    demo: "Demo mode: sign in to board!",
    locked: "Unlocks soon",
    noStory: "Your first destination is coming soon!",
  },
} as const;

export type WorldCopy = (typeof COPY)[WorldLang];
