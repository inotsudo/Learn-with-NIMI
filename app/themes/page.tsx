"use client";

import AppShell from "@/components/layout/AppShell";
import { PageSurface } from "@/components/layout/primitives";
import ThemeGallery from "@/components/themes/ThemeGallery";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";

export default function ThemesPage() {
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);

  return (
    <AppShell>
      <PageSurface>
        <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
          <ThemeGallery />
        </div>
      </PageSurface>
    </AppShell>
  );
}
