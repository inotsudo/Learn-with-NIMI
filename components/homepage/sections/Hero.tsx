"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import Section from "@/components/homepage/ui/Section";
import Button from "@/components/homepage/ui/Button";
import ActivityIconRow from "@/components/marketing/ActivityIconRow";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

function HeroCopy() {
  return (
    <div className="flex flex-col items-start">
      <h1 className="font-baloo font-black text-gray-900 text-h1 sm:text-display leading-[1.1]">
        Grow with<br />
        <span className="text-nimi-green">every story.</span>
      </h1>
      <p className="font-nunito text-gray-600 text-body sm:text-body-lg mt-4 max-w-sm leading-relaxed">
        Read, create, explore and grow with<br />Nimi, Piko &amp; Zilo.
      </p>
      <div className="flex items-center gap-3 mt-7">
        <Button href="/signuppage" variant="primary">
          Start Learning
        </Button>
        <Button href="#stories" variant="secondary">
          <Play className="w-3.5 h-3.5 fill-gray-700" /> Watch Demo
        </Button>
      </div>
      <ActivityIconRow className="mt-8" />
    </div>
  );
}

export default function Hero() {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  return (
    <Section id="hero" bg="white" padded={false}>

      {/* Desktop: two-column */}
      <div className="hidden md:flex min-h-screen w-full overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center shrink-0
                        w-[44%] xl:w-[40%] 2xl:w-[36%]
                        pl-8 sm:pl-12 lg:pl-16 xl:pl-20
                        pr-6 pt-36 lg:pt-40 pb-16 bg-white">
          <HeroCopy />
        </div>
        <div className="relative z-10 w-16 shrink-0 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="relative flex-1 min-w-0">
          <Image
            src={assets.homeHero}
            alt="Nimi, Piko and Zilo in the NIMIPIKO garden"
            fill
            priority
            sizes="60vw"
            className="object-cover object-[30%_center]"
          />
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="md:hidden">
        <div className="px-5 pt-36 pb-6 bg-white">
          <HeroCopy />
        </div>
        <div className="relative w-full aspect-[853/1200]">
          <Image
            src={assets.homeHeroMobile}
            alt="Nimi, Piko and Zilo in the NIMIPIKO garden"
            fill
            className="object-cover object-top"
          />
        </div>
      </div>

    </Section>
  );
}
