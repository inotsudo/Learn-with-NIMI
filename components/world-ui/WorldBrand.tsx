import Image from "next/image";
import { WORLD } from "@/lib/design-system/world";

/** The airline mark at the top of every terminal screen: gold-ringed medallion + name. */
export default function WorldBrand({ subtitle }: { subtitle: string }) {
  return (
    <header className="flex items-center gap-3">
      <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full" style={{ boxShadow: "0 0 0 2px #C9A84C, 0 6px 16px rgba(0,0,0,0.45)" }}>
        <Image src="/nimi-logo.png" alt="" fill sizes="44px" className="object-cover" priority />
      </span>
      <div className="leading-tight" style={{ textShadow: "0 1px 8px rgba(6,16,31,0.9)" }}>
        <p className="font-baloo text-[13px] font-extrabold tracking-[0.22em]" style={{ color: WORLD.color.goldBright }}>NIMIPIKO AIRWAYS</p>
        <p className="font-nunito text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFF7E0]/70">{subtitle}</p>
      </div>
    </header>
  );
}
