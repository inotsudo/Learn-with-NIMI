"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { ArrowLeft, Upload, Camera, Download, Sparkles, Crown, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import supabase from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { getChildren } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import { getParentAccess } from "@/lib/payments/products";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

interface Story {
  id: string; title: string; slug: string;
  cover_url: string | null; theme_emoji: string | null; is_personalizable: boolean;
}
interface MasterpieceOrder {
  id: string; child_name: string; story_id: string;
  status: string; pdf_url: string | null; created_at: string;
}

const CARD_GRADIENTS = [
  "from-purple-500 to-indigo-600",
  "from-rose-400 to-pink-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-blue-400 to-violet-600",
  "from-cyan-400 to-sky-600",
];

const STEP_LABELS = ["Choose Story", "Upload Photo", "Done!"];

// ── Confetti ────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#fbbf24","#f43f5e","#10b981","#3b82f6","#a855f7","#f97316","#06b6d4"];
function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.5,
    duration: 1.2 + Math.random() * 0.8,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {pieces.map(p => (
        <motion.div key={p.id}
          className="absolute top-0 rounded-sm"
          style={{ left:`${p.x}%`, width:p.size, height:p.size, background:p.color, rotate:p.rotate }}
          initial={{ y:-20, opacity:1 }}
          animate={{ y:"110vh", opacity:[1,1,0], rotate:p.rotate + 360 * 3 }}
          transition={{ duration:p.duration, delay:p.delay, ease:"easeIn" }}
        />
      ))}
    </div>
  );
}

