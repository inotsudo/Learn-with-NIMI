"use client";

import { useRouter } from "next/navigation";
import { NimiThemeProvider } from "@/components/nimi-world/NimiThemeProvider";
import NimiToyWorld from "@/components/nimi-world/NimiToyWorld";
import { DEMO_WORLD } from "@/components/nimi-world/worldData";
import { ZONE_ORDER, type WorldZoneId } from "@/components/nimi-world/scenes";
import { isKidVersionId, isWorldThemeId } from "@/components/nimi-world/themes";

export default function WorldDemoClient({
  theme, version, lang, zone, age, intro,
}: {
  theme?: string; version?: string; lang?: string; zone?: string; age: number; intro: boolean;
}) {
  const router = useRouter();
  const initialZone = ZONE_ORDER.includes(zone as WorldZoneId) ? (zone as WorldZoneId) : undefined;
  return (
    <NimiThemeProvider
      childId="demo"
      childAge={age}
      defaultLang={lang === "en" ? "en" : "fr"}
      forceTheme={isWorldThemeId(theme) ? theme : undefined}
      forceVersion={isKidVersionId(version) ? version : undefined}
    >
      <NimiToyWorld
        data={DEMO_WORLD}
        childAge={age}
        demo
        skipIntro={!intro}
        initialZone={initialZone}
        onNavigate={(href) => router.push(href)}
      />
    </NimiThemeProvider>
  );
}
