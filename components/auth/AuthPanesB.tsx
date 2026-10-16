"use client";

import { useState } from "react";
import { Smartphone, MessageSquareText, Plane } from "lucide-react";
import { useAirwaysAuth } from "@/lib/auth/useAirwaysAuth";
import { AirwaysCTA, AIRWAYS_GREEN } from "./AirwaysAuthUI";

export function PhonePane({ hook }: { hook: ReturnType<typeof useAirwaysAuth> }) {
  const a = hook;
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  return (
    <div className="mt-3">
      <p className="font-nunito text-[13px] text-gray-500 font-semibold">
        Rwanda-friendly — SMS code. Needs phone auth enabled in Supabase.
      </p>
      <label className="font-nunito text-[10px] font-black tracking-[0.22em] mt-2 block" style={{ color: AIRWAYS_GREEN }}>
        PHONE (E.164)
      </label>
      <div className="mt-1.5 relative">
        <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          onKeyDown={async (e) => { if (e.key === "Enter") { await a.sendPhoneOtp(phone); setOtpSent(true); } }}
          placeholder="+2507XXXXXXXX"
          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 font-nunito text-sm outline-none focus:border-[#1B8A4B] focus:ring-2 focus:ring-[#1B8A4B]/15"
        />
      </div>
      {!otpSent ? (
        <AirwaysCTA onClick={async () => { await a.sendPhoneOtp(phone); setOtpSent(true); }} loading={a.loading}>
          <>📱 Send SMS Code</>
        </AirwaysCTA>
      ) : (
        <>
          <label className="font-nunito text-[10px] font-black tracking-[0.22em] mt-3 block" style={{ color: AIRWAYS_GREEN }}>
            SMS CODE
          </label>
          <div className="mt-1.5 relative">
            <MessageSquareText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" inputMode="numeric" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") a.verifyPhoneOtp(phone, otp); }}
              placeholder="6-digit code"
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 font-nunito text-sm tracking-[0.3em] text-center outline-none focus:border-[#1B8A4B] focus:ring-2 focus:ring-[#1B8A4B]/15"
            />
          </div>
          <AirwaysCTA onClick={() => a.verifyPhoneOtp(phone, otp)} loading={a.loading}>
            <><Plane className="w-4 h-4" /> Verify & Board</>
          </AirwaysCTA>
          <button type="button" onClick={() => setOtpSent(false)} className="mt-2 w-full text-center font-nunito text-xs font-bold text-gray-400 hover:text-gray-600">
            Wrong number? Go back
          </button>
        </>
      )}
    </div>
  );
}
