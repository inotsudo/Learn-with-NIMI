"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive: boolean;
  emoji: string;
  onClick?: () => void;
}

export default function SidebarNavItem({ icon: Icon, label, href, isActive, emoji, onClick }: SidebarNavItemProps) {
  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl font-baloo font-black text-[15px] transition-all ${
        isActive
          ? "theme-accent/60 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] border theme-border-strong/30"
          : "theme-text hover:theme-accent/30"
      }`}>
      <span className="text-[18px] shrink-0">{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}
