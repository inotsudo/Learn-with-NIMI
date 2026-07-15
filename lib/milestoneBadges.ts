// Milestone badge catalog — auto-awarded by _sa_award_milestone_badges RPC.
// Distinct from admin-awarded badges (BADGE_CATALOG in RewardsManager).

export interface MilestoneBadge {
  slug: string;
  emoji: string;
  label: string;
  desc: string;
}

export const MILESTONE_BADGES: MilestoneBadge[] = [
  { slug: "story-explorer",   emoji: "🧭", label: "Story Explorer",   desc: "Complete your first story" },
  { slug: "story-adventurer", emoji: "🚀", label: "Story Adventurer", desc: "Complete 3 stories"        },
  { slug: "story-champion",   emoji: "🏆", label: "Story Champion",   desc: "Complete 5 stories"        },
  { slug: "star-collector",   emoji: "⭐", label: "Star Collector",   desc: "Earn 50 stars"             },
  { slug: "super-star",       emoji: "🌟", label: "Super Star",       desc: "Earn 100 stars"            },
];

export const MILESTONE_BADGE_MAP: Record<string, MilestoneBadge> =
  Object.fromEntries(MILESTONE_BADGES.map(b => [b.slug, b]));

export function getMilestoneBadgeMeta(slug: string): MilestoneBadge | null {
  return MILESTONE_BADGE_MAP[slug] ?? null;
}
