// lib/conceptTaxonomy.ts
//
// Static concept taxonomy — the global knowledge graph skeleton.
//
// This is the equivalent of curriculumKnowledge.ts but for concepts:
// a hand-authored hierarchy that AI-extracted story concepts get slotted into.
//
// Structure:
//   ConceptNode   — a node in the global knowledge graph
//   CONCEPT_TREE  — the taxonomy, keyed by concept name
//   lookupConcept — find a node by name (normalized)
//   getAncestors  — traverse parent chain
//   getSkillForConcept — which CurriculumSkill does this concept map to?
//
// Naming rules:
//   - Concept names are lowercase, singular
//   - parent_name references another concept name in this file
//   - curriculum_skill must be a valid CurriculumSkill key
//   - If a concept doesn't map cleanly to one skill, pick the closest

import type { CurriculumSkill } from "./curriculumKnowledge";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ConceptType = 'word' | 'emotion' | 'theme' | 'skill' | 'topic' | 'animal' | 'character';

export interface ConceptNode {
  name:             string;
  concept_type:     ConceptType;
  parent_name?:     string;           // parent in the hierarchy (null = root node)
  curriculum_skill?: CurriculumSkill; // which CurriculumSkill this maps to
  display_emoji?:   string;
  description?:     string;
  aliases?:         string[];         // alternative names that resolve to this concept
}

// ── Taxonomy ───────────────────────────────────────────────────────────────────
// Key = canonical concept name (lowercase).
// This is a STATIC seed — AI story analysis adds more nodes dynamically.

