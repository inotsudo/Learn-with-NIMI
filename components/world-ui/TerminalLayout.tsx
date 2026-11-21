"use client";

import type { ReactNode } from "react";
import WorldBackdrop from "./WorldBackdrop";
import WorldBrand from "./WorldBrand";

/**
 * The airport-terminal screen used by every account door (sign in, sign up,
 * forgot / reset code): an official scene full-bleed, the airline mark, and a
 * glass boarding-pass card.
 *  - phone portrait: art on top, card rises from the bottom
 *  - tablet portrait: whole art on top, card under the characters' faces
 *  - landscape ≥768px (tablets, desktops, big phones): hero left, card right
 */
export default function TerminalLayout({
  scene,
  focus,
  portraitFocus,
  subtitle,
  hero,
  children,
}: {
  scene: string;
  focus?: { x: number; y: number };
  portraitFocus?: { x: number; y: number };
  subtitle: string;
  /** Shown beside the card on wide screens only. */
  hero?: ReactNode;
  /** The card (usually a <TicketCard>). */
  children: ReactNode;
}) {
  return (
    <div className="wui-screen">
      <WorldBackdrop src={scene} focus={focus} portraitFocus={portraitFocus} shade="adaptive" dim={0.12} portraitTop />
      <main id="main-content" className="wui-safe relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
        <WorldBrand subtitle={subtitle} />
        <div className="grid flex-1 grid-cols-1 items-end gap-8 pt-[34vh] landscape:items-center landscape:pt-6 landscape:md:grid-cols-[1fr_420px] landscape:lg:grid-cols-[1fr_440px]">
          {/* the hero stays centred on screen while a long card scrolls past it */}
          <div className="hidden self-stretch landscape:md:block">
            <div className="sticky top-6 flex min-h-[calc(100dvh-124px)] flex-col items-start justify-center gap-6">{hero}</div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
