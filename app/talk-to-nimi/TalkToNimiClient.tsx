"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { ArrowLeft, Send, Mic, Volume2, VolumeX, Crown } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import {
  getChildren,
  getTodayStars, getActivityDates, getChildBadges, getBadgeImages, getTodayMissions,
  getClaimedChallenges, claimChallengeReward,
} from "@/lib/queries";
import { getStoryLibrary, getStorySlots } from "@/lib/storyRepository";
import { getDayPeriod } from "@/components/challenges/_challengeData";
import { computeStreaks } from "@/lib/parentInsights";
import { useNimiChat, type ChatMessage } from "@/hooks/useNimiChat";
import { useSpeechToText, speechErrorKey } from "@/hooks/useSpeechToText";
import QuickReplyChips from "@/components/home/QuickReplyChips";
import ChatQuestBanner from "@/components/home/ChatQuestBanner";
import ChatSidebar from "@/components/home/ChatSidebar";
import { NIMI_CHAT_HANDOFF_KEY } from "@/components/home/TalkToNimi";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import { useScreenTime } from "@/lib/screenTime";
import BreakNudge from "@/components/learn/BreakNudge";
import VoiceCompanionView from "@/components/voice/VoiceCompanionView";
import supabase from "@/lib/supabaseClient";
import { getActiveSubscription } from "@/lib/payments/products";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const QUEST_TARGET = 3;

const QUEST_STARS  = 10;


interface Props {
  initialChildren?: import("@/lib/queries").Child[];
  initialHasSubscription?: boolean;
}

export default function TalkToNimiClient({ initialChildren, initialHasSubscription }: Props = {}) {
  return <Suspense><TalkToNimiInner initialChildren={initialChildren} initialHasSubscription={initialHasSubscription} /></Suspense>;
}

function TalkToNimiInner({ initialChildren, initialHasSubscription }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const searchParams = useSearchParams();
  const initialMode: "chat" | "practice" = searchParams.get("mode") === "practice" ? "practice" : "chat";
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<number | null>(null);
  const [childLanguage, setChildLanguage] = useState<"en" | "fr" | "rw">("en");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const list = initialChildren !== undefined ? initialChildren : await getChildren();
    let name = t("defaultChildName");
    let id: string | null = null;
    let lang: "en" | "fr" | "rw" = "en";
    let age: number | null = null;
    if (list.length > 0) {
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      name = child.name;
      id   = child.id;
      lang = child.language;
      age  = child.age ?? null;
    }
    setChildName(name);
    setChildId(id);
    setChildAge(age);
    setChildLanguage(lang);

    const greeting: ChatMessage = { from: "nimi", text: t("nimiGreeting").replace("{name}", name) };
    let initial: ChatMessage[] = [greeting];
    let pending: string | null = null;
    const raw = sessionStorage.getItem(NIMI_CHAT_HANDOFF_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data.messages) && data.messages.length > 0) initial = data.messages;
        if (typeof data.pending === "string") pending = data.pending;
      } catch { /* ignore */ }
      sessionStorage.removeItem(NIMI_CHAT_HANDOFF_KEY);
    }

    setInitialMessages(initial);
    setPendingMessage(pending);

    if (initialHasSubscription !== undefined) {
      setHasSubscription(initialHasSubscription);
    } else {
      // Non-blocking subscription check for the message counter
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const sub = await getActiveSubscription(user.id);
        setHasSubscription(!!sub);
      }
    }
  };

  if (initialMessages === null) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pb-24 space-y-3 pt-4">
          <Bone className="h-14 leaf-lg" />
          <div className="flex-1 space-y-3">
            <Bone className="h-16 w-3/4 leaf-lg" />
            <Bone className="h-12 w-2/3 leaf-lg self-end ml-auto" />
            <Bone className="h-16 w-4/5 leaf-lg" />
            <Bone className="h-12 w-1/2 leaf-lg" />
          </div>
          <Bone className="h-14 leaf-lg mt-auto" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <NimiChatPageContent
        childId={childId}
        childName={childName}
        childAge={childAge}
        childLanguage={childLanguage}
        hasSubscription={hasSubscription}
        initialMessages={initialMessages}
        pendingMessage={pendingMessage}
        initialMode={initialMode}
      />
    </AppShell>
  );
}

