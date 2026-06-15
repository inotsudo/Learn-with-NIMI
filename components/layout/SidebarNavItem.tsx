"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive: boolean;
  onClick?: () => void;
}

export default function SidebarNavItem({ icon: Icon, label, href, isActive, onClick }: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors
        ${isActive
          ? "bg-white/15 text-white shadow-inner border-l-4 border-nimi-gold"
          : "text-indigo-200 border-l-4 border-transparent hover:bg-white/10 hover:text-white"}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
