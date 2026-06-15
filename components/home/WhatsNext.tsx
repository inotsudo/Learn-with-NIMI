"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES } from "@/app/_activityData";

interface Props {
  completedSteps: number[];
}

export default function WhatsNext({ completedSteps }: Props) {
  const { t } = useLanguage();
  const total = ACTIVITIES.length;
  const done = completedSteps.length;

  // Categories not yet completed at the current level
  const remaining = ACTIVITIES.filter(a => !completedSteps.includes(a.number));
  const allDone = remaining.length === 0;

  const next = remaining[0];
  const after = remaining[1];
  const lastOne = !allDone && remaining.length === 1;

  return (
    <div className="bg-white border-2 border-blue-100 rounded-2xl shadow-md p-4">
      <h3 className="font-black text-gray-800 text-[13px] uppercase mb-3 flex items-center gap-1.5 tracking-wide">
        🚀 WHAT&apos;S NEXT?
      </h3>

      {allDone ? (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-4 text-center">
          <div className="text-4xl mb-1.5">🏆</div>
          <p className="font-black text-orange-700 text-[10px] leading-snug">
            {t("allLevelsCompleteLabel")}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">

            {/* Next mission */}
            <Link href={next.href} className="flex-1">
              <div className="bg-white border-2 border-blue-100 rounded-2xl p-2 sm:p-3 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-1">NEXT UP</p>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto rounded-xl ${next.numBg} flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-sm`}>
                  {next.emoji}
                </div>
                <p className="text-[9px] font-black text-blue-800 uppercase leading-tight mb-1.5">
                  {t(next.titleKey)}
                </p>
                <div className="bg-blue-600 text-white text-[9px] font-black rounded-full py-1.5 flex items-center justify-center gap-1 shadow">
                  ▶ START NOW
                </div>
              </div>
            </Link>

            {/* Separator */}
            <div className="flex-shrink-0 text-blue-300 text-lg font-black">→</div>

            {/* Then */}
            <div className="flex-1 bg-white border-2 border-blue-100 rounded-2xl p-2 sm:p-3 text-center shadow-sm opacity-60">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">THEN</p>
              {after ? (
                <>
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto rounded-xl ${after.numBg} flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-sm`}>
                    {after.emoji}
                  </div>
                  <p className="text-[9px] font-black text-gray-600 uppercase leading-tight mb-1.5">
                    {t(after.titleKey)}
                  </p>
                  <div className="bg-gray-200 text-gray-500 text-[9px] font-black rounded-full py-1.5 flex items-center justify-center gap-1 shadow">
                    UP NEXT
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto rounded-xl bg-yellow-100 flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-sm">
                    🏁
                  </div>
                  <p className="text-[9px] font-black text-gray-600 uppercase leading-tight mb-1.5">
                    Last One!
                  </p>
                  <div className="bg-gray-200 text-gray-500 text-[9px] font-black rounded-full py-1.5 flex items-center justify-center gap-1 shadow">
                    FINAL MISSION
                  </div>
                </>
              )}
            </div>

          </div>

          <p className="text-[9.5px] text-gray-500 text-center leading-snug">
            {done}/{total} missions mastered — {remaining.length} to go!
          </p>
        </>
      )}
    </div>
  );
}
