import type { CSSProperties, ReactNode } from "react";
import UniverseScene from "@/components/universe/UniverseScene";
import UniverseLayer from "@/components/universe/UniverseLayer";
import UniverseAtmosphere from "@/components/universe/UniverseAtmosphere";
import UniverseBackground from "@/components/universe/UniverseBackground";
import { UNIVERSE_DEPTH } from "@/lib/design-system/universe";
interface HomeWorldShellProps {
  /** World content (greeting → destination → journey → marker/passport). */
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * HomeWorldShell — world composition wrapper for /home.
 *
 * The backdrop (sky → horizon → ground + dunes + atmosphere) is anchored to
 * the VIEWPORT via a zero-height FIXED band, so the world stays put while the
 * page scrolls: content travels across one coherent world instead of drifting
 * over a page-length gradient, and the art stays continuous behind the whole
 * mobile page (no white strip). The dunes sit at `top: 58%` translated
 * up by their own height — matching UniverseBackground's horizon band — so the
 * silhouettes rest ON the horizon line instead of floating in the sky.
 * `fixed` is used instead of `sticky` because the scene's `overflow: clip`
 * (kept to avoid an accidental scroll container) would otherwise clip a sticky
 * child and let it scroll away on mobile; `fixed` ignores ancestor clipping.
 *
 * The UI layer stays transparent so live content floats directly on the
 * world; all decorative layers are non-interactive and aria-hidden.
 */
export default function HomeWorldShell({ children, className = "", style }: HomeWorldShellProps) {
  return (
    <UniverseScene
      label="NIMIPIKO home world"
      // Inline style beats .universe-scene's min-height/overflow regardless of
      // stylesheet order; world fills the viewport and stays sticky-compatible.
      style={{ minHeight: "100vh", overflow: "clip", ...style }}
      className={`min-h-screen ${className}`}
    >
      {/* Zero-height FIXED band: viewport-anchored world backdrop. Uses
          `fixed` rather than `sticky` because UniverseScene's `overflow: clip`
          (required to keep the scene sticky-safe on desktop) also CLIPS a
          sticky child, so on a scrolling mobile page the sticky art would
          scroll away and expose the white body beneath the world. `fixed`
          ignores ancestor clipping and stays pinned to the viewport on every
          breakpoint — the world stays continuous behind the whole mobile page
          with no white strip, and desktop remains one-screen (verified). */}
      <div className="fixed top-0 left-0 right-0 h-0" aria-hidden="true" style={{ zIndex: UNIVERSE_DEPTH.background }}>
        <div className="relative h-screen w-full overflow-hidden">
          {/* Base sky → horizon → ground token gradient (fallback if world
              art is missing), then the APPROVED NIMIPIKO Airways floating-island
              world art on top as the primary backdrop — the reference for the
              castle, islands, waterfalls, golden horizon and landing platform. */}
          <div className="absolute inset-0" style={{ zIndex: UNIVERSE_DEPTH.sky }}>
            <UniverseBackground variant="daybreak" />
            <div aria-hidden="true">
              <img
                src="/now/nimipiko-airways-world.png"
                alt=""
                aria-hidden="true"
                /* Per-breakpoint crop of the 16:9 art: mobile portrait holds the
                   castle/golden cluster (40%) so the destination stays
                   recognizable; tablet widens (52%); desktop shows the full
                   scenic composition (62%+) with castle + horizon visible. */
                className="absolute inset-0 h-full w-full object-cover object-[40%_42%] sm:object-[52%_42%] lg:object-[62%_38%] xl:object-[64%_36%]"
                decoding="async"
                fetchPriority="high"
              />
              {/* Scrim for text contrast — left-weighted and LIGHT so the castle /
                  islands / golden horizon stay visible (cards carry their own
                  cream/navy surfaces, so the world needs no heavy dimming). */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(6,16,31,0.48) 0%, rgba(6,16,31,0.12) 40%, rgba(6,16,31,0) 62%)",
                }}
              />
              {/* Subtle bottom fade so the first dashboard panel meets the world. */}
              <div
                className="absolute inset-x-0 bottom-0 h-20"
                style={{ background: "linear-gradient(to top, rgba(6,16,31,0.38), transparent)" }}
              />
            </div>
          </div>
          {/* Drifting motes / soft clouds — deterministic, reduced-motion safe.
              Kept over the real world art for cohesion + life. */}
          <div className="absolute inset-0" style={{ zIndex: UNIVERSE_DEPTH.particles }}>
            <UniverseAtmosphere density="sparse" clouds stars />
          </div>
        </div>
      </div>
      {/* Live UI — no background of its own: the world shows through. */}
      <UniverseLayer depth="ui" decorative={false} className="relative">
        {children}
      </UniverseLayer>
    </UniverseScene>
  );
}
