"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, ChevronRight, Mic, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNimiChat, type ChatMessage } from "@/hooks/useNimiChat";
import { useSpeechToText, speechErrorKey } from "@/hooks/useSpeechToText";
import QuickReplyChips from "./QuickReplyChips";

export const NIMI_CHAT_HANDOFF_KEY = "nimipiko_nimi_chat_handoff";
const EXCHANGES_BEFORE_FULL_CHAT = 2;

interface Props {
  childName: string;
}

function greetingFor(name: string): ChatMessage {
  return { from: "nimi", text: `Hello ${name}! 👋 How was your adventure today?` };
}

export default function TalkToNimi({ childName }: Props) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const messagesRef = useRef<HTMLDivElement>(null);
  const exchangeCountRef = useRef(0);

  const { messages, setMessages, isTyping, send, isSpeaking, toggleSpeak } = useNimiChat([greetingFor(childName)], {
    childName,
    onExchangeComplete: () => { exchangeCountRef.current += 1; },
  });
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    exchangeCountRef.current = 0;
    setMessages([greetingFor(childName)]);
  }, [childName, setMessages]);

  const sendChat = (overrideText?: string) => {
    const msg = (overrideText ?? chatInput).trim();
    if (!msg || isTyping) return;

    if (exchangeCountRef.current >= EXCHANGES_BEFORE_FULL_CHAT) {
      sessionStorage.setItem(NIMI_CHAT_HANDOFF_KEY, JSON.stringify({ messages, pending: msg }));
      setChatInput("");
      router.push("/talk-to-nimi");
      return;
    }

    setChatInput("");
    void send(msg);
  };

  const { listening, supported: micSupported, start: startListening, stop: stopListening, interimText, error: micError } =
    useSpeechToText(language, (text) => sendChat(text));
  const showMic = micSupported && language !== "rw";

  return (
    <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-md overflow-hidden flex flex-col h-full">

      {/* Header */}
      <div className="bg-purple-700 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <motion.button whileTap={{ scale: 0.9 }}
          className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white flex-shrink-0 transition">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </motion.button>
        <img src="/nimi-logo-circle.png" alt="NIMI"
          className="w-7 h-7 rounded-full object-cover border-2 border-yellow-300 flex-shrink-0 shadow" />
        <span className="font-black text-white text-[12px] tracking-wide flex-1">{t("talkToNimiTitle")}</span>
        <motion.button whileTap={{ scale: 0.9 }}
          className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white flex-shrink-0 transition font-black text-sm">
          ✕
        </motion.button>
      </div>

      {/* Chat area */}
      <div className="flex-1 px-3 pt-3 flex flex-col bg-gradient-to-b from-purple-50/40 to-white min-h-0">
        <div ref={messagesRef} className="flex-1 space-y-2.5 overflow-y-auto mb-3 min-h-0">
          {messages.map((msg, idx) => {
            const isLast = idx === messages.length - 1;
            const showTyping = isTyping && isLast && msg.from === "nimi" && msg.text === "";

            return (
              <div key={idx} className={`flex items-end gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                {msg.from === "nimi" && (
                  <img src="/nimi-logo-circle.png" alt="NIMI"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-md border-2 border-yellow-200" />
                )}
                <div className={`text-[10.5px] leading-snug px-3 py-2 max-w-[72%] shadow-sm ${
                  msg.from === "nimi"
                    ? "bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100"
                    : "bg-purple-600 text-white rounded-2xl rounded-br-sm"
                }`}>
                  {showTyping ? (
                    <span className="flex items-center gap-1 py-1" aria-label={t("nimiThinking")}>
                      {[0, 0.15, 0.3].map(delay => (
                        <motion.span key={delay}
                          className="w-1.5 h-1.5 bg-purple-300 rounded-full"
                          animate={{ y: [0, -3, 0] }}
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

        {/* Quick replies */}
        <QuickReplyChips onSelect={text => sendChat(text)} disabled={isTyping} size="sm" />

        {/* Mic error */}
        {micError && (
          <p className="px-2 pb-1 text-[9.5px] font-bold text-red-500 text-center">
            {t(speechErrorKey(micError))}
          </p>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 bg-white rounded-full border-2 border-purple-200 px-3 py-1 shadow-sm mb-3 mt-2 flex-shrink-0">
          {language !== "rw" && (
            <motion.button onClick={toggleSpeak} whileTap={{ scale: 0.88 }} disabled={isTyping}
              aria-label={isSpeaking ? t("stopReadingLabel") : t("readAloudLabel")}
              className="w-7 h-7 bg-purple-50 hover:bg-purple-100 rounded-full flex items-center justify-center text-purple-600 flex-shrink-0 transition disabled:opacity-50">
              {isSpeaking ? (
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                  <VolumeX className="w-3.5 h-3.5" />
                </motion.span>
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </motion.button>
          )}
          <input
            type="text" value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
            placeholder={listening ? (interimText || t("listeningLabel")) : t("chatPlaceholder")}
            disabled={isTyping || listening}
            className="flex-1 min-w-0 text-[10.5px] bg-transparent focus:outline-none text-gray-600 placeholder-gray-400 disabled:opacity-60" />
          {showMic && (
            <motion.button onClick={() => (listening ? stopListening() : startListening())}
              whileTap={{ scale: 0.88 }}
              aria-label={t("micButtonLabel")}
              animate={listening ? { scale: [1, 1.15, 1] } : {}}
              transition={listening ? { duration: 0.8, repeat: Infinity } : {}}
              disabled={isTyping}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0 transition shadow disabled:opacity-50 ${
                listening ? "bg-red-500 hover:bg-red-600" : "bg-purple-300 hover:bg-purple-400"
              }`}>
              <Mic className="w-3 h-3" />
            </motion.button>
          )}
          <motion.button onClick={() => sendChat()} whileTap={{ scale: 0.88 }}
            disabled={isTyping || !chatInput.trim()}
            className="w-7 h-7 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 rounded-full flex items-center justify-center text-white flex-shrink-0 transition shadow">
            <Send className="w-3 h-3" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
