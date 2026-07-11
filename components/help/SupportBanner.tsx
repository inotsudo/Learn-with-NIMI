"use client";

import { Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

export default function SupportBanner() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  return (
    <div className="shadow-md p-5 text-white flex items-center justify-between gap-4 flex-wrap" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}>
      <div className="flex items-center gap-4">
        <img
          src={assets.nimiCircle}
          alt="NIMI"
          className="w-14 h-14 rounded-full object-cover border-4 border-white/30 shrink-0"
         loading="lazy" />
        <div>
          <h3 className="font-black text-lg">{t("stillNeedHelpTitle")}</h3>
          <p className="text-white/80 text-sm mt-0.5">{t("stillNeedHelpDesc")}</p>
        </div>
      </div>
      <a
        href="mailto:support@nimipiko.com"
        className="flex items-center gap-2 bg-white/20 border border-white/30 text-white font-black px-5 py-2.5 text-sm shrink-0 hover:bg-white/30 transition" style={{ borderRadius: 'var(--leaf-r-sm)' }}
      >
        <Mail className="w-4 h-4" />
        {t("emailSupportBtn")}
      </a>
    </div>
  );
}
