"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { getStorageUrl } from "@/lib/queries";

import LandingNav             from "@/components/homepage/sections/LandingNav";
import LandingDemoSection     from "@/components/homepage/sections/LandingDemoSection";
import LandingAppPreviewSection from "@/components/homepage/sections/LandingAppPreviewSection";
import LandingFAQSection      from "@/components/homepage/sections/LandingFAQSection";
import LandingNewsletterSection from "@/components/homepage/sections/LandingNewsletterSection";
import AppStoreBadges         from "@/components/homepage/LandingAppStoreBadges";

/* ─────────────────────────────────────────────────────────────
   DECORATIONS
───────────────────────────────────────────────────────────── */

function FloatCloud({ className = "", w = 140, delay = 0, opacity = 0.88, speed = 7 }: {
  className?: string; w?: number; delay?: number; opacity?: number; speed?: number;
}) {
  const noMotion = useReducedMotion();
  return (
    <motion.div
      className={`absolute pointer-events-none select-none z-0 ${className}`}
      animate={noMotion ? {} : { x:[0,20,0], y:[0,-8,0] }}
      transition={{ duration: speed, repeat: Infinity, ease:"easeInOut", delay }}
      style={{ opacity }}
      aria-hidden
    >
      <svg width={w} height={Math.round(w * 0.5)} viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="74" rx="88" ry="20" fill="white" />
        <circle cx="58"  cy="56" r="28" fill="white" />
        <circle cx="100" cy="42" r="38" fill="white" />
        <circle cx="143" cy="56" r="28" fill="white" />
      </svg>
    </motion.div>
  );
}

function EarlyAccessPill() {
  return (
    <span className="inline-flex items-center gap-1.5 font-nunito font-semibold text-[12px] text-gray-700 bg-white/85 backdrop-blur-sm border border-green-100 px-3 py-1 rounded-full shadow-sm">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
      <span>🌱 Now in early access — founding families only</span>
    </span>
  );
}

function StickyMobileCTA({ href, visible }: { href: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 88 }}
          animate={{ y: 0 }}
          exit={{ y: 88 }}
          transition={{ type: "spring", damping: 30, stiffness: 320 }}
          className="fixed bottom-0 inset-x-0 z-[55] lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-2xl px-4 pt-2 pb-4">
            <p className="text-center font-nunito text-gray-400 text-[10px] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1 animate-pulse" />
              🏅 Founding family price — locks in forever
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={href}
                className="flex-1 flex items-center justify-center gap-2 text-white font-baloo font-black text-[15px] py-3.5 rounded-2xl"
                style={{ background: "linear-gradient(135deg, var(--nimi-green) 0%, #166534 100%)", boxShadow: "0 4px 16px rgba(21,128,61,0.40)" }}
              >
                🚀 Start Free Today
              </Link>
              <div className="shrink-0 text-center">
                <p className="font-nunito text-gray-400 text-[10px] leading-tight">No credit card</p>
                <p className="font-nunito text-gray-400 text-[10px] leading-tight">Cancel anytime</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE DATA
───────────────────────────────────────────────────────────── */

