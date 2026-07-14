"use client";

import { useEffect, useState } from "react";
import { Lock, Printer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, type AchievementItem, type AchievementTier } from "@/app/_achievementData";
import { generateCertificateDataUrl } from "@/lib/certificateImage";
import BadgeRenderer from "./BadgeRenderer";

function printCertificate() { window.print(); }

/* ── Story badge JPEG — falls back to BadgeRenderer if image not found ── */
function StoryBadgeImage({
  src,
  title,
  fallback,
}: {
  src: string;
  title: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={title}
      onError={() => setFailed(true)}
      className="w-40 h-40 object-contain drop-shadow-lg"
    />
  );
}

interface Props {
  item: AchievementItem;
  earnedAt: string | null;
  childName: string;
}

const TIER_STYLES: Record<AchievementTier, { border: string; text: string }> = {
  languageExplorer: { border: "border-amber-300", text: "text-amber-600" },
  explorer:         { border: "border-green-400",  text: "text-gray-500"  },
  categoryMaster:   { border: "border-blue-300",   text: "text-blue-600"  },
};

/* ── Certificate display: loads the admin template, stamps the name ── */
function TemplateCertificate({ childName, language }: { childName: string; language: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateCertificateDataUrl(childName, language).then(url => {
      setDataUrl(url);
      setLoading(false);
    });
  }, [childName, language]);

  if (loading) {
    return (
      <div className="w-full aspect-[3/4] animate-pulse rounded-t-2xl"
        style={{ background: "linear-gradient(160deg,#FDF4DC,#F8EABC)" }} />
    );
  }

  if (!dataUrl) {
    /* No template configured — show a clean placeholder */
    return (
      <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-3 rounded-t-2xl"
        style={{ background: "linear-gradient(160deg,#FDF4DC,#F8EABC)" }}>
        <span className="text-5xl">🏆</span>
        <p className="font-baloo font-black text-amber-800 text-[15px] text-center px-4 leading-tight">
          {childName}
        </p>
        <p className="text-amber-600/70 text-[11px] font-semibold">Story Complete!</p>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`${childName}'s certificate`}
      className="w-full rounded-t-2xl object-cover"
    />
  );
}

export default function AchievementCard({ item, earnedAt, childName }: Props) {
  const { t } = useLanguage();
  const earned = earnedAt !== null;
  const style = TIER_STYLES[item.tier];

  const title = fillTemplate(t(item.titleKey), item.titleParams);
  const desc  = fillTemplate(t(item.descKey),  item.descParams);

  /* ── Earned certificate → real admin template ── */
  if (earned && item.type === "certificate") {
    return (
      <div className={`overflow-hidden shadow-ds-card border ${style.border} certificate-print-root`}
        style={{ borderRadius: "var(--leaf-r)" }}>
        <TemplateCertificate childName={childName} language={item.language ?? "en"} />
        <div className="bg-amber-50 px-3 py-2.5 text-center border-t border-amber-100">
          <p className="font-black text-xs uppercase text-amber-700 tracking-wide">{title}</p>
          <p className="text-gray-500 text-[10px] mt-0.5">{desc}</p>
          <button
            onClick={printCertificate}
            className="mt-2 flex items-center gap-1.5 mx-auto bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] px-3 py-1.5 rounded-full transition"
          >
            <Printer className="w-3 h-3" /> Print
          </button>
        </div>
      </div>
    );
  }

  /* ── Earned badge → story JPEG if available, else SVG BadgeRenderer ── */
  if (earned && item.type === "badge") {
    const badgeSrc = item.storySlug
      ? `/certs/${item.storySlug}-${item.language}.jpeg`
      : null;

    const badgeRenderer = (
      <BadgeRenderer
        title={title}
        subtitle={childName}
        language={(item.language ?? "en") as "en" | "fr" | "rw"}
        scale={0.56}
      />
    );

    return (
      <div className="overflow-hidden shadow-ds-card border border-blue-100 bg-white"
        style={{ borderRadius: "var(--leaf-r)" }}>
        <div className="flex justify-center pt-3 pb-1">
          {badgeSrc ? (
            <StoryBadgeImage src={badgeSrc} title={title} fallback={badgeRenderer} />
          ) : (
            badgeRenderer
          )}
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
    <div className="relative border-4 border-dashed shadow-ds-card p-5 text-center bg-gray-50 border-gray-200 opacity-70"
      style={{ borderRadius: "var(--leaf-r)" }}>
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
