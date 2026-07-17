"use client";

import { useEffect, useState } from "react";
import { Lock, Printer, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, type AchievementItem, type AchievementTier } from "@/app/_achievementData";
import { generateCertificateDataUrl } from "@/lib/certificateImage";
import BadgeRenderer from "./BadgeRenderer";

function printCertificate() { window.print(); }

async function nativeShare(opts: {
  files?: File[];
  title: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    if (opts.files && navigator.canShare?.({ files: opts.files })) {
      await navigator.share({ files: opts.files, title: opts.title, text: opts.text });
      return true;
    }
    await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
    return true;
  } catch {
    return false;
  }
}

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
function TemplateCertificate({
  childName,
  language,
  onDataUrl,
}: {
  childName: string;
  language: string;
  onDataUrl?: (url: string | null) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateCertificateDataUrl(childName, language).then(url => {
      setDataUrl(url);
      setLoading(false);
      onDataUrl?.(url);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childName, language]);

  if (loading) {
    return (
      <div className="w-full aspect-[3/4] animate-pulse rounded-t-2xl"
        style={{ background: "linear-gradient(160deg,#FDF4DC,#F8EABC)" }} />
    );
  }

  if (!dataUrl) {
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

/* ── Earned certificate card with share capability ── */
function EarnedCertificateCard({ item, childName }: { item: AchievementItem; childName: string }) {
  const { t } = useLanguage();
  const [certDataUrl, setCertDataUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const style = TIER_STYLES[item.tier];
  const title = fillTemplate(t(item.titleKey), item.titleParams);
  const desc  = fillTemplate(t(item.descKey),  item.descParams);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function handleShare() {
    setSharing(true);
    try {
      const shareText = `🎓 ${childName} just earned a NIMIPIKO Language Certificate! nimipiko.com`;

      if (certDataUrl) {
        const res = await fetch(certDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${childName.replace(/ /g, "_")}_certificate.jpg`, { type: "image/jpeg" });

        const shared = await nativeShare({
          files: [file],
          title: `${childName}'s NIMIPIKO Certificate`,
          text: shareText,
          url: "https://nimipiko.com",
        });
        if (shared) return;
      } else {
        const shared = await nativeShare({
          title: `${childName}'s NIMIPIKO Certificate`,
          text: shareText,
          url: "https://nimipiko.com",
        });
        if (shared) return;
      }

      // WhatsApp fallback
      const waText = encodeURIComponent(`🎓 ${childName} just earned a NIMIPIKO Language Certificate! nimipiko.com`);
      window.open(`https://wa.me/?text=${waText}`, "_blank");
      showToast("Opening WhatsApp…");
    } catch (err) {
      // Clipboard last resort
      try {
        await navigator.clipboard.writeText(`🎓 ${childName} just earned a NIMIPIKO Language Certificate! nimipiko.com`);
        showToast("Copied to clipboard!");
      } catch {
        console.error("[EarnedCertificateCard] share failed", err);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className={`overflow-hidden shadow-ds-card border ${style.border} certificate-print-root relative`}
      style={{ borderRadius: "var(--leaf-r)" }}>
      <TemplateCertificate childName={childName} language={item.language ?? "en"} onDataUrl={setCertDataUrl} />
      <div className="bg-amber-50 px-3 py-2.5 text-center border-t border-amber-100">
        <p className="font-black text-xs uppercase text-amber-700 tracking-wide">{title}</p>
        <p className="text-gray-500 text-[10px] mt-0.5">{desc}</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            onClick={printCertificate}
            className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] px-3 py-1.5 rounded-full transition"
          >
            <Printer className="w-3 h-3" /> Print
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-[11px] px-3 py-1.5 rounded-full transition disabled:opacity-60"
          >
            <Share2 className="w-3 h-3" />
            {sharing ? "…" : "Share"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Badge share button ── */
function ShareBadgeButton({ childName, title, badgeSrc }: { childName: string; title: string; badgeSrc: string | null }) {
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function handleShare() {
    setSharing(true);
    try {
      const shareText = `🏅 ${childName} just earned the "${title}" badge on NIMIPIKO! nimipiko.com`;

      // Try to share the badge image if available
      if (badgeSrc) {
        try {
          const res = await fetch(badgeSrc);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], `${childName.replace(/ /g, "_")}_badge.jpg`, { type: blob.type });
            const shared = await nativeShare({ files: [file], title: `${childName}'s Badge`, text: shareText });
            if (shared) return;
          }
        } catch { /* fall through */ }
      }

      const shared = await nativeShare({ title: `${childName}'s Badge`, text: shareText, url: "https://nimipiko.com" });
      if (shared) return;

      // WhatsApp fallback
      const waText = encodeURIComponent(shareText);
      window.open(`https://wa.me/?text=${waText}`, "_blank");
      showToast("Opening WhatsApp…");
    } catch {
      try {
        await navigator.clipboard.writeText(`🏅 ${childName} just earned the "${title}" badge on NIMIPIKO! nimipiko.com`);
        showToast("Copied!");
      } catch { /* silent */ }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        disabled={sharing}
        className="flex items-center gap-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-[10px] px-2.5 py-1 rounded-full transition disabled:opacity-60 mx-auto mt-1"
      >
        <Share2 className="w-2.5 h-2.5" />
        {sharing ? "…" : "Share"}
      </button>
      {toast && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function AchievementCard({ item, earnedAt, childName }: Props) {
  const { t } = useLanguage();
  const earned = earnedAt !== null;
  const style = TIER_STYLES[item.tier];

  const title = fillTemplate(t(item.titleKey), item.titleParams);
  const desc  = fillTemplate(t(item.descKey),  item.descParams);

  /* ── Earned certificate → own sub-component (needs its own state) ── */
  if (earned && item.type === "certificate") {
    return <EarnedCertificateCard item={item} childName={childName} />;
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
          <ShareBadgeButton childName={childName} title={title} badgeSrc={badgeSrc} />
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
