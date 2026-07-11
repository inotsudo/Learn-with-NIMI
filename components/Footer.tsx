"use client";

import { Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";

export default function Footer() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      // Check if we're at the bottom of the page
      const isAtBottom = currentScrollPos + clientHeight >= scrollHeight - 10;
      setAtBottom(isAtBottom);

      // Only show when scrolling down, not at bottom, and scrolled enough
      const shouldShow = 
        currentScrollPos > prevScrollPos && 
        currentScrollPos > 100 && 
        !isAtBottom;

      setVisible(shouldShow);
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <footer className={`fixed bottom-16 left-0 right-0 z-30 transition-all duration-300 ${
      visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    }`}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border border-ds-border rounded-lg p-2 shadow-sm flex flex-col items-center">
          <div className="flex items-center text-gray-500">
            <Heart className="w-4 h-4 fill-gray-300 mr-1 animate-pulse" />
            <span className="text-xs font-semibold">
              {t('madeWithLove') || "Made with love"}
            </span>
            <Heart className="w-4 h-4 fill-gray-300 ml-1 animate-pulse" />
          </div>
          <div className="text-gray-500 text-[10px] mt-0.5">
            © {new Date().getFullYear()} NIMI Play
          </div>
        </div>
      </div>
    </footer>
  );
}