"use client";

import Link from "next/link";

const ACTIONS = [
  { label: "Read",    href: "/stories",    emoji: "📖" },
  { label: "Create",  href: "/missions",   emoji: "✏️" },
  { label: "Explore", href: "/missions",   emoji: "🧭" },
  { label: "Move",    href: "/missions",   emoji: "🏃" },
  { label: "Sing",    href: "/missions",   emoji: "🎵" },
  { label: "Grow",    href: "/community",  emoji: "🌱" },
] as const;

export default function QuickActions() {
  return (
    <nav aria-label="Quick actions">
      <ul className="flex gap-4 sm:gap-6 justify-center flex-wrap">
        {ACTIONS.map(({ label, href, emoji }) => (
          <li key={label}>
            <Link href={href} className="flex flex-col items-center gap-2 group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-2xl sm:text-3xl transition-colors" style={{ borderRadius: 'var(--leaf-r)' }}>
                {emoji}
              </div>
              <span className="font-nunito font-bold text-gray-600 text-xs sm:text-sm text-center">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
