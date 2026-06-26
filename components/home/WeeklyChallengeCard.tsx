"use client";

import { useState } from "react";
import ChampionChallengeCard from "@/components/challenges/ChampionChallengeCard";
import CelebrationModal from "@/components/challenges/CelebrationModal";

interface Props {
  childName?: string;
}

export default function WeeklyChallengeCard({ childName = "Explorer" }: Props) {
  const [completed, setCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleDidIt = () => {
    setShowCelebration(true);
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    setCompleted(true);
  };

  return (
    <>
      <ChampionChallengeCard
        onDidIt={handleDidIt}
        completed={completed}
      />
      <CelebrationModal
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
        childName={childName}
      />
    </>
  );
}
