"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Stories", href: "#stories" },
  { label: "Activities", href: "#activities" },
  { label: "Community", href: "/community" },
  { label: "Schools", href: "/schools" },
  { label: "About", href: "/about" },
];

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  return (
    <header id="top" className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto flex items-center gap-3 px-4 sm:px-6 py-3">
        <Link href="#top" className="flex items-center gap-2 shrink-0 mr-auto">
          <Image src={assets.nimiLogo} alt="NIMIPIKO" width={36} height={36} className="w-9 h-9 rounded-full" />
          <div className="hidden sm:block">
            <Image src={assets.nimiLogoText} alt="NIMIPIKO" width={120} height={20} className="h-5" style={{ width: "auto" }} />
            <p className="font-nunito text-gray-400 text-[10px] leading-none mt-0.5">Grow with Every Story</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <Link key={link.label} href={link.href}
              className="font-nunito font-bold text-gray-600 hover:text-nimi-orange text-[14px] transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Link href="/loginpage"
            className="font-baloo font-black text-gray-700 text-[13px] px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            Log In
          </Link>
          <Link href="/signuppage"
            className="font-baloo font-black text-white text-[13px] px-4 py-2 rounded-full bg-nimi-green shadow-md hover:brightness-105 transition">
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(true)}
          className="md:hidden w-10 h-10 rounded-full flex items-center justify-center border border-gray-200 shrink-0">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="bg-white w-4/5 sm:max-w-xs flex flex-col gap-1">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Link href="#top" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 mb-4">
            <Image src={assets.nimiLogo} alt="NIMIPIKO" width={36} height={36} className="w-9 h-9 rounded-full" />
            <Image src={assets.nimiLogoText} alt="NIMIPIKO" width={120} height={20} className="h-5" style={{ width: "auto" }} />
          </Link>

          {NAV_LINKS.map(link => (
            <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
              className="font-nunito font-bold text-gray-700 text-[15px] py-3 border-b border-gray-100">
              {link.label}
            </Link>
          ))}

          <div className="flex flex-col gap-2 mt-4">
            <Link href="/loginpage" onClick={() => setMenuOpen(false)}
              className="font-baloo font-black text-gray-700 text-[14px] text-center px-4 py-2.5 rounded-full border border-gray-200">
              Log In
            </Link>
            <Link href="/signuppage" onClick={() => setMenuOpen(false)}
              className="font-baloo font-black text-white text-[14px] text-center px-4 py-2.5 rounded-full bg-nimi-green shadow-md">
              Get Started
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
