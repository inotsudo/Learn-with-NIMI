"use client";

export function RefreshingBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-gray-800/95 shadow-xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm">
        <div className="w-4 h-4 rounded-full border-[2.5px] border-t-transparent animate-spin" style={{ borderColor: "var(--nimi-green)", borderTopColor: "transparent" }} />
        <span className="text-[12px] font-black text-gray-700 dark:text-gray-200 tracking-wide">Switching…</span>
      </div>
    </div>
  );
}
