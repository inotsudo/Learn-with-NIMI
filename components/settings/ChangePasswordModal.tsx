"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMotion } from "@/hooks/useMotion";

interface Props {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { t } = useLanguage();
  const m = useMotion();
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
          {...m.modalAnimation}
          className="bg-white border border-ds-border shadow-2xl w-full max-w-sm overflow-hidden" style={{ borderRadius: 'var(--leaf-r-lg)' }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--nimi-green)' }}>
            <p className="text-white font-black text-lg tracking-wide">{t("changePasswordModalTitle")}</p>
            <button onClick={onClose}
              aria-label="Close"
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
              className="w-full border border-ds-border bg-ds-input leaf px-3 py-2 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
            />
            <input
              type="password"
              placeholder={t("confirmNewPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              disabled={saving || success}
              className="w-full border border-ds-border bg-ds-input leaf px-3 py-2 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
            />

            {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}
            {success && <p className="text-[var(--ds-brand-primary)] text-xs font-semibold">{t("passwordUpdatedMsg")}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || success || !password || !confirmPassword}
                className="flex-1 text-white font-black py-2.5 text-sm transition disabled:opacity-60"
                style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}
              >
                {saving ? t("savingLabel") : t("updatePasswordBtn")}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 border border-ds-border text-ds-text font-black py-2.5 text-sm hover:bg-gray-50 transition disabled:opacity-60"
                style={{ borderRadius: 'var(--leaf-r-sm)' }}
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
