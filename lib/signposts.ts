export interface Signpost {
  emoji: string;
  label: string;
  href: string;
  color: string;
  shadow: string;
}

export const SIGNPOST: Signpost[] = [
  { emoji: "📚", label: "READ",    href: "/stories",      color: "#C4722A", shadow: "rgba(196,114,42,0.35)" },
  { emoji: "🎨", label: "CREATE",  href: "/community",    color: "#E05252", shadow: "rgba(224,82,82,0.35)" },
  { emoji: "🔍", label: "EXPLORE", href: "/stories",      color: "#3DAA7C", shadow: "rgba(61,170,124,0.35)" },
  { emoji: "🤸", label: "MOVE",    href: "/treasure",     color: "#4A90D9", shadow: "rgba(74,144,217,0.35)" },
  { emoji: "🎵", label: "SING",    href: "/talk-to-nimi", color: "#5CB85C", shadow: "rgba(92,184,92,0.35)" },
  { emoji: "🌱", label: "GROW",    href: "/user-profile", color: "#7DBE5B", shadow: "rgba(125,190,91,0.35)" },
];
