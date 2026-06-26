"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  email: string;
  onClose: () => void;
}

export default function DeleteAccountModal({ email, onClose }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmText.trim().toLowerCase() === email.trim().toLowerCase();

  const handleDelete = async () => {
    if (!matches || deleting) return;
    setError(null);
    setDeleting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDeleting(false);
      setError(t("deleteAccountFailedMsg"));
      return;
    }

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      setDeleting(false);
      setError(t("deleteAccountFailedMsg"));
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
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
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 flex items-center justify-between">
            <p className="text-white font-black text-lg tracking-wide">{t("deleteAccountModalTitle")}</p>
            <button onClick={onClose} disabled={deleting}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition disabled:opacity-60">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="flex gap-2 bg-red-500/15 border-2 border-red-400/30 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
              <p className="text-red-200 text-xs font-semibold leading-snug">{t("deleteAccountWarningBody")}</p>
            </div>

            <div>
              <p className="text-xs font-bold theme-text mb-1.5">
                {t("deleteAccountConfirmInstructions").replace("{email}", email)}
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => { setConfirmText(e.target.value); setError(null); }}
                placeholder={t("deleteAccountConfirmPlaceholder")}
                disabled={deleting}
                className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-red-300 transition placeholder:text-white/40"
              />
            </div>

            {error && <p className="text-red-300 text-xs font-semibold">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDelete}
                disabled={!matches || deleting}
                className="flex-1 bg-red-600 text-white font-black rounded-full py-2.5 text-sm hover:bg-red-700 transition disabled:opacity-40"
              >
                {deleting ? t("deletingAccountLabel") : t("deleteAccountBtn")}
              </button>
              <button
                onClick={onClose}
                disabled={deleting}
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
