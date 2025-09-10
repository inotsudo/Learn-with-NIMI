'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { useEffect, useState } from 'react';

// Translation dictionary for all supported languages
const translations = {
  en: {
    loading: "Loading missions...",
  },
  es: {
    loading: "Cargando misiones...",
  },
  fr: {
    loading: "Chargement des missions...",
  },
  rw: {
    loading: "Kuringaniza imirimo...",
  },
  sw: {
    loading: "Inapakia misheni...",
  }
};
const MissionsComponent = dynamic(
  () => import('./MissionsComponent'),
  { 
    ssr: false,
    loading: () => {
      const { language } = useLanguage();

      // Type-safe translation function
      const t = (key: string) => {
        const translationObj = translations[language] as Record<string, string> 
          || translations.en as Record<string, string>;
        return translationObj[key] || (translations.en as Record<string, string>)[key] || key;
      };

      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="text-gray-600">{t('loading')}</p>
          </main>
          <BottomNavigation />
        </div>
      );
    }
  }
);


export default function MissionsPage() {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50 overflow-x-hidden">
      <Header />
      <main className="max-w-6xl mx-auto flex-grow px-3 sm:px-4 py-4 sm:py-6 w-full">
        <MissionsComponent />
      </main>
      <BottomNavigation />
    </div>
  );
}