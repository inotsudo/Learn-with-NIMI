"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { updateChild } from "@/lib/queries";
import { AVATARS } from "@/components/home/CreateChildModal";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [avatar, setAvatar] = useState(initialAvatar && AVATARS.includes(initialAvatar) ? initialAvatar : AVATARS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await updateChild(childId, { name: name.trim(), avatar_url: avatar });
    setSaving(false);
    onSaved({ name: name.trim(), avatar_url: avatar });
  };

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
            <p className="text-white font-black text-lg tracking-wide">{t("editProfileModalTitle")}</p>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div>
              <p className="text-xs font-bold theme-text uppercase tracking-wide mb-2">{t("chooseAvatarLabel")}</p>
              <div className="flex gap-2 flex-wrap">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition border-2 ${
                      avatar === a
                        ? "theme-border-strong theme-accent-muted scale-110 shadow"
                        : "border-transparent bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold theme-text uppercase tracking-wide block mb-1">
                {t("childNameLabel")}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                maxLength={30}
                className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:theme-border-strong transition placeholder:text-white/40"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 theme-accent text-white font-black rounded-full py-2.5 text-sm hover:theme-accent transition disabled:opacity-60"
              >
                {saving ? t("savingLabel") : t("saveBtn")}
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
