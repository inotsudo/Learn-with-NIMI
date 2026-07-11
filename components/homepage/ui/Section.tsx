import type { ReactNode } from "react";

type Background = "white" | "cream" | "transparent";

interface SectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
  bg?: Background;
  /** Set false for full-bleed sections (e.g. Hero) that manage their own spacing. */
  padded?: boolean;
}

const BACKGROUND: Record<Background, string> = {
  white: "bg-white",
  cream: "bg-amber-50",
  transparent: "bg-transparent",
};

// Vertical rhythm + background wrapper shared by every homepage section, so
// individual sections only need to worry about their own content. `padded`
// is a real prop (not a className override) because two equal-specificity
// Tailwind utilities like py-0 vs py-section-y don't reliably cancel each
// other out based on string order alone.
export default function Section({ id, children, className = "", bg = "white", padded = true }: SectionProps) {
  return (
    <section id={id} className={`${BACKGROUND[bg]} ${padded ? "py-section-y-sm sm:py-section-y" : ""} ${className}`}>
      {children}
    </section>
  );
}
