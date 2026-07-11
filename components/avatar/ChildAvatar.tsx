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

  if (avatarUrl?.startsWith("http")) {
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
    return <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }}>{avatarUrl}</span>;
  }

  return <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }}>{fallbackEmoji}</span>;
}
