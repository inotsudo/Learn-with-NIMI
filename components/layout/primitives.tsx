"use client";

import type { ReactNode } from "react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant, type ZoneId } from "@/lib/design-system/componentVariants";

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── PageSurface ──────────────────────────────────────────────────────────
// Theme-aware page body wrapper. Replaces every
//   <div className="min-h-screen bg-gray-50 flex flex-col">
// pattern so page files never reference a background color directly.

interface PageSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function PageSurface({ children, className }: PageSurfaceProps) {
  const { themeId } = useAppTheme();
  const v = getComponentVariant(themeId);
  return (
    <div className={cn("min-h-screen flex flex-col bg-transparent", className)}>
      <div className={cn("mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-4 lg:px-6", v.backgroundStyle.page)}>
        {children}
      </div>
    </div>
  );
}

// ─── HeroBanner ───────────────────────────────────────────────────────────
// Theme-zone gradient shell. Replaces the outer container + inline gradient
// div that every hero section hardcodes. Zone-specific colors live in
// componentVariants.zoneGradients — adding a theme means adding entries
// there, with zero changes to the components that use HeroBanner.
//
// Usage:
//   <HeroBanner zone="library" className="mb-6">
//     {/* decorative circles, floating emojis, content z-10 div */}
//   </HeroBanner>

interface HeroBannerProps {
  zone: ZoneId;
  children: ReactNode;
  className?: string;
  direction?: "r" | "br" | "b" | "bl" | "tr";
}

export function HeroBanner({ zone, children, className, direction = "br" }: HeroBannerProps) {
  const { themeId } = useAppTheme();
  const v = getComponentVariant(themeId);
  return (
    <div className={cn("relative overflow-hidden leaf-lg border border-white/70 shadow-[0_18px_40px_rgba(15,23,42,0.08)]", className)}>
      <div className={cn("absolute inset-0", `bg-gradient-to-${direction}`, v.zoneGradients[zone])} />
      {children}
    </div>
  );
}

// ─── ContentSurface ───────────────────────────────────────────────────────
// Theme-aware card surface. Replaces
//   <div className="bg-white border border-ds-border rounded-2xl shadow-ds-card">
// so card surfaces adopt the active theme's card style automatically.

interface ContentSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function ContentSurface({ children, className }: ContentSurfaceProps) {
  const { themeId } = useAppTheme();
  const v = getComponentVariant(themeId);
  return (
    <div className={cn("bg-white/90 backdrop-blur-sm", v.cardStyle.border, "leaf", "shadow-[0_16px_34px_rgba(15,23,42,0.08)]", className)}>
      {children}
    </div>
  );
}
