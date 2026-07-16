"use client";

import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type CelebrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
};

export default function CelebrationModal({ isOpen, onClose, message }: CelebrationModalProps) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    }}>
      <div style={{
        background: "white",
        padding: "2rem",
        borderRadius: "12px",
        textAlign: "center",
        maxWidth: "90vw",
      }}>
        <h2>🎉 {t("celebrationTitle")} 🎉</h2>
        <p>{message || t("celebrationComplete")}</p>
        <button onClick={onClose} style={{ marginTop: "1rem" }}>{t("celebrationClose")}</button>
      </div>
    </div>
  );
}
