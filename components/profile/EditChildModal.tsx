"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { updateChild } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import AvatarBuilder from "@/components/avatar/AvatarBuilder";
import { parseAvatar, serializeAvatar, DEFAULT_AVATAR, type AvatarConfig } from "@/lib/avatarConfig";

interface Props {
  childId: string;
  initialName: string;
  initialAvatar: string | null;
  onSaved: (updates: { name: string; avatar_url: string }) => void;
  onClose: () => void;
}

export default function EditChildModal({ childId, initialName, initialAvatar, onSaved, onClose }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const [avatarCfg, setAvatarCfg] = useState<AvatarConfig>(
    parseAvatar(initialAvatar) ?? DEFAULT_AVATAR
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const avatar_url = serializeAvatar(avatarCfg);
    await updateChild(childId, { name: name.trim(), avatar_url });
    setSaving(false);
    onSaved({ name: name.trim(), avatar_url });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="bg-ds-card border border-ds-border shadow-[0_24px_64px_rgba(0,0,0,0.25)] w-full max-w-2xl overflow-hidden my-4"
          style={{ borderRadius: 'var(--leaf-r-lg)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--nimi-green)' }}>
            <div>
              <p className="text-white font-black text-lg tracking-wide">{t("editProfileModalTitle")}</p>
              <p className="text-white/75 text-[12px]">Design your explorer!</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar builder */}
          <div className="p-4">
            <AvatarBuilder initial={avatarCfg} onChange={setAvatarCfg} />
          </div>

          {/* Name + actions */}
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-ds-text uppercase tracking-wide block mb-1">
                {t("childNameLabel")}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                maxLength={30}
                className="w-full border border-ds-border bg-ds-input rounded-xl px-3 py-2.5 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 text-white font-black py-3 text-sm transition disabled:opacity-60 rounded-xl"
                style={{ backgroundColor: 'var(--nimi-green)' }}
              >
                {saving ? t("savingLabel") : t("saveBtn")}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 bg-white border border-ds-border text-ds-text font-black py-3 text-sm hover:bg-gray-50 transition disabled:opacity-60 rounded-xl"
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
