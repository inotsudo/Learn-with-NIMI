"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Gem, Shield, Sparkles, Trophy, Info, CreditCard, X, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/translations";
import supabase from "@/lib/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";
import { debounce } from "lodash";

// Types
type PlanType = "monthly" | "yearly";

type Subscription = {
  plan: PlanType;
  status: string;
};

export default function SubscriptionPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const session = useSession();
  const parentId = session?.user?.id;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<PlanType | null>(null);
  const [hasSubscriptionData, setHasSubscriptionData] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Define feature descriptions for tooltips
  const featureDescriptions = useMemo(() => ({
    f1: t(language, "f1Description") || "Unlimited access to all learning content",
    f2: t(language, "f2Description") || "Download resources for offline use",
    f3: t(language, "f3Description") || "Priority customer support",
    f4: t(language, "f4Description") || "Exclusive educational games",
    f5: t(language, "f5Description") || "Special yearly subscriber bonus content",
  }), [language]);
  

  // Define Plans
  const plans = useMemo(
    () => [
      {
        nameKey: "planMonthly",
        price: "$6.99",
        periodKey: "perMonth",
        features: ["f1", "f2", "f3", "f4"],
        planId: "monthly" as PlanType,
        highlighted: false,
      },
      {
        nameKey: "planYearly",
        price: "$59.99",
        periodKey: "perYear",
        features: ["f1", "f2", "f3", "f4", "f5"],
        planId: "yearly" as PlanType,
        highlighted: true,
        badge: t(language, "bestValue"),
      },
    ],
    [language]
  );

  const isSubscribed = subscription?.status === "subscribed";

  // Debounced subscription update handler
  const handleSubscriptionUpdate = useCallback(
    debounce((payload) => {
      setSubscription(payload.new);
    }, 1000),
    []
  );

  // Fetch subscription from Supabase
  useEffect(() => {
    if (!parentId) return;

    const fetchSubscription = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("parent_id", parentId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Subscription fetch error:", error);
          toast({ 
            title: t(language, "error"), 
            description: t(language, "subscriptionLoadError") || "Failed to load subscription information",
            variant: "destructive"
          });
        } else {
          setSubscription(data || null);
          setHasSubscriptionData(!!data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        toast({ 
          title: t(language, "error"), 
          description: t(language, "unexpectedError") || "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    const channel = supabase
      .channel(`subscription-updates-${parentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "subscriptions", filter: `parent_id=eq.${parentId}` },
        (payload) => handleSubscriptionUpdate(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      handleSubscriptionUpdate.cancel();
    };
  }, [parentId, language, toast, handleSubscriptionUpdate]);

  // Stripe Checkout
  const subscribeStripe = async (plan: PlanType) => {
    if (!parentId) return;
    setChangingPlan(plan);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, plan }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No URL returned from server");
      }
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      toast({ 
        title: t(language, "error"), 
        description: t(language, "checkoutError") || "Failed to initialize checkout process",
        variant: "destructive"
      });
      setChangingPlan(null);
    }
  };

  // Show manual MTN/Airtel modal
  const openManualPayment = (plan: PlanType, provider: string) => {
    setSelectedPlan(plan);
    setSelectedProvider(provider);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
    setSelectedProvider(null);
  };

  // Sanitize input for manual payments
  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>"'`;()]/g, "");
  };

  // Validate phone number based on provider
  const validatePhoneNumber = (phone: string, provider: string): boolean => {
    const sanitizedPhone = phone.replace(/\D/g, ''); // Remove non-digit characters
    
    if (provider === "MTN") {
      return /^(77|78|76|39|38)\d{7}$/.test(sanitizedPhone);
    } else if (provider === "Airtel") {
      return /^(75|74|70)\d{7}$/.test(sanitizedPhone);
    }
    
    return false;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen p-4 md:p-8 space-y-8">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-muted-foreground">{t(language, "loading") || "Loading subscription information..."}</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Header />

      {isSubscribed && subscription?.plan && (
        <motion.div
          className="flex justify-center mt-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium shadow-sm">
            <Gem className="h-4 w-4" /> 🎉 {t(language, "youAreOn")}{" "}
            {subscription.plan === "yearly" ? t(language, "planYearly") : t(language, "planMonthly")}
          </div>
        </motion.div>
      )}

      <main className="flex-1 container max-w-5xl mx-auto p-4 md:p-8 space-y-12">
        {/* Header Section */}
        <motion.div className="text-center space-y-3" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium shadow-sm">
            <Gem className="h-4 w-4" />
            {t(language, "premiumTitle")}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{t(language, "premiumHeadline")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t(language, "premiumSubhead")}</p>
        </motion.div>

        {/* No subscription state */}
        {/* {!hasSubscriptionData && !loading && (
          <motion.div 
            className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-sm border border-dashed border-purple-300 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CreditCard className="h-16 w-16 text-purple-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t(language, "noSubscriptionTitle") || "No Subscription Yet"}</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t(language, "noSubscriptionDesc") || "Unlock all premium features and enhance your child's learning experience!"}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-medium">
              <Sparkles className="h-4 w-4" />
              {t(language, "unlockFeatures") || "Unlock all features with Premium!"}
            </div>
          </motion.div>
        )} */}

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((p, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.15 }} viewport={{ once: true }}>
              <Card className={`relative ${p.highlighted ? "border-purple-400 ring-2 ring-purple-200 scale-[1.02]" : ""} transition-all hover:shadow-lg cursor-pointer shadow-sm h-full flex flex-col`}>
                {/* Current Plan Badge */}
                {subscription?.plan === p.planId && subscription?.status === "subscribed" && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10">
                    {t(language, "currentPlan") || "Current Plan"}
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold">{t(language, p.nameKey)}</CardTitle>
                    {p.badge && (
                      <span className="text-xs font-semibold bg-amber-200 text-amber-900 rounded-full px-3 py-1">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-bold">{p.price}</div>
                    <div className="text-xs text-muted-foreground">{t(language, p.periodKey)}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 group relative">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{t(language, f)}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute left-0 top-6 ml-6 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 max-w-xs pointer-events-none">
                        {featureDescriptions[f as keyof typeof featureDescriptions]}
                        </div>
                        <Info className="h-3 w-3 text-gray-400 mt-1 ml-1 flex-shrink-0" />
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    {/* Stripe Button */}
                    <Button
                      className={`w-full ${p.highlighted ? "bg-purple-700 hover:bg-purple-800" : "bg-purple-600 hover:bg-purple-700"} shadow-md transition-all`}
                      onClick={() => subscribeStripe(p.planId)}
                      disabled={changingPlan !== null}
                      size="lg"
                    >
                      {changingPlan === p.planId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t(language, "processing") || "Processing..."}
                        </>
                      ) : subscription?.plan === p.planId ? (
                        t(language, "subscribed")
                      ) : (
                        `${t(language, "pay")} ${p.price} (Card/Stripe)`
                      )}
                    </Button>

                    {/* MTN/Airtel Manual Button */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-yellow-400 hover:bg-yellow-50 py-3 h-auto"
                        onClick={() => openManualPayment(p.planId, "MTN")}
                        disabled={changingPlan !== null}
                      >
                        <Image src="/mtn-logo.png" alt="MTN" width={24} height={24} className="rounded-sm" />
                        <span className="text-xs sm:text-sm">{t(language, "pay")} {p.price} (MTN)</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-red-400 hover:bg-red-50 py-3 h-auto"
                        onClick={() => openManualPayment(p.planId, "Airtel")}
                        disabled={changingPlan !== null}
                      >
                        <Image src="/airtel-logo.jpeg" alt="Airtel" width={24} height={24} className="rounded-sm" />
                        <span className="text-xs sm:text-sm">{t(language, "pay")} {p.price} (Airtel)</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-2">{t(language, "trialNote")}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Benefits Section */}
        <motion.div className="grid md:grid-cols-3 gap-6" initial="hidden" whileInView="visible" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.2 } } }} viewport={{ once: true }}>
          <BenefitTile icon={<Trophy className="h-5 w-5" />} title={t(language, "benefit1Title")} desc={t(language, "benefit1Desc")} />
          <BenefitTile icon={<Sparkles className="h-5 w-5" />} title={t(language, "benefit2Title")} desc={t(language, "benefit2Desc")} />
          <BenefitTile icon={<Shield className="h-5 w-5" />} title={t(language, "benefit3Title")} desc={t(language, "benefit3Desc")} />
        </motion.div>

        <motion.div className="text-center space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Link href="/parent">
            <Button variant="outline">{t(language, "backToParentZone")}</Button>
          </Link>
        </motion.div>
      </main>

      <BottomNavigation />

      {/* Manual Payment Modal */}
      {showModal && selectedProvider && selectedPlan && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div 
            className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg"
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 id="modal-title" className="text-xl font-bold">{selectedProvider} Payment</h2>
              <Button variant="ghost" size="icon" onClick={closeModal} aria-label="Close dialog">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{selectedPlan === "yearly" ? t(language, "planYearly") : t(language, "planMonthly")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{plans.find(p => p.planId === selectedPlan)?.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pay to number:</span>
                <span className="font-semibold">{selectedProvider === "MTN" ? "078XXXXXXX" : "078YYYYYYY"}</span>
              </div>
              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                Open your MoMo app and send the above amount. Include your email in the message.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmittingPayment(true);

                const target = e.currentTarget as typeof e.currentTarget & {
                  phone: { value: string };
                  transaction: { value: string };
                };

                const phone = sanitizeInput(target.phone.value);
                const transaction = sanitizeInput(target.transaction.value);

                console.log("Submitting manual payment with:", {
                  parentId,
                  selectedProvider,
                  selectedPlan,
                  phone,
                  transaction,
                });

                if (!parentId) {
                  toast({
                    title: t(language, "error"),
                    description: "You must be logged in to submit a payment.",
                    variant: "destructive",
                  });
                  setSubmittingPayment(false);
                  return;
                }

                if (!phone || !transaction) {
                  toast({
                    title: t(language, "error"),
                    description:
                      t(language, "fillAllFields") || "Please fill in all fields",
                    variant: "destructive",
                  });
                  setSubmittingPayment(false);
                  return;
                }

                if (!validatePhoneNumber(phone, selectedProvider)) {
                  toast({
                    title: t(language, "error"),
                    description:
                      selectedProvider === "MTN"
                        ? t(language, "invalidMtnNumber") ||
                          "Please enter a valid MTN phone number"
                        : t(language, "invalidAirtelNumber") ||
                          "Please enter a valid Airtel phone number",
                    variant: "destructive",
                  });
                  setSubmittingPayment(false);
                  return;
                }

                try {
                  const { error } = await supabase.from("manual_payments").insert([
                    {
                      parent_id: parentId,
                      provider: selectedProvider,
                      plan: selectedPlan,
                      phone,
                      transaction_id: transaction,
                      created_at: new Date().toISOString(),
                    },
                  ]);

                  if (error) {
                    console.error("Supabase insert error:", error);
                    if (error.code === "23505") {
                      throw new Error("Transaction ID already used");
                    }
                    throw error;
                  }

                  toast({
                    title: t(language, "success"),
                    description:
                      t(language, "paymentSubmitted") ||
                      "Payment info submitted for verification",
                  });
                  closeModal();
                } catch (err: any) {
                  console.error("Unexpected error:", err);
                  toast({
                    title: t(language, "error"),
                    description: err.message || "Unexpected error occurred",
                    variant: "destructive",
                  });
                } finally {
                  setSubmittingPayment(false);
                }
              }}
            >
              <div className="space-y-3">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">
                    {t(language, "phoneNumber") || "Phone Number"}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder={selectedProvider === "MTN" ? "078XXXXXXX" : "075XXXXXXX"}
                    className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="transaction" className="block text-sm font-medium mb-1">
                    {t(language, "transactionId") || "Transaction ID"}
                  </label>
                  <input
                    id="transaction"
                    name="transaction"
                    type="text"
                    placeholder={
                      t(language, "transactionPlaceholder") ||
                      "Transaction ID / Reference"
                    }
                    className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1" disabled={submittingPayment}>
                  {submittingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t(language, "submitting") || "Submitting..."}
                    </>
                  ) : (
                    t(language, "submitPayment") || "Submit Payment"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={closeModal}
                  disabled={submittingPayment}
                >
                  {t(language, "cancel") || "Cancel"}
                </Button>
              </div>
            </form>

          </motion.div>
        </div>
      )}
    </div>
  );
}

// Benefit Tile Component
function BenefitTile({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string; }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      viewport={{ once: true }}
      className="h-full"
    >
      <Card className="bg-muted/30 hover:shadow-md transition-shadow h-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-purple-700 mb-3">
            <div className="p-2 bg-purple-100 rounded-full">
              {icon}
            </div>
            <div className="font-semibold">{title}</div>
          </div>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}