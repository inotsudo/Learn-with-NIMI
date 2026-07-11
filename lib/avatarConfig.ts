// Avatar config is stored in `avatar_url` prefixed with "ava:"
// e.g. ava:{"sk":"F5C5A3","hr":"buns","hc":"2D1A0A","ey":"round","ec":"8B5CF6","mo":"bigsmile","ot":"overalls","oc":"4ADE80","ac":"none","ab":"F59E0B","bg":"DBEAFE"}

export const AVATAR_PREFIX = "ava:";

export type HairStyle    = "buns" | "afro" | "curly" | "straight" | "spiky" | "braids" | "ponytail" | "short";
export type EyeShape     = "round" | "big" | "starry" | "almond" | "sleepy";
export type MouthStyle   = "smile" | "bigsmile" | "grin" | "shy" | "tongue";
export type OutfitStyle  = "tshirt" | "overalls" | "dress" | "hoodie" | "vest";
export type AccessoryStyle = "none" | "earrings" | "glasses" | "bow" | "crown" | "headband";

export interface AvatarConfig {
  sk: string;          // skin hex (no #)
  hr: HairStyle;
  hc: string;          // hair color
  ey: EyeShape;
  ec: string;          // eye color
  mo: MouthStyle;
  ot: OutfitStyle;
  oc: string;          // outfit color
  ac: AccessoryStyle;
  ab: string;          // accessory color
  bg: string;          // background color
}

export const DEFAULT_AVATAR: AvatarConfig = {
  sk: "F5C5A3",
  hr: "buns",
  hc: "2D1A0A",
  ey: "round",
  ec: "8B5CF6",
  mo: "bigsmile",
  ot: "overalls",
  oc: "4ADE80",
  ac: "earrings",
  ab: "F59E0B",
  bg: "DBEAFE",
};

export function serializeAvatar(cfg: AvatarConfig): string {
  return AVATAR_PREFIX + JSON.stringify(cfg);
}

export function parseAvatar(raw: string | null | undefined): AvatarConfig | null {
  if (!raw?.startsWith(AVATAR_PREFIX)) return null;
  try {
    return JSON.parse(raw.slice(AVATAR_PREFIX.length)) as AvatarConfig;
  } catch {
    return null;
  }
}

export function isAvatarConfig(raw: string | null | undefined): boolean {
  return !!raw?.startsWith(AVATAR_PREFIX);
}

// ─── Color palettes ───────────────────────────────────────────────────────────

export const SKIN_TONES = [
  { label: "Ebony",     hex: "3B1F0F" },
  { label: "Espresso",  hex: "5C2E0A" },
  { label: "Mocha",     hex: "7B3F1A" },
  { label: "Almond",    hex: "9C5622" },
  { label: "Caramel",   hex: "B5722E" },
  { label: "Honey",     hex: "C98B44" },
  { label: "Sienna",    hex: "D4A06A" },
  { label: "Sand",      hex: "DEB891" },
  { label: "Beige",     hex: "E8C9A0" },
  { label: "Ivory",     hex: "F0D9B5" },
  { label: "Cream",     hex: "F5C5A3" },
  { label: "Peach",     hex: "FAD5BE" },
  { label: "Rose",      hex: "FDDFD0" },
  { label: "Blush",     hex: "FFE8DA" },
  { label: "Fair",      hex: "FFF0E8" },
];

export const HAIR_COLORS = [
  { label: "Jet Black",  hex: "1A0A00" },
  { label: "Espresso",   hex: "3B1F0F" },
  { label: "Dark Brown", hex: "5C3317" },
  { label: "Auburn",     hex: "9B4A11" },
  { label: "Golden",     hex: "D4A017" },
  { label: "Blonde",     hex: "F5D776" },
  { label: "Ginger",     hex: "C2441D" },
  { label: "Ash",        hex: "9E9E9E" },
  { label: "Silver",     hex: "D0D0D0" },
  { label: "Lavender",   hex: "B39DDB" },
  { label: "Bubblegum",  hex: "F48FB1" },
  { label: "Sky Blue",   hex: "64B5F6" },
  { label: "Mint",       hex: "80CBC4" },
  { label: "Tangerine",  hex: "FF8A65" },
];

export const EYE_COLORS = [
  { label: "Dark Brown", hex: "3E2009" },
  { label: "Chestnut",   hex: "6D3A1E" },
  { label: "Hazel",      hex: "8B6914" },
  { label: "Forest",     hex: "2E6B3E" },
  { label: "Sky",        hex: "3B8BEB" },
  { label: "Violet",     hex: "8B5CF6" },
  { label: "Sapphire",   hex: "1565C0" },
  { label: "Rose",       hex: "D81B60" },
];

