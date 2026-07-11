"use client";

import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeEffects } from "@/lib/design-system/themeEffects";

const POSITIONS = [
  { cls: "top-20 left-10",      delay: "0s",   si: 0, ci: 0, size: "text-2xl" },
  { cls: "top-40 right-20",     delay: "1s",   si: 1, ci: 1, size: "text-2xl" },
  { cls: "bottom-40 left-20",   delay: "2s",   si: 2, ci: 2, size: "text-2xl" },
  { cls: "bottom-20 right-10",  delay: "0.5s", si: 3, ci: 3, size: "text-2xl" },
  { cls: "top-60 left-1/4",     delay: "1.5s", si: 4, ci: 0, size: "text-xl"  },
  { cls: "bottom-60 right-1/4", delay: "2.5s", si: 0, ci: 1, size: "text-xl"  },
];

export default function FloatingStickers() {
  const { themeId } = useAppTheme();
  const { particles } = getThemeEffects(themeId);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {POSITIONS.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.cls} animate-bounce ${p.size}`}
          style={{
            animationDelay: p.delay,
            color: particles.colors[p.ci % particles.colors.length],
          }}
        >
          {particles.shapes[p.si % particles.shapes.length]}
        </div>
      ))}
    </div>
  );
}
