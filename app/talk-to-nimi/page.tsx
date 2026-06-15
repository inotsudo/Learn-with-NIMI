"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Mic, Volume2, VolumeX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getChildren, getActiveStories, getMissionsByCategories, getCompletedMissionIds,
  getTodayStars, getActivityDates, getChildAchievements,
} from "@/lib/queries";
import { computeStreaks } from "@/lib/parentInsights";
import { ACTIVITIES } from "@/app/_activityData";
import { useNimiChat, type ChatMessage } from "@/hooks/useNimiChat";
import { useSpeechToText, speechErrorKey } from "@/hooks/useSpeechToText";
import QuickReplyChips from "@/components/home/QuickReplyChips";
import ChatQuestBanner from "@/components/home/ChatQuestBanner";
import ChatSidebar from "@/components/home/ChatSidebar";
import { NIMI_CHAT_HANDOFF_KEY } from "@/components/home/TalkToNimi";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

function greetingFor(name: string): ChatMessage {
  return { from: "nimi", text: `Hello ${name}! 👋 How was your adventure today?` };
}

export default function TalkToNimiPage() {
  const [mounted, setMounted] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState("Explorer");
  const [childLanguage, setChildLanguage] = useState<"en" | "fr" | "rw">("en");
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    const list = await getChildren();
    let name = "Explorer";
    let id: string | null = null;
    let lang: "en" | "fr" | "rw" = "en";
    if (list.length > 0) {
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      name = child.name;
      id = child.id;
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
      } catch {
        // ignore malformed handoff
      }
      sessionStorage.removeItem(NIMI_CHAT_HANDOFF_KEY);
    }

    setInitialMessages(initial);
    setPendingMessage(pending);
    setMounted(true);
  };

  if (!mounted || initialMessages === null) return null;

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
  const { t, language } = useLanguage();
  const messagesRef = useRef<HTMLDivElement>(null);
  const hasResumedRef = useRef(false);
  const [chatInput, setChatInput] = useState("");

  const [todayStars, setTodayStars] = useState(0);
  const [chatStreakDays, setChatStreakDays] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [activitiesCompleted, setActivitiesCompleted] = useState(0);

  const { messages, isTyping, send, isSpeaking, toggleSpeak } = useNimiChat(initialMessages, { childName });

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
    setTodayStars(await getTodayStars(id, lang));
    setChatStreakDays(computeStreaks(await getActivityDates(id, lang)).current);

    const achievements = await getChildAchievements(id);
    setBadgeCount(achievements.filter(a => a.type === "badge" && a.language === lang).length);

    const stories = await getActiveStories();
    if (stories.length > 0) {
      const missions = await getMissionsByCategories(stories[0].id, ACTIVITIES.map(a => a.category));
      const completedIds = new Set(await getCompletedMissionIds(id, lang));
      setActivitiesCompleted(missions.filter(m => completedIds.has(m.id)).length);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
        <Link href="/" className="inline-flex items-center gap-1 text-purple-600 font-bold text-sm mb-3 hover:text-purple-700 transition w-fit">
          <ArrowLeft className="w-4 h-4" />
          {t("backToHome")}
        </Link>

        <div className="mb-4 lg:max-w-3xl lg:mx-auto">
          <ChatQuestBanner />
        </div>

        <div className="mb-4 text-center">
          <h1 className="font-black text-2xl sm:text-3xl text-gray-800">{t("nimiChatPageTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("nimiChatPageSubtitle")}</p>
        </div>

        <div className="lg:grid lg:grid-cols-[180px_1fr_280px] lg:gap-4 lg:items-start">

          {/* Left mascot + speech bubble */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3 lg:sticky lg:top-24">
            <div className="bg-white border-2 border-purple-200 rounded-2xl rounded-br-sm shadow-md px-4 py-3 text-center">
              <p className="text-sm font-bold text-gray-700 leading-snug">
                {t("readyToChatBubble").replace("{name}", childName)}
              </p>
            </div>
            <motion.img
              src="/nimi-logo-circle.png" alt="NIMI"
              className="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          </div>

          {/* Chat card */}
          <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md overflow-hidden flex flex-col h-[70vh]">
            {/* Header */}
            <div className="bg-purple-700 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <motion.img
                src="/nimi-logo-circle.png" alt="NIMI"
                className="w-10 h-10 rounded-full object-cover border-2 border-yellow-300 shadow flex-shrink-0"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
              <div className="flex-1">
                <p className="font-black text-white text-sm tracking-wide">NIMI</p>
                <p className="text-purple-200 text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  {t("nimiOnlineLabel")}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 min-h-0 px-4 py-4 space-y-3 overflow-y-auto bg-gradient-to-b from-purple-50/40 to-white">
              {messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                const showTyping = isTyping && isLast && msg.from === "nimi" && msg.text === "";

                return (
                  <div key={idx} className={`flex items-end gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.from === "nimi" && (
                      <img src="/nimi-logo-circle.png" alt="NIMI"
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-md border-2 border-yellow-200" />
                    )}
                    <div className={`text-sm leading-relaxed px-4 py-2.5 max-w-[75%] shadow-sm ${
                      msg.from === "nimi"
                        ? "bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100"
                        : "bg-purple-600 text-white rounded-2xl rounded-br-sm"
                    }`}>
                      {showTyping ? (
                        <span className="flex items-center gap-1.5 py-1" aria-label={t("nimiThinking")}>
                          {[0, 0.15, 0.3].map(delay => (
                            <motion.span key={delay}
                              className="w-2 h-2 bg-purple-300 rounded-full"
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay }} />
                          ))}
                        </span>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Read aloud toggle - directly under Nimi's responses */}
            {language !== "rw" && (
              <div className="flex justify-center py-1.5 border-t border-purple-50">
                <motion.button whileTap={{ scale: 0.95 }} onClick={toggleSpeak} disabled={isTyping}
                  className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition disabled:opacity-50">
                  {isSpeaking ? (
                    <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                      <VolumeX className="w-3.5 h-3.5" />
                    </motion.span>
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  {isSpeaking ? t("stopReadingLabel") : t("readAloudLabel")}
                </motion.button>
              </div>
            )}

            {/* Quick replies */}
            <div className="px-3 pt-2 bg-white border-t border-purple-100">
              <QuickReplyChips onSelect={text => sendChat(text)} disabled={isTyping} size="md" />
            </div>

            {/* Mic error */}
            {micError && (
              <p className="px-4 pb-1 text-[11px] font-bold text-red-500 text-center">
                {t(speechErrorKey(micError))}
              </p>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 bg-white px-3 py-3 flex-shrink-0">
              <input
                type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder={listening ? (interimText || t("listeningLabel")) : t("chatPlaceholder")}
                disabled={isTyping || listening}
                className="flex-1 min-w-0 text-sm bg-gray-50 rounded-full border-2 border-purple-200 px-4 py-2.5 focus:outline-none focus:border-purple-400 text-gray-700 placeholder-gray-400 disabled:opacity-60" />
              {showMic && (
                <motion.button onClick={() => (listening ? stopListening() : startListening())}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t("micButtonLabel")}
                  animate={listening ? { scale: [1, 1.15, 1] } : {}}
                  transition={listening ? { duration: 0.8, repeat: Infinity } : {}}
                  disabled={isTyping}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition shadow disabled:opacity-50 ${
                    listening ? "bg-red-500 hover:bg-red-600" : "bg-purple-300 hover:bg-purple-400"
                  }`}>
                  <Mic className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button onClick={() => sendChat()} whileTap={{ scale: 0.9 }}
                disabled={isTyping || !chatInput.trim()}
                className="w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 rounded-full flex items-center justify-center text-white flex-shrink-0 transition shadow">
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Right sidebar */}
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
    </div>
  );
}
