"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    if (password.length < 6) return setError(t("passwordTooShortMsg"));
    if (password !== confirmPassword) return setError(t("passwordMismatchMsg"));

    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(t("passwordUpdateFailedMsg"));
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="theme-darker backdrop-blur-xl border-2 border-white/15 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
            <p className="text-white font-black text-lg tracking-wide">{t("changePasswordModalTitle")}</p>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-3">
            <input
              type="password"
              placeholder={t("newPasswordPlaceholder")}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              disabled={saving || success}
              className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:theme-border-strong transition placeholder:text-white/40"
            />
            <input
              type="password"
              placeholder={t("confirmNewPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              disabled={saving || success}
              className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:theme-border-strong transition placeholder:text-white/40"
            />

            {error && <p className="text-red-300 text-xs font-semibold">{error}</p>}
            {success && <p className="text-green-300 text-xs font-semibold">{t("passwordUpdatedMsg")}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || success || !password || !confirmPassword}
                className="flex-1 theme-accent text-white font-black rounded-full py-2.5 text-sm hover:theme-accent transition disabled:opacity-60"
              >
                {saving ? t("savingLabel") : t("updatePasswordBtn")}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 border-2 border-white/20 theme-text font-black rounded-full py-2.5 text-sm hover:bg-white/10 transition disabled:opacity-60"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
