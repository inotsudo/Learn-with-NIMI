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
  { id: "nimiHat", category: "accessories", nameKey: "rewardNimiHat", emoji: "🎩", bg: "bg-gradient-to-br from-emerald-300 to-green-500", price: 50 },
  { id: "pikoHeadphones", category: "accessories", nameKey: "rewardPikoHeadphones", emoji: "🎧", bg: "bg-gradient-to-br from-sky-300 to-blue-500", price: 60 },
  { id: "rainbowBg", category: "backgrounds", nameKey: "rewardRainbowBg", emoji: "🌈", bg: "bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300", price: 80 },
  { id: "spaceAdventure", category: "backgrounds", nameKey: "rewardSpaceAdventure", emoji: "🪐", bg: "bg-gradient-to-br from-indigo-400 to-purple-600", price: 100 },
  { id: "starGlasses", category: "accessories", nameKey: "rewardStarGlasses", emoji: "🕶️", bg: "bg-gradient-to-br from-pink-300 to-rose-500", price: 20 },
  { id: "magicWand", category: "accessories", nameKey: "rewardMagicWand", emoji: "🪄", bg: "bg-gradient-to-br from-yellow-300 to-amber-500", price: 30 },
  { id: "underwaterWorld", category: "backgrounds", nameKey: "rewardUnderwaterWorld", emoji: "🐠", bg: "bg-gradient-to-br from-cyan-300 to-blue-500", price: 90 },
  { id: "castleKingdom", category: "backgrounds", nameKey: "rewardCastleKingdom", emoji: "🏰", bg: "bg-gradient-to-br from-purple-300 to-pink-400", price: 120 },
  { id: "teddyBear", category: "toys", nameKey: "rewardTeddyBear", emoji: "🧸", bg: "bg-gradient-to-br from-amber-200 to-orange-400", price: 40 },
  { id: "toyRocket", category: "toys", nameKey: "rewardToyRocket", emoji: "🚀", bg: "bg-gradient-to-br from-red-400 to-orange-500", price: 70 },
  { id: "buildingBlocks", category: "toys", nameKey: "rewardBuildingBlocks", emoji: "🧱", bg: "bg-gradient-to-br from-blue-300 to-indigo-500", price: 50 },
  { id: "kite", category: "toys", nameKey: "rewardKite", emoji: "🪁", bg: "bg-gradient-to-br from-teal-300 to-cyan-500", price: 35 },
];
