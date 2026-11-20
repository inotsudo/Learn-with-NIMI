// Asset registry — maps app theme IDs to static asset paths.
// All paths are relative to /public/.
// HP theme points to the real files that exist today.
// Ocean theme entries are placeholders; swap in real artwork when available.

export interface ThemeAssets {
  // ── Brand ──────────────────────────────────────────────────────────────────
  nimiLogo:          string;  // Round logo mark used in headers / favicons
  nimiLogoText:      string;  // Horizontal wordmark
  // ── Characters ─────────────────────────────────────────────────────────────
  nimiCircle:        string;  // Nimi mascot circle avatar
  pikoCircle:        string;  // Piko mascot circle avatar
  nimiAuth:          string;  // Nimi full illustration used on auth pages
  nimiHappy:         string;  // Nimi mood — happy
  nimiSad:           string;  // Nimi mood — sad
  nimiLocked:        string;  // Nimi mood — locked / waiting
  nimiCelebration:   string;  // Nimi mood — celebration
  starMascot:        string;  // Decorative star character
  trophy:            string;  // Trophy icon / reward artwork
  // ── Badges ─────────────────────────────────────────────────────────────────
  badgeExplorer:     string;  // Story Explorer badge
  badgeKindHeart:    string;  // Kind Heart badge
  badgeHero:         string;  // Healthy Hero badge
  // ── Slot icons ─────────────────────────────────────────────────────────────
  iconFlipflop:      string;  // FlipFlop Audio slot
  iconPdf:           string;  // Story PDF slot
  iconColoring:      string;  // Coloring slot
  iconMove:          string;  // Move & Explore slot
  iconSing:          string;  // Sing Along slot
  iconVideo:         string;  // Bonus Video slot
  // ── Hero world layers ──────────────────────────────────────────────────────
  // Each layer is independently replaceable by artists.
  // All paths must be satisfied by both themes.
  hero: {
    background: string;  // Full-bleed world background (castle / coral reef)
    foreground: string;  // Right-side world elements (owl+candles / turtle+coral)
    frame:      string;  // Edge decoration overlay (parchment corners / glass shell)
    mascot:     string;  // World-specific hero character positioned bottom-right
    ornaments:  string;  // Thematic ornamental overlay (stars+wand / bubbles+seaweed)
    particles:  string;  // Animated atmosphere layer (sparkle dust / rising bubbles)
  };
  // ── Navigation world layers ────────────────────────────────────────────────
  // Subtle world art layered onto every persistent navigation surface.
  navigation: {
    sidebar:         string;  // Sidebar world texture / background art
    topbar:          string;  // Top bar decorative strip
    bottomBar:       string;  // Bottom nav world texture
    activeIndicator: string;  // Active state indicator (glow disc / pearl)
    ornaments:       string;  // Edge ornaments / corner flourishes
    particles:       string;  // Ambient particles (dust / bubbles)
  };
  // ── Global background world layers ────────────────────────────────────────
  // Very low-opacity world art behind all page content.
  backgrounds: {
    app:     string;  // Full-app ambient world art (castle/reef silhouette)
    page:    string;  // Page content subtle texture
    section: string;  // Section divider decoration
  };
  // ── Story card world layers ────────────────────────────────────────────────
  // Subtle world identity layered onto every story card surface.
  // background/frame/ornaments/particles: always transparent placeholders until
  // artist artwork is dropped in — components work correctly at 0% opacity.
  storyCard: {
    background:   string;  // Subtle card texture (parchment paper / frosted glass)
    frame:        string;  // Card border frame overlay (carved wood / shell border)
    badge:        string;  // Chapter badge — wax seal (HP) or pearl (Ocean)
    ornaments:    string;  // Corner ornamental overlay
    particles:    string;  // Ambient sparkle / bubble overlay
    progressFill: string;  // Tailwind gradient classes for progress bar fill
    buttonStyle:  string;  // Tailwind classes for world-specific action button
  };
  // ── Reward world layers ────────────────────────────────────────────────────
  // World-themed visuals overlaid on badges, certificates, and celebrations.
  rewards: {
    badgeFrame:       string;  // Glowing ring/halo overlay for earned badges
    badgeBackground:  string;  // Badge backing (wax seal / pearl medallion)
    certificateFrame: string;  // Certificate border decoration (parchment / coral)
    celebration:      string;  // Celebration sparkle / bubble-burst texture
    particles:        string;  // Ambient reward particle layer
    ribbon:           string;  // Banner ribbon decoration (crimson+gold / wave)
    trophy:           string;  // World-themed trophy illustration
    confetti:         string;  // Confetti pattern SVG
  };
  // ── Reader world layers ────────────────────────────────────────────────────
  // World-themed visuals overlaid on every surface of the story reader.
  reader: {
    pageBackground: string;  // Page texture/backing (parchment hatching / sea-glass waves)
    pageFrame:      string;  // Page edge frame overlay (burned edges / coral wave border)
    chapterHeader:  string;  // Chapter title ornament (gold flourish / wave + shell divider)
    navigation:     string;  // Bookmark/tab decoration (gold ribbon / coral pearl tab)
    controls:       string;  // Control button surface (brass rings / glass pearl)
    progress:       string;  // Progress bar decoration (golden spell trail / water ripple)
    vocabularyCard: string;  // Vocabulary card frame (spell card / pearl card)
    quizCard:       string;  // Quiz card frame (wizard exam parchment / treasure hunt map)
    completion:     string;  // Completion screen art (magical star burst / treasure chest + bubbles)
    particles:      string;  // Ambient reading particles (placeholder until artists deliver)
  };
  // ── Hero / marketing ───────────────────────────────────────────────────────
  homeHero:          string;  // Homepage hero (desktop)
  homeHeroMobile:    string;  // Homepage hero (mobile)
  communityHeader:   string;  // Community page header artwork
  // ── Story / learning ───────────────────────────────────────────────────────
  storyCurrentCover: string;  // "Current story" book cover image
  storyContinue:     string;  // Continue / CTA button image
  storyComplete:     string;  // Story completion illustration
  // ── Misc theme folders ─────────────────────────────────────────────────────
  heroImage:          string;
  backgroundArtwork:  string;
  badgeArtwork:       string;
  celebrationAssets:  string[];
  illustrationFolder: string;
  // ── Decorations ────────────────────────────────────────────────────────────
  decorations: {
    sparkle:   string;  // Sparkle / star ornament SVG
    cornerTL:  string;  // Top-left corner flourish
    cornerTR:  string;  // Top-right corner flourish
    divider:   string;  // Section divider artwork
    floating1: string;  // Floating decoration element 1
    floating2: string;  // Floating decoration element 2
    floating3: string;  // Floating decoration element 3
  };
  // ── Quick action themed buttons (optional — absent on themes without image buttons) ──
  quickActions?: {
    read:    string;
    create:  string;
    explore: string;
    move:    string;
    sing:    string;
    grow:    string;
  };
  // ── Universe foundation (Phase 1, optional) ───────────────────────────────
  // Layered 2D world slots. Absent until artist packs land — components must
  // treat every field as potentially null and render documented fallbacks
  // (gradients + existing mascots) so the UI never breaks.
  universe?: UniverseAssets;
}

