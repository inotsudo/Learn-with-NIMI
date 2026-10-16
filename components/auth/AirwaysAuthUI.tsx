"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Plane, Mail, Lock, Rocket, MapPin, CheckCircle } from "lucide-react";
import GoogleIcon from "./GoogleIcon";

export const AIRWAYS_GREEN = "#1B8A4B";
export const AIRWAYS_YELLOW = "#FFD60A";
export const AIRWAYS_BLUE = "#00A1E0";
export const AIRWAYS_PINK = "#FF6B9D";
export const AIRWAYS_PURPLE = "#9B59B6";
export const AIRWAYS_CREAM = "#FFF8E1";

export function AirwaysBrand({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ border: `1.5px solid ${AIRWAYS_GREEN}`, color: AIRWAYS_GREEN, background: `${AIRWAYS_GREEN}22` }}
      >
        <Plane className="w-4 h-4" />
      </span>
      <div className="leading-none">
        <p className="font-baloo font-black text-[13px] tracking-[0.18em]" style={{ color: AIRWAYS_GREEN }}>
          NIMIPIKO AIRWAYS
        </p>
        <p className="font-nunito text-[10px] tracking-[0.14em] text-gray-400 font-bold mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export function AirwaysInput({
  id,
  label,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 font-nunito text-[10px] font-black tracking-[0.22em] uppercase" style={{ color: AIRWAYS_GREEN }}>
        <span className="w-3 h-3 rounded-full" style={{ background: AIRWAYS_YELLOW }}></span>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: `${AIRWAYS_GREEN}15`, color: AIRWAYS_GREEN }}>
          {icon}
        </span>
        <input
          id={id}
          {...props}
          className="w-full rounded-2xl border-2 border-gray-100 bg-white pl-10 pr-4 py-3.5 font-nunito text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-[#1B8A4B] focus:ring-4 focus:ring-[#1B8A4B]15 transition"
        />
      </div>
    </div>
  );
}

export function AirwaysCTA({
  onClick,
  loading,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "yellow" | "pink" | "blue";
}) {
  const variants = {
    primary: {
      bg: `linear-gradient(135deg,${AIRWAYS_GREEN} 0%,#178040 100%)`,
      shadow: `0 10px 26px ${AIRWAYS_GREEN}25`,
      color: "#fff",
    },
    yellow: {
      bg: `linear-gradient(135deg,${AIRWAYS_YELLOW} 0%,#E8A300 100%)`,
      shadow: `0 10px 26px ${AIRWAYS_YELLOW}25`,
      color: "#1a1a1a",
    },
    pink: {
      bg: `linear-gradient(135deg,${AIRWAYS_PINK} 0%,#E84393 100%)`,
      shadow: `0 10px 26px ${AIRWAYS_PINK}25`,
      color: "#fff",
    },
    blue: {
      bg: `linear-gradient(135deg,${AIRWAYS_BLUE} 0%,#0070C0 100%)`,
      shadow: `0 10px 26px ${AIRWAYS_BLUE}25`,
      color: "#fff",
    },
  };

  const v = variants[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileTap={{ scale: 0.98 }}
      className="mt-4 w-full font-baloo font-black text-[15px] py-3.5 flex items-center justify-center gap-2 rounded-2xl text-white transition disabled:opacity-60 active:scale-[0.97]"
      style={{ background: v.bg, boxShadow: v.shadow }}
    >
      {loading ? (
        <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Rocket className="w-4 h-4" />
        </motion.span>
      ) : (
        children
      )}
    </motion.button>
  );
}

export function OAuthButtons({
  onOAuth,
  loadingProvider,
  mode,
}: {
  onOAuth: (provider: "google") => void;
  loadingProvider: string | null;
  mode: "signin" | "signup";
}) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => onOAuth("google")}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-gray-100 bg-white py-3.5 font-nunito text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
      >
        <GoogleIcon />
        {loadingProvider === "google"
          ? "Contacting Google…"
          : mode === "signin"
            ? "Continue with Google"
            : "Sign up with Google"}
      </button>
    </div>
  );
}

