import { motion } from "framer-motion";
import Image from "next/image";

export default function NimiAssistant({ mood = "happy", phrase = "" }) {
  const moodImageMap = {
    happy: "/nimi/happy.png",
    sad: "/nimi/sad.jpeg",
    locked: "/nimi/locked.png",
    celebration: "/nimi/celebration.jpeg",
  };

  const moodImage = moodImageMap[mood as keyof typeof moodImageMap] || "/nimi/happy.png";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 bg-white rounded-xl shadow p-3 max-w-xs"
    >
      <Image
        src={moodImage}
        alt={mood}
        width={50}
        height={50}
        className="rounded-full"
      />
      <p className="text-gray-700 font-medium">{phrase}</p>
    </motion.div>
  );
}
