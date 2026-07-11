"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { ArrowLeft, Send, Mic, Volume2, VolumeX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MagicLoader from "@/components/magic/MagicLoader";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import {
  getChildren,
  getTodayStars, getActivityDates, getChildAchievements,
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

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const QUEST_TARGET = 3;
const QUEST_STARS  = 10;

const NIMI_PROMPTS = [
  "Ask me anything! 🌟",
  "Want to hear a joke? 😄",
  "Tell me about your day! 💬",
  "I know cool animal facts! 🦊",
  "Let's talk about your story! 📖",
  "What made you smile today? ☀️",
];

function greetingFor(name: string): ChatMessage {
  return { from: "nimi", text: `Hello ${name}! 👋 How was your adventure today?` };
}

export default function TalkToNimiPage() {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [mounted, setMounted] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState("Explorer");
  const [childLanguage, setChildLanguage] = useState<"en" | "fr" | "rw">("en");
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const list = await getChildren();
    let name = "Explorer";
    let id: string | null = null;
    let lang: "en" | "fr" | "rw" = "en";
    if (list.length > 0) {
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      name = child.name;
      id   = child.id;
      lang = child.language;
    }
    setChildName(name);
    setChildId(id);
    setChildLanguage(lang);

    let initial: ChatMessage[] = [greetingFor(name)];
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
    setMounted(true);
  };

  if (!mounted || initialMessages === null) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center min-h-[80vh]">
          <MagicLoader variant="default" fullPage={false} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <NimiChatPageContent
        childId={childId}
        childName={childName}
        childLanguage={childLanguage}
        initialMessages={initialMessages}
        pendingMessage={pendingMessage}
      />
    </AppShell>
  );
}

