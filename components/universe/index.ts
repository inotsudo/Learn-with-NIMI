/**
 * NIMIPIKO Universe — public barrel (Phase 1 Foundation).
 * Import from "@/components/universe" in future phases.
 * Nothing here is mounted by existing routes — foundation stays invisible.
 */

export { default as UniverseProvider, useUniverse } from "./UniverseProvider";
export { default as UniverseScene } from "./UniverseScene";
export { default as UniverseBackground } from "./UniverseBackground";
export { default as UniverseAtmosphere } from "./UniverseAtmosphere";
export { default as UniverseLayer } from "./UniverseLayer";
export { default as UniverseObject } from "./UniverseObject";
export { default as UniverseCharacter } from "./UniverseCharacter";
export { default as UniverseTransition } from "./UniverseTransition";
export { default as UniversePortal } from "./UniversePortal";
export { default as UniversePath, type UniverseStop, type UniverseStopState } from "./UniversePath";

export type {
  UniverseCharacterId,
  UniverseCharacterState,
} from "@/lib/universe/characters";