export const CONCEPT_TAXONOMY: Record<string, ConceptNode> = {

  // ── ROOT DOMAINS ──────────────────────────────────────────────────────────

  "emotions": {
    name: "emotions",
    concept_type: "topic",
    display_emoji: "💛",
    description: "Feelings and emotional states — the SEL curriculum domain",
  },
  "animals": {
    name: "animals",
    concept_type: "topic",
    display_emoji: "🐾",
    description: "The animal world — characters and natural science vocabulary",
  },
  "nature": {
    name: "nature",
    concept_type: "topic",
    display_emoji: "🌿",
    description: "Natural world: plants, weather, environment",
  },
  "social skills": {
    name: "social skills",
    concept_type: "topic",
    display_emoji: "🤝",
    description: "How we interact with others",
  },
  "character traits": {
    name: "character traits",
    concept_type: "topic",
    display_emoji: "⭐",
    description: "Virtues, values, and personal qualities",
  },
  "academic concepts": {
    name: "academic concepts",
    concept_type: "topic",
    display_emoji: "📚",
    description: "Foundational literacy and numeracy concepts",
  },
  "family and community": {
    name: "family and community",
    concept_type: "topic",
    display_emoji: "🏡",
    description: "Relationships within family and community structures",
  },

  // ── EMOTIONS ──────────────────────────────────────────────────────────────

  "happy": {
    name: "happy",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "😊",
    aliases: ["joy", "joyful", "cheerful", "glad", "pleased"],
  },
  "sad": {
    name: "sad",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "😢",
    aliases: ["unhappy", "sorrowful", "upset", "tearful"],
  },
  "angry": {
    name: "angry",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "😠",
    aliases: ["mad", "furious", "cross", "frustrated"],
  },
  "scared": {
    name: "scared",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "😨",
    aliases: ["afraid", "frightened", "fearful", "terrified"],
  },
  "surprised": {
    name: "surprised",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "😲",
    aliases: ["amazed", "astonished", "shocked", "startled"],
  },
  "proud": {
    name: "proud",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "self_regulation",
    display_emoji: "🏆",
    aliases: ["confident", "accomplished"],
  },
  "excited": {
    name: "excited",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "🤩",
    aliases: ["thrilled", "enthusiastic"],
  },
  "worried": {
    name: "worried",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "self_regulation",
    display_emoji: "😟",
    aliases: ["anxious", "nervous", "uneasy"],
  },
  "lonely": {
    name: "lonely",
    concept_type: "emotion",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "🙁",
  },
  "delight": {
    name: "delight",
    concept_type: "word",
    parent_name: "happy",
    curriculum_skill: "empathy",
    display_emoji: "✨",
    description: "A strong feeling of happiness or pleasure",
    aliases: ["delighted", "delightful"],
  },
  "comfort": {
    name: "comfort",
    concept_type: "word",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "🤗",
    description: "A feeling of relief or being soothed; to make someone feel better",
    aliases: ["comforting", "comforted"],
  },

  // ── EMPATHY / SEL CHAIN ───────────────────────────────────────────────────

  "empathy": {
    name: "empathy",
    concept_type: "skill",
    parent_name: "emotions",
    curriculum_skill: "empathy",
    display_emoji: "💙",
    description: "Understanding and sharing the feelings of another person",
    aliases: ["empathetic", "empathise"],
  },
  "kindness": {
    name: "kindness",
    concept_type: "skill",
    parent_name: "character traits",
    curriculum_skill: "kindness",
    display_emoji: "💖",
    aliases: ["kind", "caring", "generous"],
  },
  "friendship": {
    name: "friendship",
    concept_type: "skill",
    parent_name: "social skills",
    curriculum_skill: "friendship",
    display_emoji: "🫂",
    aliases: ["friend", "friends"],
  },
  "cooperation": {
    name: "cooperation",
    concept_type: "skill",
    parent_name: "social skills",
    curriculum_skill: "friendship",
    display_emoji: "🤲",
    aliases: ["cooperate", "teamwork", "working together"],
  },
  "courage": {
    name: "courage",
    concept_type: "skill",
    parent_name: "character traits",
    curriculum_skill: "self_regulation",
    display_emoji: "🦁",
    aliases: ["brave", "bravery", "courageous"],
  },
  "honesty": {
    name: "honesty",
    concept_type: "skill",
    parent_name: "character traits",
    curriculum_skill: "kindness",
    display_emoji: "🌟",
    aliases: ["honest", "truthful", "truth"],
  },
  "patience": {
    name: "patience",
    concept_type: "skill",
    parent_name: "character traits",
    curriculum_skill: "self_regulation",
    display_emoji: "⏳",
    aliases: ["patient", "wait"],
  },
  "respect": {
    name: "respect",
    concept_type: "skill",
    parent_name: "social skills",
    curriculum_skill: "family_values",
    display_emoji: "🙏",
    aliases: ["respectful", "respectfully"],
  },
  "responsibility": {
    name: "responsibility",
    concept_type: "skill",
    parent_name: "character traits",
    curriculum_skill: "self_regulation",
    display_emoji: "📋",
    aliases: ["responsible", "responsible for"],
  },

  // ── ANIMALS ───────────────────────────────────────────────────────────────

  "lion": {
    name: "lion",
    concept_type: "animal",
    parent_name: "animals",
    curriculum_skill: "reading_comprehension",
    display_emoji: "🦁",
    aliases: ["lions"],
  },
  "rabbit": {
    name: "rabbit",
    concept_type: "animal",
    parent_name: "animals",
    curriculum_skill: "reading_comprehension",
    display_emoji: "🐇",
    aliases: ["rabbits", "bunny"],
  },
  "elephant": {
    name: "elephant",
    concept_type: "animal",
    parent_name: "animals",
    curriculum_skill: "reading_comprehension",
    display_emoji: "🐘",
    aliases: ["elephants"],
  },
  "bird": {
    name: "bird",
    concept_type: "animal",
    parent_name: "animals",
    curriculum_skill: "reading_comprehension",
    display_emoji: "🐦",
    aliases: ["birds"],
  },
  "fish": {
    name: "fish",
    concept_type: "animal",
    parent_name: "animals",
    curriculum_skill: "reading_comprehension",
    display_emoji: "🐟",
  },
  "forest": {
    name: "forest",
    concept_type: "topic",
    parent_name: "nature",
    curriculum_skill: "reading_comprehension",
    display_emoji: "🌳",
    aliases: ["jungle", "woods"],
  },
  "roar": {
    name: "roar",
    concept_type: "word",
    parent_name: "lion",
    curriculum_skill: "vocabulary",
    display_emoji: "🔊",
    description: "The loud sound made by a lion; also used for other loud sounds",
  },

  // ── ACADEMIC CONCEPTS ─────────────────────────────────────────────────────

  "colors": {
    name: "colors",
    concept_type: "topic",
    parent_name: "academic concepts",
    curriculum_skill: "vocabulary",
    display_emoji: "🎨",
    aliases: ["colour", "colours", "color"],
  },
  "numbers": {
    name: "numbers",
    concept_type: "topic",
    parent_name: "academic concepts",
    curriculum_skill: "vocabulary",
    display_emoji: "🔢",
    aliases: ["counting", "numerals"],
  },
  "letters": {
    name: "letters",
    concept_type: "topic",
    parent_name: "academic concepts",
    curriculum_skill: "phonics",
    display_emoji: "🔤",
    aliases: ["alphabet", "abc"],
  },
  "shapes": {
    name: "shapes",
    concept_type: "topic",
    parent_name: "academic concepts",
    curriculum_skill: "vocabulary",
    display_emoji: "🔷",
  },

  // ── STORY STRUCTURE ───────────────────────────────────────────────────────

  "beginning": {
    name: "beginning",
    concept_type: "skill",
    parent_name: "academic concepts",
    curriculum_skill: "memory",
    display_emoji: "▶️",
    aliases: ["start", "introduction"],
  },
  "middle": {
    name: "middle",
    concept_type: "skill",
    parent_name: "academic concepts",
    curriculum_skill: "memory",
    display_emoji: "⏸️",
  },
  "end": {
    name: "end",
    concept_type: "skill",
    parent_name: "academic concepts",
    curriculum_skill: "memory",
    display_emoji: "⏹️",
    aliases: ["ending", "conclusion", "finally"],
  },
  "problem": {
    name: "problem",
    concept_type: "skill",
    parent_name: "academic concepts",
    curriculum_skill: "critical_thinking",
    display_emoji: "❓",
    aliases: ["conflict", "challenge"],
  },
  "solution": {
    name: "solution",
    concept_type: "skill",
    parent_name: "academic concepts",
    curriculum_skill: "critical_thinking",
    display_emoji: "✅",
    aliases: ["answer", "resolution", "solve"],
  },
  "moral lesson": {
    name: "moral lesson",
    concept_type: "theme",
    parent_name: "academic concepts",
    curriculum_skill: "critical_thinking",
    display_emoji: "💡",
    aliases: ["lesson", "moral", "message"],
  },

  // ── FAMILY AND COMMUNITY ──────────────────────────────────────────────────

  "family": {
    name: "family",
    concept_type: "topic",
    parent_name: "family and community",
    curriculum_skill: "family_values",
    display_emoji: "👨‍👩‍👧",
    aliases: ["families"],
  },
  "community": {
    name: "community",
    concept_type: "topic",
    parent_name: "family and community",
    curriculum_skill: "family_values",
    display_emoji: "🏘️",
  },
  "sharing": {
    name: "sharing",
    concept_type: "skill",
    parent_name: "social skills",
    curriculum_skill: "kindness",
    display_emoji: "🤲",
    aliases: ["share"],
  },
  "helping": {
    name: "helping",
    concept_type: "skill",
    parent_name: "social skills",
    curriculum_skill: "kindness",
    display_emoji: "🙌",
    aliases: ["help", "helper"],
  },
};

