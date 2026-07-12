import type { CSSProperties } from "react";

export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear", ...style }}
    />
  );
}
