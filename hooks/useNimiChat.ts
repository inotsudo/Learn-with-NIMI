"use client";

import { useCallback, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { speakText, stopSpeaking } from "@/lib/speech";

export interface ChatMessage {
  from: "nimi" | "user";
  text: string;
}

interface UseNimiChatOptions {
  childName: string;
  onExchangeComplete?: () => void;
}

function lastNimiText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].from === "nimi") return messages[i].text;
  }
  return "";
}

export function useNimiChat(initialMessages: ChatMessage[], { childName, onExchangeComplete }: UseNimiChatOptions) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastReplyRef = useRef(lastNimiText(initialMessages));

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
      const res = await fetch("/api/nimi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({
            role: m.from === "nimi" ? "assistant" : "user",
            content: m.text,
          })),
          language,
          childName,
        }),
      });

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
      }
    } catch {
      updateReply(t("chatErrorMsg"));
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping, language, childName, t, onExchangeComplete, stopReading]);

  return { messages, setMessages, isTyping, send, isSpeaking, toggleSpeak };
}
