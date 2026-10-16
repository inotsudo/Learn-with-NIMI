import type { CSSProperties, ReactNode } from "react";
import UniverseLayer from "./UniverseLayer";
import UniverseBackground from "./UniverseBackground";
import "./universe.css";

interface UniverseSceneProps {
  /** Sky/ground art slots (null = token gradients, current state). */
  skySrc?: string | null;
  groundSrc?: string | null;
  variant?: "daybreak" | "night";
  /** Accessible name for the world region. */
  label?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * UniverseScene — server-renderable world container.
 * Composes background (sky/horizon/ground) + caller-supplied UniverseLayers.
 * Layering contract: background → sky → distant → middle → foreground →
 * characters → objects → particles → UI. No client JS required for the
 * static shell; interactivity lives in child client components.
 */
export default function UniverseScene({
  skySrc = null,
  groundSrc = null,
  variant = "daybreak",
  label = "NIMIPIKO world",
  children,
  className = "",
  style,
}: UniverseSceneProps) {
  return (
    <section aria-label={label} className={`universe-scene ${className}`} style={style}>
      <UniverseLayer depth="background" decorative>
        <UniverseBackground variant={variant} skySrc={skySrc} groundSrc={groundSrc} />
      </UniverseLayer>
      {children}
    </section>
  );
}
