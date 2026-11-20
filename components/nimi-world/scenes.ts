// Asset map for the toy world: every file lives under public/now/ (served at /now/...).
// The journey follows the brand intro video, scene by scene:
//   Welcome Hall (1) → passport control (3) → boarding stairs (5) → cabin (9)
//   → flight into the storybook (11–13) → the storybook (14) → the open book
//   with the 6 missions (16).
import type { WorldLang } from "./themes";

export type WorldZoneId = "hall" | "control" | "gate" | "cabin" | "arrival" | "book";

export const ZONE_ORDER: WorldZoneId[] = ["hall", "control", "gate", "cabin", "arrival", "book"];

const scene = (n: number) => `/now/scenes/scene-${n}.png`;

export type HotspotKind =
  | "kit"      // the illustrated Kit des Champions → 3D Kit studio
  | "piko"     // Piko the guide → speaks the hint
  | "next"     // gate / stairs / screen → the next stop of the journey
  | "desk"     // passport control desk → PassportControl
  | "pass"     // the Kit's screen at the gate → BoardingPass
  | "story"    // the giant storybook → opens the book
  | "mission"; // one of the 6 missions painted in the open book

/**
 * A glowing aura placed *on the artwork*. x/y/r are fractions of the square
 * 1080×1080 scene image, so the aura stays registered to the illustrated
 * object at every viewport size (see .nw-cover in world.css).
 */
export interface SceneHotspot { kind: HotspotKind; x: number; y: number; r: number; slotKey?: string }

export interface ZoneDef {
  id: WorldZoneId;
  name: Record<WorldLang, string>;
  emoji: string;
  /** Full-bleed scene (100vw × 100vh, object-cover). */
  plate: string;
  /**
   * object-position of the cover crop. A square image only overflows on one
   * axis: fx picks the column kept on portrait phones, fy the band kept on
   * landscape screens. Tuned so the key hotspots stay on screen.
   */
  fx: number;
  fy: number;
  hotspots: SceneHotspot[];
  /** Zone the "next" hotspot (gate / stairs / screen) leads to. */
  next: WorldZoneId | null;
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
    next: "control",
  },
  control: {
    id: "control",
    name: { fr: "Contrôle des passeports", en: "Passport control" },
    emoji: "🛂",
    plate: scene(3),
    fx: 0.5, fy: 0.75,
    hotspots: [
      { kind: "desk", x: 0.44, y: 0.78, r: 0.085 },
      { kind: "kit", x: 0.28, y: 0.86, r: 0.08 },
      { kind: "piko", x: 0.45, y: 0.6, r: 0.06 },
      // Gate G1 sign on wide screens, the boarding stairs on phones (whichever is in frame).
      { kind: "next", x: 0.93, y: 0.58, r: 0.065 },
      { kind: "next", x: 0.68, y: 0.47, r: 0.07 },
    ],
    next: "gate",
  },
  gate: {
    id: "gate",
    name: { fr: "Porte d'embarquement", en: "Boarding gate" },
    emoji: "🎫",
    plate: scene(5),
    fx: 0.55, fy: 0.5,
    hotspots: [
      { kind: "pass", x: 0.64, y: 0.77, r: 0.1 },
      { kind: "next", x: 0.6, y: 0.22, r: 0.09 },
      { kind: "piko", x: 0.42, y: 0.45, r: 0.07 },
    ],
    next: "cabin",
  },
  cabin: {
    id: "cabin",
    name: { fr: "Cabine Dorée", en: "Golden Cabin" },
    emoji: "💺",
    plate: scene(9),
    fx: 0.35, fy: 0.45,
    hotspots: [
      { kind: "next", x: 0.25, y: 0.25, r: 0.12 },
      { kind: "piko", x: 0.47, y: 0.21, r: 0.065 },
      { kind: "kit", x: 0.75, y: 0.84, r: 0.09 },
    ],
    next: "arrival",
  },
  arrival: {
    id: "arrival",
    name: { fr: "Le grand livre", en: "The great book" },
    emoji: "📖",
    plate: scene(14),
    fx: 0.75, fy: 0.5,
    hotspots: [
      { kind: "story", x: 0.8, y: 0.31, r: 0.15 },
      { kind: "kit", x: 0.39, y: 0.81, r: 0.08 },
      { kind: "piko", x: 0.6, y: 0.67, r: 0.06 },
    ],
    next: "book",
  },
  book: {
    id: "book",
    name: { fr: "Les 6 missions", en: "The 6 missions" },
    emoji: "✨",
    plate: scene(16),
    fx: 0.5, fy: 0.35,
    hotspots: [
      { kind: "mission", slotKey: "flipflop_audio", x: 0.31, y: 0.24, r: 0.075 },
      { kind: "mission", slotKey: "story_pdf", x: 0.52, y: 0.25, r: 0.075 },
      { kind: "mission", slotKey: "coloring", x: 0.71, y: 0.24, r: 0.075 },
      { kind: "mission", slotKey: "move_explore", x: 0.28, y: 0.45, r: 0.075 },
      { kind: "mission", slotKey: "sing_along", x: 0.53, y: 0.44, r: 0.07 },
      { kind: "mission", slotKey: "bonus_video", x: 0.72, y: 0.45, r: 0.075 },
      { kind: "kit", x: 0.32, y: 0.83, r: 0.08 },
      { kind: "piko", x: 0.63, y: 0.73, r: 0.06 },
    ],
    next: null,
  },
};

