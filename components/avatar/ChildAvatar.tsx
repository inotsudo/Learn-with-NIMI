"use client";

import AvatarSvg from "./AvatarSvg";
import { parseAvatar, DEFAULT_AVATAR } from "@/lib/avatarConfig";

interface Props {
  avatarUrl: string | null | undefined;
  name?: string;
  size?: number;
  className?: string;
  /** Fallback emoji if neither avatar config nor http image */
  fallbackEmoji?: string;
}

/**
 * Universal child avatar renderer.
 * - If avatarUrl starts with "ava:" → renders the SVG avatar builder character
 * - If avatarUrl starts with "http" → renders as <img loading="lazy">
 * - Otherwise → renders the string as an emoji
 */
export default function ChildAvatar({ avatarUrl, name, size = 40, className = "", fallbackEmoji = "🧒" }: Props) {
  const config = parseAvatar(avatarUrl);

  if (config) {
    return <AvatarSvg config={config} size={size} className={className} />;
  }

  if (avatarUrl?.startsWith("http") || avatarUrl?.startsWith("blob:")) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
       loading="lazy" />
    );
  }

  if (avatarUrl) {
    // Defensive: legacy/test rows sometimes store a raw JSON blob (no "ava:"
    // prefix and no URL). Never render that as giant body text — fall back to
    // the child's initial instead. Data itself is untouched (frontend only).
    const trimmed = avatarUrl.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      return (
        <span
          className={`flex items-center justify-center rounded-full font-baloo font-black ${className}`}
          style={{
            width: size, height: size, fontSize: size * 0.45, lineHeight: 1,
            background: "linear-gradient(135deg,#173b66,#285595)", color: "#F9D779",
          }}
          aria-label={name ?? "avatar"}
        >
          {(name?.charAt(0) ?? fallbackEmoji).toUpperCase()}
        </span>
      );
    }
    return <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }}>{avatarUrl}</span>;
  }

  return <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }}>{fallbackEmoji}</span>;
}
