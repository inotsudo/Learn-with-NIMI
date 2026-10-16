"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Props {
  childId: string;
  childName: string;
}

const PROMPT_KEY = (id: string) => `nimipiko_push_prompt_${id}`;

export default function NotificationOptInPrompt({ childId, childName }: Props) {
  const push = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show only if:
    // • push is supported and not already granted/denied
    // • parent hasn't dismissed or subscribed before
    if (!push.supported) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(PROMPT_KEY(childId)) === "dismissed") return;

    // Delay 4 s so the page finishes rendering before we nudge
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, [push.supported, childId]);

  // Hide once subscribed (deferred so the effect body itself stays pure —
  // lint rule react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!push.isSubscribed || !visible) return;
    const t = setTimeout(() => setVisible(false), 0);
    return () => clearTimeout(t);
  }, [push.isSubscribed, visible]);

  function dismiss() {
    localStorage.setItem(PROMPT_KEY(childId), "dismissed");
    setDismissed(true);
    setVisible(false);
  }

  async function enable() {
    await push.subscribe();
    // If granted the card will close via the isSubscribed effect above.
    // If denied, treat as dismiss so we don't re-show.
    if (Notification.permission !== "granted") {
      dismiss();
    }
  }

  if (dismissed || push.isSubscribed) return null;

  return (
    <AnimatePresence>
      {visible && (
        /* Desktop: floating card above the scene (document height unaffected).
           Mobile/tablet keeps the in-flow banner below the dashboard so the
           bottom navigation always clears (pb-[208px]). */
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          data-testid="notification-optin-prompt"
          className="mx-auto w-full max-w-[1248px] px-2 pt-3 pb-[208px] sm:px-3 lg:px-4 lg:pb-4 lg:fixed lg:top-[72px] lg:right-6 lg:left-auto lg:z-40 lg:mx-0 lg:w-[340px] lg:max-w-[340px] lg:px-0 lg:pt-0 lg:pb-0"
        >
          <div role="region" aria-label="Daily reminder opt-in"
            className="relative overflow-hidden rounded-2xl bg-[var(--ds-surface-card)] shadow-lg border border-[var(--ds-border-primary)]">
            {/* Accent strip */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842,#C9A84C)" }} />

            <button onClick={dismiss}
              className="absolute right-2 top-2 p-1 text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)]"
              aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)" }}>
                  <Bell className="w-5 h-5" style={{ color: "var(--airways-gold-text, #E8BC56)" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-baloo font-black text-[var(--ds-text-primary)] text-mbase leading-snug">
                    Keep {childName}&apos;s streak going 🔥
                  </p>
                  <p className="font-nunito text-[var(--ds-text-secondary)] text-xs mt-0.5 leading-relaxed">
                    Get a daily nudge if {childName} hasn&apos;t practiced yet — so you never miss a day.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 pl-[52px] sm:pl-0">
                <button
                  onClick={enable}
                  disabled={push.loading}
                  className="flex-1 font-baloo font-black text-sml py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}
                >
                  {push.loading ? "Enabling…" : "Enable reminders"}
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 font-nunito font-bold text-sml text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)] transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
