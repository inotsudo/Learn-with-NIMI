"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  // In the airport world the Kit and hotspots live low in the scene, so the
  // notice sits at the top there; elsewhere it floats above the dock.
  const inWorld = usePathname() === "/home";

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    // Notify this tab (and any external-store subscribers) to re-read the value.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  if (!visible) return null;

  // Centred on every screen size, so it never covers the dock or the world's
  // corner controls (the intro's Skip button).
  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className={inWorld
        ? "fixed inset-x-0 top-0 z-max px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]"
        : "fixed inset-x-0 bottom-0 z-max px-3 pb-[calc(env(safe-area-inset-bottom,0px)+104px)] [@media(max-height:500px)]:pb-3"}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="mx-auto flex max-w-md items-center gap-3 rounded-[22px] px-4 py-3 lg:px-5 lg:py-4"
        style={{
          pointerEvents: "auto",
          color: "#FFF7E0",
          background: "linear-gradient(160deg, rgba(26,53,88,0.92) 0%, rgba(11,26,51,0.94) 60%, rgba(6,16,31,0.96) 100%)",
          border: "1px solid rgba(253,230,138,0.35)",
          boxShadow: "inset 0 1px 0 rgba(255,247,224,0.14), 0 24px 60px rgba(0,0,0,0.5)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <span className="shrink-0 text-xl" aria-hidden>🍪</span>
        <p className="min-w-0 flex-1 font-nunito text-[13px] font-semibold leading-snug text-[#FFF7E0]/80">
          We use essential cookies to keep NIMIPIKO running smoothly and remember your preferences.
          No ads, no tracking.{" "}
          <Link href="/privacy" className="text-[#E8BC56] underline transition-colors hover:text-[#FDE68A]">
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={accept}
          className="min-h-11 shrink-0 rounded-full px-5 font-baloo text-[14px] font-extrabold text-[#06101F] transition-transform active:translate-y-0.5"
          style={{
            background: "radial-gradient(130% 160% at 30% 0%, #FFF7E0 0%, #FDE68A 32%, #E8BC56 62%, #C9A84C 100%)",
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.7), 0 4px 0 #8A6A1E, 0 10px 20px rgba(0,0,0,0.4)",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
