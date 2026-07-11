"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION, EASE } from "@/lib/design-system/motion";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

const NAV_LINKS = [
  { label: "Home",       href: "#hero",       active: true  },
  { label: "Stories",    href: "#stories",    active: false },
  { label: "Activities", href: "#activities", active: false },
  { label: "Community",  href: "#community",  active: false },
  { label: "Schools",    href: "#schools",    active: false },
  { label: "About",      href: "#about",      active: false },
];

function Logo() {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  return (
    <Link href="/" className="shrink-0 mr-auto">
      <img src={assets.nimiLogo} alt="NIMIPIKO — Grow With Every Story" className="h-28 w-auto sm:h-32"  loading="lazy" />
    </Link>
  );
}

export default function Navigation() {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [scrolled, setScrolled]  = useState(false);

  // Switch from transparent → opaque once the user scrolls past the
  // top portion of the hero, so the bar stays legible over every section.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the full-screen mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ── NAV BAR ────────────────────────────────────────────────────────
          fixed (not sticky) so the Hero's artwork starts at y=0 and the
          bar floats transparently on top of it.  Once the user scrolls
          past ~60 px the bar becomes solid-white so it stays legible
          over every section below the hero.
      ────────────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-start gap-3 px-4 sm:px-6 py-2">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 mt-4">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className={`font-nunito font-bold text-[14px] transition-colors pb-0.5 ${
                  link.active
                    ? "text-gray-900 border-b-2 border-nimi-green"
                    : "text-gray-700 hover:text-gray-900 border-b-2 border-transparent"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0 mt-4">
            <Link
              href="/loginpage"
              className="font-baloo font-black text-gray-800 text-[13px] px-5 py-2 rounded-full bg-white/90 border border-gray-200 hover:bg-white transition-colors shadow-sm"
            >
              Log In
            </Link>
            <Link
              href="/signuppage"
              className="font-baloo font-black text-white text-[13px] px-5 py-2 rounded-full bg-nimi-green shadow-md hover:brightness-105 transition"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center bg-white/90 border border-gray-200 shrink-0 active:scale-90 transition-transform mt-3"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* ── MOBILE FULL-SCREEN DRAWER ───────────────────────────────────────
          Kept OUTSIDE <header> to avoid Chromium's backdrop-filter
          containing-block bug (see earlier comment in git history).
      ────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE.enter }}
            className="fixed inset-0 z-50 bg-white md:hidden flex flex-col"
          >
            {/* Top bar */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-2 border-b border-gray-100 shrink-0">
              <Logo />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-200 shrink-0 active:scale-90 transition-transform"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 flex flex-col items-center justify-center gap-1 px-6 overflow-y-auto">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: DURATION.base, ease: EASE.enter }}
                  className="w-full text-center"
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block font-baloo font-black text-[24px] py-3 active:scale-95 transition-transform ${
                      link.active ? "text-nimi-green" : "text-gray-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Bottom CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + NAV_LINKS.length * 0.05, duration: DURATION.base, ease: EASE.enter }}
              className="flex flex-col gap-3 px-6 pb-10 shrink-0"
            >
              <Link
                href="/loginpage"
                onClick={() => setMenuOpen(false)}
                className="font-baloo font-black text-gray-700 text-[15px] text-center px-4 py-3 rounded-full border border-gray-200"
              >
                Log In
              </Link>
              <Link
                href="/signuppage"
                onClick={() => setMenuOpen(false)}
                className="font-baloo font-black text-white text-[15px] text-center px-4 py-3 rounded-full bg-nimi-green shadow-md"
              >
                Get Started
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
