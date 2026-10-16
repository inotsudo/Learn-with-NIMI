"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const STORAGE_KEY = "nimipiko_cookie_consent";
const CHANGE_EVENT = "nimipiko_cookie_consent_change";

// Consent lives in localStorage. useSyncExternalStore lets the server render the
// consented/hidden state while the client reads the real stored value on
// hydration — no hydration-mismatch error, no post-mount flash. Same key and
// persistence as before; safe in private-browsing (throws → treated as consented).
function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}
function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return "1"; // private browsing → treat as consented (hide banner)
  }
}
function getServerSnapshot() {
  return "1"; // server always renders hidden; client reveals after hydration
}

export default function CookieConsentBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = consent !== "1";

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    // Notify this tab (and any external-store subscribers) to re-read the value.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-max px-3 pb-[calc(env(safe-area-inset-bottom,0px)+104px)] lg:inset-x-auto lg:right-0 lg:bottom-0 lg:px-4 lg:pb-4"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-2xl lg:mx-0 lg:ml-auto lg:px-5 lg:py-4"
        style={{ pointerEvents: "auto" }}
      >
        <span className="shrink-0 text-xl" aria-hidden>🍪</span>
        <p className="min-w-0 flex-1 font-nunito text-[13px] leading-snug text-gray-200">
          We use essential cookies to keep NIMIPIKO running smoothly and remember your preferences.
          No ads, no tracking.{" "}
          <Link href="/privacy" className="text-[var(--ds-text-brand)] underline hover:text-[var(--ds-text-primary)] transition-colors">
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-xl bg-[var(--nimi-green,#15803D)] px-4 py-2.5 font-baloo text-[13px] font-bold text-[var(--ds-nav-bg,#fff)] transition-colors hover:bg-[var(--ds-brand-primary,#15803d)] active:bg-[var(--ds-brand-hover,#166534)]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