/** Short cinematic reels built from the scene stills. */
export const REELS = {
  /** The plane flies into the storybook through the clouds (cabin → arrival). */
  takeoff: [scene(11), scene(12), scene(13)],
  /** The great book swings open on the 6 missions (arrival → book). */
  book: [scene(15)],
  /** "PRÊT ?" — the big open book, shown for a beat before a mission launches. */
  ready: [scene(17)],
  /** Characters on the open story book — the plate while data arrives. */
  loading: scene(19),
};

export const INTRO_VIDEO = {
  /**
   * 16.5 s muted 1080p cut of the brand trailer (media-source/Intro.mp4, kept
   * out of public/ and git): welcome hall → tarmac → boarding stairs. The full
   * trailer is 371 MB / 4 min — too heavy to stream as a child's intro.
   */
  src: "/now/videos/intro-boarding.mp4",
  poster: "/now/videos/intro-boarding-poster.jpg",
};

/** All world copy in one place. Little Explorers never see these (icons + voice only), but the voice reads them aloud. */
export const COPY = {
  fr: {
    hello: (name: string) => `Bonjour ${name} ! Ton voyage commence ici. Ouvre ton Kit des Champions, puis va au contrôle des passeports !`,
    helloLittle: (name: string) => `Coucou ${name} ! On part en voyage !`,
    control: "Montre ton passeport au contrôle des voyageurs !",
    controlLittle: "Touche le comptoir pour ton passeport !",
    controlDone: "Passeport tamponné ! Va à la porte d'embarquement.",
    gate: "Touche l'écran de ta valise pour ta carte d'embarquement !",
    gateLittle: "Touche ta valise !",
    gateDone: "C'est l'heure ! Monte à bord de l'avion.",
    cabin: "Touche l'écran pour décoller vers ta destination !",
    arrival: "Tu es arrivé ! Touche le grand livre pour l'ouvrir.",
    arrivalGlobe: "Tu es arrivé ! Touche le grand livre, ou fais tourner le globe dans ton Kit.",
    book: "Choisis une mission dans le livre !",
    bookLittle: "Touche une image qui brille !",
    bookDone: "Bravo ! Les 6 missions sont faites. Touche Piko pour ton certificat !",
    needPassport: "Montre d'abord ton passeport au contrôle !",
    needBoarding: "Il te faut ta carte d'embarquement !",
    kit: "Kit des Champions",
    passport: "Passeport Voyage Nimipiko",
    passportCover: "PASSEPORT VOYAGE",
    globe: "Globe de vol",
    stamps: (n: number) => `${n} tampon${n > 1 ? "s" : ""}`,
    continue: "Continuer l'aventure",
    stories: "Histoires",
    treasure: "Mon Trésor",
    talk: "Parler à Nimi",
    piko: "Piko, ton guide",
    toControl: "Vers le contrôle des passeports",
    toGate: "Vers la porte d'embarquement",
    toCabin: "Monter à bord",
    toArrival: "Décoller vers ta destination",
    toBook: "Ouvrir le grand livre",
    certificate: "Voir mon certificat",
    desk: "Contrôle des voyageurs",
    openPassport: "Touche ton passeport pour l'ouvrir",
    tapStamp: "Touche le tampon !",
    stampIt: "Tamponner",
    stamped: "Tampon ! Passeport validé !",
    visas: "VISAS",
    republic: "République des Champions de Nimipiko",
    boardingTitle: "Carte d'embarquement",
    board: "Embarquer",
    boarded: "Bienvenue à bord !",
    passenger: "PASSAGER",
    flight: "VOL",
    date: "DATE",
    from: "DÉPART",
    airport: "Aéroport Nimipiko",
    destination: "DESTINATION",
    gateL: "PORTE",
    seat: "SIÈGE",
    classL: "CLASSE",
    championClass: "Champion",
    destinationN: (n: number) => `Destination ${n}`,
    missionDone: "terminée",
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
    locked: "Bientôt débloquée",
    soon: "Cette mission arrive bientôt !",
    noStory: "Ta première destination arrive bientôt !",
  },
  en: {
    hello: (name: string) => `Hello ${name}! Your trip starts here. Open your Champions Kit, then go to passport control!`,
    helloLittle: (name: string) => `Hi ${name}! Let's go on a trip!`,
    control: "Show your passport at passport control!",
    controlLittle: "Tap the desk for your passport!",
    controlDone: "Passport stamped! Head to the boarding gate.",
    gate: "Tap your suitcase screen for your boarding pass!",
    gateLittle: "Tap your suitcase!",
    gateDone: "Time to go! Board the plane.",
    cabin: "Tap the screen to take off to your destination!",
    arrival: "You've arrived! Tap the big book to open it.",
    arrivalGlobe: "You've arrived! Tap the big book, or spin the globe in your Kit.",
    book: "Pick a mission in the book!",
    bookLittle: "Tap a shining picture!",
    bookDone: "Well done! All 6 missions are complete. Tap Piko for your certificate!",
    needPassport: "Show your passport at passport control first!",
    needBoarding: "You need your boarding pass!",
    kit: "Champions Kit",
    passport: "Nimipiko Travel Passport",
    passportCover: "TRAVEL PASSPORT",
    globe: "Flight globe",
    stamps: (n: number) => `${n} stamp${n === 1 ? "" : "s"}`,
    continue: "Continue the adventure",
    stories: "Stories",
    treasure: "My Treasure",
    talk: "Talk to Nimi",
    piko: "Piko, your guide",
    toControl: "To passport control",
    toGate: "To the boarding gate",
    toCabin: "Board the plane",
    toArrival: "Take off to your destination",
    toBook: "Open the great book",
    certificate: "See my certificate",
    desk: "Passport control",
    openPassport: "Tap your passport to open it",
    tapStamp: "Tap the stamp!",
    stampIt: "Stamp it",
    stamped: "Stamp! Passport approved!",
    visas: "VISAS",
    republic: "Republic of Nimipiko Champions",
    boardingTitle: "Boarding pass",
    board: "Board",
    boarded: "Welcome aboard!",
    passenger: "PASSENGER",
    flight: "FLIGHT",
    date: "DATE",
    from: "FROM",
    airport: "Nimipiko Airport",
    destination: "DESTINATION",
    gateL: "GATE",
    seat: "SEAT",
    classL: "CLASS",
    championClass: "Champion",
    destinationN: (n: number) => `Destination ${n}`,
    missionDone: "done",
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
    locked: "Unlocks soon",
    soon: "This mission is coming soon!",
    noStory: "Your first destination is coming soon!",
  },
} as const;

export type WorldCopy = (typeof COPY)[WorldLang];
