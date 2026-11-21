"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Mail, Lock, Plane, Sparkles, Phone } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { appUrl, safeNextPath } from "@/lib/auth/config";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { TerminalLayout, TicketCard, WorldNotice, HeroTitle, GoldButton, GlassField, EyeToggle, Tilt3D } from "@/components/world-ui";
import "@/components/world-ui/world-ui.css";
import { WORLD } from "@/lib/design-system/world";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#06101F" }} />}>
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
  const [showPhone, setShowPhone] = useState(false); // the phone-code panel is folded away until asked for
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
      <TerminalLayout
        scene={WORLD.scene(2)}
        focus={{ x: 0.42, y: 0.4 }}
        subtitle="Learning terminal · Kigali"
        hero={<>
          <HeroTitle lead="Welcome back," gold="Captain!" emoji="✈️" />
          <p className="max-w-sm font-nunito text-base font-bold text-[#FFF7E0]/80" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
            Your little explorers are ready for take-off.
          </p>
          <motion.div initial={{ opacity: 0, y: 30, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: -4 }} transition={{ ...WORLD.spring.soft, delay: 0.2 }}
            className="w-[min(30vw,230px)] [@media(max-height:520px)]:hidden">
            <Tilt3D src="/now/props/passport-cover.webp" alt="Passeport Voyage Nimipiko" width={600} height={931} priority />
          </motion.div>
        </>}
      >
        <TicketCard
          id="login"
          stub={{ label: "SEAT", value: "12A" }}
          title={<>
            <span className="block text-[20px] landscape:md:hidden">Welcome back, <span className="whitespace-nowrap">Captain! ✈️</span></span>
            <span className="block text-[15px] font-bold text-[#FFF7E0]/70 landscape:md:text-[22px] landscape:md:font-extrabold landscape:md:text-[#FFF7E0]">Parent / Guardian Login</span>
          </>}
        >
          <WorldNotice error={error} ok={message} className="mt-4" />

          {/* a real form so phone password managers can fill and save the login */}
          <form onSubmit={e => { e.preventDefault(); login(); }} noValidate>
            <div className="mt-5 grid grid-cols-1 gap-4">
              <GlassField label="Email" icon={<Mail className="h-5 w-5" />} type="email" autoComplete="email" inputMode="email"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@family.com" />
              <GlassField label="Boarding code" icon={<Lock className="h-5 w-5" />} type={showPassword ? "text" : "password"} autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="Your secret word"
                trailing={<EyeToggle shown={showPassword} onToggle={() => setShowPassword(v => !v)} />} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 font-nunito text-sm font-bold">
              <label className="flex min-h-11 cursor-pointer select-none items-center gap-2 text-[#FFF7E0]/75">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-5 w-5 rounded accent-[#E8BC56]" />
                Remember me
              </label>
              <Link href="/forgot-password" className="flex min-h-11 items-center text-[#E8BC56] transition hover:text-[#FDE68A]">Forgot code?</Link>
            </div>

            <GoldButton type="submit" full className="mt-3" loading={loading} icon={<Plane className="h-5 w-5" />}>Board now</GoldButton>
          </form>

          <div className="wui-ticket__perf" aria-hidden="true" />

          <p className="mb-3 text-center font-baloo text-[11px] font-extrabold tracking-[0.24em] text-[#FFF7E0]/55">OTHER WAYS TO BOARD</p>
          <GoldButton variant="light" full onClick={loginWithGoogle} loading={oauthLoading} icon={<GoogleIcon />}>Continue with Google</GoldButton>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <GoldButton variant="glass" onClick={loginWithMagicLink} disabled={magicLoading || loading} loading={magicLoading} icon={<Sparkles className="h-4 w-4" />} className="!px-3 !text-[15px]">
              Magic link
            </GoldButton>
            <GoldButton variant="glass" icon={<Phone className="h-4 w-4" />} className="!px-3 !text-[15px]" aria-expanded={showPhone} aria-controls="phone-pane"
              onClick={() => { setError(""); setMessage(""); setShowPhone(v => !v); }}>
              Phone code
            </GoldButton>
          </div>

          <AnimatePresence initial={false}>
            {(showPhone || otpSent) && (
              <motion.div id="phone-pane" key="phone-pane" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }} className="overflow-hidden">
              <div className="mt-4 rounded-2xl p-3" style={{ background: "rgba(6,16,31,0.4)", border: "1px solid rgba(253,230,138,0.16)" }}>
                {!otpSent ? (
                  <div className="flex items-end gap-2">
                    <GlassField autoFocus className="min-w-0 flex-1" label="Phone · +250 Rwanda" icon={<Phone className="h-5 w-5" />} type="tel" autoComplete="tel" inputMode="tel"
                      value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendPhoneOtp(); }} placeholder="+2507XXXXXXXX" />
                    <GoldButton variant="glass" onClick={sendPhoneOtp} loading={loading} className="!px-5">Send</GoldButton>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <GlassField className="min-w-0 flex-1" label="SMS code" icon={<Lock className="h-5 w-5" />} type="text" inputMode="numeric" autoComplete="one-time-code"
                      value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => { if (e.key === "Enter") verifyPhoneOtp(); }} placeholder="6-digit code" />
                    <GoldButton variant="glass" onClick={verifyPhoneOtp} loading={loading} className="!px-5">Verify</GoldButton>
                  </div>
                )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-5 text-center font-nunito text-sm font-bold text-[#FFF7E0]/65">
            New here? <Link href="/signuppage" className="text-[#E8BC56] transition hover:text-[#FDE68A]">Get your boarding pass →</Link>
          </p>
        </TicketCard>
      </TerminalLayout>
    </MotionConfig>
  );
}
