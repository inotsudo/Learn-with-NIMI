"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Pencil, Bell, Shield, ChevronRight, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStorageUrl } from "@/lib/queries";
import EditChildModal from "./EditChildModal";
import NotificationSettingsModal from "./NotificationSettingsModal";
import PrivacySettingsModal from "./PrivacySettingsModal";

type RowAction = "avatar" | "name" | "notifications" | "privacy";

const ROWS: {
  id: RowAction;
  icon: typeof ImagePlus;
  gradient: string;
  labelKey: string;
  descKey: string;
}[] = [
  { id: "avatar",        icon: ImagePlus, gradient: "from-violet-400 to-purple-500",  labelKey: "changeAvatarLabel",          descKey: "changeAvatarDesc" },
  { id: "name",          icon: Pencil,    gradient: "from-blue-400 to-sky-500",       labelKey: "editNameLabel",              descKey: "editNameDesc" },
  { id: "notifications", icon: Bell,      gradient: "from-orange-400 to-amber-500",   labelKey: "notificationSettingsLabel",  descKey: "notificationSettingsDesc" },
  { id: "privacy",       icon: Shield,    gradient: "from-emerald-400 to-teal-500",   labelKey: "privacySettingsLabel",       descKey: "privacySettingsDesc" },
];

interface Props {
  childId: string;
  childName: string;
  avatarUrl: string | null;
  onChildUpdated: (updates: { name: string; avatar_url: string }) => void;
}

export default function AccountSettingsCard({ childId, childName, avatarUrl, onChildUpdated }: Props) {
  const { t } = useLanguage();
  const [openModal, setOpenModal] = useState<RowAction | null>(null);

  const avatarSrc = avatarUrl ? getStorageUrl(avatarUrl) : null;

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card overflow-hidden" style={{ borderRadius: 'var(--leaf-r)' }}>
      {/* Child identity header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-ds-border bg-gradient-to-r from-[var(--ds-brand-subtle)] to-transparent">
        <div className="relative shrink-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={childName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] flex items-center justify-center border-2 border-white shadow-md">
              <User size={24} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setOpenModal("avatar")}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-ds-border rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition"
          >
            <ImagePlus size={10} className="text-ds-muted" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-baloo font-black text-ds-text text-[18px] leading-tight truncate">{childName}</p>
          <p className="text-ds-muted text-[11px] mt-0.5">{t("accountSettingsTitle")}</p>
        </div>
      </div>

      {/* Action rows */}
      <div className="divide-y divide-gray-100">
        {ROWS.map((row, i) => (
          <motion.button
            key={row.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setOpenModal(row.id)}
            className="flex items-center gap-4 px-5 py-3.5 w-full text-left hover:bg-gray-50 transition group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${row.gradient} flex items-center justify-center shadow-sm shrink-0`}>
              <row.icon size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[13px] text-ds-text leading-tight">{t(row.labelKey)}</p>
              <p className="text-[11px] text-ds-muted mt-0.5">{t(row.descKey)}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-ds-muted transition-transform group-hover:translate-x-0.5 shrink-0" />
          </motion.button>
        ))}
      </div>

      {/* Modals */}
      {(openModal === "avatar" || openModal === "name") && (
        <EditChildModal
          childId={childId}
          initialName={childName}
          initialAvatar={avatarUrl}
          onSaved={updates => { onChildUpdated(updates); setOpenModal(null); }}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "notifications" && (
        <NotificationSettingsModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === "privacy" && (
        <PrivacySettingsModal onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
