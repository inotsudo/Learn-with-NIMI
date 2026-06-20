"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getParent } from "@/lib/queries";
import ChangePasswordModal from "./ChangePasswordModal";
import DeleteAccountModal from "./DeleteAccountModal";

export default function SettingsAccountCard() {
  const { t } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    void getParent().then((p) => setEmail(p?.email ?? null));
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("accountTitle")}</h3>

      <button
        onClick={() => setShowPasswordModal(true)}
        className="flex items-center gap-3 py-3 border-b border-white/15 w-full text-left"
      >
        <div className="w-9 h-9 bg-blue-400/20 rounded-full flex items-center justify-center shrink-0">
          <KeyRound className="w-4 h-4 text-blue-200" />
        </div>
        <span className="font-bold text-sm flex-1 text-purple-100">{t("changePasswordLabel")}</span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </button>

      <button
        onClick={() => email && setShowDeleteModal(true)}
        disabled={!email}
        className="flex items-center gap-3 py-3 w-full text-left disabled:opacity-60"
      >
        <div className="w-9 h-9 bg-red-400/20 rounded-full flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4 text-red-300" />
        </div>
        <span className="font-bold text-sm flex-1 text-red-400">{t("deleteAccountLabel")}</span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </button>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal && email && <DeleteAccountModal email={email} onClose={() => setShowDeleteModal(false)} />}
    </div>
  );
}
