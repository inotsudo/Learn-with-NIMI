"use client";

import type { ThemeStatus } from "@/lib/design-system/themeMetadata";

const STATUS_CONFIG: Record<
  ThemeStatus,
  { label: string; className: string }
> = {
  current:     { label: "Current",     className: "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] border border-[var(--ds-border-brand)]/30" },
  installed:   { label: "Installed",   className: "bg-sky-100   text-sky-700   border border-sky-200"   },
  locked:      { label: "Locked",      className: "bg-gray-100  text-gray-500  border border-gray-200"  },
  premium:     { label: "Premium",     className: "bg-amber-50  text-amber-600 border border-amber-200" },
  coming_soon: { label: "Coming Soon", className: "bg-violet-50 text-violet-600 border border-violet-200" },
};

interface Props {
  status: ThemeStatus;
  className?: string;
}

export default function ThemeBadge({ status, className = "" }: Props) {
  const { label, className: base } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${base} ${className}`}
    >
      {label}
    </span>
  );
}
