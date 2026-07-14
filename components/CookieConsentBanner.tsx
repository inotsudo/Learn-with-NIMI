"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "nimipiko_cookie_consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Private-browsing environments may throw — silently skip
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="max-w-2xl mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-2xl shrink-0" aria-hidden>🍪</span>
        <p className="font-nunito text-[13px] text-gray-200 flex-1 leading-relaxed">
          We use essential cookies to keep NIMIPIKO running smoothly and remember your preferences.
          No ads, no tracking.{" "}
          <Link href="/privacy" className="text-green-400 underline hover:text-green-300 transition-colors">
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 bg-[var(--nimi-green,#15803D)] hover:bg-[var(--ds-brand-primary,#15803d)] active:bg-[var(--ds-brand-hover,#166534)] text-white font-baloo font-bold text-[13px] px-5 py-2 rounded-xl transition-colors whitespace-nowrap"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
