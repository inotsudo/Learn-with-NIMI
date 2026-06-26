"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  onClose: () => void;
}

export default function NotificationSettingsModal({ onClose }: Props) {
  const { t } = useLanguage();
  const { supported, isSubscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className="bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-4 flex items-center justify-between">
            <p className="text-white font-black text-lg tracking-wide">{t("notificationSettingsModalTitle")}</p>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4 text-center">
            {!supported ? (
              <p className="theme-text text-sm">{t("pushNotSupportedLabel")}</p>
            ) : (
              <>
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                  isSubscribed ? "bg-green-400/20 text-green-200" : "bg-white/10 theme-text-muted"
                }`}>
                  {isSubscribed ? <Bell className="w-7 h-7" /> : <BellOff className="w-7 h-7" />}
                </div>
                <p className="theme-text text-sm">
                  {isSubscribed ? t("pushEnabledDesc") : t("pushDisabledDesc")}
                </p>
                {error && <p className="text-red-300 text-xs font-semibold">{error}</p>}
                <button
                  onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
                  disabled={loading}
                  className={`w-full font-black rounded-full py-2.5 text-sm transition disabled:opacity-60 ${
                    isSubscribed
                      ? "border-2 border-white/20 theme-text hover:bg-white/10"
                      : "theme-accent text-white hover:theme-accent"
                  }`}
                >
                  {loading ? t("savingLabel") : isSubscribed ? t("disablePushBtn") : t("enablePushBtn")}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