// ── Alias index (built once at module load) ────────────────────────────────────

const ALIAS_INDEX: Map<string, string> = new Map();
for (const [key, node] of Object.entries(CONCEPT_TAXONOMY)) {
  ALIAS_INDEX.set(key, key);
  for (const alias of node.aliases ?? []) {
    ALIAS_INDEX.set(alias.toLowerCase(), key);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Find a concept by name or alias (case-insensitive). Returns null if unknown. */
export function lookupConcept(name: string): ConceptNode | null {
  const normalized = name.toLowerCase().trim();
  const canonical  = ALIAS_INDEX.get(normalized);
  return canonical ? CONCEPT_TAXONOMY[canonical] ?? null : null;
}

/** Get the CurriculumSkill for a concept, traversing up the parent chain. */
export function getSkillForConcept(name: string): CurriculumSkill | null {
  let node = lookupConcept(name);
  while (node) {
    if (node.curriculum_skill) return node.curriculum_skill;
    if (!node.parent_name) break;
    node = lookupConcept(node.parent_name);
  }
  return null;
}

/** Get all ancestors of a concept (parent → grandparent → … → root). */
export function getAncestors(name: string): ConceptNode[] {
  const chain: ConceptNode[] = [];
  let node = lookupConcept(name);
  while (node?.parent_name) {
    const parent = lookupConcept(node.parent_name);
    if (!parent) break;
    chain.push(parent);
    node = parent;
  }
  return chain;
}

/** Get all direct children of a concept in the taxonomy. */
export function getChildren(parentName: string): ConceptNode[] {
  const normalized = parentName.toLowerCase().trim();
  return Object.values(CONCEPT_TAXONOMY).filter(
    n => n.parent_name?.toLowerCase() === normalized
  );
}

/**
 * Given a list of word strings (from story analysis), resolve them to concept nodes.
 * Unknown words are returned as synthetic 'word' nodes without a parent.
 */
export function resolveWordsToConcepts(words: string[]): ConceptNode[] {
  return words.map(w => {
    const found = lookupConcept(w);
    if (found) return found;
    // Create a synthetic node for unknown words so they still get tracked
    return {
      name: w.toLowerCase(),
      concept_type: "word" as ConceptType,
      description: `Vocabulary word from story: ${w}`,
    };
  });
}

/**
 * Given a list of theme strings (from story analysis), resolve them to concept nodes.
 */
export function resolveThemesToConcepts(themes: string[]): ConceptNode[] {
  return themes.map(t => {
    const found = lookupConcept(t);
    if (found) return found;
    return {
      name: t.toLowerCase(),
      concept_type: "theme" as ConceptType,
    };
  });
}
