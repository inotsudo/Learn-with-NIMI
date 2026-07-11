"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive: boolean;
  emoji: string;
  onClick?: () => void;
}

export default function SidebarNavItem({ icon: Icon, label, href, isActive, emoji, onClick }: SidebarNavItemProps) {
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);

  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl font-baloo font-black text-[15px] transition-all ${
        isActive ? cv.navigationStyle.activeItem : `text-gray-500 ${cv.navigationStyle.hoverItem}`
      }`}>
      <span className="text-[18px] shrink-0">{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}