// ── Universe foundation asset namespace ────────────────────────────────────
// Every raster slot is `string | null`: a path under /public/ when approved
// art exists, `null` while pending. No fake production assets are invented;
// `null` renders the token-gradient fallback defined in lib/design-system/universe.ts.

export interface UniverseAssets {
  backgrounds: {
    /** Full-bleed sky art. Fallback: UNIVERSE_SKY gradient. */
    sky: string | null;
    /** Ground art. Fallback: UNIVERSE_GROUND gradient. */
    ground: string | null;
    /** Horizon blend art. Fallback: horizon glow wash. */
    horizon: string | null;
  };
  environment: {
    /** Distant silhouette (mountains / castle / reef). */
    distant: string | null;
    /** Middle-ground set piece. */
    middle: string | null;
    /** Foreground framing element. */
    foreground: string | null;
  };
  objects: {
    /** Giant-book closed art. Fallback: story cover via giant_book_url. */
    bookClosed: string | null;
    /** Giant-book open art (pending until Phase 3+). */
    bookOpen: string | null;
    /** Journey path art. Fallback: UniversePath SVG dots. */
    path: string | null;
  };
  decorations: {
    cloud: string | null;
    star: string | null;
    sparkle: string | null;
  };
  portals: {
    /** Journey portal ring. Fallback: destination-glow CSS ring. */
    gate: string | null;
    /** Destination beacon art. Fallback: destination-glow CSS halo. */
    beacon: string | null;
  };
  book: {
    /** Book glow texture. Fallback: UNIVERSE_GLOW.book. */
    glow: string | null;
    /** Page texture for book-open state. */
    page: string | null;
  };
  characters: {
    /** Nimi uses live assets (never null — falls back to registry nimiHappy). */
    nimi: string | null;
    /** Piko slot — null until approved poses land (falls back to pikoCircle). */
    piko: string | null;
    /** Zilo slot — null until approved art lands (falls back to initial disc). */
    zilo: string | null;
  };
  rewards: {
    /** Champion crown / trophy art. Fallback: registry trophy. */
    champion: string | null;
    /** Reward burst texture. Fallback: RewardBurst component. */
    burst: string | null;
  };
}

