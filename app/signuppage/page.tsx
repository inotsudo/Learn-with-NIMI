"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Plane, Gift, ChevronDown, Smartphone, Star, Sparkles, Check } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { PENDING_REF_KEY, REFERRAL_CODE_LENGTH } from "@/lib/referralConstants";
import { appUrl } from "@/lib/auth/config";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { TerminalLayout, TicketCard, WorldNotice, HeroTitle, GoldButton, GlassField, EyeToggle, Tilt3D } from "@/components/world-ui";
import "@/components/world-ui/world-ui.css";
import { WORLD } from "@/lib/design-system/world";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#06101F" }} />}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [name,            setName]           = useState("");
  const [email,           setEmail]          = useState("");
  const [password,        setPassword]       = useState("");
  const [confirmPassword, setConfirmPassword]= useState("");
  const [showPassword,    setShowPassword]   = useState(false);
  const [showConfirm,     setShowConfirm]    = useState(false);
  const [agreed,          setAgreed]         = useState(true);
  const [loading,         setLoading]        = useState(false);
  const [info,            setInfo]           = useState("");
  const [method,          setMethod]         = useState<"password" | "magiclink" | "phone" | "google">("password");
  const [magicEmail,      setMagicEmail]     = useState("");
  const [phone,           setPhone]          = useState("");
  const [otp,             setOtp]            = useState("");
  const [otpSent,         setOtpSent]        = useState(false);
  const [magicLoading,    setMagicLoading]   = useState(false);
  const [phoneLoading,    setPhoneLoading]   = useState(false);
  const [error,           setError]          = useState("");

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [codeInput,    setCodeInput]    = useState("");
  const [codeOpen,     setCodeOpen]     = useState(false);
  const [codeError,    setCodeError]    = useState("");
  const [validating,   setValidating]   = useState(false);
  const [linkChecking, setLinkChecking] = useState(false);
  const [linkInvalid,  setLinkInvalid]  = useState(false);

  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      const clean = ref.toUpperCase().slice(0, REFERRAL_CODE_LENGTH);
      setLinkChecking(true);
      fetch(`/api/referral/validate?code=${encodeURIComponent(clean)}`)
        .then(r => r.ok ? r.json() : null)
        .then((j: { referrerName?: string } | null) => {
          if (j?.referrerName !== undefined) {
            setReferralCode(clean);
            setReferrerName(j.referrerName ?? null);
            sessionStorage.setItem(PENDING_REF_KEY, clean);
          } else {
            setLinkInvalid(true);
          }
        })
        .catch(() => setLinkInvalid(true))
        .finally(() => setLinkChecking(false));
      return;
    }
    const stored = sessionStorage.getItem(PENDING_REF_KEY);
    if (stored) { setReferralCode(stored); setCodeInput(stored); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCode = async () => {
    const clean = codeInput.trim().toUpperCase();
    if (!clean) { setCodeError("Please enter a code."); return; }
    if (clean.length !== REFERRAL_CODE_LENGTH) { setCodeError(`Codes are ${REFERRAL_CODE_LENGTH} characters.`); return; }
    setValidating(true);
    try {
      const res  = await fetch(`/api/referral/validate?code=${encodeURIComponent(clean)}`);
      if (!res.ok) { setCodeError("That code doesn't exist."); return; }
      const json = await res.json() as { valid: boolean; referrerName?: string };
      setReferrerName(json.referrerName ?? null);
    } catch {
      setCodeError("Couldn't verify the code. Check your connection.");
      return;
    } finally { setValidating(false); }
    sessionStorage.setItem(PENDING_REF_KEY, clean);
    setReferralCode(clean);
    setCodeError("");
    setCodeOpen(false);
  };

  const signup = async () => {
    if (loading) return;
    if (!name.trim() || !email.trim() || !password) { setError(t("signupErrFillAll")); return; }
    if (password !== confirmPassword) { setError(t("signupErrNoMatch")); return; }
    if (!agreed) { setError(t("signupErrTerms")); return; }
    setLoading(true);
    setError("");
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) { setError(signUpError.message); return; }
      if (data.user) {
        await supabase.from("parents").upsert(
          { id: data.user.id, email: data.user.email ?? email, name },
          { onConflict: "id" },
        );
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          void fetch("/api/account/welcome-email", {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (referralCode) {
            void fetch("/api/referral", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ code: referralCode }),
            });
            sessionStorage.removeItem(PENDING_REF_KEY);
          }
          router.replace("/onboarding");
        } else {
          router.replace("/onboarding?verify=1");
        }
      } else {
        setError(t("signupErrNoUser"));
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpGoogle = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/onboarding")}` },
    });
    if (e) {
      setError(`${e.message}. Enable Google in Supabase → Auth → Providers.`);
      setLoading(false);
    }
  };

  const sendMagicLink = async () => {
    if (loading || magicLoading) return;
    const em = magicEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Enter a valid email address first."); return; }
    setMagicLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithOtp({
      email: em,
      options: { emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/onboarding")}` },
    });
    setMagicLoading(false);
    if (e) setError(`${e.message} (Enable email confirmations in Supabase to use magic links.)`);
    else setInfo("Magic boarding link sent! Check your email.");
  };

  const sendPhoneOtp = async () => {
    if (loading || phoneLoading) return;
    const ph = phone.trim().replace(/[\s-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(ph)) { setError("Enter phone as +2507XXXXXXXX."); return; }
    setPhoneLoading(true);
    setError("");
    const { error: e } = await supabase.auth.signInWithOtp({ phone: ph });
    setPhoneLoading(false);
    if (e) setError(`${e.message} (Enable phone auth in Supabase to use SMS.)`);
    else { setOtpSent(true); setInfo(`Code sent to ${ph}.`); }
  };

  const METHODS = [
    { id: "password",  label: "Password",   icon: <Plane className="h-5 w-5" /> },
    { id: "magiclink", label: "Magic link", icon: <Sparkles className="h-5 w-5" /> },
    { id: "phone",     label: "Phone",      icon: <Smartphone className="h-5 w-5" /> },
    { id: "google",    label: "Google",     icon: <GoogleIcon /> },
  ] as const;

  return (
    <MotionConfig reducedMotion="user">
      <TerminalLayout
        scene={WORLD.scene(3)}
        focus={{ x: 0.3, y: 0.55 }}
        portraitFocus={{ x: 0, y: 0.5 }}
        subtitle="New passenger registration"
        hero={<>
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-baloo text-[11px] font-extrabold tracking-[0.18em] text-[#06101F]"
            style={{ background: "linear-gradient(120deg,#FDE68A,#E8BC56)", boxShadow: "0 4px 0 #8A6A1E, 0 10px 20px rgba(0,0,0,0.35)" }}>
            <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> 7-DAY FREE TRIAL
          </span>
          <HeroTitle lead="Register your" gold="family account" emoji="✈️" />
          <ul className="grid grid-cols-1 gap-2 [@media(max-height:520px)]:hidden">
            {["Personalised journey for each child", "Boarding pass, passport & badge for your kids", "Progress tracking across 3 languages"].map(b => (
              <li key={b} className="flex items-center gap-2.5 font-nunito text-[15px] font-bold text-[#FFF7E0]/85" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#06101F]" style={{ background: "#E8BC56" }}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3.5} aria-hidden="true" />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <motion.div initial={{ opacity: 0, y: 30, rotate: 8 }} animate={{ opacity: 1, y: 0, rotate: 4 }} transition={{ ...WORLD.spring.soft, delay: 0.2 }}
            className="w-[min(24vw,250px,30vh)] [@media(max-height:620px)]:hidden">
            <Tilt3D src="/now/props/boarding-pass.webp" alt="Nimipiko Airways boarding pass" width={720} height={724} maxTilt={14} priority />
          </motion.div>
        </>}
      >
        <TicketCard
          id="signup"
          stub={{ label: "CLASS", value: "EXPLORER" }}
          title={<>
            <span className="block text-[20px] landscape:md:hidden">Register your <span className="whitespace-nowrap">family <span aria-hidden="true">✈️</span></span></span>
            <span className="block text-[15px] font-bold text-[#FFF7E0]/70 landscape:md:text-[22px] landscape:md:font-extrabold landscape:md:text-[#FFF7E0]">Family account 🎟️</span>
          </>}
        >
          <AnimatePresence mode="wait">
            {(error || info) && <WorldNotice key={error || info} error={error} ok={info} className="mt-4" />}
          </AnimatePresence>

          {/* trial ribbon */}
          <div className="wui-row wui-row--gold mt-4">
            <span className="text-2xl" aria-hidden="true">🎁</span>
            <div className="min-w-0">
              <p className="font-baloo text-[15px] font-extrabold leading-tight text-[#FFF7E0]">7-day free trial included</p>
              <p className="font-nunito text-[13px] font-bold text-[#FFF7E0]/65">Full Club access — no credit card needed</p>
            </div>
          </div>

          {/* how to board */}
          <p className="mb-2 mt-5 ml-1 font-baloo text-[11px] font-extrabold tracking-[0.22em] text-[#E8BC56]">HOW DO YOU WANT TO BOARD?</p>
          <div className="wui-seg" role="group" aria-label="Sign-up method">
            {METHODS.map(o => (
              <button key={o.id} type="button" className="wui-seg__opt" aria-pressed={method === o.id} disabled={loading} onClick={() => setMethod(o.id)}>
                {o.icon}{o.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={method} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {method === "password" ? (
                <form onSubmit={e => { e.preventDefault(); signup(); }} noValidate className="mt-5 grid grid-cols-1 gap-4">
                  <GlassField label="Your name" icon={<User className="h-5 w-5" />} type="text" autoComplete="name"
                    value={name} onChange={e => setName(e.target.value)} disabled={loading} placeholder={t("signupPlaceholderName")} />
                  <GlassField label="Your email" icon={<Mail className="h-5 w-5" />} type="email" autoComplete="email" inputMode="email"
                    value={email} onChange={e => setEmail(e.target.value)} disabled={loading} placeholder={t("signupPlaceholderEmail")} />
                  <GlassField label="Boarding code" icon={<Lock className="h-5 w-5" />} type={showPassword ? "text" : "password"} autoComplete="new-password"
                    value={password} onChange={e => setPassword(e.target.value)} disabled={loading} placeholder={t("signupPlaceholderPassword")}
                    trailing={<EyeToggle shown={showPassword} onToggle={() => setShowPassword(p => !p)} />} />
                  <GlassField label="Confirm code" icon={<Lock className="h-5 w-5" />} type={showConfirm ? "text" : "password"} autoComplete="new-password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} placeholder={t("signupPlaceholderConfirm")}
                    trailing={<EyeToggle shown={showConfirm} onToggle={() => setShowConfirm(p => !p)} />} />
                  <Terms agreed={agreed} onChange={setAgreed} />
                  <GoldButton type="submit" full loading={loading} icon={<Plane className="h-5 w-5" />}>Get my boarding pass</GoldButton>
                </form>
              ) : method === "magiclink" ? (
                <div className="mt-5 grid grid-cols-1 gap-4">
                  <GlassField label="Email" icon={<Mail className="h-5 w-5" />} type="email" autoComplete="email" inputMode="email"
                    value={magicEmail} onChange={e => setMagicEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMagicLink()} placeholder={t("signupPlaceholderEmail")} />
                  <Terms agreed={agreed} onChange={setAgreed} />
                  <GoldButton full onClick={sendMagicLink} loading={magicLoading} icon={<Sparkles className="h-5 w-5" />}>Send magic link</GoldButton>
                </div>
              ) : method === "phone" ? (
                <div className="mt-5 grid grid-cols-1 gap-4">
                  <GlassField label="Phone · +250 Rwanda" icon={<Smartphone className="h-5 w-5" />} type="tel" autoComplete="tel" inputMode="tel"
                    value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && sendPhoneOtp()} placeholder="+2507XXXXXXXX" />
                  <Terms agreed={agreed} onChange={setAgreed} />
                  <GoldButton full onClick={sendPhoneOtp} loading={phoneLoading} icon={<Smartphone className="h-5 w-5" />}>Send SMS code</GoldButton>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4">
                  <Terms agreed={agreed} onChange={setAgreed} />
                  <GoldButton variant="light" full onClick={signUpGoogle} loading={loading} icon={<GoogleIcon />}>Sign up with Google</GoldButton>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="wui-ticket__perf" aria-hidden="true" />

          {/* referral */}
          {linkChecking ? (
            <div className="wui-row" role="status">
              <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#FFF7E0]/25 border-t-[#E8BC56]" aria-hidden="true" />
              <p className="font-nunito text-sm font-bold text-[#FFF7E0]/75">Checking your invite…</p>
            </div>
          ) : linkInvalid ? (
            <div className="wui-row wui-row--danger">
              <span className="text-xl" aria-hidden="true">⚠️</span>
              <div className="min-w-0 flex-1">
                <p className="font-baloo text-[15px] font-extrabold text-[#FECACA]">Invalid invite link.</p>
                <p className="font-nunito text-[13px] font-bold text-[#FECACA]/75">Enter your code below.</p>
              </div>
              <button type="button" className="wui-link shrink-0" onClick={() => { setLinkInvalid(false); setCodeOpen(true); }}>Enter code</button>
            </div>
          ) : referralCode ? (
            <div className="wui-row wui-row--gold">
              <span className="text-2xl" aria-hidden="true">🎁</span>
              <div className="min-w-0 flex-1">
                <p className="font-baloo text-[15px] font-extrabold text-[#FFF7E0]">{referrerName ? `${referrerName} invited you!` : "Referral code applied!"}</p>
                <p className="font-nunito text-[13px] font-bold text-[#FFF7E0]/65">Code <strong className="text-[#FDE68A]">{referralCode}</strong> · You both get 1 free month.</p>
              </div>
              <button type="button" className="wui-link shrink-0"
                onClick={() => { setReferralCode(null); setReferrerName(null); setCodeInput(""); setCodeOpen(true); sessionStorage.removeItem(PENDING_REF_KEY); }}>Change</button>
            </div>
          ) : (
            <div>
              <button type="button" className="wui-link w-full" aria-expanded={codeOpen} onClick={() => setCodeOpen(o => !o)}>
                <Gift className="h-4 w-4" aria-hidden="true" />
                Have a referral code?
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${codeOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {codeOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex items-end gap-2 pt-1">
                      <GlassField className="min-w-0 flex-1" label="Referral code" icon={<Gift className="h-5 w-5" />} type="text" autoCapitalize="characters"
                        value={codeInput} maxLength={REFERRAL_CODE_LENGTH} placeholder="e.g. ABC12345"
                        style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.18em", textTransform: "uppercase" }}
                        onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                        onKeyDown={e => e.key === "Enter" && applyCode()} />
                      <GoldButton variant="glass" onClick={applyCode} loading={validating} className="!px-5">Apply</GoldButton>
                    </div>
                    {codeError && <p role="alert" className="ml-1 mt-2 font-nunito text-[13px] font-bold text-[#FECACA]">{codeError}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <p className="mt-4 text-center font-nunito text-sm font-bold text-[#FFF7E0]/65">
            Already have an account? <Link href="/loginpage" className="text-[#E8BC56] transition hover:text-[#FDE68A]">Log in here →</Link>
          </p>

          {/* the stub's barcode */}
          <div className="mt-4 flex items-center gap-3 opacity-80" aria-hidden="true">
            <div className="flex flex-1 items-end gap-[2px]">
              {BARS.map((h, i) => (
                <div key={i} className="flex-1 rounded-[1px]" style={{ height: h, background: "linear-gradient(180deg,#FDE68A,#C9A84C)" }} />
              ))}
            </div>
            <div className="shrink-0 text-right font-mono text-[9px] font-bold leading-tight text-[#FFF7E0]/50">
              <p>NMP-NEW-KGL</p>
              <p>{new Date().toISOString().slice(0, 10).replace(/-/g, "")}</p>
            </div>
          </div>
        </TicketCard>
      </TerminalLayout>
    </MotionConfig>
  );
}

const BARS = [10,16,8,20,12,18,8,14,20,10,16,8,18,12,20,10,14,18,8,16,12,20,10,16,8,20,14,10,18,12,16,8,20,10,14,18,8,16];

function Terms({ agreed, onChange }: { agreed: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-2.5 font-nunito text-[13px] font-bold leading-snug text-[#FFF7E0]/75">
      <input type="checkbox" checked={agreed} onChange={e => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-[#E8BC56]" />
      <span>
        I agree to the{" "}
        <Link href="/terms" target="_blank" className="text-[#E8BC56] hover:text-[#FDE68A]">Terms of Service</Link>{" "}
        and{" "}
        <Link href="/privacy" target="_blank" className="text-[#E8BC56] hover:text-[#FDE68A]">Privacy Policy</Link>
      </span>
    </label>
  );
}
