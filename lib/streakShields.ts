import { getStreakShieldsPurchased, getUsedShieldDates, activateStreakShield } from "@/lib/queries";

function toLocalStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ShieldState {
  purchased: number;
  usedDates: Set<string>;
  available: number;
  activated: boolean;
}

/**
 * Fetches shield state and auto-activates any available shields into gaps
 * within the current streak. Safe to call on every render — idempotent once
 * all gaps are filled (DB insert de-duped by unique constraint; cache
 * invalidated in activateStreakShield so subsequent callers see fresh dates).
 */
export async function resolveShields(
  childId: string,
  language: "en" | "fr" | "rw",
  activityDates: Set<string>
): Promise<ShieldState> {
  const [purchased, used] = await Promise.all([
    getStreakShieldsPurchased(childId),
    getUsedShieldDates(childId, language),
  ]);

  const available = purchased - used.size;
  if (available <= 0) return { purchased, usedDates: used, available: 0, activated: false };

  const effective = new Set([...activityDates, ...used]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newlyUsed = new Set(used);
  let remaining = available;
  let activated = false;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < 60 && remaining > 0; i++) {
    const curStr = toLocalStr(cursor);
    cursor.setDate(cursor.getDate() - 1);
    const prevStr = toLocalStr(cursor);

    if (!effective.has(curStr) && !newlyUsed.has(curStr)) {
      if (effective.has(prevStr) || newlyUsed.has(prevStr)) {
        await activateStreakShield(childId, language, curStr);
        newlyUsed.add(curStr);
        effective.add(curStr);
        remaining--;
        activated = true;
      } else {
        break;
      }
    }
  }

  return { purchased, usedDates: newlyUsed, available: remaining, activated };
}
