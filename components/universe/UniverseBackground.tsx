import Image from "next/image";
import {
  UNIVERSE_SKY,
  UNIVERSE_HORIZON,
} from "@/lib/design-system/universe";

interface UniverseBackgroundProps {
  /** Daybreak (default, Airways navy → gold horizon) or night. */
  variant?: "daybreak" | "night";
  /** Approved sky art — null renders the token gradient (current state). */
  skySrc?: string | null;
  /** Approved ground art — null renders the token gradient. */
  groundSrc?: string | null;
  className?: string;
}

/**
 * UniverseBackground — server-renderable sky → horizon → ground.
 * Gradient fallbacks only; no background-attachment: fixed (iOS jank).
 * Art slots stay null until artist packs land in the asset registry.
 */
export default function UniverseBackground({
  variant = "daybreak",
  skySrc = null,
  groundSrc = null,
  className = "",
}: UniverseBackgroundProps) {
  const sky =
    variant === "night"
      ? `linear-gradient(180deg, #020813 0%, ${UNIVERSE_SKY.zenith} 55%, ${UNIVERSE_SKY.mid} 100%)`
      : `linear-gradient(180deg, ${UNIVERSE_SKY.zenith} 0%, ${UNIVERSE_SKY.violet} 46%, #2A2050 72%, ${UNIVERSE_SKY.horizonGlow} 100%)`;
  const ground =
    variant === "night"
      ? `linear-gradient(180deg, #0A1830 0%, #030C17 100%)`
      : `linear-gradient(180deg, rgba(245,200,66,0.20) 0%, #16224a 55%, #0A1330 100%)`;

  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      {/* Sky (upper ~70%) */}
      <div className="absolute inset-x-0 top-0 h-[72%]" style={{ background: sky }}>
        {skySrc ? (
          <Image src={skySrc} alt="" fill sizes="100vw" priority={false} className="object-cover" />
        ) : null}
      </div>
      {/* Horizon blend band */}
      <div
        className="absolute inset-x-0 top-[58%]"
        style={{
          height: UNIVERSE_HORIZON.blendHeight,
          background: `linear-gradient(180deg, transparent 0%, ${UNIVERSE_SKY.horizonGlow} 55%, transparent 100%)`,
          borderTop: `1px solid ${UNIVERSE_HORIZON.lineColor}`,
        }}
      />
      {/* Ground (lower ~30%) */}
      <div className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: ground }}>
        {groundSrc ? (
          <Image src={groundSrc} alt="" fill sizes="100vw" priority={false} className="object-cover" />
        ) : null}
      </div>
    </div>
  );
}
