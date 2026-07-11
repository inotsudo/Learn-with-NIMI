"use client";

import { Lock, Share2, Printer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, type AchievementItem, type AchievementTier } from "@/app/_achievementData";
import AnimatedCheckmark from "@/components/delight/AnimatedCheckmark";
import { CHECKMARK_SUCCESS } from "@/lib/design-system/delight";
import CertificateRenderer from "./CertificateRenderer";
import BadgeRenderer from "./BadgeRenderer";

function shareCertificate(childName: string, title: string) {
  const text = `🎉 ${childName} just earned the "${title}" certificate on NIMIPIKO! Check out this amazing educational app for kids 📚✨ → https://nimipiko.com`;
  if (typeof navigator !== "undefined" && navigator.share) {
    void navigator.share({ title: `${childName}'s NIMIPIKO Certificate`, text, url: "https://nimipiko.com" }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
}

function printCertificate() {
  window.print();
}

interface Props {
  item: AchievementItem;
  earnedAt: string | null;
  childName: string;
}

const TIER_STYLES: Record<AchievementTier, { border: string; iconBg: string; text: string }> = {
  languageExplorer: { border: "border-amber-300", iconBg: "bg-amber-500", text: "text-amber-600" },
  explorer:         { border: "border-green-400",  iconBg: "bg-[var(--nimi-green)]",  text: "text-gray-500"  },
  categoryMaster:   { border: "border-blue-300",   iconBg: "bg-blue-500",   text: "text-blue-600"  },
};

export default function AchievementCard({ item, earnedAt, childName }: Props) {
  const { t } = useLanguage();
  const earned = earnedAt !== null;
  const style = TIER_STYLES[item.tier];

  const title = fillTemplate(t(item.titleKey), item.titleParams);
  const desc  = fillTemplate(t(item.descKey),  item.descParams);

  /* ── Earned certificate → full CSS renderer ── */
  if (earned && item.type === "certificate") {
    return (
      <div className="overflow-hidden shadow-ds-card border border-amber-200 certificate-print-root" style={{ borderRadius: 'var(--leaf-r)' }}>
        <CertificateRenderer
          childName={childName}
          language={(item.language ?? "en") as "en" | "fr" | "rw"}
          scale={0.72}
        />
        <div className="bg-amber-50 px-3 py-2 text-center border-t border-amber-100">
          <p className="font-black text-xs uppercase text-amber-700 tracking-wide">{title}</p>
          <p className="text-gray-500 text-[10px] mt-0.5">{desc}</p>
          <div className="flex gap-2 justify-center mt-2">
            <button
              onClick={() => shareCertificate(childName, title)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-full transition"
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
            <button
              onClick={printCertificate}
              className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] px-3 py-1.5 rounded-full transition"
            >
              <Printer className="w-3 h-3" /> Print
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Earned badge → circular badge renderer ── */
  if (earned && item.type === "badge") {
    return (
      <div className="overflow-hidden shadow-ds-card border border-blue-100 bg-white" style={{ borderRadius: 'var(--leaf-r)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <BadgeRenderer
            title={title}
            subtitle={childName}
            language={(item.language ?? "en") as "en" | "fr" | "rw"}
            scale={0.56}
          />
        </div>
        <div className="px-3 pb-3 text-center">
          <p className={`font-black text-xs uppercase tracking-wide ${style.text}`}>{title}</p>
          <p className="text-gray-500 text-[10px] mt-0.5 px-1">{desc}</p>
        </div>
      </div>
    );
  }

  /* ── Locked card ── */
  return (
    <div className="relative border-4 border-dashed shadow-ds-card p-5 text-center bg-gray-50 border-gray-200 opacity-70" style={{ borderRadius: 'var(--leaf-r)' }}>
      <span className="absolute top-2 left-2 text-yellow-400 text-sm">⭐</span>
      <span className="absolute top-2 right-2 text-yellow-400 text-sm">⭐</span>

      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto shadow-sm">
        <Lock className="w-7 h-7 text-gray-400" />
      </div>

      <p className="font-black text-xs uppercase tracking-wide mt-3 text-gray-400">{title}</p>
      <p className="text-gray-400 font-bold text-sm mt-1">{t("certLockedMessage")}</p>
      <p className="text-gray-500 text-xs mt-1 px-1">{desc}</p>
    </div>
  );
}
