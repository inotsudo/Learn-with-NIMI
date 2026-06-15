"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  childName: string;
}

export default function GreetingCard({ childName }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-100 rounded-2xl shadow-sm p-4 flex items-center gap-4">
      <motion.img
        src="/nimi-logo-circle.png"
        alt="NIMI"
        className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-white shadow shrink-0"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div>
        <p className="font-black text-purple-700 text-lg">
          {t("progressGreatJob").replace("{name}", childName)}
        </p>
        <p className="text-gray-500 text-sm mt-0.5">{t("progressEncouragement")}</p>
      </div>
    </div>
  );
}
