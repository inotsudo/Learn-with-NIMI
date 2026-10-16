"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, MotionConfig } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Plane, Sparkles, Rocket, Phone } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { appUrl, safeNextPath } from "@/lib/auth/config";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { AirwaysCTA } from "@/components/auth/AirwaysAuthUI";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#F7FAF7" }} />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const rawNext = searchParams?.get("next") ?? "";
  const nextPath = safeNextPath(rawNext, "/home");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(nextPath);
    });
  });

  const login = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) { setError(loginError.message); return; }
      setMessage(t("loginSuccess"));
      router.replace(nextPath);
    } catch {
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setOauthLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (e) {
      setError(`${e.message}. Enable Google in Supabase → Auth → Providers.`);
      setOauthLoading(false);
    }
  };

  const loginWithMagicLink = async () => {
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Enter a valid email address first."); return; }
    setMagicLoading(true);
    setError("");
    setMessage("");
    const { error: e } = await supabase.auth.signInWithOtp({
      email: em,
      options: { emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    setMagicLoading(false);
    if (e) setError(e.message);
    else setMessage("Magic boarding link sent! Check your email.");
  };

  const sendPhoneOtp = async () => {
    const ph = phone.trim().replace(/[\s-]/g, "");
    if (!/^\+?[1-9]\d{7,14}$/.test(ph)) { setError("Enter phone as +2507XXXXXXXX."); return; }
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithOtp({ phone: ph });
    setLoading(false);
    if (e) setError(`${e.message} (Enable phone auth in Supabase to use SMS.)`);
    else { setOtpSent(true); setMessage(`Code sent to ${ph}.`); }
  };

  const verifyPhoneOtp = async () => {
    const ph = phone.trim().replace(/[\s-]/g, "");
    if (otp.trim().length < 6) { setError("Enter the 6-digit SMS code."); return; }
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.verifyOtp({ phone: ph, token: otp.trim(), type: "sms" });
    setLoading(false);
    if (e) setError(`${e.message} (Enable phone auth in Supabase to use SMS.)`);
    else { setOtpSent(true); setMessage(`Code matched! Welcome back, Captain.`); }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(180deg, #F7FAF7 0%, #F2F7F3 45%, #EDF5EF 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ backgroundImage: "radial-gradient(rgba(27,138,75,0.03) 1px, transparent 1px)", backgroundSize: "24px 24px", maskImage: "radial-gradient(90% 90% at 50% 20%, #0003 30%, transparent 90%)", WebkitMaskImage: "radial-gradient(90% 90% at 50% 20%, #0003 30%, transparent 90%)" }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-6 pb-10 min-h-screen flex flex-col">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ border: "1.5px solid #1B8A4B", color: "#1B8A4B", background: "#1B8A4B14" }}>
              <Plane className="w-4 h-4" />
            </span>
            <div>
              <p className="font-baloo font-black text-[13px] tracking-[0.18em]" style={{ color: "#1B8A4B" }}>NIMIPIKO AIRWAYS</p>
              <p className="font-nunito text-[10px] tracking-[0.14em] text-gray-400 font-bold mt-0.5">LEARNING TERMINAL · KIGALI</p>
            </div>
          </div>

          <div className="flex-1 grid lg:grid-cols-2 gap-8 items-center mt-6 lg:mt-0">
            <div>
              <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
                className="font-baloo font-black leading-[1.08] text-gray-900" style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>
                Welcome back,
                <span style={{ color: "#1B8A4B" }}>Captain!</span> <span className="inline-block align-middle">✈️</span>
              </motion.h1>
              <p className="font-nunito text-gray-400 text-sm mt-3 font-semibold">Your little explorers are ready for take-off.</p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }} className="mt-5 flex items-center gap-3">
                <div className="w-[76px] h-[76px] rounded-full overflow-hidden shrink-0 bg-white shadow-2xl" style={{ border: "2.5px solid #1B8A4B" }}>
                  <Image src="/nimi/happy.png" alt="NIMI" width={76} height={76} className="w-full h-full object-cover" />
                </div>
                <div className="rounded-2xl bg-white px-4 py-2.5 max-w-[240px]" style={{ border: "1.5px solid #1B8A4B18" }}>
                  <p className="font-nunito text-[12.5px] font-bold leading-snug" style={{ color: "#1B8A4B" }}>Let's create something amazing today!</p>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }} className="mt-5 flex flex-wrap gap-2">
                {["Passengers","Families","Stories","Adventure"].map((label, i) => (
                  <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-nunito font-bold"
                    style={{ background: ["#F0F5F1","#E8F4FD","#FCE4EC","#EAF2FF"][i], color: ["#1B8A4B","#175C8A","#B42318","#175C8A"][i], border: "1px solid", borderColor: ["#D4E8D8","#C8E0F0","#E8C8D0","#C8E0F0"][i] }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ["#4CAF50","#2196F3","#F44336","#2196F3"][i] }} />
                    {label}
                  </span>
                ))}
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.08 }} className="justify-self-center lg:justify-self-end w-full max-w-[440px]">
              <div className="rounded-[24px] bg-white overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(27,138,75,0.08), 0 1px 4px rgba(27,138,75,0.05)", border: "1px solid #E8F0E8" }}>
                <div className="px-6 pt-5 pb-4 flex items-start justify-between">
                  <div>
                    <p className="font-nunito text-[10px] font-black tracking-[0.22em]" style={{ color: "#1B8A4B" }}>NIMIPIKO AIRWAYS</p>
                    <p className="font-baloo font-black text-[17px] text-gray-900 mt-0.5">Parent / Guardian Login</p>
                  </div>
                  <div className="text-right">
                    <p className="font-nunito text-[10px] font-black tracking-[0.22em] text-gray-400">SEAT</p>
                    <p className="font-baloo font-black text-[15px] text-gray-900" style={{ color: "#1B8A4B" }}>12A · WIN</p>
                  </div>
                </div>

                {(error || message) && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-3 rounded-xl px-4 py-2.5 font-nunito text-sm" style={error ? { background: "#FDECEC", color: "#B42318", border: "1px solid #F5C0B8" } : { background: "#E9F7EF", color: "#1B8A4B", border: "1px solid #BDE5CD" }}>
                    {error || message}
                  </motion.div>
                )}

                <div className="mt-4">
                  <div className="flex items-center gap-2" style={{ color: "#1B8A4B" }}>
                    <Plane className="w-3.5 h-3.5" />
                    <span className="font-nunito text-[10px] font-black tracking-[0.22em] uppercase">Email</span>
                  </div>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9AA5B1" }} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
                      placeholder="you@family.com" style={{ border: "2px solid #E8ECEC", borderRadius: "12px", paddingLeft: "32px", padding: "12px 16px", fontFamily: "Nunito", fontSize: "14px", color: "#333", backgroundColor: "#fff" }} />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2" style={{ color: "#1B8A4B" }}>
                    <Lock className="w-3.5 h-3.5" />
                    <span className="font-nunito text-[10px] font-black tracking-[0.22em] uppercase">Boarding Code</span>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9AA5B1" }} />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
                      placeholder="Type your secret word" style={{ border: "2px solid #E8ECEC", borderRadius: "12px", paddingLeft: "32px", padding: "12px 16px", fontFamily: "Nunito", fontSize: "14px", color: "#333", backgroundColor: "#fff" }} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 transition">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-1.5 font-nunito cursor-pointer select-none">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-3.5 h-3.5 rounded accent-#1B8A4B" />
                    <span className="font-nunito text-gray-500">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="font-bold text-gray-500 hover:text-gray-800 transition">Forgot code?</Link>
                </div>

                <AirwaysCTA onClick={login} loading={loading}>
                  {loading ? <Rocket className="w-4 h-4 animate-spin" /> : <><Plane className="w-4 h-4" /> Board Now</>}
                </AirwaysCTA>

                <p className="mt-3 text-center text-xs text-gray-400 font-nunito">
                  New here? <Link href="/signuppage" className="font-black hover:opacity-80 transition" style={{ color: "#1B8A4B" }}>Get your boarding pass →</Link>
                </p>

                <div className="mt-4">
                  <AirwaysCTA variant="blue" onClick={loginWithGoogle} loading={oauthLoading}>
                    {oauthLoading ? <Rocket className="w-4 h-4 animate-spin" /> : <><GoogleIcon /> Continue with Google</>}
                  </AirwaysCTA>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={loginWithMagicLink} disabled={magicLoading || loading}
                    className="flex-1 min-w-[140px] rounded-xl border border-gray-200 bg-white py-2.5 font-nunito text-xs font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] disabled:opacity-60">
                    <Sparkles className="w-3 h-3 inline-block mr-1.5" /> Magic link
                  </button>
                  <button type="button" onClick={() => { setError(""); setMessage(""); document.getElementById("phone-pane")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); setOtpSent(false); (document.getElementById("phone-input") as HTMLInputElement | null)?.focus(); }}
                    className="flex-1 min-w-[140px] rounded-xl border border-gray-200 bg-white py-2.5 font-nunito text-xs font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] disabled:opacity-60">
                    <Phone className="w-3 h-3 inline-block mr-1.5" /> Phone code
                  </button>
                </div>

                <div id="phone-pane" className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3" style={{ borderColor: "#1B8A4B18" }}>
                  <div className="flex items-center gap-2" style={{ color: "#1B8A4B" }}>
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-nunito text-[10px] font-black tracking-[0.2em] uppercase">Phone Boarding · +250 RWANDA READY</span>
                  </div>
                  {!otpSent ? (
                    <div className="mt-2 flex gap-2">
                      <input id="phone-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") sendPhoneOtp(); }}
                        placeholder="+2507XXXXXXXX" style={{ flex: 1, border: "2px solid #E8ECEC", borderRadius: "12px", padding: "10px 12px", fontFamily: "Nunito", fontSize: "13px", color: "#333", outline: "none" }} />
                      <AirwaysCTA variant="primary" onClick={sendPhoneOtp} loading={loading}>Send</AirwaysCTA>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={(e) => { if (e.key === "Enter") verifyPhoneOtp(); }}
                        placeholder="6-digit code" style={{ flex: 1, border: "2px solid #E8ECEC", borderRadius: "12px", padding: "10px 12px", fontFamily: "Nunito", fontSize: "13px", color: "#333", textAlign: "center", outline: "none" }} />
                      <AirwaysCTA variant="primary" onClick={verifyPhoneOtp} loading={loading}>Verify</AirwaysCTA>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
