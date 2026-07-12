import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./node_modules/@shadcn/ui/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // HeroBanner builds the direction class dynamically: `bg-gradient-to-${direction}`
    // Tailwind cannot detect these at scan time — safelist them explicitly.
    "bg-gradient-to-r",
    "bg-gradient-to-br",
    "bg-gradient-to-b",
    "bg-gradient-to-bl",
    "bg-gradient-to-tr",
  ],
  theme: {
    // xs fills the gap below sm (375px) — needed for small-phone
    // hero/card layout tuning. All others match Tailwind defaults.
    screens: {
      xs:    "375px",
      sm:    "640px",
      md:    "768px",
      lg:    "1024px",
      xl:    "1280px",
      "2xl": "1536px",
    },
    extend: {

      // ─── FONTS ─────────────────────────────────────────────────────
      // CSS variables injected by next/font in layout.tsx at build time.
      fontFamily: {
        baloo:  ["var(--font-baloo)",  "cursive"],
        nunito: ["var(--font-nunito)", "sans-serif"],
      },

      // ─── COLORS ────────────────────────────────────────────────────
      colors: {

        // ── Shadcn / UI system tokens ─────────────────────────────────
        // These map Tailwind classes (bg-primary, text-muted-foreground,
        // etc.) to the CSS custom properties defined in globals.css.
        // Updating --primary in :root automatically updates every shadcn
        // component without touching component files.
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },

        // ── Existing app tokens (preserved) ──────────────────────────
        "nimi-orange": "#F26522",
        "nimi-pink":   "#F94D8C",
        "nimi-gold":   "#F6C600",
        "nimi-blue":   "#5C9EFF",
        "nimi-green":  "#00BA78",
        "nimi-violet": "#8B5CF6",
        "nimi-amber":  "#F59E0B",
        "nimi-bg":     "#FFF7ED",
        "nimi-white":  "#FFFFFF",
        "nimi-gray":   "#E0E0E0",
        "nimi-dark":   "#212529",
        "piko-pink":   "#ff9a9e",
        "piko-purple": "#5e548e",
        "piko-cream":  "#f0e6d2",
        "piko-peach":  "#ffb7b2",
        "piko-paper":  "#f9f7f2",
        "sidebar-indigo": "#3730A3",
        "sidebar-purple": "#4C1D95",

        // ── Homepage / Marketing tokens (hp- prefix) ──────────────────
        // These are the explicit design-spec hex values for the new
        // visual language. Use hp- classes on public/marketing pages
        // and as the ground truth when building new components.
        "hp-green": {
          50:  "#F0FDF4",
          100: "#DCFCE7",
          400: "#22C55E",  // lighter accent, Grow activity, icon row
          500: "#16A34A",  // primary CTA, hero green headline
          600: "#15803D",  // hover state
          700: "#166534",  // pressed / active state
        },
        // Activity pill colors (right-side hero overlay)
        "hp-orange":  { 500: "#F97316" },   // READ
        "hp-pink":    { 500: "#EC4899" },   // CREATE
        "hp-teal":    { 500: "#10B981" },   // EXPLORE pill
        "hp-amber":   { 500: "#EAB308" },   // SING pill
        // Activity icon circle colors (bottom row — intentionally different)
        "hp-blue":    { 500: "#3B82F6" },   // Explore icon circle
        "hp-violet":  { 500: "#8B5CF6" },   // Sing icon circle
        "hp-emerald": { 500: "#22C55E" },   // Move / Grow icon circle
        // Neutrals
        "hp-dark":    "#111827",            // primary headings / text
        "hp-surface": "#FFFFFF",            // page + card surface

        // ── Semantic aliases (sprint 1) ───────────────────────────
        // Flat token names that map directly to design-spec hex values.
        // Use these instead of hp-gray.* / hp-green.* when authoring
        // new components — one token → one intent → one color.
        "hp-text":   "#111827",   // primary heading / body text
        "hp-muted":  "#6B7280",   // subtitle, muted text, captions
        "hp-border": "#E5E7EB",   // card borders, button outlines
        "hp-card":   "#FFFFFF",   // card / panel background
        "hp-nav":    "#FFFFFF",   // navigation bar background
        "hp-button": "#16A34A",   // primary button fill
        "hp-input":  "#F9FAFB",   // input field background (subtle off-white)

        "hp-gray": {
          50:  "#F9FAFB",   // subtle hover backgrounds
          100: "#F3F4F6",   // dividers, disabled surfaces
          200: "#E5E7EB",   // card borders, button outlines
          400: "#9CA3AF",   // placeholder text, muted icons
          500: "#6B7280",   // subtitle / body text
          700: "#374151",   // nav link default
          900: "#111827",   // alias for hp-dark (Tailwind class context)
        },
      },

      // ─── BOX SHADOWS ───────────────────────────────────────────────
      // Each shadow is tuned for its element — not a generic sm/md/lg.
      // The green-tinted CTA shadow connects the button to the brand color.
      boxShadow: {
        "hp-nav":        "0 2px 8px rgba(0,0,0,0.06)",
        "hp-card":       "0 4px 16px rgba(0,0,0,0.08)",
        "hp-card-hover": "0 8px 28px rgba(0,0,0,0.14)",
        "hp-cta":        "0 4px 12px rgba(22,163,74,0.35)",
        "hp-pill":       "0 3px 10px rgba(0,0,0,0.18)",
        "hp-play":       "0 2px 8px rgba(0,0,0,0.20)",
        "hp-char":       "0 8px 32px rgba(0,0,0,0.12)",
        // General helpers used during component migration
        "card-sm":       "0 2px 8px rgba(0,0,0,0.06)",
        "inner-glow":    "inset 0 1px 0 rgba(255,255,255,0.08)",
        // Semantic shadow aliases (sprint 1) — same values as hp-card/hp-nav/hp-card-hover
        // but with descriptive names that communicate intent at the call site.
        "hp-shadow-card":  "0 4px 16px rgba(0,0,0,0.08)",
        "hp-shadow-nav":   "0 2px 8px rgba(0,0,0,0.06)",
        "hp-shadow-hover": "0 8px 28px rgba(0,0,0,0.14)",
      },

      // ─── BORDER RADIUS ─────────────────────────────────────────────
      // lg / md / sm are wired to --radius (1rem = 16px in globals.css).
      // This means every shadcn component that uses rounded-lg picks up
      // the new rounder aesthetic without touching any component file.
      //
      //   rounded-sm → calc(1rem - 4px) = 12px   chips, tags
      //   rounded-md → calc(1rem - 2px) = 14px   inputs, small cards
      //   rounded-lg → 1rem             = 16px   cards, dialogs
      //
      // Components using rounded-xl (20px), rounded-2xl (24px),
      // rounded-3xl (28px), rounded-full are unaffected.
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Explicit hp- tokens for new components
        "hp-sm":   "8px",
        "hp-md":   "12px",
        "hp-card": "16px",
        "hp-pill": "9999px",
      },

      // ─── MAX WIDTH ─────────────────────────────────────────────────
      maxWidth: {
        "hp-container": "1280px",
        "hp-hero-text": "520px",
        "hp-card":      "320px",
      },

      // ─── SPACING ───────────────────────────────────────────────────
      spacing: {
        // Legacy app rhythm (preserved)
        "section-y":    "5rem",
        "section-y-sm": "3rem",
        // Homepage / new component rhythm
        "hp-section":          "4rem",     // 64px — desktop section gap
        "hp-section-sm":       "2.5rem",   // 40px — mobile section gap
        "hp-container-pad":    "2.5rem",   // 40px — desktop gutter
        "hp-container-pad-sm": "1.25rem",  // 20px — mobile gutter
        "hp-card-gap":         "1.25rem",  // 20px — story card grid gap
        "hp-nav-h":            "72px",     // nav height (scroll-offset calc)
        "hp-hero-min":         "580px",    // hero section min-height
        "hp-icon-circle":      "3.5rem",   // activity icon circle
        "hp-play-btn":         "3rem",     // play button overlay
      },

      // ─── FONT SIZE ─────────────────────────────────────────────────
      fontSize: {
        // Legacy app scale (preserved)
        display:   ["46px", { lineHeight: "1.1" }],
        h1:        ["34px", { lineHeight: "1.15" }],
        h2:        ["22px", { lineHeight: "1.3" }],
        "body-lg": ["16px", { lineHeight: "1.6" }],
        body:      ["14px", { lineHeight: "1.6" }],
        // New homepage scale
        "hp-hero":    ["clamp(40px,4.5vw,64px)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "hp-hero-sm": ["clamp(32px,6vw,48px)",   { lineHeight: "1.1",  letterSpacing: "-0.01em" }],
        "hp-h2":      ["1.5rem",    { lineHeight: "1.2" }],
        "hp-body":    ["1.125rem",  { lineHeight: "1.6" }],
        "hp-sm":      ["0.875rem",  { lineHeight: "1.4" }],
        "hp-xs":      ["0.8125rem", { lineHeight: "1.3" }],
      },

      // ─── KEYFRAMES ─────────────────────────────────────────────────
      keyframes: {
        "hp-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        "hp-fade-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "hp-scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "hp-wiggle": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%":      { transform: "rotate(-8deg)" },
          "75%":      { transform: "rotate(8deg)" },
        },
        "hp-slide-in": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },

      // ─── ANIMATION ─────────────────────────────────────────────────
      animation: {
        // Legacy (preserved)
        "bounce-slow": "bounce 2s infinite",
        "pulse-slow":  "pulse 3s infinite",
        "spin-slow":   "spin 3s linear infinite",
        // New homepage / component animations
        "hp-float":    "hp-float 4s ease-in-out infinite",
        "hp-fade-up":  "hp-fade-up 0.5s ease forwards",
        "hp-scale-in": "hp-scale-in 0.3s ease forwards",
        "hp-wiggle":   "hp-wiggle 0.4s ease",
        "hp-slide-in": "hp-slide-in 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
