"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useAirwaysAuth } from "@/lib/auth/useAirwaysAuth";
import { AirwaysCTA, AIRWAYS_GREEN } from "./AirwaysAuthUI";

export function PasswordPane({ hook }: { hook: ReturnType<typeof useAirwaysAuth> }) {
  const a = hook;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const enter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") fn();
  };
  return (
    <div className="mt-3">
      <label className="font-nunito text-[10px] font-black tracking-[0.22em]" style={{ color: AIRWAYS_GREEN }}>
        YOUR EMAIL
      </label>
      <div className="mt-1.5 relative">
        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={enter(() => a.signInPassword(email, password))}
          placeholder="Enter your email"
          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 font-nunito text-sm outline-none focus:border-[#1B8A4B] focus:ring-2 focus:ring-[#1B8A4B]/15"
        />
      </div>
      <label className="font-nunito text-[10px] font-black tracking-[0.22em] mt-3 block" style={{ color: AIRWAYS_GREEN }}>
        BOARDING CODE
      </label>
      <div className="mt-1.5 relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">🔒</span>
        <input
          type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={enter(() => a.signInPassword(email, password))}
          placeholder="Enter your password"
          className="w-full rounded-xl border border-gray-200 pl-10 pr-11 py-3 font-nunito text-sm outline-none focus:border-[#1B8A4B] focus:ring-2 focus:ring-[#1B8A4B]/15"
        />
        <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
          {showPw ? "🙈" : "👁"}
        </button>
      </div>
      <AirwaysCTA onClick={() => a.signInPassword(email, password)} loading={a.loading}>
        <>✈ Board Now</>
      </AirwaysCTA>
    </div>
  );
}

export function MagicLinkPane({ hook }: { hook: ReturnType<typeof useAirwaysAuth> }) {
  const a = hook;
  const [email, setEmail] = useState("");
  return (
    <div className="mt-3">
      <p className="font-nunito text-[13px] text-gray-500 font-semibold">No password needed — one-tap boarding link by email.</p>
      <label className="font-nunito text-[10px] font-black tracking-[0.22em] mt-2 block" style={{ color: AIRWAYS_GREEN }}>
        YOUR EMAIL
      </label>
      <div className="mt-1.5 relative">
        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") a.sendMagicLink(email); }}
          placeholder="Enter your email"
          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 font-nunito text-sm outline-none focus:border-[#1B8A4B] focus:ring-2 focus:ring-[#1B8A4B]/15"
        />
      </div>
      <AirwaysCTA onClick={() => a.sendMagicLink(email)} loading={a.loading}>
        <>✨ Send Magic Link</>
      </AirwaysCTA>
    </div>
  );
}
