"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ChildCosmetics } from "@/lib/queries";
import { SHOP_ITEM_MAP } from "@/components/shop/_shopData";
import ChildAvatar from "@/components/avatar/ChildAvatar";

interface Props {
  childName: string;
  avatarUrl?: string | null;
  nimiSrc: string;
  pikoSrc?: string;
  cosmetics: ChildCosmetics;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}

const EMPTY_COSMETICS: ChildCosmetics = { nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null };

export default function ChildIdentityCard({
  childName, avatarUrl, nimiSrc, pikoSrc, cosmetics = EMPTY_COSMETICS, subtitle, className = "", compact = false,
}: Props) {
  const { t } = useLanguage();

  const frame = cosmetics.frame ? SHOP_ITEM_MAP[cosmetics.frame] : null;
  const nimiOutfit = cosmetics.nimi_outfit ? SHOP_ITEM_MAP[cosmetics.nimi_outfit] : null;
  const pikoOutfit = cosmetics.piko_outfit ? SHOP_ITEM_MAP[cosmetics.piko_outfit] : null;
  const titleBadge = cosmetics.title_badge ? SHOP_ITEM_MAP[cosmetics.title_badge] : null;

  const cardBg = frame?.frameBg ?? "bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white";
  const cardRing = frame?.frameRing ?? "";

  const avatarSize = compact ? 48 : 64;

  return (
    <div className={`relative overflow-hidden border p-4 flex items-center gap-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] transition-all duration-300 ${cardRing} ${cardBg} ${className}`}
      style={{ borderRadius: 'var(--leaf-r)', borderColor: frame ? undefined : 'var(--ds-border-primary)' }}>

      {/* Top accent bar */}
      {!frame && (
        <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      )}

      {/* Left: child's avatar OR NIMI mascot */}
      <div className="shrink-0 flex items-end gap-1.5">
        {avatarUrl ? (
          /* Child's own avatar — prominent */
          <motion.div
            className={`rounded-full overflow-hidden ring-2 ring-[var(--ds-brand-primary)]/40 shadow-md bg-white/30 flex items-center justify-center ${compact ? "w-12 h-12" : "w-16 h-16"}`}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChildAvatar avatarUrl={avatarUrl} name={childName} size={avatarSize} className={compact ? "" : "translate-y-[4px]"} />
          </motion.div>
        ) : (
          /* Fallback: NIMI mascot */
          <div className="relative">
            <motion.img
              src={nimiSrc}
              alt="NIMI"
              className={`rounded-full object-cover border-2 shadow shrink-0 ${compact ? "w-12 h-12" : "w-16 h-16"}`}
              style={{ borderColor: nimiOutfit ? undefined : 'var(--nimi-green)' }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {nimiOutfit && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 text-xl leading-none drop-shadow-lg"
                title={t(nimiOutfit.nameKey)}
              >
                {nimiOutfit.emoji}
              </motion.span>
            )}
          </div>
        )}

        {/* NIMI mini badge when child avatar is shown */}
        {avatarUrl && !compact && (
          <motion.div
            className="relative -ml-3 self-end mb-0.5"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          >
            <img src={nimiSrc} alt="NIMI" className="w-9 h-9 rounded-full object-cover border-2 shadow opacity-90"
              style={{ borderColor: nimiOutfit ? undefined : 'var(--nimi-green)' }}  loading="lazy" />
            {nimiOutfit && (
              <span className="absolute -bottom-1 -right-1 text-base leading-none drop-shadow-lg">{nimiOutfit.emoji}</span>
            )}
          </motion.div>
        )}

        {/* PIKO mini badge (only when no child avatar, not compact) */}
        {!avatarUrl && pikoSrc && !compact && (
          <div className="relative">
            <motion.img
              src={pikoSrc}
              alt="PIKO"
              className="w-11 h-11 rounded-full object-cover border-2 shadow shrink-0 -ml-2 opacity-80"
              style={{ borderColor: pikoOutfit ? undefined : 'var(--ds-brand-primary)' }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            {pikoOutfit && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 text-base leading-none drop-shadow-lg"
                title={t(pikoOutfit.nameKey)}
              >
                {pikoOutfit.emoji}
              </motion.span>
            )}
          </div>
        )}
      </div>

      {/* Text area */}
      <div className="min-w-0">
        <p className={`font-black text-ds-text leading-tight ${compact ? "text-base" : "text-lg"}`}>
          {t("progressGreatJob").replace("{name}", childName)}
        </p>

        {/* Title badge */}
        {titleBadge && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full mt-1 ${titleBadge.titleColor ?? "bg-gray-100 text-gray-600"}`}
          >
            {titleBadge.emoji} {t(titleBadge.nameKey)}
          </motion.span>
        )}

        {subtitle && !titleBadge && (
          <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
        )}
        {subtitle && titleBadge && (
          <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