function NimiChatPageContent({
  childId, childName, childLanguage, initialMessages, pendingMessage,
}: {
  childId: string | null;
  childName: string;
  childLanguage: "en" | "fr" | "rw";
  initialMessages: ChatMessage[];
  pendingMessage: string | null;
}) {
  const [currentStoryTitle,    setCurrentStoryTitle]    = useState<string | null>(null);
  const [currentStoryEmoji,    setCurrentStoryEmoji]    = useState<string | null>(null);
  const [currentStoryProgress, setCurrentStoryProgress] = useState(0);
  const [slotsDone,  setSlotsDone]  = useState(0);
  const [slotsTotal, setSlotsTotal] = useState(0);
  const [promptIdx, setPromptIdx]   = useState(0);

  const noMotion = useReducedMotion() ?? false;
  const m        = useThemeMotion();
  const { t, language } = useLanguage();
  const { themeId }     = useAppTheme();
  const assets          = getThemeAssets(themeId);
  const messagesRef     = useRef<HTMLDivElement>(null);
  const hasResumedRef   = useRef(false);
  const [chatInput, setChatInput] = useState("");

  const [todayStars,           setTodayStars]           = useState(0);
  const [chatStreakDays,        setChatStreakDays]        = useState(0);
  const [badgeCount,           setBadgeCount]           = useState(0);
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

  const { messages, isTyping, send, isSpeaking, toggleSpeak } = useNimiChat(initialMessages, {
    childName,
    onExchangeComplete: handleExchangeComplete,
    storyTitle:    currentStoryTitle,
    storyEmoji:    currentStoryEmoji,
    storyProgress: currentStoryProgress,
    slotsDone,
    slotsTotal,
  });

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
    const [stars, dates, achievements, stories, claimed] = await Promise.all([
      getTodayStars(id, lang),
      getActivityDates(id, lang),
      getChildAchievements(id),
      getStoryLibrary(id, lang),
      getClaimedChallenges(id, lang),
    ]);
    if (claimed.has(`daily-chat-${getDayPeriod()}`)) setQuestClaimed(true);
    setTodayStars(stars);
    setChatStreakDays(computeStreaks(dates).current);
    setBadgeCount(achievements.filter((a: { type: string; language: string }) => a.type === "badge" && a.language === lang).length);
    setActivitiesCompleted(stories.filter((s: { complete: boolean }) => s.complete).length);

    const curStory = stories.find((s: { unlocked: boolean; complete: boolean }) => s.unlocked && !s.complete) ?? stories[0];
    if (curStory) {
      setCurrentStoryTitle(curStory.title);
      setCurrentStoryEmoji(curStory.theme_emoji ?? null);
      setCurrentStoryProgress(curStory.progress ?? 0);
      const slots = await getStorySlots(id, curStory.sid, lang);
      setSlotsDone(slots.filter((s: { completed: boolean }) => s.completed).length);
      setSlotsTotal(slots.length);
    }
  };

  const sendChat = (overrideText?: string) => {
    const msg = (overrideText ?? chatInput).trim();
    if (!msg || isTyping) return;
    setChatInput("");
    void send(msg);
  };

  const { listening, supported: micSupported, start: startListening, stop: stopListening, interimText, error: micError } =
    useSpeechToText(language, (text) => sendChat(text));
  const showMic = micSupported && language !== "rw";

  return (
    <PageSurface>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">

        {/* ── HERO ── */}
        <HeroBanner zone="nimiChat" className="mb-4">
          <button
            onClick={() => window.history.back()}
            className="absolute top-4 left-5 z-20 flex items-center gap-1.5 text-white/80 hover:text-white text-[13px] font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />

          {/* Floaters */}
          {[
            { top:"14%", left:"6%",  emoji:"⭐", delay:0   },
            { top:"68%", left:"10%", emoji:"✨", delay:0.6 },
            { top:"18%", right:"5%", emoji:"💬", delay:0.3 },
            { top:"66%", right:"8%", emoji:"⭐", delay:1   },
          ].map((d, i) => (
            <motion.span key={i} className="absolute pointer-events-none select-none text-[14px]"
              style={{ top:d.top, left:(d as any).left, right:(d as any).right }}
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
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/40 shadow-lg shrink-0" />
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5">AI Friend</p>
              <h1 className="font-baloo font-black text-white text-[22px] sm:text-[28px] leading-tight drop-shadow-md">
                {t("nimiChatPageTitle")}
              </h1>
              <p className="text-white/75 text-[12px] sm:text-[13px] font-semibold mt-0.5">
                {t("nimiChatPageSubtitle")}
              </p>
            </div>
          </div>
        </HeroBanner>

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
              transition={noMotion ? {} : { duration:3.5, repeat:Infinity, ease:"easeInOut" }} />

            {/* Streak */}
            {chatStreakDays > 0 && (
              <motion.div
                initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 px-4 py-2.5 rounded-2xl w-full"
              >
                <span className="text-2xl leading-none">🔥</span>
                <div>
                  <p className="font-black text-orange-600 text-[13px] leading-tight">{chatStreakDays} day streak</p>
                  <p className="text-[10px] text-orange-400 font-semibold">Keep going!</p>
                </div>
              </motion.div>
            )}

            {/* Today's stars */}
            {todayStars > 0 && (
              <div className="flex items-center gap-2.5 bg-yellow-50 border border-yellow-100 px-4 py-2.5 rounded-2xl w-full">
                <span className="text-2xl leading-none">⭐</span>
                <div>
                  <p className="font-black text-yellow-600 text-[13px] leading-tight">{todayStars} stars today</p>
                  <p className="text-[10px] text-yellow-500 font-semibold">Amazing work!</p>
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Chat card */}
          <div className="bg-ds-surface border border-ds-border shadow-ds-card overflow-hidden flex flex-col h-[72vh]"
            style={{ borderRadius:"var(--leaf-r-lg)" }}>

            {/* Chat header */}
            <div className="relative flex items-center gap-3 px-4 py-3 flex-shrink-0 overflow-hidden"
              style={{ backgroundColor:"var(--nimi-green)" }}>
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

              <motion.img src={assets.nimiCircle} alt="NIMI"
                className="w-11 h-11 rounded-full object-cover border-2 border-white/50 shadow-md flex-shrink-0"
                animate={noMotion ? {} : { y:[0,-3,0] }}
                transition={noMotion ? {} : { duration:3, repeat:Infinity }} />

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

              {/* Read-aloud toggle — lives in the header now */}
              {language !== "rw" && (
                <motion.button whileTap={m.buttonPress} onClick={toggleSpeak} disabled={isTyping}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition disabled:opacity-50 shrink-0">
                  {isSpeaking
                    ? <><VolumeX className="w-3.5 h-3.5" /> Stop</>
                    : <><Volume2 className="w-3.5 h-3.5" /> Listen</>
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
                        <img src={assets.nimiCircle} alt="NIMI"
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow border-2 border-emerald-100" />
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
            <div className="px-3 pt-2.5 pb-1 border-t border-ds-border">
              <QuickReplyChips onSelect={text => sendChat(text)} disabled={isTyping} size="md" />
            </div>

            {/* Mic error */}
            {micError && (
              <p className="px-4 py-1 text-[11px] font-bold text-red-500 text-center">
                {t(speechErrorKey(micError))}
              </p>
            )}

            {/* Input bar */}
            <div className="px-3 py-3 flex-shrink-0 bg-ds-surface border-t border-ds-border">
              <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm px-3 py-2 focus-within:border-[var(--nimi-green)] focus-within:ring-2 focus-within:ring-[var(--nimi-green)] focus-within:ring-opacity-20 transition-shadow"
                style={{ borderRadius:"var(--leaf-r)" }}>
                {showMic && (
                  <motion.button
                    onClick={() => listening ? stopListening() : startListening()}
                    whileTap={m.buttonPress}
                    aria-label={t("micButtonLabel")}
                    animate={listening && !noMotion ? { scale:[1,1.12,1] } : {}}
                    transition={listening && !noMotion ? { duration:0.8, repeat:Infinity } : {}}
                    disabled={isTyping}
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
                  placeholder={listening ? (interimText || t("listeningLabel")) : t("chatPlaceholder")}
                  disabled={isTyping || listening}
                  className="flex-1 min-w-0 text-[14px] bg-transparent py-1.5 focus:outline-none text-gray-800 placeholder:text-gray-400 disabled:opacity-60 font-nunito" />
                <motion.button onClick={() => sendChat()} whileTap={m.buttonPress}
                  disabled={isTyping || !chatInput.trim()}
                  className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition disabled:opacity-30 text-white shadow hover:opacity-90 disabled:shadow-none"
                  style={{ backgroundColor:"var(--nimi-green)", borderRadius:"var(--leaf-r-sm)" }}>
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div className="mt-4 lg:mt-0">
            <ChatSidebar
              todayStars={todayStars}
              chatStreakDays={chatStreakDays}
              badgeCount={badgeCount}
              activitiesCompleted={activitiesCompleted}
            />
          </div>
        </div>
      </main>
    </PageSurface>
  );
}
