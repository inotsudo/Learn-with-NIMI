"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const STARS: { className: string; size: string; color: string; delay: number }[] = [
  { className: "top-[6%] left-[8%]", size: "w-6 h-6", color: "text-yellow-300", delay: 0 },
  { className: "top-[8%] left-[27%]", size: "w-3 h-3", color: "text-gray-300", delay: 0.4 },
  { className: "top-[6%] right-[22%]", size: "w-4 h-4", color: "text-gray-300", delay: 0.8 },
  { className: "top-[10%] right-[8%]", size: "w-6 h-6", color: "text-yellow-300", delay: 1.2 },
  { className: "top-[12%] right-[16%]", size: "w-3 h-3", color: "text-pink-300", delay: 0.2 },
  { className: "top-[12%] left-[18%]", size: "w-4 h-4", color: "text-pink-300", delay: 0.6 },
  { className: "top-[14%] left-[32%]", size: "w-3 h-3", color: "text-green-400", delay: 1.0 },
  { className: "top-[20%] left-[12%]", size: "w-4 h-4", color: "text-blue-300", delay: 0.3 },
  { className: "top-[22%] left-[25%]", size: "w-3 h-3", color: "text-gray-300", delay: 0.9 },
  { className: "top-[18%] right-[20%]", size: "w-3 h-3", color: "text-pink-300", delay: 0.5 },
  { className: "top-[28%] right-[24%]", size: "w-4 h-4", color: "text-blue-300", delay: 1.1 },
  { className: "top-[22%] right-[6%]", size: "w-3 h-3", color: "text-gray-300", delay: 0.7 },
  { className: "top-[42%] left-[10%]", size: "w-3 h-3", color: "text-blue-200", delay: 0.4 },
  { className: "top-[38%] right-[18%]", size: "w-4 h-4", color: "text-pink-300", delay: 0.2 },
  { className: "top-[35%] right-[4%]", size: "w-3 h-3", color: "text-gray-300", delay: 1.3 },
  { className: "top-[50%] left-[26%]", size: "w-4 h-4", color: "text-yellow-300", delay: 0.6 },
  { className: "top-[64%] right-[14%]", size: "w-4 h-4", color: "text-pink-300", delay: 1.0 },
  { className: "top-[72%] left-[10%]", size: "w-4 h-4", color: "text-blue-300", delay: 0.5 },
  { className: "top-[78%] right-[16%]", size: "w-5 h-5", color: "text-yellow-300", delay: 0.9 },
  { className: "top-[86%] left-[18%]", size: "w-6 h-6", color: "text-pink-300", delay: 0.3 },
];

export default function AuthBackground() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none select-none">
        {STARS.map((s, i) => (
          <motion.span
            key={i}
            className={`absolute ${s.className} ${s.color}`}
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
            transition={{ duration: 2.5 + (i % 4) * 0.4, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
          >
            <Star className={s.size} fill="currentColor" />
          </motion.span>
        ))}
      </div>

      <svg
        className="absolute bottom-0 left-0 w-full h-32 sm:h-40 text-green-100 pointer-events-none select-none"
        viewBox="0 0 1600 200" preserveAspectRatio="none" fill="currentColor"
      >
        <ellipse cx="100" cy="190" rx="180" ry="100" />
        <ellipse cx="380" cy="210" rx="230" ry="120" />
        <ellipse cx="700" cy="180" rx="210" ry="110" />
        <ellipse cx="1020" cy="210" rx="250" ry="130" />
        <ellipse cx="1330" cy="190" rx="210" ry="110" />
        <ellipse cx="1560" cy="210" rx="180" ry="100" />
      </svg>
    </>
  );
}
