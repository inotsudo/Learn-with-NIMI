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
  hp: {
    nimiLogo:          "/nimi-logo.png",
    nimiLogoText:      "/nimipiko-logo-text.png",
    nimiCircle:        "/nimi-logo-circle.png",
    pikoCircle:        "/piko-logo-circle.png",
    nimiAuth:          "/nimipiko.png",
    nimiHappy:         "/nimi/happy.png",
    nimiSad:           "/nimi/sad.jpeg",
    nimiLocked:        "/nimi/locked.png",
    nimiCelebration:   "/nimi/celebration.jpeg",
    starMascot:        "/assets/star-mascot.svg",
    trophy:            "/assets/trophy.svg",
    badgeExplorer:     "/assets/badge-explorer.svg",
    badgeKindHeart:    "/assets/badge-kindheart.svg",
    badgeHero:         "/assets/badge-hero.svg",
    iconFlipflop:      "/assets/icon-flipflop.svg",
    iconPdf:           "/assets/icon-pdf.svg",
    iconColoring:      "/assets/icon-coloring.svg",
    iconMove:          "/assets/icon-move.svg",
    iconSing:          "/assets/icon-sing.svg",
    iconVideo:         "/assets/icon-video.svg",
    hero: {
      background: "/themes/hp/hero/background.svg",
      foreground: "/themes/hp/hero/foreground.svg",
      frame:      "/themes/hp/hero/frame.svg",
      mascot:     "/themes/hp/hero/mascot.svg",
      ornaments:  "/themes/hp/hero/ornaments.svg",
      particles:  "/themes/hp/hero/particles.svg",
    },
    navigation: {
      sidebar:         "/themes/hp/navigation/sidebar.svg",
      topbar:          "/themes/hp/navigation/topbar.svg",
      bottomBar:       "/themes/hp/navigation/bottomBar.svg",
      activeIndicator: "/themes/hp/navigation/activeIndicator.svg",
      ornaments:       "/themes/hp/navigation/ornaments.svg",
      particles:       "/themes/hp/navigation/particles.svg",
    },
    backgrounds: {
      app:     "/themes/hp/backgrounds/app.svg",
      page:    "/themes/hp/backgrounds/page.svg",
      section: "/themes/hp/backgrounds/section.svg",
    },
    storyCard: {
      background:   "/themes/hp/story/background.svg",
      frame:        "/themes/hp/story/frame.svg",
      badge:        "/themes/hp/story/badge.svg",
      ornaments:    "/themes/hp/story/ornaments.svg",
      particles:    "/themes/hp/story/particles.svg",
      progressFill: "from-amber-400 via-yellow-400 to-amber-500",
      buttonStyle:  "bg-amber-700 hover:bg-amber-800 text-amber-50 border border-amber-600/40",
    },
    rewards: {
      badgeFrame:       "/themes/hp/rewards/badge-frame.svg",
      badgeBackground:  "/themes/hp/rewards/badge-background.svg",
      certificateFrame: "/themes/hp/rewards/certificate-frame.svg",
      celebration:      "/themes/hp/rewards/celebration.svg",
      particles:        "/themes/hp/rewards/particles.svg",
      ribbon:           "/themes/hp/rewards/ribbon.svg",
      trophy:           "/themes/hp/rewards/trophy.svg",
      confetti:         "/themes/hp/rewards/confetti.svg",
    },
    reader: {
      pageBackground: "/themes/hp/reader/page-background.svg",
      pageFrame:      "/themes/hp/reader/page-frame.svg",
      chapterHeader:  "/themes/hp/reader/chapter-header.svg",
      navigation:     "/themes/hp/reader/navigation.svg",
      controls:       "/themes/hp/reader/controls.svg",
      progress:       "/themes/hp/reader/progress.svg",
      vocabularyCard: "/themes/hp/reader/vocabulary-card.svg",
      quizCard:       "/themes/hp/reader/quiz-card.svg",
      completion:     "/themes/hp/reader/completion.svg",
      particles:      "/themes/hp/reader/particles.svg",
    },
    homeHero:          "/home-hero.png",
    homeHeroMobile:    "/home-hero-mobile.png",
    communityHeader:   "/community-header.png",
    storyCurrentCover: "/current-story.png",
    storyContinue:     "/continue.png",
    storyComplete:     "/story-complete.png",
    heroImage:          "/themes/hp/hero.png",
    backgroundArtwork:  "/themes/hp/background.png",
    badgeArtwork:       "/themes/hp/badge.png",
    celebrationAssets:  ["/themes/hp/confetti.png"],
    illustrationFolder: "/themes/hp/illustrations/",
    decorations: {
      sparkle:   "/themes/hp/decorations/sparkle.svg",
      cornerTL:  "/themes/hp/decorations/corner-tl.svg",
      cornerTR:  "/themes/hp/decorations/corner-tr.svg",
      divider:   "/themes/hp/decorations/divider.svg",
      floating1: "/themes/hp/decorations/floating-1.svg",
      floating2: "/themes/hp/decorations/floating-2.svg",
      floating3: "/themes/hp/decorations/floating-3.svg",
    },
  },
  ocean: {
    // Mascots and logos are shared between themes — same files as HP.
    // Swap these for ocean-specific artwork when the asset pack is delivered.
    nimiLogo:          "/nimi-logo.png",
    nimiLogoText:      "/nimipiko-logo-text.png",
    nimiCircle:        "/nimi-logo-circle.png",
    pikoCircle:        "/piko-logo-circle.png",
    nimiAuth:          "/nimipiko.png",
    nimiHappy:         "/nimi/happy.png",
    nimiSad:           "/nimi/sad.jpeg",
    nimiLocked:        "/nimi/locked.png",
    nimiCelebration:   "/nimi/celebration.jpeg",
    starMascot:        "/assets/star-mascot.svg",
    trophy:            "/assets/trophy.svg",
    badgeExplorer:     "/assets/badge-explorer.svg",
    badgeKindHeart:    "/assets/badge-kindheart.svg",
    badgeHero:         "/assets/badge-hero.svg",
    iconFlipflop:      "/assets/icon-flipflop.svg",
    iconPdf:           "/assets/icon-pdf.svg",
    iconColoring:      "/assets/icon-coloring.svg",
    iconMove:          "/assets/icon-move.svg",
    iconSing:          "/assets/icon-sing.svg",
    iconVideo:         "/assets/icon-video.svg",
    hero: {
      background: "/themes/ocean/hero/background.svg",
      foreground: "/themes/ocean/hero/foreground.svg",
      frame:      "/themes/ocean/hero/frame.svg",
      mascot:     "/themes/ocean/hero/mascot.svg",
      ornaments:  "/themes/ocean/hero/ornaments.svg",
      particles:  "/themes/ocean/hero/particles.svg",
    },
    navigation: {
      sidebar:         "/themes/ocean/navigation/sidebar.svg",
      topbar:          "/themes/ocean/navigation/topbar.svg",
      bottomBar:       "/themes/ocean/navigation/bottomBar.svg",
      activeIndicator: "/themes/ocean/navigation/activeIndicator.svg",
      ornaments:       "/themes/ocean/navigation/ornaments.svg",
      particles:       "/themes/ocean/navigation/particles.svg",
    },
    backgrounds: {
      app:     "/themes/ocean/backgrounds/app.svg",
      page:    "/themes/ocean/backgrounds/page.svg",
      section: "/themes/ocean/backgrounds/section.svg",
    },
    storyCard: {
      background:   "/themes/ocean/story/background.svg",
      frame:        "/themes/ocean/story/frame.svg",
      badge:        "/themes/ocean/story/badge.svg",
      ornaments:    "/themes/ocean/story/ornaments.svg",
      particles:    "/themes/ocean/story/particles.svg",
      progressFill: "from-cyan-400 via-sky-400 to-teal-500",
      buttonStyle:  "bg-sky-600 hover:bg-sky-700 text-white border border-sky-500/30",
    },
    rewards: {
      badgeFrame:       "/themes/ocean/rewards/badge-frame.svg",
      badgeBackground:  "/themes/ocean/rewards/badge-background.svg",
      certificateFrame: "/themes/ocean/rewards/certificate-frame.svg",
      celebration:      "/themes/ocean/rewards/celebration.svg",
      particles:        "/themes/ocean/rewards/particles.svg",
      ribbon:           "/themes/ocean/rewards/ribbon.svg",
      trophy:           "/themes/ocean/rewards/trophy.svg",
      confetti:         "/themes/ocean/rewards/confetti.svg",
    },
    reader: {
      pageBackground: "/themes/ocean/reader/page-background.svg",
      pageFrame:      "/themes/ocean/reader/page-frame.svg",
      chapterHeader:  "/themes/ocean/reader/chapter-header.svg",
      navigation:     "/themes/ocean/reader/navigation.svg",
      controls:       "/themes/ocean/reader/controls.svg",
      progress:       "/themes/ocean/reader/progress.svg",
      vocabularyCard: "/themes/ocean/reader/vocabulary-card.svg",
      quizCard:       "/themes/ocean/reader/quiz-card.svg",
      completion:     "/themes/ocean/reader/completion.svg",
      particles:      "/themes/ocean/reader/particles.svg",
    },
    // Hero / community images fall back to HP until ocean artwork is delivered.
    homeHero:          "/home-hero.png",
    homeHeroMobile:    "/home-hero-mobile.png",
    communityHeader:   "/community-header.png",
    storyCurrentCover: "/current-story.png",
    storyContinue:     "/continue.png",
    storyComplete:     "/story-complete.png",
    heroImage:          "/home-hero.png",
    backgroundArtwork:  "/themes/hp/backgrounds/app.svg",
    badgeArtwork:       "/assets/badge-explorer.svg",
    celebrationAssets:  ["/themes/hp/rewards/confetti.svg"],
    illustrationFolder: "/themes/hp/illustrations/",
    decorations: {
      sparkle:   "/themes/ocean/decorations/sparkle.svg",
      cornerTL:  "/themes/ocean/decorations/corner-tl.svg",
      cornerTR:  "/themes/ocean/decorations/corner-tr.svg",
      divider:   "/themes/ocean/decorations/divider.svg",
      floating1: "/themes/ocean/decorations/floating-1.svg",
      floating2: "/themes/ocean/decorations/floating-2.svg",
      floating3: "/themes/ocean/decorations/floating-3.svg",
    },
  },
};

export function getThemeAssets(themeId: string): ThemeAssets {
  return assetRegistry[themeId] ?? assetRegistry.default;
}
