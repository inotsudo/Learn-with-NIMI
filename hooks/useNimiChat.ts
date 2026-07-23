"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { speakText, stopSpeaking } from "@/lib/speech";
import supabase from "@/lib/supabaseClient";

export interface ChatMessage {
  from: "nimi" | "user";
  text: string;
}

interface UseNimiChatOptions {
  childName: string;
  onExchangeComplete?: () => void;
  childId?: string | null;
  childAge?: number | null;
  storyId?: string | null;
  storyTitle?: string | null;
  storyEmoji?: string | null;
  storyProgress?: number;
  slotsDone?: number;
  slotsTotal?: number;
  // When true, the hook auto-persists a conversation summary when the component unmounts.
  persistOnUnmount?: boolean;
  // Pass true for Club/trial members — disables the daily cap counter entirely.
  hasSubscription?: boolean;
}

function lastNimiText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].from === "nimi") return messages[i].text;
  }
  return "";
}

export function useNimiChat(initialMessages: ChatMessage[], { childName, onExchangeComplete, childId, childAge, storyId, storyTitle, storyEmoji, storyProgress, slotsDone, slotsTotal, persistOnUnmount, hasSubscription }: UseNimiChatOptions) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  // null = unlimited (Club); number = today's count so far (free users)
  const [nimiMessagesUsed, setNimiMessagesUsed] = useState<number | null>(null);
  const lastReplyRef = useRef(lastNimiText(initialMessages));

  // Keep a ref to the latest messages so the unmount effect always has current data
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Persist conversation summary on unmount when there are enough exchanges
  useEffect(() => {
    if (!persistOnUnmount || !childId) return;
    return () => {
      const current = messagesRef.current;
      if (current.filter(m => m.from === 'user').length < 2) return;
      const apiMessages = current.map(m => ({
        role: m.from === 'nimi' ? 'assistant' : 'user',
        content: m.text,
      }));
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        void fetch('/api/nimi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages:       apiMessages,
            language,
            childName,
            childId,
            storyId:        storyId ?? null,
            persistSummary: true,
          }),
          // keepalive so the request survives page navigation
          keepalive: true,
        });
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistOnUnmount, childId]);

  // Fetch today's message count for free users so the counter is accurate on mount
  useEffect(() => {
    if (hasSubscription || !childId) {
      setNimiMessagesUsed(null);
      return;
    }
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("nimi_message_counts")
        .select("count")
        .eq("child_id", childId)
        .eq("date", today)
        .maybeSingle();
      const used = (data?.count as number | null) ?? 0;
      setNimiMessagesUsed(used);
      if (used >= 10) setDailyLimitReached(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, hasSubscription]);

  const stopReading = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const toggleSpeak = useCallback(() => {
    if (isSpeaking) {
      stopReading();
      return;
    }
    const text = lastReplyRef.current;
    if (!text.trim()) return;
    void speakText(text, language, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, [isSpeaking, language, stopReading]);

  const sendVoice = useCallback(async (text: string, sttConfidence = 1) => {
    const msg = text.trim();
    if (!msg || isTyping) return;

    stopReading();

    const ageRange: "5-7" | "8-10" | "11+" =
      childAge == null ? "8-10" :
      childAge <= 7    ? "5-7"  :
      childAge <= 10   ? "8-10" : "11+";

    const history: ChatMessage[] = [...messages, { from: "user", text: msg }];
    setMessages([...history, { from: "nimi", text: "" }]);
    setIsTyping(true);

    const updateReply = (replyText: string) => {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { from: "nimi", text: replyText };
        return next;
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/voice-conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: history.map(m => ({
            role: m.from === "nimi" ? "assistant" : "user",
            content: m.text,
          })),
          language,
          childName,
          childId:       childId ?? null,
          storyId:       storyId ?? null,
          storyTitle:    storyTitle ?? null,
          ageRange,
          sttConfidence,
        }),
      });

      if (!res.ok) throw new Error("voice AI request failed");

      const data = await res.json() as { response?: string };
      const reply = (data.response ?? "").trim();

      if (!reply) {
        updateReply(t("chatErrorMsg"));
      } else {
        updateReply(reply);
        lastReplyRef.current = reply;
        onExchangeComplete?.();
        void speakText(reply, language, {
          onStart: () => setIsSpeaking(true),
          onEnd:   () => setIsSpeaking(false),
        });
      }
    } catch {
      updateReply(t("chatErrorMsg"));
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping, language, childName, childId, childAge, storyId, storyTitle, t, onExchangeComplete, stopReading]);

  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || isTyping) return;

    stopReading();

    const history: ChatMessage[] = [...messages, { from: "user", text: msg }];
    setMessages([...history, { from: "nimi", text: "" }]);
    setIsTyping(true);

    const updateReply = (replyText: string) => {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { from: "nimi", text: replyText };
        return next;
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/nimi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: history.map(m => ({
            role: m.from === "nimi" ? "assistant" : "user",
            content: m.text,
          })),
          language,
          childName,
          childId:       childId ?? null,
          storyId:       storyId ?? null,
          storyTitle:    storyTitle ?? null,
          storyEmoji:    storyEmoji ?? null,
          storyProgress: storyProgress ?? 0,
          slotsDone:     slotsDone ?? 0,
          slotsTotal:    slotsTotal ?? 0,
        }),
      });

      if (res.status === 429) {
        setDailyLimitReached(true);
        setNimiMessagesUsed(10);
        updateReply("Wow, we've talked so much today! 🌟 You've used all 10 of your free chats for today. Come back tomorrow — I'll be here! To chat with me anytime, ask a grown-up about NIMIPIKO Club. 👑");
        return;
      }

      if (!res.ok || !res.body) throw new Error("AI request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              reply += parsed.content;
              updateReply(reply);
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      if (!reply.trim()) {
        updateReply(t("chatErrorMsg"));
      } else {
        onExchangeComplete?.();
        lastReplyRef.current = reply;
        setNimiMessagesUsed(prev => (prev === null ? null : prev + 1));
      }
    } catch {
      updateReply(t("chatErrorMsg"));
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping, language, childName, childId, storyId, t, onExchangeComplete, stopReading]);

  return { messages, setMessages, isTyping, send, sendVoice, isSpeaking, toggleSpeak, dailyLimitReached, nimiMessagesUsed };
}
