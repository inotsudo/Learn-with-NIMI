import { useEffect } from "react";
import { Howl } from "howler";
import { motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/design-system/motion";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const DAY_COMPLETE_VOICES = [
  new Howl({ src: ["/sounds/nimi-day-complete1.mp3"], volume: 0.8 }),
  new Howl({ src: ["/sounds/nimi-day-complete2.mp3"], volume: 0.8 }),
];

const DayCompleteModal = ({
  day,
  onClose,
  onNextDay,
  isLastDay,
}: {
  day: number;
  onClose: () => void;
  onNextDay: () => void;
  isLastDay: boolean;
}) => {
  useEffect(() => {
    const voice = DAY_COMPLETE_VOICES[Math.floor(Math.random() * DAY_COMPLETE_VOICES.length)];
    voice.play();
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="alert"
      aria-live="polite"
    >
      <motion.div
        className="bg-white leaf-lg p-8 shadow-xl text-center max-w-xs w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: DURATION.moderate }}
      >
        <motion.div
          className="text-6xl mb-5 select-none"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.85, 1]
          }}
          transition={{ repeat: Infinity, duration: DURATION.loopDrift, ease: EASE.standard }}
          aria-hidden="true"
        >
          🏆
        </motion.div>

        <h2 className="text-2xl font-bold mb-4">Day Complete!</h2>
        <p className="mb-6">You finished all of Day {day}&apos;s activities!</p>

        <div className="flex justify-center gap-4">
          {!isLastDay && (
            <Button
              onClick={() => {
                onNextDay();
                onClose();
              }}
              className="gap-2"
              aria-label={`Go to Day ${day + 1}`}
            >
              Go to Day {day + 1} <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
          <Button onClick={onClose} aria-label="Close day complete modal">
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DayCompleteModal;
