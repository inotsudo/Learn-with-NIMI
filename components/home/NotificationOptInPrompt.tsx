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

  // Hide once subscribed
  useEffect(() => {
    if (push.isSubscribed && visible) setVisible(false);
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
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-20 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-[340px] z-50"
        >
          <div className="bg-[var(--ds-surface-card)] rounded-2xl shadow-2xl border border-[var(--ds-border-primary)] overflow-hidden">
            {/* Accent strip */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842,#C9A84C)" }} />

            <div className="p-4 flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)" }}>
                <Bell className="w-5 h-5" style={{ color: "var(--airways-gold-text, #E8BC56)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-baloo font-black text-[var(--ds-text-primary)] text-mbase leading-snug">
                  Keep {childName}&apos;s streak going 🔥
                </p>
                <p className="font-nunito text-[var(--ds-text-secondary)] text-xs mt-0.5 leading-relaxed">
                  Get a daily nudge if {childName} hasn&apos;t practiced yet — so you never miss a day.
                </p>
              </div>
              <button onClick={dismiss} className="p-1 text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)] shrink-0 -mr-1 -mt-1" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={enable}
                disabled={push.loading}
                className="flex-1 font-baloo font-black text-sml py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