const assetRegistry: Record<string, ThemeAssets> = {
  default: {
    // ── Brand (global assets, theme-neutral) ──────────────────────────────────
    nimiLogo:          "/nimi-logo.png",
    nimiLogoText:      "/nimipiko-logo-text.png",
    nimiCircle:        "/nimi-logo-circle.png",
    pikoCircle:        "/piko-logo-circle.png",
    nimiAuth:          "/nimipiko.png",
    nimiHappy:         "/nimi/happy.png",
    nimiSad:           "/nimi/sad.jpeg",
    nimiLocked:        "/nimi/locked.png",
    nimiCelebration:   "/nimi/celebration.jpeg",
    starMascot:        "/themes/default/story/badge.png",
    trophy:            "/themes/default/rewards/trophy.png",
    // ── Badges (themed versions pending; reuse global SVGs for now) ───────────
    badgeExplorer:     "/assets/badge-explorer.svg",
    badgeKindHeart:    "/assets/badge-kindheart.svg",
    badgeHero:         "/assets/badge-hero.svg",
    // ── Slot icons (shared across themes) ─────────────────────────────────────
    iconFlipflop:      "/assets/icon-flipflop.svg",
    iconPdf:           "/assets/icon-pdf.svg",
    iconColoring:      "/assets/icon-coloring.svg",
    iconMove:          "/assets/icon-move.svg",
    iconSing:          "/assets/icon-sing.svg",
    iconVideo:         "/assets/icon-video.svg",
    // ── Hero world layers ─────────────────────────────────────────────────────
    hero: {
      background: "/themes/default/hero/background.svg",
      foreground: "/themes/default/hero/foreground.svg",
      frame:      "/themes/default/hero/frame.svg",
      mascot:     "/themes/default/hero/mascot.svg",
      ornaments:  "/themes/default/hero/ornaments.svg",
      particles:  "/themes/default/hero/particles.svg",
    },
    // ── Navigation world layers ───────────────────────────────────────────────
    navigation: {
      sidebar:         "/themes/default/navigation/sidebar.svg",
      topbar:          "/themes/default/navigation/topbar.svg",
      bottomBar:       "/themes/default/navigation/bottomBar.svg",
      activeIndicator: "/themes/default/navigation/activeIndicator.svg",
      ornaments:       "/themes/default/navigation/ornaments.svg",
      particles:       "/themes/default/navigation/particles.svg",
    },
    // ── Global background world layers ────────────────────────────────────────
    backgrounds: {
      app:     "/themes/default/backgrounds/app.svg",
      page:    "/themes/default/backgrounds/page.svg",
      section: "/themes/default/backgrounds/section.svg",
    },
    // ── Story card world layers ───────────────────────────────────────────────
    storyCard: {
      background:   "/themes/default/story/background.svg",
      frame:        "/themes/default/story/frame.svg",
      badge:        "/themes/default/story/badge.svg",
      ornaments:    "/themes/default/story/ornaments.svg",
      particles:    "/themes/default/story/particles.svg",
      progressFill: "from-green-400 via-emerald-400 to-green-500",
      buttonStyle:  "bg-green-600 hover:bg-green-700 text-white border border-green-500/30",
    },
    // ── Reward world layers ───────────────────────────────────────────────────
    rewards: {
      badgeFrame:       "/themes/default/rewards/badge-frame.svg",
      badgeBackground:  "/themes/default/rewards/badge-background.svg",
      certificateFrame: "/themes/default/rewards/certificate-frame.svg",
      celebration:      "/themes/default/rewards/celebration.svg",
      particles:        "/themes/default/rewards/particles.svg",
      ribbon:           "/themes/default/rewards/ribbon.svg",
      trophy:           "/themes/default/rewards/trophy.svg",
      confetti:         "/themes/default/rewards/confetti.svg",
    },
    // ── Reader world layers ───────────────────────────────────────────────────
    reader: {
      pageBackground: "/themes/default/reader/page-background.svg",
      pageFrame:      "/themes/default/reader/page-frame.svg",
      chapterHeader:  "/themes/default/reader/chapter-header.svg",
      navigation:     "/themes/default/reader/navigation.svg",
      controls:       "/themes/default/reader/controls.svg",
      progress:       "/themes/default/reader/progress.svg",
      vocabularyCard: "/themes/default/reader/vocabulary-card.svg",
      quizCard:       "/themes/default/reader/quiz-card.svg",
      completion:     "/themes/default/reader/completion.svg",
      particles:      "/themes/default/reader/particles.svg",
    },
    // ── Hero / marketing ──────────────────────────────────────────────────────
    homeHero:          "/themes/default/hero/background.png",
    homeHeroMobile:    "/themes/default/hero/background.png",
    communityHeader:   "/community-header.png",
    // ── Story / learning ──────────────────────────────────────────────────────
    storyCurrentCover: "/current-story.png",
    storyContinue:     "/continue.png",
    storyComplete:     "/story-complete.png",
    // ── Misc ──────────────────────────────────────────────────────────────────
    heroImage:          "/themes/default/hero/background.png",
    backgroundArtwork:  "/themes/default/backgrounds/app.png",
    badgeArtwork:       "/themes/default/rewards/badge-frame.svg",
    celebrationAssets:  ["/themes/default/rewards/celebration.svg"],
    illustrationFolder: "/themes/default/world/",
    // ── Decorations ───────────────────────────────────────────────────────────
    decorations: {
      sparkle:   "/themes/default/decorations/sparkle.svg",
      cornerTL:  "/themes/default/decorations/corner-tl.svg",
      cornerTR:  "/themes/default/decorations/corner-tr.svg",
      divider:   "/themes/default/decorations/divider.svg",
      floating1: "/themes/default/decorations/floating-1.svg",
      floating2: "/themes/default/decorations/floating-2.svg",
      floating3: "/themes/default/decorations/floating-3.svg",
    },
    // ── Quick action themed buttons ───────────────────────────────────────────
    quickActions: {
      read:    "/themes/default/quick-actions/btn-read.png",
      create:  "/themes/default/quick-actions/btn-create.png",
      explore: "/themes/default/quick-actions/btn-explore.png",
      move:    "/themes/default/quick-actions/btn-move.png",
      sing:    "/themes/default/quick-actions/btn-sing.png",
      grow:    "/themes/default/quick-actions/btn-grow.png",
    },
  },
};

// Airways reuses the same artwork assets as default — visual identity comes from
// the token/colour layer (theme.ts), not from theme-specific image files.
assetRegistry.airways = assetRegistry.default;

export function getThemeAssets(themeId: string): ThemeAssets {
  return assetRegistry[themeId] ?? assetRegistry.default;
}