const fadeUp = {
  hidden:  { opacity:0, y:30 },
  visible: { opacity:1, y:0, transition:{ duration:0.55, ease:[0.22,1,0.36,1] as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition:{ staggerChildren:0.11 } },
};

interface Story { id:string; slug:string; title:string; cover_url?:string; theme_emoji?:string; }

/* ─────────────────────────────────────────────────────────────
   PAGE COMPONENT
───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const noMotion = useReducedMotion();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [stories,      setStories]      = useState<Story[]>([]);
  const [authed,       setAuthed]       = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [ctaVisible,   setCtaVisible]   = useState(false);
  const [testimonials, setTestimonials] = useState<{
    id: string; name: string; role: string; location: string | null;
    quote: string; rating: number; avatar_url: string | null;
  }[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user } }) => { if (user) setAuthed(true); });
  }, []);
  useEffect(() => {
    fetch("/api/featured-stories?limit=4")
      .then(r => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setStories((d as Story[]).slice(0,4)); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    supabase
      .from('testimonials')
      .select('id, name, role, location, quote, rating, avatar_url')
      .eq('approved', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setTestimonials(data); });
  }, []);
  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 60);
      setCtaVisible(window.scrollY > 480);
    };
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NIMIPIKO",
    "applicationCategory": "EducationApplication",
    "operatingSystem": "Web, iOS, Android",
    "inLanguage": ["en", "fr", "rw"],
    "description": "Interactive stories, AI companion Nimi and achievement certificates for children ages 2–12 in English, French and Kinyarwanda.",
    "url": "https://nimipiko.com",
    "image": "https://nimipiko.com/nimipiko.png",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "author": { "@type": "Organization", "name": "NIMIPIKO", "url": "https://nimipiko.com" },
    "audience": { "@type": "EducationalAudience", "educationalRole": "student", "audienceType": "Children ages 2–12" },
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="min-h-screen font-nunito overflow-x-clip w-full" style={{ backgroundColor: 'var(--parchment)' }}>

      {/* ══ NAV + DRAWER ═════════════════════════════════════════════ */}
      <LandingNav
        scrolled={scrolled}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        authed={authed}
      />

      {/* ══ HERO MOBILE ══════════════════════════════════════════════ */}
      <section className="sm:hidden relative overflow-hidden" style={{minHeight:"100svh"}}>
        <Image src="/themes/default/hero/hero-background.png" alt="" aria-hidden fill priority
          className="object-cover object-top pointer-events-none select-none"
          style={{willChange:"transform",transform:"translateZ(0)"}} />
        <div className="absolute inset-x-0 top-0 h-[45%] pointer-events-none"
          style={{background:"linear-gradient(to bottom,rgba(255,255,255,0.92) 0%,rgba(255,255,255,0.85) 55%,transparent 100%)"}} />
        <FloatCloud className="top-20 -left-6" w={110} delay={0} opacity={0.55} speed={8} />

        <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center text-center px-6" style={{paddingTop:"clamp(92px,14dvh,112px)"}}>
          <span className="inline-flex items-center gap-1.5 font-nunito font-bold text-[10px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-2 shadow-sm">
            🇷🇼 Kinyarwanda · 🇫🇷 Français · 🇬🇧 English
          </span>
          <h1 className="font-baloo font-black leading-tight mb-1.5" style={{fontSize:"clamp(1.65rem,7.5vw,2.1rem)"}}>
            <span className="text-gray-900 block">The first app that speaks</span>
            <span className="text-[var(--ds-brand-primary)] block">your child&rsquo;s language.</span>
          </h1>
          <p className="font-nunito font-semibold text-gray-600 leading-snug mb-0" style={{fontSize:"clamp(0.72rem,3vw,0.82rem)",maxWidth:"30ch"}}>
            Stories, missions and printable certificates — crafted for Rwandan families and curious children worldwide.
          </p>
          <div className="flex justify-center mt-1.5">
            <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.93}} transition={{type:"spring",stiffness:420,damping:22}}>
              <Link href={authed ? "/home" : "/signuppage"}>
                <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                  className="h-auto object-contain drop-shadow-lg select-none" style={{width:"clamp(118px,34vw,150px)"}} />
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[70px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>
      <div className="sm:hidden flex justify-center bg-white pb-4 -mt-1">
        <EarlyAccessPill />
      </div>

      {/* ══ HERO TABLET ══════════════════════════════════════════════ */}
      <section className="hidden sm:block xl:hidden relative overflow-hidden" style={{minHeight:"100svh"}}>
        <Image src="/themes/default/hero/tablet-background.png" alt="" aria-hidden fill priority
          className="object-cover object-top pointer-events-none select-none"
          style={{willChange:"transform",transform:"translateZ(0)"}} />
        <div className="absolute inset-x-0 top-0 h-[52%] pointer-events-none"
          style={{background:"linear-gradient(to bottom,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0.65) 55%,transparent 100%)"}} />
        <FloatCloud className="top-24 -left-8" w={150} delay={0} opacity={0.50} speed={9} />

        {([
          {href:"/stories",   top:"32.69vw",label:"Lire"},
          {href:"/missions",  top:"39.60vw",label:"Créer"},
          {href:"/missions",  top:"46.60vw",label:"Explorer"},
          {href:"/missions",  top:"53.60vw",label:"Bouger"},
          {href:"/missions",  top:"60.60vw",label:"Chanter"},
          {href:"/community", top:"67.61vw",label:"Grandir"},
        ] as const).map(({href,top,label}) => (
          <Link key={label} href={href} aria-label={label} className="absolute z-20 cursor-pointer"
            style={{top,right:"6.54vw",width:"39.59vw",height:"6.45vw"}} />
        ))}
        <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center text-center px-10 lg:px-16" style={{paddingTop:"clamp(90px,16dvh,140px)"}}>
          <span className="inline-flex items-center gap-1.5 font-nunito font-bold text-[11px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-3 shadow-sm">
            🇷🇼 Kinyarwanda · 🇫🇷 Français · 🇬🇧 English
          </span>
          <h1 className="font-baloo font-black leading-tight mb-3" style={{fontSize:"clamp(2rem,3.8vw,3rem)"}}>
            <span className="text-gray-900 block">The first app that speaks</span>
            <span className="text-[var(--ds-brand-primary)] block">your child&rsquo;s language.</span>
          </h1>
          <p className="font-nunito font-semibold text-gray-700 leading-relaxed mb-1" style={{fontSize:"clamp(0.85rem,1.6vw,1rem)",maxWidth:"38ch"}}>
            Stories, missions and printable certificates — crafted for Rwandan families and curious children worldwide.
          </p>
          <div className="flex justify-center -mt-3">
            <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.93}} transition={{type:"spring",stiffness:420,damping:22}}>
              <Link href={authed ? "/home" : "/signuppage"}>
                <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                  className="w-auto h-auto object-contain drop-shadow-lg select-none" style={{width:"clamp(210px,27vw,270px)"}} />
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[80px] lg:h-[100px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══ HERO DESKTOP ═════════════════════════════════════════════ */}
      <section className="hidden xl:block relative overflow-hidden" style={{minHeight:"100svh"}}>
        <Image src="/themes/default/hero/new-background.png" alt="" aria-hidden fill priority
          className="object-cover object-top pointer-events-none select-none" />
        <div className="absolute inset-y-0 left-0 w-[46%] pointer-events-none"
          style={{background:"linear-gradient(to right,rgba(255,255,255,0.96) 0%,rgba(255,255,255,0.9) 42%,rgba(255,255,255,0.4) 73%,transparent 100%)"}} />
        <FloatCloud className="top-20 left-[44%]" w={180} delay={0} opacity={0.45} speed={10} />

        {([
          {href:"/stories",   top:"10.91vw",label:"Read"},
          {href:"/missions",  top:"16.62vw",label:"Create"},
          {href:"/missions",  top:"21.81vw",label:"Explore"},
          {href:"/missions",  top:"26.98vw",label:"Move"},
          {href:"/missions",  top:"32.15vw",label:"Sing"},
          {href:"/community", top:"37.31vw",label:"Grow"},
        ] as const).map(({href,top,label}) => (
          <Link key={label} href={href} aria-label={label} className="absolute z-20 cursor-pointer"
            style={{top,right:"7.01vw",width:"23.99vw",height:"5.14vw"}} />
        ))}
        <div className="absolute top-0 left-0 z-10 flex flex-col w-[40%] px-12 xl:px-16 2xl:px-20" style={{paddingTop:"clamp(100px,18dvh,180px)"}}>
          <span className="inline-flex items-center gap-1.5 font-nunito font-bold text-[11px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-4 shadow-sm self-start">
            🇷🇼 Kinyarwanda · 🇫🇷 Français · 🇬🇧 English
          </span>
          <h1 className="font-baloo font-black leading-tight mb-4" style={{fontSize:"clamp(2.2rem,3.6vw,4.2rem)"}}>
            <span className="text-gray-900 block">The first app</span>
            <span className="text-gray-900 block">that speaks</span>
            <span className="text-[var(--ds-brand-primary)] block">your child&rsquo;s language.</span>
          </h1>
          <p className="font-nunito font-semibold text-gray-700 leading-relaxed mb-1" style={{fontSize:"clamp(0.875rem,1.15vw,1.1rem)",maxWidth:"34ch"}}>
            Stories, missions and printable certificates — crafted for Rwandan families and curious children worldwide.
          </p>
          <div className="flex gap-3 flex-wrap items-center -mt-3">
            <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.93}} transition={{type:"spring",stiffness:420,damping:22}}>
              <Link href={authed ? "/home" : "/signuppage"}>
                <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                  className="w-auto h-auto object-contain drop-shadow-lg select-none" style={{width:"clamp(230px,16vw,310px)"}} />
              </Link>
            </motion.div>
            <Link href="/stories" className="font-baloo font-bold text-gray-600 hover:text-[var(--ds-brand-primary)] text-[14px] flex items-center gap-1.5 transition-colors">
              Browse Stories <span className="text-[16px]">→</span>
            </Link>
          </div>
          <div className="mt-4">
            <EarlyAccessPill />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[110px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══ WHY NIMIPIKO ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-green-800 mb-4 bg-green-200 px-4 py-1.5 rounded-full">
                🏰 Why families choose us
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                More than an app —<br /><span className="text-nimi-green">a world they love coming back to</span>
              </h2>
              <p className="font-nunito text-gray-600 mt-4 text-[15px] max-w-xl mx-auto leading-relaxed">
                Every story, mission and challenge is crafted by educators to build real skills while kids genuinely have fun.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
              <motion.div variants={fadeUp}>
                <motion.div whileHover={{y:-8,rotate:-0.5}} transition={{type:"spring",stiffness:260,damping:20}}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{background:"linear-gradient(145deg,#FDF2F8,#FCE7F3)", borderRadius:'var(--leaf-r-lg)'}}>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <img loading="lazy" src="/themes/default/quick-actions/btn-read.png" alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-pink-400 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Stories</h3>
                      </div>
                    </div>
                    <img loading="lazy" src="/themes/default/characters/nimi.png" alt="Nimi" className="w-28 h-28 object-contain self-center mb-4 drop-shadow" />
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Beautifully illustrated stories that build reading, vocabulary and imagination — in 3 languages.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Read-along narration","Vocabulary highlights","Comprehension activities"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <motion.div whileHover={{y:-8,rotate:0.5}} transition={{type:"spring",stiffness:260,damping:20}}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{background:"linear-gradient(145deg,#FFF7ED,#FFEDD5)", borderRadius:'var(--leaf-r-lg)'}}>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <img loading="lazy" src="/themes/default/quick-actions/btn-create.png" alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-orange-400 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Missions</h3>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 mb-4">
                      <img loading="lazy" src="/themes/default/quick-actions/btn-move.png" alt="" className="w-12 h-12 object-contain" />
                      <img loading="lazy" src="/themes/default/characters/piko.png" alt="Piko" className="w-24 h-24 object-contain drop-shadow -mt-2" />
                      <img loading="lazy" src="/themes/default/quick-actions/btn-sing.png" alt="" className="w-12 h-12 object-contain" />
                    </div>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Hands-on activities: drawing, singing, moving and exploring. Learning through play, not passive screens.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Drawing & colouring","Songs & karaoke","Movement activities"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <motion.div whileHover={{y:-8,rotate:-0.5}} transition={{type:"spring",stiffness:260,damping:20}}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{background:"linear-gradient(145deg,#EFF6FF,#DBEAFE)", borderRadius:'var(--leaf-r-lg)'}}>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <img loading="lazy" src="/themes/default/rewards/trophy.png" alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-blue-500 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Progress</h3>
                      </div>
                    </div>
                    <div className="flex justify-center items-end gap-2 mb-4">
                      <img loading="lazy" src="/themes/default/characters/zilo.png" alt="Zilo" className="w-24 h-24 object-contain drop-shadow" />
                      <img loading="lazy" src="/themes/default/rewards/ribbon.png" alt="" className="w-14 h-14 object-contain" />
                    </div>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Every milestone is celebrated. Parents track achievements while kids earn badges and certificates.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Stars & badges","Achievement certificates","Parent dashboard"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ DEMO VIDEO ═══════════════════════════════════════════════ */}
      <LandingDemoSection />

      {/* ══ APP PREVIEW ══════════════════════════════════════════════ */}
      <LandingAppPreviewSection authed={authed} />

      {/* ══ HOW IT WORKS ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="eyebrow inline-block text-amber-800 mb-4 bg-amber-200 px-4 py-1.5 rounded-full">
                🗺️ Your Journey Begins Here
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Ready in <span className="text-nimi-green">3 simple steps</span>
              </h2>
              <p className="font-nunito text-gray-600 mt-4 text-[15px]">
                Setup takes under 2 minutes. Your child starts their first story today.
              </p>
            </motion.div>

            <div className="relative grid sm:grid-cols-3 gap-8 sm:gap-6">
              <div className="hidden sm:block absolute top-14 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-0.5 bg-gradient-to-r from-amber-400 via-green-400 to-amber-400" />
              {([
                {step:"1",char:"/themes/default/characters/nimi.png",alt:"Nimi",
                 title:"Create your child's profile",
                 desc:"Add your child's name and age. Manage multiple children under one family account."},
                {step:"2",char:"/themes/default/characters/piko.png",alt:"Piko",
                 title:"Pick a language & start a story",
                 desc:"Choose English, French or Kinyarwanda — then dive into the first adventure together."},
                {step:"3",char:"/themes/default/characters/zilo.png",alt:"Zilo",
                 title:"Watch them learn & grow",
                 desc:"Kids earn stars, badges and certificates. You follow every milestone from your dashboard."},
              ] as const).map(({step,char,alt,title,desc}) => (
                <motion.div key={step} variants={fadeUp} className="flex flex-col items-center text-center gap-3">
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-full text-white font-baloo font-black text-[26px] flex items-center justify-center shadow-lg shadow-green-300/50 border-4 border-[#FEF9C3]" style={{backgroundColor:'var(--nimi-green)'}}>
                      {step}
                    </div>
                  </div>
                  <motion.img src={char} alt={alt} className="w-24 h-24 object-contain drop-shadow-md"
                    animate={{y:[0,-8,0]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut",delay:Number(step)*0.5}} />
                  <h3 className="font-baloo font-black text-gray-900 text-[17px] leading-snug">{title}</h3>
                  <p className="font-nunito text-gray-600 text-[13px] sm:text-[14px] leading-relaxed max-w-[230px] mx-auto">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ LANGUAGES ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-purple-700 mb-4 bg-purple-100 px-4 py-1.5 rounded-full">
                🌍 Three Languages, One Campus
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Your child learns in <span className="text-nimi-green">3 languages</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px] max-w-lg mx-auto leading-relaxed">
                Switch languages anytime — progress in each is saved. Give your child the gift of being truly multilingual.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6">
              {([
                {flag:"🇬🇧",lang:"English",     grad:"from-blue-500 to-sky-400",    border:"border-blue-200",  bg:"bg-blue-50",  tick:"text-blue-600",
                 desc:"Build reading, vocabulary and storytelling from day one.",
                 bullets:["Phonics & reading","Story comprehension","Creative prompts"]},
                {flag:"🇫🇷",lang:"French",      grad:"from-red-500 to-rose-400",    border:"border-red-200",   bg:"bg-red-50",   tick:"text-red-500",
                 desc:"Explore magical stories and missions en français.",
                 bullets:["French vocabulary","Listening & speaking","Cultural stories"]},
                {flag:"🇷🇼",lang:"Kinyarwanda", grad:"from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)]",border:"border-[var(--ds-border-brand)]/30", bg:"bg-[var(--ds-brand-subtle)]", tick:"text-[var(--ds-brand-primary)]",
                 desc:"Stay rooted in culture and mother tongue while learning.",
                 bullets:["Cultural heritage","Mother tongue pride","Community stories"]},
              ] as const).map(({flag,lang,grad,border,bg,tick,desc,bullets}) => (
                <motion.div key={lang} variants={fadeUp}>
                  <motion.div whileHover={{y:-7}} transition={{type:"spring",stiffness:280,damping:20}}
                    className={`border-2 ${border} ${bg} overflow-hidden shadow-md flex flex-col h-full`}
                    style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                    <div className={`bg-gradient-to-r ${grad} px-6 py-5 flex items-center gap-4`}>
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-[36px] shadow-inner">
                        {flag}
                      </div>
                      <h3 className="font-baloo font-black text-white text-[22px] drop-shadow">{lang}</h3>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <p className="font-nunito text-gray-500 text-[14px] leading-relaxed mb-5">{desc}</p>
                      <ul className="flex flex-col gap-2.5 mt-auto">
                        {bullets.map(b => (
                          <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                            <CheckCircle2 className={`w-4 h-4 shrink-0 ${tick}`} />{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURED STORIES ═════════════════════════════════════════ */}
      <section className="relative px-5 sm:px-10 lg:px-14 py-16 sm:py-20 overflow-hidden bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-60px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
              <div>
                <span className="eyebrow text-nimi-green mb-1 block">📚 The Library</span>
                <h2 className="font-baloo font-black text-gray-900 text-[20px] sm:text-[28px]">
                  Stories your child will love
                </h2>
              </div>
              <Link href="/stories" className="font-nunito font-bold text-nimi-green hover:underline text-sm transition-colors whitespace-nowrap">
                View all ›
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {stories.length > 0
                ? stories.map(story => (
                    <motion.div key={story.id} variants={fadeUp}>
                      <motion.div whileHover={{y:-6,scale:1.03}} whileTap={{scale:0.97}}
                        transition={{type:"spring",stiffness:380,damping:22}}>
                        <Link href={`/stories/${story.slug}`} className="group block">
                          <div className="relative overflow-hidden aspect-[4/3] bg-gray-100 mb-2.5 shadow-sm group-hover:shadow-xl transition-shadow duration-300" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                            {story.cover_url ? (
                              <Image src={getStorageUrl(story.cover_url)} alt={story.title} fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                                <span className="text-5xl">{story.theme_emoji ?? "📖"}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                              <div className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center shadow-xl">
                                <svg className="w-5 h-5 fill-[var(--nimi-green)] ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          </div>
                          <p className="font-baloo font-black text-gray-800 text-[13px] sm:text-[15px] leading-snug group-hover:text-[var(--ds-brand-primary)] transition-colors">
                            {story.title}
                          </p>
                        </Link>
                      </motion.div>
                    </motion.div>
                  ))
                : [...Array(4)].map((_,i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-100 aspect-[4/3] mb-2.5" style={{ borderRadius: 'var(--leaf-r)' }} />
                      <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                    </div>
                  ))
              }
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ SAFE FOR KIDS ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-[var(--ds-brand-primary)] mb-4 bg-[var(--ds-brand-subtle)] px-4 py-1.5 rounded-full">
                🛡️ Built for Families
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Built for kids.<br /><span className="text-nimi-green">Trusted by parents.</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
                Every decision we make puts your child&apos;s safety and wellbeing first — no exceptions.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {([
                {emoji:"🚫",title:"Zero Ads",       desc:"No ads. No distractions. Ever.",         grad:"from-red-400 to-rose-500"},
                {emoji:"🔒",title:"100% Private",    desc:"We never share your child's data.",       grad:"from-blue-400 to-indigo-500"},
                {emoji:"👨‍👩‍👧",title:"Parent Control", desc:"You manage your child's whole account.", grad:"from-purple-400 to-violet-500"},
                {emoji:"✅",title:"Safe Content",    desc:"Every story reviewed by educators.",       grad:"from-green-400 to-emerald-500"},
              ] as const).map(({emoji,title,desc,grad}) => (
                <motion.div key={title} variants={fadeUp}>
                  <motion.div whileHover={{y:-6,scale:1.03}} transition={{type:"spring",stiffness:300,damping:20}}
                    className="overflow-hidden shadow-md flex flex-col h-full"
                    style={{ borderRadius: 'var(--leaf-r)' }}>
                    <div className={`bg-gradient-to-br ${grad} p-5 flex items-center justify-center`}>
                      <span className="text-[44px]">{emoji}</span>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 flex flex-col gap-1 flex-1">
                      <p className="font-baloo font-black text-gray-900 text-[15px]">{title}</p>
                      <p className="font-nunito text-gray-500 text-[12px] leading-snug">{desc}</p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ TESTIMONIALS — hidden until approved rows exist in DB ══ */}
      {testimonials.length > 0 && (
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28"
        style={{background:"linear-gradient(135deg,#15803d 0%,#0f6b32 50%,#0a5228 100%)"}}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)", backgroundSize:"28px 28px"}} />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <span className="eyebrow inline-block text-green-200 mb-4 bg-white/10 px-4 py-1.5 rounded-full">
                ❤️ Families Love NIMIPIKO
              </span>
              <h2 className="font-baloo font-black text-white text-[28px] sm:text-[42px] leading-tight">
                What parents are saying
              </h2>
            </motion.div>

            <div className={`grid gap-6 ${testimonials.length === 1 ? '' : testimonials.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {testimonials.map(t => {
                const initials = t.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                const colors = ['bg-pink-500','bg-sky-500','bg-amber-500','bg-violet-500','bg-emerald-500','bg-rose-500'];
                const color  = colors[t.name.charCodeAt(0) % colors.length];
                return (
                  <motion.div key={t.id} variants={fadeUp}>
                    <div className="bg-white/10 border border-white/20 p-7 flex flex-col gap-5 h-full backdrop-blur-sm" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex gap-0.5">
                        {Array.from({length:5}).map((_,i) => (
                          <span key={i} className={`text-[18px] ${i < t.rating ? 'text-yellow-300' : 'text-white/20'}`}>★</span>
                        ))}
                      </div>
                      <p className="font-nunito text-white text-[14px] sm:text-[15px] leading-relaxed italic flex-1">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <div className="flex items-center gap-3">
                        {t.avatar_url ? (
                          <Image src={t.avatar_url} alt={t.name} width={48} height={48}
                            className="rounded-full object-cover shrink-0 shadow-md ring-2 ring-white/20" />
                        ) : (
                          <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0 shadow-md`}>
                            <span className="font-baloo font-black text-white text-[14px]">{initials}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-baloo font-black text-white text-[14px]">{t.name}</p>
                          <p className="font-nunito text-white/60 text-[11px]">
                            {t.role}{t.location ? ` · ${t.location}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ PRICING ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-[var(--ds-brand-primary)] mb-4 bg-[var(--ds-brand-subtle)] px-4 py-1.5 rounded-full">
                💫 Choose Your Adventure
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Simple, honest <span className="text-nimi-green">pricing</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px]">
                One subscription. Unlimited learning. Cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                  <span className="text-green-600 text-[14px]">🎉</span>
                  <span className="font-baloo font-black text-green-700 text-[13px]">Start exploring free — no credit card required</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
                  <span className="text-amber-500 text-[14px]">🏅</span>
                  <span className="font-baloo font-black text-amber-700 text-[13px]">Founding family price — locks in forever</span>
                </div>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <motion.div variants={fadeUp}>
                <div className="relative pt-5 flex flex-col h-full">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <motion.span
                      animate={{ boxShadow: ["0 0 0 0 rgba(21,128,61,0.5)", "0 0 0 8px rgba(21,128,61,0)", "0 0 0 0 rgba(21,128,61,0)"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                      className="flex items-center gap-1.5 bg-[var(--nimi-green)] text-white font-baloo font-black text-[11px] px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wide"
                      style={{ display: "inline-flex" }}>
                      ★ MOST POPULAR
                    </motion.span>
                  </div>
                  <div className="relative overflow-hidden shadow-xl flex flex-col flex-1 border-2 border-[var(--ds-border-brand)]/40" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                    <div className="bg-cta-gradient px-7 pt-8 pb-5 flex items-center gap-4">
                      <span className="text-[44px]">🌟</span>
                      <div>
                        <h3 className="font-baloo font-black text-white text-[22px] leading-tight">NIMIPIKO Club</h3>
                        <p className="font-nunito text-green-100 text-[12px]">Unlimited learning, every month</p>
                      </div>
                    </div>
                    <div className="bg-white p-7 flex flex-col gap-5 flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="font-baloo font-black text-gray-900 text-[38px] leading-none">$14.99</span>
                        <span className="font-nunito text-gray-400 text-[14px]">/ month</span>
                      </div>
                      <p className="font-nunito text-gray-400 text-[11px] -mt-3">or 9,900 RWF/month · Cancel anytime</p>
                      <ul className="flex flex-col gap-3">
                        {["All Interactive Stories","3 Languages (EN / FR / RW)","Creative Missions & Songs","Achievement Certificates","Parent Progress Dashboard","Nimi AI Learning Companion"].map(f => (
                          <li key={f} className="flex items-center gap-2.5 font-nunito text-[13px] text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-[var(--ds-brand-primary)] shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 mt-1">
                        <span className="text-[22px] shrink-0">🛡️</span>
                        <div>
                          <p className="font-baloo font-black text-green-800 text-[13px] leading-tight">30-day money-back guarantee</p>
                          <p className="font-nunito text-green-600 text-[11px]">Not happy? Full refund, no questions asked.</p>
                        </div>
                      </div>
                      <Link href={authed ? "/pricing" : "/signuppage"} className="mt-auto w-full text-center text-white font-baloo font-black py-3.5 shadow-md transition-all hover:-translate-y-0.5 active:scale-95 text-[15px]" style={{backgroundColor:'var(--nimi-green)', borderRadius:'var(--leaf-r)', boxShadow:'0 6px 20px rgba(5,150,105,0.35)'}}>
                        Start Free → Get Full Access
                      </Link>
                      <p className="text-center font-nunito text-gray-400 text-[11px] -mt-2">No credit card needed to explore</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <div className="relative overflow-hidden shadow-lg flex flex-col h-full border border-gray-200" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-400 px-7 pt-7 pb-5 flex items-center gap-4">
                    <span className="text-[44px]">🎨</span>
                    <div>
                      <h3 className="font-baloo font-black text-white text-[22px] leading-tight">Masterpiece</h3>
                      <p className="font-nunito text-purple-100 text-[12px]">A keepsake for life</p>
                    </div>
                  </div>
                  <div className="bg-white p-7 flex flex-col gap-5 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-baloo font-black text-gray-900 text-[38px] leading-none">$9.99</span>
                      <span className="font-nunito text-gray-400 text-[14px]">one-time</span>
                    </div>
                    <p className="font-nunito text-gray-400 text-[11px] -mt-3">A gift your child keeps forever</p>
                    <ul className="flex flex-col gap-3">
                      {["Personalised Hero Story","Child's Photo in the Book","Downloadable PDF Keepsake","Champion Certificate","A Memory That Lasts Forever"].map(f => (
                        <li key={f} className="flex items-center gap-2.5 font-nunito text-[13px] text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/pricing" className="mt-auto w-full text-center border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-700 font-baloo font-black py-3.5 transition-all text-[15px]" style={{ borderRadius: 'var(--leaf-r)' }}>
                      Create Their Story →
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ PARENT PROMISE ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-16 sm:py-20 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <span className="eyebrow inline-block text-gray-700 mb-3 bg-gray-100 px-4 py-1.5 rounded-full">
                🤝 Our Promise to Parents
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[24px] sm:text-[36px] leading-tight">
                Screen time they&apos;ll <span className="text-nimi-green">actually grow from</span>
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {([
                { icon: "🎓", title: "Educator-Designed", desc: "Every story and mission built with child development experts." },
                { icon: "⏱️", title: "15-Min Sessions",   desc: "Perfect learning bursts — no endless scrolling or autoplay traps." },
                { icon: "📊", title: "You See Everything", desc: "Real-time progress reports, time-on-app, and achievement milestones." },
                { icon: "🔄", title: "Cancel Anytime",    desc: "No lock-in, no hidden fees. Your trust is more valuable than your payment." },
              ] as const).map(({ icon, title, desc }) => (
                <motion.div key={title} variants={fadeUp}
                  className="flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-200 transition-all group">
                  <span className="text-[32px] leading-none">{icon}</span>
                  <p className="font-baloo font-black text-gray-900 text-[16px] group-hover:text-[var(--ds-brand-primary)] transition-colors">{title}</p>
                  <p className="font-nunito text-gray-500 text-[13px] leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 pt-20 sm:pt-28 pb-0"
        style={{background:"linear-gradient(180deg,#f0fdf4 0%,#dcfce7 60%,#bbf7d0 100%)"}}>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{backgroundImage:"radial-gradient(circle, #15803d 1px, transparent 1px)", backgroundSize:"32px 32px"}} />

        <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}
          className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6 relative z-10">

          <motion.div variants={fadeUp} className="flex items-center gap-2 bg-green-900/40 border border-green-700/50 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="font-baloo font-bold text-green-200 text-[12px] sm:text-[13px]">
              🌱 Early access — be a founding family
            </span>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-end justify-center">
            <motion.img loading="lazy" src="/themes/default/characters/nimi.png" alt="Nimi"
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-lg -mr-4 z-10"
              animate={noMotion ? {} : {y:[0,-9,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut",delay:0}} />
            <motion.img loading="lazy" src="/themes/default/characters/piko.png" alt="Piko"
              className="w-28 h-28 sm:w-40 sm:h-40 object-contain drop-shadow-xl z-20"
              animate={noMotion ? {} : {y:[0,-13,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut",delay:0.45}} />
            <motion.img loading="lazy" src="/themes/default/characters/zilo.png" alt="Zilo"
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-lg -ml-4 z-10"
              animate={noMotion ? {} : {y:[0,-9,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut",delay:0.9}} />
          </motion.div>

          <motion.h2 variants={fadeUp} className="font-baloo font-black text-gray-900 text-[32px] sm:text-[52px] leading-tight">
            Start your child&apos;s<br /><span className="text-nimi-green">adventure today! 🚀</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="font-nunito text-gray-600 text-[15px] sm:text-[16px] max-w-md leading-relaxed">
            Be among the first to give your child the gift of stories, language and creativity — at a founding family price that locks in forever.
          </motion.p>

          <motion.div variants={fadeUp} whileHover={{scale:1.06}} whileTap={{scale:0.95}}
            transition={{type:"spring",stiffness:400,damping:20}}>
            <Link href={authed ? "/home" : "/signuppage"}>
              <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                className="h-auto object-contain drop-shadow-xl select-none" style={{width:"clamp(200px,35vw,280px)"}} />
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="font-nunito text-gray-500 text-[12px]">
            No credit card required to explore. Cancel anytime.
          </motion.p>

          <motion.div variants={fadeUp}>
            <AppStoreBadges className="justify-center" />
          </motion.div>
        </motion.div>

        <div className="relative mt-12 pointer-events-none select-none overflow-hidden" style={{ height: "clamp(80px,14vw,160px)" }} aria-hidden>
          <div className="absolute inset-x-0 top-0 h-10 z-10"
            style={{ background: "linear-gradient(to bottom, #bbf7d0, transparent)" }} />
          <div className="absolute bottom-0 inset-x-0 max-w-4xl mx-auto flex items-end justify-center gap-3 sm:gap-6 px-4">
            <img loading="lazy" src="/themes/default/world/tree-3.png"     alt="" className="h-[55%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/birdhouse.png"  alt="" className="h-[40%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/greenhouse.png" alt="" className="h-[75%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/tree-1.png"     alt="" className="h-[65%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/greenhouse.png" alt="" className="h-[70%] w-auto object-contain object-bottom opacity-80" />
            <img loading="lazy" src="/themes/default/world/tree-2.png"     alt="" className="h-[60%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/tree-4.png"     alt="" className="h-[50%] w-auto object-contain object-bottom" />
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════ */}
      <LandingFAQSection />

      {/* ══ NEWSLETTER ═══════════════════════════════════════════════ */}
      <LandingNewsletterSection />

      {/* ══ STICKY MOBILE CTA ════════════════════════════════════════ */}
      <StickyMobileCTA href={authed ? "/home" : "/signuppage"} visible={ctaVisible} />

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 px-5 sm:px-10 lg:px-14 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-10 mb-10">
            <div className="flex flex-col items-center sm:items-start gap-3">
              <img loading="lazy" src="/nimi-logo.png" alt="NIMIPIKO" className="w-14 h-14 object-contain" />
              <p className="font-baloo font-black text-white text-[17px]">NIMIPIKO</p>
              <p className="font-nunito text-gray-400 text-[12px] max-w-[190px] text-center sm:text-left leading-relaxed">
                Where every child becomes the hero of their own story.
              </p>
              <div className="flex items-center gap-3 mt-1">
                {[
                  { href: "https://www.facebook.com/nimipiko", title: "Facebook", d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
                  { href: "https://www.instagram.com/nimipiko", title: "Instagram", d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zm1.5-4.87h.01M17.5 6.5h.01M6.5 6.5A5 5 0 0 0 2 11.5v5A5 5 0 0 0 7 21.5h10a5 5 0 0 0 5-5v-5a5 5 0 0 0-5-5z" },
                  { href: "https://www.tiktok.com/@nimipiko", title: "TikTok", d: "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" },
                  { href: "https://wa.me/250780000000", title: "WhatsApp", d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
                ].map(({ href, title, d }) => (
                  <a key={title} href={href} title={title} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={d} />
                    </svg>
                  </a>
                ))}
              </div>
              <div className="mt-4">
                <p className="font-nunito text-gray-500 text-[10px] uppercase tracking-widest mb-2.5">Download the app</p>
                <AppStoreBadges size="sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-10 text-center sm:text-left">
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Learn</p>
                {([["Stories","/stories"],["Activities","/missions"],["Community","/community"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Family</p>
                {([["For Parents","/parents"],["Pricing","/pricing"],["Help","/help"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Legal</p>
                {([["Privacy Policy","/privacy"],["Terms of Use","/terms"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-nunito text-gray-500 text-[12px]">
              © {new Date().getFullYear()} Nimipiko Studio LTD. Made with ❤️ for curious kids everywhere.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-nunito text-gray-500 text-[11px]">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
    </>
  );
}
