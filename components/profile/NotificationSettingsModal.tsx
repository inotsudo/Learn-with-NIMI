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
          className="bg-white border border-ds-border shadow-2xl w-full max-w-sm overflow-hidden" style={{ borderRadius: 'var(--leaf-r-lg)' }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--nimi-green)' }}>
            <p className="text-white font-black text-lg tracking-wide">{t("notificationSettingsModalTitle")}</p>
            <button onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4 text-center">
            {!supported ? (
              <p className="text-ds-text text-sm">{t("pushNotSupportedLabel")}</p>
            ) : (
              <>
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                  isSubscribed ? "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]" : "bg-gray-100 text-gray-400"
                }`}>
                  {isSubscribed ? <Bell className="w-7 h-7" /> : <BellOff className="w-7 h-7" />}
                </div>
                <p className="text-ds-text text-sm">
                  {isSubscribed ? t("pushEnabledDesc") : t("pushDisabledDesc")}
                </p>
                {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}
                <button
                  onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
                  disabled={loading}
                  className={`w-full font-black py-2.5 text-sm transition disabled:opacity-60 ${
                    isSubscribed
                      ? "border border-ds-border text-ds-text hover:bg-gray-50"
                      : "text-white"
                  }`}
                  style={{ borderRadius: 'var(--leaf-r-sm)', ...(!isSubscribed ? { backgroundColor: 'var(--nimi-green)' } : {}) }}
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
