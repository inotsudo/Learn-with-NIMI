"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const DISMISS_KEY = "nimi_install_dismissed_at";
const DISMISS_DAYS = 14;
const SHOW_AFTER_MS = 120_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function recentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const at = localStorage.getItem(DISMISS_KEY);
  if (!at) return false;
  const elapsedDays = (Date.now() - Number(at)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    setIos(isIOS());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const timer = setTimeout(() => {
      if (isStandalone() || recentlyDismissed()) return;
      setVisible(true);
    }, SHOW_AFTER_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  if (!visible || (!deferredEvent && !ios)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-2xl p-4 flex flex-col gap-2">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 theme-text-muted hover:text-white transition"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2">
        <Download className="w-5 h-5 theme-text" />
        <p className="font-black text-white text-sm">{t("installPromptTitle")}</p>
      </div>
      <p className="theme-text text-xs leading-relaxed">{t("installPromptBody")}</p>
      {ios ? (
        <p className="theme-text text-xs font-semibold bg-white/10 rounded-lg px-3 py-2 mt-1">
          {t("iosInstallInstructions")}
        </p>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={install}
            className="flex-1 theme-accent hover:theme-accent text-white font-black text-xs rounded-full py-2 shadow transition"
          >
            {t("installBtn")}
          </button>
          <button
            onClick={dismiss}
            className="theme-text-muted hover:text-white text-xs font-semibold px-2"
          >
            {t("installLaterBtn")}
          </button>
        </div>
      )}
    </div>
  );
}