// ── Step indicator ──────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEP_LABELS.map((label, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={current ? { scale:[1,1.12,1] } : {}}
                transition={{ duration:1.4, repeat:Infinity }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black border-2 transition-all ${
                  done    ? "bg-nimi-green border-nimi-green text-white" :
                  current ? "bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200" :
                            "bg-ds-surface border-ds-border text-ds-muted"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </motion.div>
              <p className={`text-[10px] font-bold hidden sm:block ${current ? "text-amber-600" : done ? "text-nimi-green" : "text-ds-muted"}`}>
                {label}
              </p>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-10 sm:w-16 h-0.5 mx-1 mb-4 transition-colors ${i < step ? "bg-nimi-green" : "bg-ds-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  initialChildren?: Child[];
}

export default function MasterpieceClient({ initialChildren }: Props = {}) {
  const m = useThemeMotion();
  const [child, setChild]   = useState<Child | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [orders, setOrders]   = useState<MasterpieceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [hasAccess, setHasAccess]          = useState<boolean | null>(null);
  const [step, setStep]                   = useState<"choose"|"upload"|"processing"|"done">("choose");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [photoFile, setPhotoFile]         = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [generating, setGenerating]       = useState(false);
  const [downloadUrl, setDownloadUrl]     = useState<string | null>(null);
  const [showConfetti, setShowConfetti]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const [list, storiesRes] = await Promise.all([
        initialChildren !== undefined ? Promise.resolve(initialChildren) : getChildren(),
        supabase.from("stories")
          .select("id, title, slug, cover_url, theme_emoji, is_personalizable")
          .eq("is_personalizable", true).eq("status", "published").order("sort_order"),
      ]);

      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const c = list.find(ch => ch.id === savedId) ?? list[0];
      setChild(c ?? null);
      setStories((storiesRes.data ?? []) as Story[]);

      if (user) {
        const [access, ordersRes] = await Promise.all([
          getParentAccess(user.id),
          supabase.from("masterpiece_orders")
            .select("*").eq("parent_id", user.id).order("created_at", { ascending: false }),
        ]);
        const granted = access.some(a => a === "personalized" || a.startsWith("personalized:"));
        setHasAccess(granted);
        setOrders((ordersRes.data ?? []) as MasterpieceOrder[]);
      } else {
        setHasAccess(false);
      }

      setLoading(false);
    })();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleGenerate = async () => {
    if (!selectedStory || !photoFile || !child) return;
    setGenerating(true);
    setStep("processing");

    try {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `masterpiece-photos/${child.id}_${Date.now()}.${ext}`;
      await supabase.storage.from("masterpieces").upload(path, photoFile, { upsert: true });
      const { data: urlData } = supabase.storage.from("masterpieces").getPublicUrl(path);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: mp, error } = await supabase.from("masterpiece_orders").insert({
        parent_id: user.id,
        child_id: child.id,
        story_id: selectedStory.id,
        child_name: child.name,
        child_photo_url: urlData.publicUrl,
        language: child.language,
      }).select().single();

      if (error || !mp) { setStep("choose"); setGenerating(false); return; }

      const res = await authedFetch("/api/masterpiece/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterpieceId: mp.id }),
      });
      const result = await res.json();

      if (result.success) {
        const dlRes  = await authedFetch(`/api/masterpiece/download?id=${mp.id}`);
        const dlData = await dlRes.json();
        setDownloadUrl(dlData.downloadUrl);
        setOrders(prev => [{ ...mp, status:"completed", pdf_url:dlData.downloadUrl }, ...prev]);
        setStep("done");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
      } else {
        setStep("choose");
      }
    } catch (err) {
      console.error("[Masterpiece]", err);
      setStep("choose");
    }
    setGenerating(false);
  };

  const resetToChoose = () => {
    setStep("choose"); setPhotoPreview(null); setPhotoFile(null);
    setSelectedStory(null); setConsentChecked(false); setDownloadUrl(null);
  };

  const stepIndex = step === "choose" ? 0 : step === "upload" ? 1 : 2;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">
          <div className="flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => <Bone key={i} className="h-8 flex-1 rounded-full" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-44 leaf-lg" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── PAYWALL ── user is loaded but has no "personalized" access ── */
  if (!loading && hasAccess === false) {
    return (
      <AppShell>
        <PageSurface>
          <main className="max-w-2xl mx-auto px-4 py-16 pb-28 flex flex-col items-center text-center gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl shadow-2xl shadow-amber-200"
            >
              👑
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h1 className="font-baloo font-black text-ds-text text-[28px] sm:text-[34px] leading-tight">
                Masterpiece is a Premium Feature
              </h1>
              <p className="text-gray-500 text-[15px] mt-3 max-w-md mx-auto leading-relaxed">
                Purchase the Masterpiece add-on once and your child becomes the hero of their own personalized storybook — complete with their photo woven into every page and a Champion Certificate.
              </p>
            </motion.div>

            {/* What they get */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                { icon: "📸", title: "Child's Photo in the Story", desc: "Headshot cropped and placed on every page" },
                { icon: "📖", title: "Personalized PDF Download", desc: "Printable keepsake forever" },
                { icon: "🏆", title: "Champion Certificate", desc: "With your child's name and photo" },
                { icon: "🌍", title: "Any Language", desc: "EN · FR · RW — their choice" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 bg-ds-card border border-ds-border rounded-2xl p-4 shadow-ds-card">
                  <span className="text-2xl shrink-0">{icon}</span>
                  <div>
                    <p className="font-black text-ds-text text-[13px]">{title}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row items-center gap-3">
              <a href="/pricing"
                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-[16px] shadow-xl shadow-amber-200 flex items-center gap-2 hover:opacity-90 transition">
                <Crown className="w-5 h-5" /> Get Masterpiece — $29.99
              </a>
              <a href="/"
                className="text-gray-400 text-[13px] font-bold hover:text-ds-text transition">
                Back to home
              </a>
            </motion.div>

            <p className="text-gray-400 text-[11px]">One-time purchase · No subscription needed · 40,000 RWF for Rwanda</p>
          </main>
        </PageSurface>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSurface>
        <AnimatePresence>{showConfetti && <Confetti key="confetti" />}</AnimatePresence>

        <main className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-28 w-full">

          {/* ── HERO ── */}
          <HeroBanner zone="treasureRoom" className="mb-6">
            <button onClick={() => window.history.back()}
              className="absolute top-4 left-5 z-20 flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-bold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />

            {/* Floating sparkles */}
            {([ {t:"15%",l:"7%",d:0},{t:"70%",l:"11%",d:0.7},{t:"20%",r:"6%",d:0.35},{t:"65%",r:"9%",d:1.1} ] as Array<{t:string;d:number;l?:string;r?:string}>).map((s,i)=>(
              <motion.span key={i} className="absolute pointer-events-none select-none text-[15px]"
                style={{ top:s.t, left:s.l, right:s.r }}
                animate={{ opacity:[0.3,1,0.3], y:[0,-6,0] }}
                transition={{ duration:2.5, repeat:Infinity, delay:s.d }} aria-hidden>
                {["✨","⭐","👑","🌟"][i]}
              </motion.span>
            ))}

            <div className="relative z-10 px-5 pt-12 pb-6 sm:px-7 flex items-center gap-4">
              <motion.div
                animate={{ y:[0,-6,0], rotate:[0,4,-4,0] }}
                transition={{ duration:3.2, repeat:Infinity }}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-xl border-2 border-white/40 shrink-0"
              >
                👑
              </motion.div>
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5">Premium Feature</p>
                <h1 className="font-baloo font-black text-white text-[24px] sm:text-[32px] leading-tight drop-shadow-md">
                  Masterpiece Studio
                </h1>
                <p className="text-white/80 text-[12px] sm:text-[13px] font-semibold mt-0.5">
                  {child?.name ? `${child.name} becomes the hero of their own story` : "Your child becomes the hero of their own story"}
                </p>
              </div>
            </div>
          </HeroBanner>

          {/* ── STEP INDICATOR ── */}
          {step !== "processing" && <StepBar step={stepIndex} />}

          {/* ── STEP 1: CHOOSE STORY ── */}
          <AnimatePresence mode="wait">
            {step === "choose" && (
              <motion.div key="choose"
                initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:20 }}
                transition={{ type:"spring", stiffness:320, damping:28 }}
                className="space-y-6"
              >
                {stories.length === 0 ? (
                  <div className="text-center py-16 bg-ds-surface border border-ds-border shadow-ds-card"
                    style={{ borderRadius:"var(--leaf-r-lg)" }}>
                    <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:2.4, repeat:Infinity }}
                      className="text-6xl mb-4">👑</motion.div>
                    <p className="text-ds-text font-black text-[18px]">No personalizable stories yet</p>
                    <p className="text-ds-muted text-[13px] mt-2">Check back soon — new stories are coming!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white font-black text-[13px]">1</div>
                      <h2 className="font-baloo font-black text-ds-text text-[20px]">Choose a Story</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {stories.map((story, i) => (
                        <motion.button key={story.id}
                          whileHover={{ y:-4, transition:{ type:"spring", stiffness:360, damping:28 } }}
                          whileTap={m.buttonPress}
                          onClick={() => { setSelectedStory(story); setStep("upload"); }}
                          className={`text-left overflow-hidden border-2 transition-all bg-ds-surface shadow-ds-card ${
                            selectedStory?.id === story.id
                              ? "border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.15)]"
                              : "border-ds-border hover:border-amber-300"
                          }`}
                          style={{ borderRadius:"var(--leaf-r)" }}
                        >
                          <div className={`h-36 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} flex items-center justify-center text-6xl relative overflow-hidden`}>
                            <motion.span
                              animate={{ scale:[1,1.08,1] }}
                              transition={{ duration:3, repeat:Infinity, delay:i*0.2 }}
                            >
                              {story.theme_emoji || "📖"}
                            </motion.span>
                            {/* Shimmer overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/20 pointer-events-none" />
                          </div>
                          <div className="p-4">
                            <p className="font-baloo font-black text-ds-text text-[16px] leading-tight">{story.title}</p>
                            <p className="text-amber-500 text-[11px] mt-1.5 flex items-center gap-1 font-bold">
                              <Crown className="w-3 h-3" /> Personalizable
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}

                {/* Previous orders */}
                {orders.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-baloo font-black text-ds-text text-[18px] mb-3">Your Masterpieces</h2>
                    <div className="space-y-3">
                      {orders.map(order => (
                        <motion.div key={order.id}
                          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                          className="bg-ds-surface border border-ds-border shadow-ds-card p-4 flex items-center gap-4"
                          style={{ borderRadius:"var(--leaf-r)" }}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                            order.status === "completed" ? "bg-emerald-100" :
                            order.status === "processing" ? "bg-amber-100" : "bg-gray-100"
                          }`}>
                            {order.status === "completed" ? "✅" : order.status === "processing" ? "⏳" : "📖"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-ds-text font-black text-[14px]">{order.child_name}&apos;s Story</p>
                            <p className="text-gray-400 text-[11px] font-semibold mt-0.5">
                              {new Date(order.created_at).toLocaleDateString()} · {order.status}
                            </p>
                          </div>
                          {order.status === "completed" && (
                            <motion.button whileTap={m.buttonPress}
                              onClick={async () => {
                                const res = await authedFetch(`/api/masterpiece/download?id=${order.id}`);
                                const data = await res.json();
                                if (data.downloadUrl) window.open(data.downloadUrl, "_blank");
                              }}
                              className="flex items-center gap-1.5 text-white font-bold text-[12px] px-3.5 py-2 rounded-full shadow-sm"
                              style={{ backgroundColor:"var(--nimi-green)" }}>
                              <Download className="w-3.5 h-3.5" /> Download
                            </motion.button>
                          )}
                          {order.status === "processing" && (
                            <span className="text-amber-500 text-[12px] font-bold animate-pulse">Generating…</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: UPLOAD PHOTO ── */}
            {step === "upload" && selectedStory && (
              <motion.div key="upload"
                initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-20 }}
                transition={{ type:"spring", stiffness:320, damping:28 }}
                className="bg-ds-surface border border-ds-border shadow-ds-card p-6 space-y-6"
                style={{ borderRadius:"var(--leaf-r-lg)" }}
              >
                {/* Story selected banner */}
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                  <span className="text-2xl">{selectedStory.theme_emoji || "📖"}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-wide">Selected Story</p>
                    <p className="text-ds-text font-black text-[14px] truncate">{selectedStory.title}</p>
                  </div>
                  <button onClick={() => setStep("choose")} className="ml-auto text-[11px] font-bold text-amber-500 hover:text-amber-700 shrink-0">
                    Change
                  </button>
                </div>

                {/* Upload header */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white font-black text-[13px]">2</div>
                    <h2 className="font-baloo font-black text-ds-text text-[20px]">Upload a Photo</h2>
                  </div>
                  <p className="text-gray-500 text-[13px] ml-9">
                    A clear headshot of {child?.name || "your child"} works best
                  </p>
                </div>

                {/* Photo upload area */}
                <div className="flex flex-col items-center">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  <motion.button
                    whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-dashed border-amber-300 hover:border-amber-400 transition-colors flex items-center justify-center bg-amber-50/50"
                  >
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover"  loading="lazy" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition rounded-full">
                          <Camera className="w-8 h-8 text-white" />
                          <p className="text-white text-[12px] font-bold mt-1">Change</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-amber-400">
                        <Upload className="w-12 h-12" />
                        <p className="font-black text-[13px]">Tap to upload</p>
                        <p className="text-[11px] text-amber-300 font-semibold">JPG, PNG, WEBP</p>
                      </div>
                    )}
                  </motion.button>
                  {!photoPreview && (
                    <p className="text-gray-400 text-[11px] mt-3 text-center max-w-[200px] leading-relaxed">
                      Use a well-lit, clear headshot for the best result
                    </p>
                  )}
                </div>

                {/* COPPA consent */}
                <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-2xl border-2 transition ${
                  consentChecked ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50/60"
                }`}>
                  <input type="checkbox" checked={consentChecked}
                    onChange={e => setConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-green-600 shrink-0 cursor-pointer" />
                  <span className="font-nunito text-[12px] text-gray-700 leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer"
                      className="text-nimi-green underline font-bold">Terms of Use</a>
                    {" "}and confirm I have the right to share this photo on Nimipiko.
                  </span>
                </label>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setStep("choose"); setPhotoPreview(null); setPhotoFile(null); setConsentChecked(false); }}
                    className="flex-1 py-3 rounded-2xl bg-ds-surface border border-ds-border text-ds-text hover:bg-ds-border/30 font-bold text-[14px] transition">
                    Back
                  </button>
                  <motion.button whileTap={m.buttonPress} onClick={handleGenerate}
                    disabled={!photoFile || !consentChecked}
                    className="flex-2 flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-[14px] shadow-lg shadow-amber-200 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 transition"
                  >
                    <Sparkles className="w-4 h-4" /> Create Masterpiece
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: PROCESSING ── */}
            {step === "processing" && (
              <motion.div key="processing"
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-6xl mb-4"
                >🎨</motion.div>
                <p className="font-baloo font-black text-ds-text text-[18px]">
                  {`Creating ${child?.name || "your child"}'s masterpiece…`}
                </p>
                <p className="text-gray-400 text-[12px] mt-8 font-semibold">
                  This takes about 30–60 seconds
                </p>
              </motion.div>
            )}

            {/* ── STEP 4: DONE ── */}
            {step === "done" && (
              <motion.div key="done"
                initial={{ opacity:0, scale:0.94 }} animate={{ opacity:1, scale:1 }}
                transition={{ type:"spring", stiffness:300, damping:26 }}
                className="text-center py-10"
              >
                <motion.div
                  initial={{ scale:0, rotate:-30 }}
                  animate={{ scale:1, rotate:0 }}
                  transition={{ type:"spring", stiffness:400, damping:20, delay:0.1 }}
                  className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl shadow-2xl shadow-amber-200"
                >
                  👑
                </motion.div>

                <motion.h2
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
                  className="font-baloo font-black text-ds-text text-[28px] sm:text-[34px]"
                >
                  Masterpiece Ready!
                </motion.h2>
                <motion.p
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
                  className="text-gray-500 text-[15px] mt-2"
                >
                  {child?.name}&apos;s personalized story is ready to download 🎉
                </motion.p>

                {downloadUrl && (
                  <motion.a href={downloadUrl} target="_blank"
                    initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}
                    whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                    className="inline-flex items-center gap-2.5 mt-8 px-10 py-4 rounded-2xl text-white font-black text-[16px] shadow-xl shadow-amber-200 bg-gradient-to-r from-amber-400 to-orange-500"
                  >
                    <Download className="w-5 h-5" /> Download PDF
                  </motion.a>
                )}

                <motion.button
                  initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
                  onClick={resetToChoose}
                  className="block mx-auto mt-5 text-gray-400 text-[13px] font-bold hover:text-ds-text transition"
                >
                  Create Another →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </PageSurface>
    </AppShell>
  );
}
