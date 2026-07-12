"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Youtube, Linkedin, Twitter } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

const SOCIAL_LINKS = [
  { Icon: Facebook,  href: "https://facebook.com/nimipiko",  label: "Facebook"  },
  { Icon: Instagram, href: "https://instagram.com/nimipiko", label: "Instagram" },
  { Icon: Youtube,   href: "https://youtube.com/@nimipiko",  label: "YouTube"   },
  { Icon: Linkedin,  href: "https://linkedin.com/company/nimipiko-studio", label: "LinkedIn" },
  { Icon: Twitter,   href: "https://x.com/nimipiko",         label: "X"         },
];

const TRUST_BADGES = [
  { emoji: "🛡️", label: "SAFE ENVIRONMENT",  bg: "bg-blue-600"   },
  { emoji: "🎯", label: "FUN LEARNING",       bg: "bg-pink-600"   },
  { emoji: "💪", label: "BUILD CONFIDENCE",   bg: "bg-orange-500" },
  { emoji: "🎮", label: "LEARN THROUGH PLAY", bg: "bg-[var(--nimi-green)]"  },
];

export default function HomeFooter() {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  return (
    <footer className="bg-gray-900 text-white">

      {/* Main body */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-5">

        {/* Brand row */}
        <div className="flex items-center gap-4">
          <Image src={assets.nimiCircle} alt="NIMI" width={48} height={48}
            className="rounded-full border-2 border-yellow-300 shadow-lg" />
          <div className="text-center">
            <p className="font-black text-2xl tracking-widest leading-none bg-gradient-to-r from-pink-300 via-purple-200 to-cyan-300 bg-clip-text text-transparent drop-shadow">
              NIMIPIKO
            </p>
            <p className="text-gray-400 text-[11px] font-semibold tracking-widest mt-1 uppercase">
              Where Stories Come to Life
            </p>
          </div>
          <Image src={assets.pikoCircle} alt="PIKO" width={48} height={48}
            className="rounded-full border-2 border-blue-300 shadow-lg" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="flex-1 h-px bg-[var(--nimi-green)]" />
          <span className="text-yellow-400 text-sm">✦</span>
          <div className="flex-1 h-px bg-[var(--nimi-green)]" />
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-2">
          {TRUST_BADGES.map(b => (
            <div key={b.label}
              className={`${b.bg} flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black tracking-wide shadow-md`}>
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
        {/* Social links */}
        <div className="flex items-center gap-5">
          {SOCIAL_LINKS.map(({ Icon, href, label }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="w-9 h-9 rounded-full bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] flex items-center justify-center transition-colors shadow-md"
            >
              <Icon size={16} className="text-white" strokeWidth={1.8} />
            </Link>
          ))}
        </div>

      </div>

      {/* Copyright strip */}
      <div className="border-t border-gray-700 bg-gray-800 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-400 font-semibold">
          <span>© {new Date().getFullYear()} Nimipiko Studio LTD. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
