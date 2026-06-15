export type ShopCategory = "accessories" | "backgrounds" | "toys";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  nameKey: string;
  emoji: string;
  bg: string;
  price: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "nimiHat", category: "accessories", nameKey: "rewardNimiHat", emoji: "🎩", bg: "bg-green-100", price: 50 },
  { id: "pikoHeadphones", category: "accessories", nameKey: "rewardPikoHeadphones", emoji: "🎧", bg: "bg-blue-100", price: 60 },
  { id: "rainbowBg", category: "backgrounds", nameKey: "rewardRainbowBg", emoji: "🌈", bg: "bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200", price: 80 },
  { id: "spaceAdventure", category: "backgrounds", nameKey: "rewardSpaceAdventure", emoji: "🪐", bg: "bg-gradient-to-br from-indigo-400 to-purple-600", price: 100 },
  { id: "starGlasses", category: "accessories", nameKey: "rewardStarGlasses", emoji: "🕶️", bg: "bg-pink-100", price: 20 },
  { id: "magicWand", category: "accessories", nameKey: "rewardMagicWand", emoji: "🪄", bg: "bg-yellow-100", price: 30 },
  { id: "underwaterWorld", category: "backgrounds", nameKey: "rewardUnderwaterWorld", emoji: "🐠", bg: "bg-gradient-to-br from-cyan-300 to-blue-500", price: 90 },
  { id: "castleKingdom", category: "backgrounds", nameKey: "rewardCastleKingdom", emoji: "🏰", bg: "bg-gradient-to-br from-purple-300 to-pink-400", price: 120 },
];
