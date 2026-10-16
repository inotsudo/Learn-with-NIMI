"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, Plane, Gift, ChevronDown, Smartphone, Star } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { PENDING_REF_KEY, REFERRAL_CODE_LENGTH } from "@/lib/referralConstants";
import { appUrl } from "@/lib/auth/config";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { AirwaysCTA } from "@/components/auth/AirwaysAuthUI";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

const DOTS = [
  { top: "5%",  left: "10%",  d: 0    },
  { top: "10%", left: "35%",  d: 0.4  },
  { top: "6%",  right: "15%", d: 0.8  },
  { top: "18%", left: "5%",   d: 0.2  },
  { top: "22%", right: "25%", d: 1.0  },
  { top: "30%", left: "28%",  d: 0.6  },
  { top: "42%", right: "8%",  d: 1.3  },
  { top: "55%", left: "12%",  d: 0.3  },
  { top: "68%", right: "18%", d: 0.9  },
] as const;

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--ds-surface-card)]" />}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { themeId, theme } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();

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

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--ds-state-focus)";
    e.target.style.boxShadow   = "0 0 0 3px var(--ds-brand-soft)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--ds-border-primary)";
    e.target.style.boxShadow   = "none";
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className={`min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br ${theme.gradients.pageBg}`}>

        {/* Ambient dots */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {DOTS.map((d, i) => (
            <motion.div key={i}
              className="absolute w-[3px] h-[3px] rounded-full bg-[var(--ds-text-brand)]"
              style={{ top: d.top, ...(("left" in d) ? { left: d.left } : { right: (d as { right: string }).right }) }}
              animate={{ opacity: [0.15, 0.70, 0.15] }}
              transition={{ duration: 2.8 + (i % 4) * 0.5, repeat: Infinity, ease: "easeInOut", delay: d.d }} />
          ))}
        </div>

        {/* ── Left hero panel ───────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col justify-between px-6 py-8 lg:w-[42%] lg:py-14 lg:px-12">

          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--ds-brand-soft)]"
              style={{ border: "1px solid var(--ds-border-brand)" }}>
              <Plane className="w-4 h-4 text-[var(--ds-text-brand)]" />
            </div>
            <div>
              <p className="font-black tracking-[0.24em] text-[10px] uppercase text-[var(--ds-text-brand)]">
                Nimipiko Airways
              </p>
              <p className="text-[var(--ds-text-secondary)] text-[9px] font-nunito tracking-widest uppercase">
                New Passenger Registration
              </p>
            </div>
          </div>

          {/* Hero copy + benefits + Nimi */}
          <div className="mt-8 lg:mt-0 lg:flex-1 flex flex-col justify-center items-center lg:items-start gap-5">
            <div className="lg:text-left text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 bg-[var(--ds-brand-soft)]"
                style={{ border: "1px solid var(--ds-border-brand)" }}>
                <Star className="w-3.5 h-3.5 text-[var(--ds-text-brand)]" fill="currentColor" />
                <span className="font-black text-[10px] tracking-[0.16em] uppercase text-[var(--ds-text-brand)]">
                  7-day free trial
                </span>
              </div>
              <h1 className="font-baloo font-black text-[var(--ds-text-primary)] leading-tight text-3xl sm:text-4xl lg:text-5xl">
                Register Your<br />
                <span className="text-[var(--ds-text-brand)]">Family Account ✈️</span>
              </h1>
              <p className="text-[var(--ds-text-secondary)] font-nunito mt-2 text-sm max-w-xs">
                Create your parent account and book your children's learning journey with Nimipiko Airways.
              </p>
            </div>

            <div className="hidden lg:flex flex-col gap-2">
              {["Personalised journey for each child", "Boarding pass, passport & badge for your kids", "Progress tracking across 3 languages"].map(b => (
                <div key={b} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[var(--ds-brand-soft)]">
                    <span className="text-[10px] text-[var(--ds-text-brand)]">✓</span>
                  </div>
                  <p className="font-nunito text-[var(--ds-text-secondary)] text-[13px]">{b}</p>
                </div>
              ))}
            </div>

            <div className="flex items-end gap-3">
              <motion.img src={assets.nimiCircle} alt="NIMI"
                className="w-20 h-20 rounded-full object-cover shrink-0"
                style={{ border: "3px solid var(--ds-border-brand)", boxShadow: "0 0 24px var(--ds-brand-soft)" }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
              <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[180px]"
                style={{ background: "var(--ds-surface-nav)", border: "1px solid var(--ds-border-brand)" }}>
                <p className="font-nunito font-bold text-[var(--ds-text-brand)] text-[13px] leading-snug">
                  I&apos;ll take good care of your little explorers! ✨
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: registration card ──────────────────────────────── */}
        <div className="relative z-10 flex-1 flex items-start lg:items-center justify-center px-4 py-6 lg:py-14 lg:pr-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="bg-[var(--ds-surface-card)] overflow-hidden rounded-[20px]"
              style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>

              {/* Card header */}
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, var(--ds-nav-bg) 0%, var(--ds-surface-nav) 100%)" }}>
                <div>
                  <p className="font-black tracking-[0.22em] text-[9px] uppercase text-[var(--ds-text-brand)]">
                    Nimipiko Airways
                  </p>
                  <p className="font-baloo font-black text-[var(--ds-text-primary)] text-base leading-tight">
                    Family Account 🎟️
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black tracking-[0.18em] uppercase text-[var(--ds-text-secondary)]">Class</p>
                  <p className="font-baloo font-black text-sm text-[var(--ds-text-brand)]">EXPLORER</p>
                </div>
              </div>

              {/* Perforation */}
              <div className="relative h-5 flex items-center overflow-hidden bg-[var(--ds-surface-card-hover)]">
                <div className="absolute -left-3 w-6 h-6 rounded-full bg-[var(--ds-nav-bg)]" />
                <div className="flex-1 mx-4 border-t-2 border-dashed border-[var(--ds-border-strong)]" />
                <div className="absolute -right-3 w-6 h-6 rounded-full bg-[var(--ds-nav-bg)]" />
              </div>

              {/* Form */}
              <div className="px-6 py-5 space-y-3.5 bg-[var(--ds-surface-card-hover)]">

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div key={error}
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-center bg-red-50 text-red-600 border border-red-200">
                      {error}
                    </motion.div>
                  )}
                 </AnimatePresence>

                 {/* Method selector */}
                 <div className="flex flex-wrap items-center gap-1.5">
                   {(["password","magiclink","phone","google"] as const).map(m => (
                     <button
                       key={m}
                       onClick={() => setMethod(m)}
                       className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition active:scale-95 disabled:opacity-40 ${method === m
                         ? "bg-[var(--ds-brand-primary)] text-white shadow-sm"
                         : "bg-white border border-[var(--ds-border-strong)] text-[var(--ds-text-secondary)] hover:border-[var(--ds-text-brand)]"}`}
                       disabled={loading}
                     >
                       {m === "password" ? "✈ Password" : m === "magiclink" ? "✨ Magic link" : m === "phone" ? "📱 Phone" : "🟡 Google"}
                     </button>
                   ))}
                 </div>

                 {/* Non-email signup methods */}
                 {method !== "password" && (
                   <div className="mt-3 rounded-2xl border border-[var(--ds-border-strong)] bg-white p-3 space-y-2.5">
                     {method === "magiclink" ? (
                       <>
                         <label className="block font-black text-[9px] uppercase tracking-[0.22em] mb-1.5 text-[var(--ds-text-brand)]">Email</label>
                         <div className="relative">
                           <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-tertiary)]" />
                           <input type="email" value={magicEmail} onChange={e => setMagicEmail(e.target.value)}
                             placeholder={t("signupPlaceholderEmail")} onKeyDown={e => e.key === "Enter" && sendMagicLink()}
                             className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold text-[var(--ds-text-primary)] bg-[var(--ds-surface-card)] border-2 border-[var(--ds-border-primary)] rounded-xl focus:outline-none transition placeholder:text-[var(--ds-text-tertiary)]" />
                         </div>
                         <AirwaysCTA onClick={sendMagicLink} loading={magicLoading}>
                           <>✈ Send magic link</>
                         </AirwaysCTA>
                       </>
                     ) : method === "phone" ? (
                       <>
                         <label className="block font-black text-[9px] uppercase tracking-[0.22em] mb-1.5 text-[var(--ds-text-brand)]">Phone (+250)</label>
                         <div className="relative">
                           <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-tertiary)]" />
                           <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                             placeholder="+2507XXXXXXXX" onKeyDown={e => e.key === "Enter" && sendPhoneOtp()}
                             className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold text-[var(--ds-text-primary)] bg-[var(--ds-surface-card)] border-2 border-[var(--ds-border-primary)] rounded-xl focus:outline-none transition placeholder:text-[var(--ds-text-tertiary)]" />
                         </div>
                         <AirwaysCTA onClick={sendPhoneOtp} loading={phoneLoading}>
                           <>📱 Send SMS code</>
                         </AirwaysCTA>
                       </>
                     ) : method === "google" ? (
                       <button type="button" onClick={signUpGoogle}
                         className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-[var(--ds-border-strong)] bg-white py-2.5 font-nunito text-xs font-bold text-[var(--ds-text-secondary)] transition hover:border-[var(--ds-text-brand)]">
                         <GoogleIcon />
                         Sign up with Google
                       </button>
                     ) : null}
                     {!otpSent && (
                       <button type="button" onClick={() => setMethod("password")}
                         className="w-full text-center font-nunito text-[11px] font-bold text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition">
                         ← Back to email + password
                       </button>
                     )}
                   </div>
                 )}


                {/* Trial badge */}
                <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 bg-[var(--ds-brand-soft)]"
                  style={{ border: "1px solid var(--ds-border-brand)" }}>
                  <span className="text-lg shrink-0">🎁</span>
                  <div>
                    <p className="font-baloo font-black text-[13px] leading-tight text-[var(--ds-text-primary)]">
                      7-day free trial included
                    </p>
                    <p className="font-nunito text-[11px] text-[var(--ds-text-secondary)]">
                      Full Club access — no credit card needed
                    </p>
                  </div>
                </div>

                {/* Referral */}
                {linkChecking ? (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-[var(--ds-surface-card)] border border-[var(--ds-border-primary)]">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-[var(--ds-brand-primary)] rounded-full animate-spin shrink-0" />
                    <p className="font-nunito text-[var(--ds-text-secondary)] text-[13px]">Checking your invite…</p>
                  </div>
                ) : linkInvalid ? (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-red-50 border border-red-200">
                    <span className="text-xl shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-baloo font-black text-red-700 text-[13px]">Invalid invite link.</p>
                      <p className="font-nunito text-red-500/80 text-[11px]">Enter your code below.</p>e
                    </div>
                    <button onClick={() => { setLinkInvalid(false); setCodeOpen(true); }}
                      className="text-[11px] text-red-500 hover:text-red-700 font-bold shrink-0">Enter code</button>
                  </div>
                ) : referralCode ? (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-[var(--ds-surface-card)] border border-[var(--ds-border-brand)]">
                    <span className="text-2xl shrink-0">🎁</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-baloo font-black text-[13px] text-[var(--ds-text-primary)]">
                        {referrerName ? `${referrerName} invited you!` : "Referral code applied!"}
                      </p>
                      <p className="font-nunito text-[11px] text-[var(--ds-text-secondary)]">
                        Code <strong>{referralCode}</strong> · You both get 1 free month.
                      </p>
                    </div>
                    <button onClick={() => { setReferralCode(null); setReferrerName(null); setCodeInput(""); setCodeOpen(true); sessionStorage.removeItem(PENDING_REF_KEY); }}
                      className="text-[11px] font-bold shrink-0 text-[var(--ds-text-brand)]">Change</button>
                  </div>
                ) : (
                  <div>
                    <button onClick={() => setCodeOpen(o => !o)}
                      className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition w-full">
                      <Gift className="w-3.5 h-3.5" />
                      Have a referral code?
                      <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${codeOpen ? "rotate-180" : ""}`} />
                    </button>
                    {codeOpen && (
                      <div className="mt-2 flex gap-2">
                        <input type="text" value={codeInput}
                          onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                          onKeyDown={e => e.key === "Enter" && applyCode()}
                          placeholder="e.g. ABC12345" maxLength={REFERRAL_CODE_LENGTH}
                          onFocus={onFocus} onBlur={onBlur}
                          className="flex-1 border-2 border-[var(--ds-border-primary)] bg-[var(--ds-surface-card)] rounded-xl px-3 py-2 text-[13px] font-mono font-bold tracking-widest focus:outline-none uppercase transition" />
                        <button onClick={applyCode} disabled={validating}
                          className="px-4 py-2 font-black text-[12px] rounded-xl hover:opacity-90 active:scale-95 transition disabled:opacity-60 flex items-center gap-1.5 text-[var(--ds-nav-bg)] bg-[var(--ds-brand-primary)]">
                          {validating && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                          {validating ? "…" : "Apply"}
                        </button>
                      </div>
                    )}
                    {codeError && <p className="text-red-500 text-[11px] mt-1">{codeError}</p>}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block font-black text-[9px] uppercase tracking-[0.22em] mb-1.5 text-[var(--ds-text-brand)]">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-tertiary)]" />
                    <input type="text" value={name}
                      onChange={e => setName(e.target.value)} disabled={loading}
                      placeholder={t("signupPlaceholderName")}
                      onFocus={onFocus} onBlur={onBlur}
                      className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold text-[var(--ds-text-primary)] bg-[var(--ds-surface-card)] border-2 border-[var(--ds-border-primary)] rounded-xl focus:outline-none transition placeholder:text-[var(--ds-text-tertiary)]" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block font-black text-[9px] uppercase tracking-[0.22em] mb-1.5 text-[var(--ds-text-brand)]">
                    Your Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-tertiary)]" />
                    <input type="email" value={email}
                      onChange={e => setEmail(e.target.value)} disabled={loading}
                      placeholder={t("signupPlaceholderEmail")}
                      onFocus={onFocus} onBlur={onBlur}
                      className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold text-[var(--ds-text-primary)] bg-[var(--ds-surface-card)] border-2 border-[var(--ds-border-primary)] rounded-xl focus:outline-none transition placeholder:text-[var(--ds-text-tertiary)]" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-black text-[9px] uppercase tracking-[0.22em] mb-1.5 text-[var(--ds-text-brand)]">
                    Boarding Code
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-tertiary)]" />
                    <input type={showPassword ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)} disabled={loading}
                      placeholder={t("signupPlaceholderPassword")}
                      onFocus={onFocus} onBlur={onBlur}
                      className="w-full pl-9 pr-10 py-2.5 text-sm font-semibold text-[var(--ds-text-primary)] bg-[var(--ds-surface-card)] border-2 border-[var(--ds-border-primary)] rounded-xl focus:outline-none transition placeholder:text-[var(--ds-text-tertiary)]" />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)] transition">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="block font-black text-[9px] uppercase tracking-[0.22em] mb-1.5 text-[var(--ds-text-brand)]">
                    Confirm Code
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-tertiary)]" />
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && signup()}
                      disabled={loading}
                      placeholder={t("signupPlaceholderConfirm")}
                      onFocus={onFocus} onBlur={onBlur}
                      className="w-full pl-9 pr-10 py-2.5 text-sm font-semibold text-[var(--ds-text-primary)] bg-[var(--ds-surface-card)] border-2 border-[var(--ds-border-primary)] rounded-xl focus:outline-none transition placeholder:text-[var(--ds-text-tertiary)]" />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)] transition">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2 text-xs text-[var(--ds-text-secondary)] cursor-pointer select-none">
                  <input type="checkbox" checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-3.5 h-3.5 mt-0.5 rounded flex-shrink-0 accent-[var(--ds-brand-primary)]" />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="font-bold text-[var(--ds-text-brand)] hover:underline">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="font-bold text-[var(--ds-text-brand)] hover:underline">Privacy Policy</Link>
                  </span>
                </label>

                {/* CTA */}
                <motion.button onClick={signup} disabled={loading} whileTap={m.buttonPress}
                  className="w-full font-baloo font-black text-[15px] py-3.5 flex items-center justify-center gap-2 rounded-[14px] transition disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, var(--ds-brand-primary) 0%, var(--ds-brand-hover) 100%)`,
                    color:      "var(--ds-nav-bg)",
                    boxShadow:  "var(--ds-shadow-cta)",
                  }}>
                  {loading ? (
                    <motion.span animate={{ rotate: [0, 360] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>✈️</motion.span>
                  ) : (
                    <><Plane className="w-4 h-4" /> Get My Boarding Pass</>
                  )}
                </motion.button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--ds-border-strong)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ds-text-tertiary)]">or</span>
                  <div className="flex-1 h-px bg-[var(--ds-border-strong)]" />
                </div>

                <p className="text-center text-xs text-[var(--ds-text-secondary)] font-nunito">
                  Already have an account?{" "}
                  <Link href="/loginpage" className="font-black text-[var(--ds-text-brand)] hover:opacity-80 transition">
                    Log in here →
                  </Link>
                </p>
              </div>

              {/* Barcode */}
              <div className="px-6 pb-5 pt-1 flex items-center gap-3 bg-[var(--ds-surface-card-hover)]">
                <div className="flex gap-[2px] items-end flex-1">
                  {Array.from({ length: 38 }, (_, i) => (
                    <div key={i} className="flex-1 bg-[var(--ds-nav-bg)] rounded-sm opacity-80"
                      style={{ height: `${[10,16,8,20,12,18,8,14,20,10,16,8,18,12,20,10,14,18,8,16,12,20,10,16,8,20,14,10,18,12,16,8,20,10,14,18,8,16][i]}px` }} />
                  ))}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[7px] font-bold leading-none text-[var(--ds-nav-bg)] opacity-50">NMP-NEW-KGL</p>
                  <p className="font-mono text-[7px] leading-none text-[var(--ds-nav-bg)] opacity-50">
                    {new Date().toISOString().slice(0, 10).replace(/-/g, "")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