export function FlightStrip() {
  const flights = [
    { label: "FLIGHT", value: "NMP101", color: AIRWAYS_YELLOW },
    { label: "GATE", value: "ADV · 01", color: AIRWAYS_BLUE },
    { label: "STATUS", value: "LANDED", color: AIRWAYS_GREEN },
  ];
  const messages = ["KIGALI (KGL) → THE WORLD OF STORIES", "CHECKS! BAGS! READY!", "WELCOME ON BOARD!"];
  const icons = [<Plane key="p" className="w-3 h-3" />, <MapPin key="m" className="w-3 h-3" />, <CheckCircle key="c" className="w-3 h-3" />];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl px-5 pt-3.5 pb-3 max-w-xl"
      style={{ border: `1.5px solid ${AIRWAYS_GREEN}`, background: `${AIRWAYS_GREEN}08` }}
    >
      <div className="grid grid-cols-3 gap-2">
        {flights.map((f, i) => (
          <div key={f.label}>
            <p className="font-nunito text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: f.color }}>
              {f.label}
            </p>
            <p className="font-baloo font-black text-[15px] mt-0.5" style={{ color: f.color }}>
              {f.value}
            </p>
            <span className="inline-flex items-center gap-1 mt-1.5">
              {icons[i]}
              <span className="font-nunito text-[9px] text-gray-400 font-bold">{messages[i]}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1.5" style={{ borderTop: `1.5px solid ${AIRWAYS_GREEN}` }}>
        <p className="font-nunito text-[11px] text-gray-400 font-semibold">KIGALI (KGL) → THE WORLD OF STORIES</p>
      </div>
    </motion.div>
  );
}

export function BoardingCardShell({
  title,
  seat,
  children,
}: {
  title: string;
  seat: string;
  children: React.ReactNode;
}) {
  const bars = [10,16,8,20,12,18,8,14,20,10,16,8,18,12,20,10,14,18,8,16,12,20,10,16,8,20,14,10,18,12,16,8,20,10,14,18,8,16];
  const seatColors = [AIRWAYS_YELLOW, AIRWAYS_PINK, AIRWAYS_PURPLE, AIRWAYS_BLUE];

  return (
    <div
      className="rounded-[24px] bg-white overflow-hidden"
      style={{ boxShadow: `0 30px 70px ${AIRWAYS_GREEN}22, 0 4px 16px ${AIRWAYS_GREEN}10`, border: `1px solid ${AIRWAYS_GREEN}08` }}
    >
      <div className="px-6 pt-5 pb-4 flex items-start justify-between">
        <div>
          <p className="font-nunito text-[10px] font-black tracking-[0.22em]" style={{ color: AIRWAYS_GREEN }}>
            NIMIPIKO AIRWAYS
          </p>
          <p className="font-baloo font-black text-[17px] text-gray-900 mt-0.5">{title}</p>
        </div>
        <div className="text-right">
          <p className="font-nunito text-[10px] font-black tracking-[0.22em] text-gray-400">SEAT</p>
          <p
            className="font-baloo font-black text-[15px] text-gray-900"
            style={{ color: seatColors[Math.abs(seat.charCodeAt(0)) % seatColors.length] }}
          >
            {seat}
          </p>
        </div>
      </div>
      <div className="mx-6" style={{ borderTop: `2px dashed ${AIRWAYS_GREEN}20` }} />
      <div className="px-6 py-5">{children}</div>
      <div
        className="px-6 pb-5 pt-1 flex items-end gap-1"
        aria-hidden
        style={{
          borderTop: `1.5px solid ${AIRWAYS_GREEN}10`,
        }}
      >
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm opacity-80"
            style={{
              height: `${h}px`,
              background: seatColors[i % seatColors.length],
            }}
          />
        ))}
      </div>
    </div>
  );
}
