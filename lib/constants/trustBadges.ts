import { ShieldCheck, Target, Zap, Gamepad2, type LucideIcon } from "lucide-react";

export interface TrustBadge {
  icon: LucideIcon;
  emoji: string;
  label: string;
  bg: string;
}

export const TRUST_BADGES: TrustBadge[] = [
  { icon: ShieldCheck, emoji: "🛡️", label: "SAFE ENVIRONMENT",  bg: "bg-blue-600"   },
  { icon: Target,      emoji: "🎯", label: "FUN LEARNING",       bg: "bg-pink-600"   },
  { icon: Zap,         emoji: "💪", label: "BUILD CONFIDENCE",   bg: "bg-orange-500" },
  { icon: Gamepad2,    emoji: "🎮", label: "LEARN THROUGH PLAY", bg: "bg-green-600"  },
];