function NimiChatPageContent({
  childId, childName, childAge, childLanguage, hasSubscription, initialMessages, pendingMessage, initialMode,
}: {
  childId: string | null;
  childName: string;
  childAge: number | null;
  childLanguage: "en" | "fr" | "rw";
  hasSubscription: boolean;
  initialMessages: ChatMessage[];
  pendingMessage: string | null;
  initialMode: "chat" | "practice";
}) {
  const [currentStoryId,       setCurrentStoryId]       = useState<string | null>(null);
  const [currentStoryTitle,    setCurrentStoryTitle]    = useState<string | null>(null);
  const [currentStoryEmoji,    setCurrentStoryEmoji]    = useState<string | null>(null);
  const [currentStoryProgress, setCurrentStoryProgress] = useState(0);
  const [slotsDone,  setSlotsDone]  = useState(0);
  const [slotsTotal, setSlotsTotal] = useState(0);
  const [promptIdx, setPromptIdx]   = useState(0);

  const noMotion = useReducedMotion() ?? false;
  const m        = useThemeMotion();
  const { t, language } = useLanguage();
  const NIMI_PROMPTS = [
    t("nimiPrompt1"), t("nimiPrompt2"), t("nimiPrompt3"),
    t("nimiPrompt4"), t("nimiPrompt5"), t("nimiPrompt6"),
  ];
  const { themeId }     = useAppTheme();
  const assets          = getThemeAssets(themeId);
  const messagesRef     = useRef<HTMLDivElement>(null);
  const hasResumedRef   = useRef(false);
  const [chatInput,       setChatInput]       = useState("");
  const [pageMode,        setPageMode]        = useState<"chat" | "practice">(initialMode);
  const [practicePassage, setPracticePassage] = useState<string | null>(null);

  const [todayStars,           setTodayStars]           = useState(0);
  const [chatStreakDays,        setChatStreakDays]        = useState(0);
  const [earnedBadges,         setEarnedBadges]         = useState<import("@/lib/queries").ChildBadge[]>([]);
  const [badgeImageMap,        setBadgeImageMap]         = useState<Record<string, string>>({});
  const [activitiesCompleted,  setActivitiesCompleted]  = useState(0);
  const [exchangeCount,        setExchangeCount]        = useState(0);
  const [questClaimed,         setQuestClaimed]         = useState(false);

  const questSlug = `daily-chat-${getDayPeriod()}`;
  const canClaim  = !!childId && exchangeCount >= QUEST_TARGET && !questClaimed;

  const handleExchangeComplete = () => setExchangeCount(prev => prev + 1);

  const handleClaimQuest = async () => {
    if (!childId || questClaimed) return;
    const ok = await claimChallengeReward(childId, childLanguage, questSlug, QUEST_STARS);
    if (ok) {
      setQuestClaimed(true);
      setTodayStars(prev => prev + QUEST_STARS);
    }
  };

  const { messages, isTyping, send, sendVoice, isSpeaking, toggleSpeak, dailyLimitReached, nimiMessagesUsed } = useNimiChat(initialMessages, {
    childName,
    onExchangeComplete: handleExchangeComplete,
    childId:         childId,
    childAge:        childAge,
    storyId:         currentStoryId,
    storyTitle:      currentStoryTitle,
    storyEmoji:      currentStoryEmoji,
    storyProgress:   currentStoryProgress,
    slotsDone,
    slotsTotal,
    persistOnUnmount: true,
    hasSubscription,
  });

  const { status: screenStatus, offlineSuggestion, dismiss: dismissBreak } =
    useScreenTime(childId, childAge);

  // Rotate mascot prompt
  useEffect(() => {
    const id = setInterval(() => setPromptIdx(p => (p + 1) % NIMI_PROMPTS.length), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (pendingMessage && !hasResumedRef.current) {
      hasResumedRef.current = true;
      void send(pendingMessage);
    }
  }, [pendingMessage, send]);

  useEffect(() => {
    if (!childId) return;
    void loadStats(childId, childLanguage);
  }, [childId, childLanguage]);

  const loadStats = async (id: string, lang: "en" | "fr" | "rw") => {
    const [stars, dates, badges, stories, claimed, todayMissions, imageMap] = await Promise.all([
      getTodayStars(id, lang),
      getActivityDates(id, lang),
      getChildBadges(id, lang),
      getStoryLibrary(id, lang),
      getClaimedChallenges(id, lang),
      getTodayMissions(id, lang),
      getBadgeImages(),
    ]);
    if (claimed.has(`daily-chat-${getDayPeriod()}`)) setQuestClaimed(true);
    setTodayStars(stars);
    setChatStreakDays(computeStreaks(dates).current);
    setEarnedBadges(badges);
    setBadgeImageMap(imageMap);
    setActivitiesCompleted(todayMissions.length);

    const curStory = stories.find((s: { unlocked: boolean; complete: boolean }) => s.unlocked && !s.complete) ?? stories[0];
    if (curStory) {
      setCurrentStoryId(curStory.sid);
      setCurrentStoryTitle(curStory.title);
      setCurrentStoryEmoji(curStory.theme_emoji ?? null);
      setCurrentStoryProgress(curStory.progress ?? 0);
      const [slots, passageResult] = await Promise.all([
        getStorySlots(id, curStory.sid, lang),
        supabase.rpc("get_story_practice_passage", { p_child_id: id, p_language: lang }),
      ]);
      setSlotsDone(slots.filter((s: { completed: boolean }) => s.completed).length);
      setSlotsTotal(slots.length);
      const passageData = passageResult.data as { passage?: string } | null;
      if (passageData?.passage) setPracticePassage(passageData.passage);
    }
  };

  const sendChat = (overrideText?: string) => {
    const msg = (overrideText ?? chatInput).trim();
    if (!msg || isTyping) return;
    setChatInput("");
    void send(msg);
  };

  const { listening, supported: micSupported, start: startListening, stop: stopListening, interimText, error: micError } =
    useSpeechToText(language, (text) => { void sendVoice(text); });
  const showMic = micSupported && language !== "rw";

  return (
    <PageSurface>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full content-enter">

        {/* ── HERO ── */}
        <HeroBanner zone="nimiChat" className="mb-4">
          <button
            onClick={() => window.history.back()}
            className="absolute top-4 left-5 z-20 flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t("storyBackBtn")}
          </button>

          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />

          {/* Floaters */}
          {(([
            { top:"14%", left:"6%",  emoji:"⭐", delay:0   },
            { top:"68%", left:"10%", emoji:"✨", delay:0.6 },
            { top:"18%", right:"5%", emoji:"💬", delay:0.3 },
            { top:"66%", right:"8%", emoji:"⭐", delay:1   },
          ]) as Array<{top:string;emoji:string;delay:number;left?:string;right?:string}>).map((d, i) => (
            <motion.span key={i} className="absolute pointer-events-none select-none text-[14px]"
              style={{ top:d.top, left:d.left, right:d.right }}
              animate={noMotion ? {} : { opacity:[0.3,1,0.3], y:[0,-5,0] }}
              transition={noMotion ? {} : { duration:2.4, repeat:Infinity, delay:d.delay }}
              aria-hidden>
              {d.emoji}
            </motion.span>
          ))}

          <div className="relative z-10 px-5 pt-12 pb-5 sm:px-7 sm:pb-6 flex items-center gap-4">
            <motion.img src={assets.nimiCircle} alt="Nimi"
              animate={noMotion ? {} : { y:[0,-5,0] }}
              transition={noMotion ? {} : { duration:2.5, repeat:Infinity }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/40 shadow-lg shrink-0"
              loading="lazy" />
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5">{t("nimiChatAIFriend")}</p>
              <h1 className="font-baloo font-black text-white text-[22px] sm:text-[28px] leading-tight drop-shadow-md">
                {t("nimiChatPageTitle")}
              </h1>
              <p className="text-white/75 text-[12px] sm:text-[13px] font-semibold mt-0.5">
                {t("nimiChatPageSubtitle")}
              </p>
            </div>
          </div>
        </HeroBanner>

        {/* Mode toggle */}
        <div className="flex justify-center mb-4">
          <div className="flex rounded-full overflow-hidden border border-ds-border shadow-sm">
            {([
              { val: "chat",     label: "💬 Chat with Nimi"  },
              { val: "practice", label: "🎤 Practice Reading" },
            ] as const).map(({ val, label }) => (
              <button key={val} onClick={() => setPageMode(val)}
                className="px-5 py-2 text-[13px] font-black transition"
                style={{
                  background: pageMode === val ? "var(--nimi-green,#15803D)" : "var(--ds-surface-card,#fff)",
                  color:      pageMode === val ? "#fff" : "var(--ds-text-secondary,#6B7280)",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quest banner */}
        <div className="mb-4">
          <ChatQuestBanner
            exchangeCount={exchangeCount}
            target={QUEST_TARGET}
            claimed={questClaimed}
            canClaim={canClaim}
            onClaim={handleClaimQuest}
          />
        </div>

        {/* ── 3-COL LAYOUT ── */}
        <div className="lg:grid lg:grid-cols-[220px_1fr_300px] lg:gap-4 lg:items-start">

          {/* LEFT: Mascot (desktop only) */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-4 lg:sticky lg:top-24">
            {/* Rotating speech bubble */}
            <div className="w-full relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={promptIdx}
                  initial={{ opacity:0, y:6, scale:0.96 }}
                  animate={{ opacity:1, y:0, scale:1 }}
                  exit={{ opacity:0, y:-4, scale:0.96 }}
                  transition={{ duration:0.3 }}
                  className="bg-ds-surface border border-ds-border shadow-sm px-4 py-3 text-center"
                  style={{ borderRadius:"var(--leaf-r)" }}
                >
                  <p className="text-[13px] font-bold text-ds-text leading-snug">{NIMI_PROMPTS[promptIdx]}</p>
                </motion.div>
              </AnimatePresence>
              {/* Downward pointer */}
              <div className="mx-auto w-0 h-0 mt-0"
                style={{
                  width:0, height:0,
                  borderLeft:"9px solid transparent",
                  borderRight:"9px solid transparent",
                  borderTop:"9px solid var(--ds-border-primary)",
                  marginLeft:"50%", transform:"translateX(-50%)"
                }} />
            </div>

            {/* NIMI image */}
            <motion.img
              src={assets.nimiCircle} alt="NIMI"
              className="w-36 h-36 rounded-full object-cover border-4 border-yellow-400 shadow-xl"
              animate={noMotion ? {} : { y:[0,-8,0] }}
              transition={noMotion ? {} : { duration:3.5, repeat:Infinity, ease:"easeInOut" }}
              loading="lazy" />

            {/* Streak */}
            {chatStreakDays > 0 && (
              <motion.div
                initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 px-4 py-2.5 rounded-2xl w-full"
              >
                <span className="text-2xl leading-none">🔥</span>
                <div>
                  <p className="font-black text-orange-600 text-[13px] leading-tight">{chatStreakDays} {t("nimiChatStreakLabel")}</p>
                  <p className="text-[10px] text-orange-400 font-semibold">{t("nimiChatKeepGoing")}</p>
                </div>
              </motion.div>
            )}

            {/* Today's stars */}
            {todayStars > 0 && (
              <div className="flex items-center gap-2.5 bg-yellow-50 border border-yellow-100 px-4 py-2.5 rounded-2xl w-full">
                <span className="text-2xl leading-none">⭐</span>
                <div>
                  <p className="font-black text-yellow-600 text-[13px] leading-tight">{todayStars} {t("nimiChatStarsLabel")}</p>
                  <p className="text-[10px] text-yellow-500 font-semibold">{t("nimiChatAmazingWork")}</p>
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Practice Reading mode */}
          {pageMode === "practice" && (
            <div className="bg-ds-surface border border-ds-border shadow-ds-card p-5 overflow-y-auto max-h-[80vh]"
              style={{ borderRadius:"var(--leaf-r-lg)" }}>
              <VoiceCompanionView
                passage={practicePassage ?? (currentStoryTitle
                  ? `${currentStoryTitle} is a story about learning and growing. Every day we discover something new.`
                  : "The sun rises over the hills every morning. Birds sing and children play outside.")}
                language={childLanguage}
                childName={childName}
                childAge={childAge}
              />
            </div>
          )}

          {/* CENTER: Chat card */}
          {pageMode === "chat" && (
          <div className="bg-ds-surface border border-ds-border shadow-ds-card overflow-hidden flex flex-col h-[72vh]"
            style={{ borderRadius:"var(--leaf-r-lg)" }}>

            {/* Chat header */}
            <div className="relative flex items-center gap-3 px-4 py-3 flex-shrink-0 overflow-hidden"
              style={{ backgroundColor:"var(--nimi-green)" }}>
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

              <motion.img src={assets.nimiCircle} alt="NIMI"
                className="w-11 h-11 rounded-full object-cover border-2 border-white/50 shadow-md flex-shrink-0"
                animate={noMotion ? {} : { y:[0,-3,0] }}
                transition={noMotion ? {} : { duration:3, repeat:Infinity }}
                loading="lazy" />

              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-[15px]">NIMI</p>
                <p className="text-white/80 text-[11px] flex items-center gap-1.5">
                  <motion.span
                    className="w-2 h-2 rounded-full bg-green-300 inline-block shrink-0"
                    animate={noMotion ? {} : { scale:[1,1.4,1], opacity:[1,0.5,1] }}
                    transition={noMotion ? {} : { duration:1.8, repeat:Infinity }} />
                  {t("nimiOnlineLabel")}
                </p>
              </div>

              {/* Daily message counter (free users only, visible from 5/10 onwards) */}
              {nimiMessagesUsed !== null && nimiMessagesUsed >= 5 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${
                    nimiMessagesUsed >= 9
                      ? "bg-red-500/90 text-white"
                      : nimiMessagesUsed >= 7
                      ? "bg-amber-400/90 text-amber-900"
                      : "bg-white/20 text-white"
                  }`}>
                  {nimiMessagesUsed}/10
                </motion.div>
              )}

              {/* Read-aloud toggle — lives in the header now */}
              {language !== "rw" && (
                <motion.button whileTap={m.buttonPress} onClick={toggleSpeak} disabled={isTyping}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition disabled:opacity-50 shrink-0">
                  {isSpeaking
                    ? <><VolumeX className="w-3.5 h-3.5" /> {t("stopReadingLabel")}</>
                    : <><Volume2 className="w-3.5 h-3.5" /> {t("readAloudLabel")}</>
                  }
                </motion.button>
              )}
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 min-h-0 px-4 py-4 space-y-3.5 overflow-y-auto">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isNimi = msg.from === "nimi";
                  const isLast = idx === messages.length - 1;
                  const showTypingDots = isTyping && isLast && isNimi && msg.text === "";

                  return (
                    <motion.div key={idx}
                      initial={{ opacity:0, y:10, scale:0.95 }}
                      animate={{ opacity:1, y:0,  scale:1 }}
                      transition={{ type:"spring", stiffness:380, damping:28 }}
                      className={`flex items-end gap-2.5 ${isNimi ? "justify-start" : "justify-end"}`}
                    >
                      {isNimi && (
                        <Image src={assets.nimiCircle} alt="NIMI"
                          width={36} height={36}
                          className="rounded-full object-cover flex-shrink-0 shadow border-2 border-emerald-100" />
                      )}
                      <div className={`text-[14px] leading-relaxed px-4 py-2.5 shadow-sm max-w-[78%] ${
                        isNimi
                          ? "bg-emerald-50 border border-emerald-100 text-ds-text rounded-2xl rounded-bl-sm"
                          : "text-white rounded-2xl rounded-br-sm shadow-md"
                      }`}
                        style={!isNimi ? { backgroundColor:"var(--nimi-green)" } : undefined}
                      >
                        {showTypingDots ? (
                          <span className="flex items-center gap-1.5 py-1" aria-label={t("nimiThinking")}>
                            {[0, 0.15, 0.3].map(d => (
                              <motion.span key={d}
                                className="w-2.5 h-2.5 bg-emerald-400 rounded-full block"
                                animate={noMotion ? {} : { y:[0,-4,0], opacity:[0.5,1,0.5] }}
                                transition={noMotion ? {} : { duration:0.6, repeat:Infinity, delay:d }} />
                            ))}
                          </span>
                        ) : msg.text}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Quick replies */}
            {!dailyLimitReached && (
              <div className="px-3 pt-2.5 pb-1 border-t border-ds-border">
                <QuickReplyChips onSelect={text => sendChat(text)} disabled={isTyping} size="md" />
              </div>
            )}

            {/* Soft upsell — 2 messages before the hard wall fires */}
            {nimiMessagesUsed !== null && nimiMessagesUsed >= 8 && !dailyLimitReached && (
              <motion.a href="/pricing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                aria-label={`${10 - nimiMessagesUsed} messages left today. Upgrade to Club for unlimited.`}
                className="mx-3 mb-1 mt-2 flex items-center gap-2.5 rounded-xl px-3.5 py-2 bg-ds-warn-surface border border-ds-warn cursor-pointer group">
                <span className="text-base shrink-0" aria-hidden="true">⭐</span>
                <p className="flex-1 min-w-0 font-nunito text-ds-warn text-xs leading-tight">
                  <strong>{10 - nimiMessagesUsed}</strong>{" "}
                  {10 - nimiMessagesUsed === 1 ? "message" : "messages"} left today —{" "}
                  <span className="font-bold group-hover:underline">upgrade for unlimited</span>
                </p>
                <span className="shrink-0 font-baloo font-black text-ds-warn text-2xs group-hover:opacity-75">Club →</span>
              </motion.a>
            )}

            {/* Daily limit upgrade banner */}
            {dailyLimitReached && (
              <motion.a href="/pricing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                aria-label="Daily limit reached. Upgrade to Club for unlimited Nimi chats."
                className="mx-3 mb-2 mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer group bg-ds-club shadow-ds-club">
                <Crown className="w-5 h-5 text-yellow-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-baloo font-black text-white text-[13px] leading-tight">You&apos;ve reached today&apos;s free limit</p>
                  <p className="text-white/70 text-2xs leading-tight">Upgrade to NIMIPIKO Club for unlimited Nimi chats, every day.</p>
                </div>
                <span className="shrink-0 font-baloo font-black text-yellow-300 text-xs group-hover:text-yellow-200">Upgrade →</span>
              </motion.a>
            )}

            {/* Break nudge — gentle, non-blocking */}
            <BreakNudge
              status={screenStatus}
              suggestion={offlineSuggestion}
              onDismiss={dismissBreak}
              onBreak={() => window.history.back()}
            />

            {/* Mic error */}
            {micError && (
              <p className="px-4 py-1 text-[11px] font-bold text-red-500 text-center">
                {t(speechErrorKey(micError))}
              </p>
            )}

            {/* Input bar */}
            <div className="px-3 py-3 flex-shrink-0 bg-ds-surface border-t border-ds-border">
              <div className={`flex items-center gap-2 border shadow-sm px-3 py-2 transition-shadow ${
                dailyLimitReached
                  ? "bg-gray-50 border-gray-200 opacity-50 pointer-events-none"
                  : "bg-white border-gray-200 focus-within:border-[var(--nimi-green)] focus-within:ring-2 focus-within:ring-[var(--nimi-green)] focus-within:ring-opacity-20"
              }`} style={{ borderRadius:"var(--leaf-r)" }}>
                {showMic && (
                  <motion.button
                    onClick={() => listening ? stopListening() : startListening()}
                    whileTap={m.buttonPress}
                    aria-label={t("micButtonLabel")}
                    animate={listening && !noMotion ? { scale:[1,1.12,1] } : {}}
                    transition={listening && !noMotion ? { duration:0.8, repeat:Infinity } : {}}
                    disabled={isTyping || dailyLimitReached}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition disabled:opacity-40 ${
                      listening
                        ? "bg-red-500 text-white shadow-md shadow-red-200"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                    }`}>
                    <Mic className="w-4 h-4" />
                  </motion.button>
                )}
                <input
                  type="text" value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder={dailyLimitReached ? "Daily limit reached" : listening ? (interimText || t("listeningLabel")) : t("chatPlaceholder")}
                  disabled={isTyping || listening || dailyLimitReached}
                  className="flex-1 min-w-0 text-[14px] bg-transparent py-1.5 focus:outline-none text-gray-800 placeholder:text-gray-400 disabled:opacity-60 font-nunito" />
                <motion.button onClick={() => sendChat()} whileTap={m.buttonPress}
                  disabled={isTyping || !chatInput.trim() || dailyLimitReached}
                  className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition disabled:opacity-30 text-white shadow hover:opacity-90 disabled:shadow-none"
                  style={{ backgroundColor:"var(--nimi-green)", borderRadius:"var(--leaf-r-sm)" }}>
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>

          )} {/* end chat mode */}

          {/* RIGHT: Sidebar */}
          <div className="mt-4 lg:mt-0">
            <ChatSidebar
              todayStars={todayStars}
              chatStreakDays={chatStreakDays}
              badges={earnedBadges}
              badgeImageMap={badgeImageMap}
              activitiesCompleted={activitiesCompleted}
            />
          </div>
        </div>
      </main>
    </PageSurface>
  );
}
