"use client";

import type { Method } from "@/lib/auth/useAirwaysAuth";

const TABS: { id: Method; label: string; icon: string }[] = [
  { id: "password", label: "Password", icon: "🔑" },
  { id: "magiclink", label: "Magic link", icon: "✨" },
  { id: "phone", label: "Phone", icon: "📱" },
];

export function MethodTabs({
  method,
  onChange,
}: {
  method: Method;
  onChange: (m: Method) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-gray-100 p-1.5">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-xl py-2 font-nunito text-[12px] font-bold transition active:scale-95 ${
            method === t.id ? "bg-white text-gray-900 shadow" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="mr-1">{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}
