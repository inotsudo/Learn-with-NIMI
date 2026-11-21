"use client";

import { useState } from "react";
import supabase from "@/lib/supabaseClient";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { ArrowLeft, Mail, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TerminalLayout, TicketCard, WorldNotice, HeroTitle, GoldButton, GlassField } from "@/components/world-ui";
import "@/components/world-ui/world-ui.css";
import { WORLD } from "@/lib/design-system/world";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError(t("resetErrEmail"));
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimipiko.com";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${siteUrl}/reset-password` }
    );

    if (resetError) {
      setError(t("resetErrGeneric"));
    } else {
      setMessage(t("resetSuccess"));
    }

    setLoading(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <TerminalLayout
        scene={WORLD.scene(1)}
        focus={{ x: 0.42, y: 0.4 }}
        subtitle="Help desk · Lost boarding code"
        hero={<>
          <HeroTitle lead="Don't worry," gold="Explorer!" emoji="✨" />
          <p className="max-w-sm font-nunito text-base font-bold text-[#FFF7E0]/85" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
            It happens! Reset your code and get back to your adventure.
          </p>
          <div className="wui-glass flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 [@media(max-height:520px)]:hidden">
            <Shield className="h-5 w-5 shrink-0 text-[#E8BC56]" aria-hidden="true" />
            <p className="font-nunito text-sm font-bold text-[#FFF7E0]/80">
              <span className="text-[#FFF7E0]">Your security is our priority.</span> We&apos;ll never share your information with anyone.
            </p>
          </div>
        </>}
      >
        <TicketCard id="forgot" kicker="HELP DESK" stub={{ label: "DESK", value: "G1" }} title="Forgot your code?">
          <p className="mt-2 font-nunito text-sm font-bold text-[#FFF7E0]/70">
            No worries! Enter your email and we&apos;ll send you a link to choose a new one.
          </p>

          <WorldNotice error={error} ok={message} className="mt-4" />

          <form onSubmit={e => { e.preventDefault(); handleResetPassword(); }} noValidate className="mt-5 grid grid-cols-1 gap-4">
            <GlassField label="Email address" icon={<Mail className="h-5 w-5" />} type="email" autoComplete="email" inputMode="email"
              value={email} onChange={e => setEmail(e.target.value)} placeholder={t("resetPlaceholderEmail")} disabled={loading} />
            <GoldButton type="submit" full loading={loading} icon={<Mail className="h-5 w-5" />}>
              {loading ? t("resetSending") : t("resetSendBtn")}
            </GoldButton>
          </form>

          <div className="wui-ticket__perf" aria-hidden="true" />

          <Link href="/loginpage" className="wui-link w-full justify-center">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to login
          </Link>
        </TicketCard>
      </TerminalLayout>
    </MotionConfig>
  );
}
