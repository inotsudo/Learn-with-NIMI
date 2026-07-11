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

  return (
    <div className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
      <h3 className="font-black text-ds-text text-[13px] uppercase mb-3 flex items-center gap-1.5 tracking-wide">
        🚀 WHAT&apos;S NEXT?
      </h3>

      {allDone ? (
        <div className="bg-ds-action-subtle border border-[var(--ds-brand-primary)]/20 p-4 text-center" style={{ borderRadius: 'var(--leaf-r)' }}>
          <div className="text-4xl mb-1.5">🏆</div>
          <p className="font-black text-[var(--ds-brand-primary)] text-[10px] leading-snug">
            {t("allLevelsCompleteLabel")}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">

            {/* Next mission */}
            <Link href={next.href} className="flex-1">
              <div className="bg-white border border-ds-border p-2 sm:p-3 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer" style={{ borderRadius: 'var(--leaf-r)' }}>
                <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mb-1">NEXT UP</p>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto rounded-xl ${next.numBgGlass} flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-sm`}>
                  {next.emoji}
                </div>
                <p className="text-[9px] font-black text-ds-text uppercase leading-tight mb-1.5">
                  {t(next.titleKey)}
                </p>
                <div className="bg-ds-action text-white text-2xs font-black rounded-full py-1.5 flex items-center justify-center gap-1 shadow">
                  ▶ START NOW
                </div>
              </div>
            </Link>

            {/* Separator */}
            <div className="flex-shrink-0 text-gray-400 text-lg font-black">→</div>

            {/* Then */}
            <div className="flex-1 bg-white border border-ds-border p-2 sm:p-3 text-center shadow-sm opacity-60" style={{ borderRadius: 'var(--leaf-r)' }}>
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">THEN</p>
              {after ? (
                <>
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto rounded-xl ${after.numBgGlass} flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-sm`}>
                    {after.emoji}
                  </div>
                  <p className="text-[9px] font-black text-ds-text uppercase leading-tight mb-1.5">
                    {t(after.titleKey)}
                  </p>
                  <div className="bg-gray-100 text-gray-500 text-[9px] font-black rounded-full py-1.5 flex items-center justify-center gap-1 shadow">
                    UP NEXT
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto rounded-xl bg-yellow-100 flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-sm">
                    🏁
                  </div>
                  <p className="text-[9px] font-black text-ds-text uppercase leading-tight mb-1.5">
                    Last One!
                  </p>
                  <div className="bg-gray-100 text-gray-500 text-[9px] font-black rounded-full py-1.5 flex items-center justify-center gap-1 shadow">
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
