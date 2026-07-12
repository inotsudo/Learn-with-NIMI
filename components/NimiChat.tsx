"use client";

import React, { useEffect, useState, useRef } from "react";
import { Mic, SendHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
import { DURATION } from "@/lib/design-system/motion";
import { useAppTheme } from "@/contexts/AppThemeProvider";

export default function NimiChat({
  open,
  onClose,
  language = "en",
  childName = "friend",
  avatar,
  voiceEnabled = true,
}: {
  open: boolean;
  onClose: () => void;
  language?: string;
  childName?: string;
  avatar?: React.ReactNode;
  voiceEnabled?: boolean;
}) {
  const { theme } = useAppTheme();
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatLog, open]);

  const sendToAI = async (question: string) => {
    if (!question.trim()) return;
    setChatLog((prev) => [...prev, `🧒: ${question}`]);
    setInput("");

    const response = await fetch("/api/nimi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: question }],
        childName,
        language,
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiReply = "";
    setIsTalking(true);

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiReply += decoder.decode(value, { stream: true });
        setChatLog((prev) => [...prev.slice(0, -1), `🤖 Nimi: ${aiReply}`]);
      }
    }

    if (voiceEnabled && typeof window !== "undefined") {
      const utter = new SpeechSynthesisUtterance(aiReply);
      utter.lang = language;
      utter.onend = () => setIsTalking(false);
      window.speechSynthesis.speak(utter);
    } else {
      setIsTalking(false);
    }
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) return alert("Voice not supported!");

    const recognition = new window.webkitSpeechRecognition!();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const voiceInput = event.results[0][0].transcript;
      setInput(voiceInput);
      sendToAI(voiceInput);
    };

    recognition.start();
  };

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-br ${theme.gradients.chatBg} p-4 flex flex-col items-center justify-center text-center`}>
      <div className="absolute top-4 right-4">
        <button onClick={onClose} className="text-xl rounded-full bg-red-400 text-white p-2">
          <X />
        </button>
      </div>

      {/* Nimi Avatar */}
      <motion.div
        animate={{ scale: isTalking ? [1, 1.2, 1] : 1 }}
        transition={{ duration: DURATION.loopSpark, repeat: Infinity }}
        className="mb-4"
      >
        {avatar || <div className="text-6xl animate-bounce">🧚‍♀️</div>}
      </motion.div>

      {/* Chat Log */}
      <div
        ref={chatRef}
        className="w-full max-w-xl h-64 overflow-y-auto p-4 bg-white leaf shadow-inner text-lg font-semibold space-y-2"
      >
        {chatLog.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center mt-4 gap-2 w-full max-w-xl">
        <input
          className="flex-1 text-xl p-2 rounded border-2 border-blue-300"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or tap the mic 🎤"
        />
        <button
          onClick={() => sendToAI(input)}
          className="p-2 rounded-full text-white" style={{ backgroundColor: 'var(--nimi-green)' }}
        >
          <SendHorizontal />
        </button>
        <button
          onClick={handleVoiceInput}
          className={`p-2 rounded-full ${isListening ? "bg-[var(--nimi-green)]" : "bg-gray-300"}`}
        >
          <Mic />
        </button>
      </div>
    </div>
  );
}
