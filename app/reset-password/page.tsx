"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { ArrowLeft, Lock, Mail, RotateCcw, ShieldCheck, AlertTriangle } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { TerminalLayout, TicketCard, WorldNotice, HeroTitle, GoldButton, GlassField, EyeToggle } from "@/components/world-ui";
import "@/components/world-ui/world-ui.css";
import { WORLD } from "@/lib/design-system/world";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [expired, setExpired] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') setExpired(true);
  }, []);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResendLoading(false);
    if (error) {
      setMessage(error.message);
      setIsError(true);
    } else {
      setResendSent(true);
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      setPassword("");
      setConfirmPassword("");
    } else {
      setIsError(false);
      setMessage("Password updated successfully! Redirecting to login...");
      setTimeout(() => router.push("/loginpage"), 2000);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <TerminalLayout
        scene={WORLD.scene(5)}
        focus={{ x: 0.4, y: 0.45 }}
        subtitle={expired ? "Help desk · Link expired" : "Help desk · New boarding code"}
        hero={<>
          {expired
            ? <HeroTitle lead="This link has" gold="expired" emoji="⏳" />
            : <HeroTitle lead="Choose a new" gold="boarding code" emoji="🔐" />}
          <p className="max-w-sm font-nunito text-base font-bold text-[#FFF7E0]/85" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
            {expired ? "Reset links expire after 1 hour for security. Ask for a fresh one." : "Pick a strong new code to keep your family's journey safe."}
          </p>
          <div className="wui-glass flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 [@media(max-height:520px)]:hidden">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#E8BC56]" aria-hidden="true" />
            <p className="font-nunito text-sm font-bold text-[#FFF7E0]/80">
              <span className="text-[#FFF7E0]">Secure connection.</span> Your code is encrypted and never stored in plain text.
            </p>
          </div>
        </>}
      >
        {expired ? (
          <TicketCard id="reset" kicker="HELP DESK" stub={{ label: "STATUS", value: "EXPIRED" }} title="Link expired">
            <div className="wui-row mt-4">
              <AlertTriangle className="h-6 w-6 shrink-0 text-[#FDBA74]" aria-hidden="true" />
              <p className="font-nunito text-sm font-bold text-[#FFF7E0]/80">
                Reset links expire after <strong className="text-[#FFF7E0]">1 hour</strong> for security. Enter your email to get a fresh link.
              </p>
            </div>
            {resendSent ? (
              <WorldNotice ok="New link sent! Check your inbox." className="mt-4" />
            ) : (
              <form onSubmit={handleResend} className="mt-5 grid grid-cols-1 gap-4">
                <WorldNotice error={isError ? message : ""} />
                <GlassField label="Your email address" icon={<Mail className="h-5 w-5" />} type="email" required autoComplete="email" inputMode="email"
                  value={resendEmail} onChange={e => setResendEmail(e.target.value)} placeholder="you@example.com" />
                <GoldButton type="submit" full loading={resendLoading} icon={<RotateCcw className="h-5 w-5" />}>
                  {resendLoading ? "Sending…" : "Send new reset link"}
                </GoldButton>
              </form>
            )}
            <div className="wui-ticket__perf" aria-hidden="true" />
            <button type="button" onClick={() => router.push("/loginpage")} className="wui-link w-full justify-center">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to login
            </button>
          </TicketCard>
        ) : (
          <TicketCard id="reset" kicker="HELP DESK" stub={{ label: "GATE", value: "G1" }} title="New boarding code">
            <p className="mt-2 font-nunito text-sm font-bold text-[#FFF7E0]/70">Enter your new code below.</p>
            <form onSubmit={handleUpdatePassword} className="mt-5 grid grid-cols-1 gap-4">
              <WorldNotice error={isError ? message : ""} ok={!isError ? message : ""} />
              <GlassField label="New code" icon={<Lock className="h-5 w-5" />} type={showPassword ? "text" : "password"} autoComplete="new-password" required disabled={loading}
                value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter new password"
                trailing={<EyeToggle shown={showPassword} onToggle={() => setShowPassword(p => !p)} />} />
              <GlassField label="Confirm code" icon={<Lock className="h-5 w-5" />} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required disabled={loading}
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
                trailing={<EyeToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword(p => !p)} />} />
              <GoldButton type="submit" full loading={loading} icon={<Lock className="h-5 w-5" />}>
                {loading ? "Updating password…" : "Update password"}
              </GoldButton>
            </form>
          </TicketCard>
        )}
      </TerminalLayout>
    </MotionConfig>
  );
}
