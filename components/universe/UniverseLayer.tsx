import type { CSSProperties, ReactNode } from "react";
import { UNIVERSE_DEPTH, type UniverseLayerName } from "@/lib/design-system/universe";

interface UniverseLayerProps {
  /** Depth slot — controls stacking order via UNIVERSE_DEPTH tokens. */
  depth: UniverseLayerName;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Decorative layers stay out of the accessibility tree by default. */
  decorative?: boolean;
}

/**
 * UniverseLayer — server-renderable depth wrapper.
 * Positions one world stratum (sky → distant → middle → foreground →
 * characters → objects → particles → ui) at its token z-index.
 */
export default function UniverseLayer({
  depth,
  children,
  className = "",
  style,
  decorative = true,
}: UniverseLayerProps) {
  return (
    <div
      className={`universe-layer ${className}`}
      style={{ zIndex: UNIVERSE_DEPTH[depth], ...style }}
      aria-hidden={decorative || undefined}
    >
      {children}
    </div>
  );
}
