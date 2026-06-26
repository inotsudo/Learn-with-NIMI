// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Personalization Token Interpolation (SA-2.3)
//
//  Replaces {child_name} tokens in story text at render time.
//  Falls back to "Friend" if no name provided.
//  Supports legacy [NAME] tokens for backward compatibility.
// ══════════════════════════════════════════════════════════════

const FALLBACK = "Friend";

export function personalize(text: string | null | undefined, childName: string | null | undefined): string {
  if (!text) return "";
  const name = childName?.trim() || FALLBACK;
  return text
    .replaceAll("{child_name}", name)
    .replaceAll("[NAME]", name)
    .replaceAll("[PRENOM]", name)
    .replaceAll("[IZINA]", name);
}

export function personalizeTitle(storyTitle: string, childName: string | null | undefined): string {
  const name = childName?.trim() || FALLBACK;
  return `${name} and Nimi's ${storyTitle} Adventure`;
}

export function personalizeJson(json: Record<string, unknown> | null | undefined, childName: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  const str = JSON.stringify(json);
  const replaced = personalize(str, childName);
  try {
    return JSON.parse(replaced);
  } catch {
    return json;
  }
}
