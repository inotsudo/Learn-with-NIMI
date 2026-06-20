"use client";

import { useState } from "react";
import { ImagePlus, Pencil, Bell, Shield, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import EditChildModal from "./EditChildModal";
import NotificationSettingsModal from "./NotificationSettingsModal";
import PrivacySettingsModal from "./PrivacySettingsModal";

type RowAction = "avatar" | "name" | "notifications" | "privacy";

const ROWS: { id: RowAction; icon: typeof ImagePlus; bg: string; color: string; labelKey: string }[] = [
  { id: "avatar", icon: ImagePlus, bg: "bg-purple-400/20", color: "text-purple-200", labelKey: "changeAvatarLabel" },
  { id: "name", icon: Pencil, bg: "bg-blue-400/20", color: "text-blue-200", labelKey: "editNameLabel" },
  { id: "notifications", icon: Bell, bg: "bg-orange-400/20", color: "text-orange-200", labelKey: "notificationSettingsLabel" },
  { id: "privacy", icon: Shield, bg: "bg-green-400/20", color: "text-green-200", labelKey: "privacySettingsLabel" },
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

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
      <h3 className="font-black text-white mb-2">{t("accountSettingsTitle")}</h3>
      {ROWS.map(row => (
        <button
          key={row.id}
          onClick={() => setOpenModal(row.id)}
          className="flex items-center gap-3 py-3 border-b border-white/15 last:border-0 w-full text-left hover:bg-white/5 rounded-lg transition px-1 -mx-1"
        >
          <div className={`w-9 h-9 ${row.bg} rounded-full flex items-center justify-center shrink-0`}>
            <row.icon className={`w-4 h-4 ${row.color}`} />
          </div>
          <span className="font-bold text-sm text-purple-100 flex-1">{t(row.labelKey)}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      ))}

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
