"use client";

import { motion } from "framer-motion";

const FLOWER_ROW = [
  { f:"🌸", sz:26, mb:6  },
  { f:"🌿", sz:20, mb:0  },
  { f:"🌼", sz:30, mb:8  },
  { f:"🌱", sz:18, mb:2  },
  { f:"🌻", sz:34, mb:10 },
  { f:"🍀", sz:22, mb:1  },
  { f:"🌺", sz:28, mb:5  },
  { f:"🌸", sz:24, mb:7  },
  { f:"🌼", sz:30, mb:3  },
  { f:"🌻", sz:32, mb:9  },
  { f:"🍀", sz:22, mb:2  },
  { f:"🌺", sz:26, mb:4  },
  { f:"🌿", sz:20, mb:0  },
  { f:"🌸", sz:28, mb:6  },
  { f:"🌼", sz:30, mb:8  },
  { f:"🌻", sz:34, mb:10 },
  { f:"🌱", sz:18, mb:1  },
  { f:"🍀", sz:22, mb:3  },
  { f:"🌺", sz:26, mb:5  },
  { f:"🌸", sz:24, mb:7  },
] as const;

export default function FlowerDivider({ bgColor = "transparent", height = 72 }: {
  bgColor?: string;
  height?: number;
}) {
  return (
    <div
      className="w-full overflow-hidden pointer-events-none select-none"
      style={{ height, background: bgColor }}
      aria-hidden
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${FLOWER_ROW.length}, 1fr)`,
          alignItems: "end",
          height: "100%",
        }}
      >
        {FLOWER_ROW.map(({ f, sz, mb }, i) => {
          const dur   = 1.7 + (i % 7) * 0.22;
          const delay = (i * 0.18) % 2.8;
          const angle = 10 + (i % 4) * 3;
          return (
            <motion.span
              key={i}
              className="leading-none flex items-end justify-center"
              style={{ fontSize: sz, paddingBottom: mb }}
              animate={{ rotate: [-angle, angle, -angle], y: [0, -4, 0] }}
              transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
            >
              {f}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
