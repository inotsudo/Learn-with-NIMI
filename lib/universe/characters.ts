/**
 * NIMIPIKO Universe — Character slot resolver (Phase 1 Foundation)
 *
 * Server-safe (no hooks): maps (character, state) → asset src or documented
 * fallback. Nimi resolves to live registry art. Piko resolves to the existing
 * circle logo until approved poses land. Zilo has no art yet and resolves to
 * `src: null` so UniverseCharacter renders the initial-disc placeholder.
 */

import type { ThemeAssets } from "@/lib/design-system/assetRegistry";

export type UniverseCharacterId = "nimi" | "piko" | "zilo";

export type UniverseCharacterState =
  | "idle"
  | "happy"
  | "wave"
  | "celebrate"
  | "sad"
  | "locked";

export interface ResolvedUniverseCharacter {
  /** Raster path under /public/, or null when no art exists yet. */
  src: string | null;
  /** Accessible label for the rendered character. */
  alt: string;
  /** True when rendering a placeholder (Piko circle / Zilo disc). */
  pending: boolean;
  /** Letter shown inside the fallback disc (Piko → "P", Zilo → "Z"). */
  fallbackInitial: string;
}

type CharacterAssetPick = Pick<
  ThemeAssets,
  "nimiHappy" | "nimiSad" | "nimiLocked" | "nimiCelebration" | "pikoCircle"
> & { universe?: ThemeAssets["universe"] };

const META: Record<UniverseCharacterId, { label: string; initial: string }> = {
  nimi: { label: "Nimi", initial: "N" },
  piko: { label: "Piko", initial: "P" },
  zilo: { label: "Zilo", initial: "Z" },
};

export function resolveUniverseCharacter(
  character: UniverseCharacterId,
  state: UniverseCharacterState,
  assets: CharacterAssetPick,
): ResolvedUniverseCharacter {
  const meta = META[character];
  const pendingArt = (src: string | null) => ({
    src,
    alt: `${meta.label} (placeholder art)`,
    pending: true,
    fallbackInitial: meta.initial,
  });

  if (character === "nimi") {
    const src =
      state === "celebrate"
        ? assets.nimiCelebration
        : state === "sad"
          ? assets.nimiSad
          : state === "locked"
            ? assets.nimiLocked
            : assets.nimiHappy;
    const themed = assets.universe?.characters.nimi ?? null;
    return {
      src: themed ?? src,
      alt: state === "idle" ? "Nimi" : `Nimi (${state})`,
      pending: false,
      fallbackInitial: meta.initial,
    };
  }

  if (character === "piko") {
    // Approved Piko poses pending — circle logo keeps the slot live.
    const themed = assets.universe?.characters.piko ?? null;
    if (themed) return { src: themed, alt: "Piko", pending: false, fallbackInitial: meta.initial };
    return pendingArt(assets.pikoCircle);
  }

  // Zilo — no approved art in any theme yet.
  const themed = assets.universe?.characters.zilo ?? null;
  if (themed) return { src: themed, alt: "Zilo", pending: false, fallbackInitial: meta.initial };
  return pendingArt(null);
}
