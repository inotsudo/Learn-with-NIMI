"use client";

interface Props {
  value:    string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ThemeSearch({ value, onChange, placeholder = "Search themes…", className = "" }: Props) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none select-none text-sm">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search themes"
        className="w-full pl-9 pr-4 py-2.5 leaf border border-gray-200 bg-white/80 text-sm text-gray-800
                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
                   focus:border-transparent transition-shadow"
        style={{ focusRingColor: "var(--theme-accent, #16a34a)" } as React.CSSProperties}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
        >
          ✕
        </button>
      )}
    </div>
  );
}