export const OUTFIT_COLORS = [
  { label: "Lime",       hex: "4ADE80" },
  { label: "Sky",        hex: "38BDF8" },
  { label: "Violet",     hex: "A78BFA" },
  { label: "Coral",      hex: "FB7185" },
  { label: "Amber",      hex: "FCD34D" },
  { label: "Orange",     hex: "FB923C" },
  { label: "Teal",       hex: "2DD4BF" },
  { label: "Red",        hex: "F87171" },
  { label: "Indigo",     hex: "818CF8" },
  { label: "White",      hex: "F8FAFC" },
  { label: "Navy",       hex: "3B4F7C" },
  { label: "Charcoal",   hex: "4B5563" },
];

export const ACCESSORY_COLORS = [
  { label: "Gold",       hex: "F59E0B" },
  { label: "Rose Gold",  hex: "F472B6" },
  { label: "Silver",     hex: "CBD5E1" },
  { label: "Ruby",       hex: "EF4444" },
  { label: "Sapphire",   hex: "3B82F6" },
  { label: "Emerald",    hex: "10B981" },
  { label: "Amethyst",   hex: "8B5CF6" },
  { label: "Coral",      hex: "FB7185" },
];

export const BG_COLORS = [
  { label: "Sky",        hex: "DBEAFE" },
  { label: "Mint",       hex: "D1FAE5" },
  { label: "Lavender",   hex: "EDE9FE" },
  { label: "Peach",      hex: "FEE2E2" },
  { label: "Lemon",      hex: "FEF9C3" },
  { label: "Rose",       hex: "FCE7F3" },
  { label: "Aqua",       hex: "CFFAFE" },
  { label: "Lilac",      hex: "F3E8FF" },
  { label: "Cream",      hex: "FFFBEB" },
  { label: "Cloud",      hex: "F8FAFC" },
];

export const HAIR_STYLES: { id: HairStyle; label: string; emoji: string }[] = [
  { id: "buns",      label: "Buns",      emoji: "🐾" },
  { id: "afro",      label: "Afro",      emoji: "☁️" },
  { id: "curly",     label: "Curly",     emoji: "🌀" },
  { id: "straight",  label: "Straight",  emoji: "〰️" },
  { id: "spiky",     label: "Spiky",     emoji: "⚡" },
  { id: "braids",    label: "Braids",    emoji: "🔗" },
  { id: "ponytail",  label: "Ponytail",  emoji: "🎀" },
  { id: "short",     label: "Short",     emoji: "🍄" },
];

export const EYE_SHAPES: { id: EyeShape; label: string }[] = [
  { id: "round",   label: "Round" },
  { id: "big",     label: "Big" },
  { id: "starry",  label: "Starry" },
  { id: "almond",  label: "Almond" },
  { id: "sleepy",  label: "Sleepy" },
];

export const MOUTH_STYLES: { id: MouthStyle; label: string }[] = [
  { id: "bigsmile", label: "Beaming" },
  { id: "smile",    label: "Smile" },
  { id: "grin",     label: "Grin" },
  { id: "shy",      label: "Shy" },
  { id: "tongue",   label: "Playful" },
];

export const OUTFIT_STYLES: { id: OutfitStyle; label: string; emoji: string }[] = [
  { id: "overalls", label: "Overalls",  emoji: "👖" },
  { id: "tshirt",   label: "T-Shirt",   emoji: "👕" },
  { id: "dress",    label: "Dress",     emoji: "👗" },
  { id: "hoodie",   label: "Hoodie",    emoji: "🧥" },
  { id: "vest",     label: "Vest",      emoji: "🦺" },
];

export const ACCESSORY_STYLES: { id: AccessoryStyle; label: string; emoji: string }[] = [
  { id: "none",      label: "None",      emoji: "✕" },
  { id: "earrings",  label: "Earrings",  emoji: "💎" },
  { id: "glasses",   label: "Glasses",   emoji: "🕶️" },
  { id: "bow",       label: "Bow",       emoji: "🎀" },
  { id: "crown",     label: "Crown",     emoji: "👑" },
  { id: "headband",  label: "Headband",  emoji: "🌸" },
];

// ─── Darken / lighten a hex color (no # prefix) ───────────────────────────────
export function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount);
  return [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + amount);
  return [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}
