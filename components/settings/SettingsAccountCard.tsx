"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Trash2, ChevronRight, Crown, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getParent } from "@/lib/queries";
import { getActiveSubscription } from "@/lib/payments/products";
import type { Subscription } from "@/lib/payments/types";
import ChangePasswordModal from "./ChangePasswordModal";
import DeleteAccountModal from "./DeleteAccountModal";
import supabase from "@/lib/supabaseClient";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SettingsAccountCard() {
  const { t } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [parent, { data: { user } }] = await Promise.all([
        getParent(),
        supabase.auth.getUser(),
      ]);
      setEmail(parent?.email ?? null);
      if (user?.id) {
        const sub = await getActiveSubscription(user.id);
        setSubscription(sub);
      }
    })();
  }, []);

  async function handleCancelSubscription() {
    setCancelling(true);
    setCancelError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCancelling(false); return; }
    const res = await fetch("/api/account/cancel-subscription", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: subscription?.id }),
    });
    if (!res.ok) {
      setCancelError("Something went wrong. Please try again.");
      setCancelling(false);
      return;
    }
    setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null);
    setCancelling(false);
    setShowCancelConfirm(false);
  }

  return (
    <div className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
      <h3 className="font-black text-ds-text mb-2">{t("accountTitle")}</h3>

      {/* Plan status */}
      <div className="mb-3 pb-3 border-b border-ds-border">
        {subscription ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[13px] text-ds-text">NIMIPIKO Club</span>
                  <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {subscription.cancel_at_period_end
                    ? `✓ Cancels ${formatDate(subscription.current_period_end)} — access until then`
                    : `Renews ${formatDate(subscription.current_period_end)}`}
                </p>
              </div>
            </div>
            {!subscription.cancel_at_period_end && !showCancelConfirm && (
              <button onClick={() => setShowCancelConfirm(true)}
                className="w-full text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors text-left px-1">
                Cancel subscription
              </button>
            )}
            {showCancelConfirm && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-2">
                <p className="text-[12px] font-bold text-red-700">Cancel your NIMIPIKO Club?</p>
                <p className="text-[11px] text-red-500">You&apos;ll keep access until {formatDate(subscription.current_period_end)}. Your child&apos;s progress is saved forever.</p>
                {cancelError && (
                  <p className="text-[11px] font-bold text-red-600">{cancelError}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={handleCancelSubscription} disabled={cancelling}
                    className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                    <XCircle className="w-3 h-3" /> {cancelling ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button onClick={() => { setShowCancelConfirm(false); setCancelError(null); }}
                    className="text-[11px] font-bold text-gray-500 hover:text-gray-700 px-3 py-1.5 transition">
                    Keep Club
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/pricing" className="flex items-center gap-3 hover:bg-yellow-50 rounded-lg transition px-1 -mx-1 py-2 group">
            <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-[13px] text-ds-text block">Free Plan</span>
              <span className="text-[11px] text-gray-400">Upgrade for full story access</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-yellow-500 transition-colors" />
          </Link>
        )}
      </div>

      <button
        onClick={() => setShowPasswordModal(true)}
        className="flex items-center gap-3 py-3 border-b border-ds-border w-full text-left hover:bg-gray-50 rounded-lg transition px-1 -mx-1"
      >
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <KeyRound className="w-4 h-4 text-blue-600" />
        </div>
        <span className="font-bold text-sm flex-1 text-ds-text">{t("changePasswordLabel")}</span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </button>

      <button
        onClick={() => email && setShowDeleteModal(true)}
        disabled={!email}
        className="flex items-center gap-3 py-3 w-full text-left disabled:opacity-60 hover:bg-red-50 rounded-lg transition px-1 -mx-1"
      >
        <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4 text-red-500" />
        </div>
        <span className="font-bold text-sm flex-1 text-red-600">{t("deleteAccountLabel")}</span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </button>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal && email && <DeleteAccountModal email={email} onClose={() => setShowDeleteModal(false)} />}
    </div>
  );
}
