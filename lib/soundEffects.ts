const SOUND_EFFECTS_KEY = "nimi_sound_effects_enabled";

export function isSoundEffectsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(SOUND_EFFECTS_KEY);
  return saved === null ? true : saved === "true";
}

export function setSoundEffectsEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_EFFECTS_KEY, String(enabled));
}
