import { UNIVERSE_PATH } from "@/lib/design-system/universe";

export type UniverseStopState = "done" | "current" | "locked";

export interface UniverseStop {
  label: string;
  state: UniverseStopState;
}

interface UniversePathProps {
  stops: UniverseStop[];
  className?: string;
  label?: string;
}

/**
 * UniversePath — server-renderable journey path with stops.
 * Dotted gold connectors (UNIVERSE_PATH tokens); current stop gets a glowing
 * ring. Screen-reader friendly ordered list with aria-current on the active stop.
 */
export default function UniversePath({ stops, className = "", label = "Journey path" }: UniversePathProps) {
  return (
    <ol aria-label={label} className={`flex items-center gap-1 sm:gap-2 ${className}`}>
      {stops.map((stop, i) => {
        const isLast = i === stops.length - 1;
        const dot =
          stop.state === "done"
            ? { background: UNIVERSE_PATH.strokeComplete, opacity: 1 }
            : stop.state === "current"
              ? {
                  background: UNIVERSE_PATH.strokeComplete,
                  opacity: 1,
                  boxShadow: `0 0 12px ${UNIVERSE_PATH.glow}`,
                }
              : { background: UNIVERSE_PATH.stroke, opacity: 0.35 };
        return (
          <li key={`${stop.label}-${i}`} className="flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="flex flex-col items-center gap-1" aria-current={stop.state === "current" ? "step" : undefined}>
              <span
                className="block w-3.5 h-3.5 rounded-full shrink-0"
                style={dot}
                aria-hidden="true"
              />
              <span className="sr-only">{`${stop.label} — ${stop.state}`}</span>
            </span>
            {!isLast && (
              <span
                aria-hidden="true"
                className="block h-0 w-6 sm:w-10 shrink-0"
                style={{ borderTop: `2px dotted ${UNIVERSE_PATH.stroke}`, opacity: 0.6 }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
