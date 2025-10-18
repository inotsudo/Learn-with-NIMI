'use client';
import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Mic, Volume2, VolumeX, AlertCircle } from "lucide-react";

interface UserMessage {
  sender: 'user' | 'nimi';
  text: string;
}

interface NimiChatProps {
  messages: UserMessage[];
  isTyping: boolean;
  onSend: (message: string) => Promise<void>;
  currentUser: { name: string; avatar: string };
  voiceEnabled?: boolean;
  textToSpeechEnabled?: boolean;
}

export const NimiChat = ({
  messages,
  isTyping,
  onSend,
  currentUser,
  voiceEnabled = true,
  textToSpeechEnabled = true
}: NimiChatProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [browserSupports, setBrowserSupports] = useState({ mic: false, tts: false });

  // Scroll to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    setBrowserSupports({
      mic:
        typeof window !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function" &&
        "webkitSpeechRecognition" in window,
      tts: typeof window !== "undefined" && "speechSynthesis" in window,
    });
  }, []);
  

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (utteranceRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  const handleSend = async () => {
    const input = chatInputRef.current;
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';
    try { await onSend(msg); } catch { setError("Failed to send message."); }
  };

  // === Voice Input ===
  const startVoiceInput = async () => {
    if (!browserSupports.mic) {
      setError("Microphone not supported in this browser.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!recognitionRef.current) {
        recognitionRef.current = new (window as any).webkitSpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (chatInputRef.current) chatInputRef.current.value = transcript;
          handleSend();
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          setError("Voice input failed.");
        };

        recognitionRef.current.onend = () => setIsListening(false);
      }

      setIsListening(true);
      recognitionRef.current.start();
      setError(null);
    } catch (err) {
      console.error("Mic access error:", err);
      setIsListening(false);
      setError(
        <span>
          Cannot access microphone.{" "}
          <button onClick={startVoiceInput} className="underline text-blue-600 ml-1">Retry</button>
        </span>
      );
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  // === Text-to-Speech ===
  const speakMessage = () => {
    if (!browserSupports.tts) { setError("Text-to-speech not supported"); return; }
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }

    const lastNimi = [...messages].reverse().find(m => m.sender === 'nimi');
    if (!lastNimi?.text?.trim()) { setError("No message to speak"); return; }

    try {
      window.speechSynthesis.cancel();
      utteranceRef.current = new SpeechSynthesisUtterance(lastNimi.text);

      const voices = window.speechSynthesis.getVoices();
      utteranceRef.current.voice = voices.find(v => v.lang.includes('en')) || null;
      utteranceRef.current.rate = 0.9;
      utteranceRef.current.pitch = 1.1;
      utteranceRef.current.volume = 1;
      utteranceRef.current.onend = () => setIsSpeaking(false);
      utteranceRef.current.onerror = () => { setIsSpeaking(false); setError("Speech failed."); };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utteranceRef.current);
    } catch {
      setIsSpeaking(false);
      setError("Text-to-speech failed.");
    }
  };

  const ErrorMessage = () => error ? (
    <div className="mb-3 p-3 rounded-md flex items-start bg-red-50 border border-red-200 text-red-800">
      <AlertCircle className="flex-shrink-0 mr-2" size={16} />
      <div className="flex-1 text-sm">{error}</div>
      <button onClick={() => setError(null)} className="p-1 -mt-1 -mr-1 hover:bg-opacity-10 hover:bg-current rounded">✕</button>
    </div>
  ) : null;

  return (
    <div className="h-full flex flex-col bg-gray-50 rounded-xl shadow-lg p-4">
      {/* Messages */}
<div className="flex-1 overflow-y-auto mb-4 p-3 space-y-3 bg-white rounded-xl border border-gray-200">
  {messages.length === 0 ? (
    <div className="flex flex-col items-center justify-center text-gray-400 h-full">
      <div className="w-16 h-16 mb-2 rounded-full overflow-hidden">
        <img src="/path/to/nimi-logo.jpg" alt="Nimi Logo" className="w-full h-full object-cover" />
      </div>
      <p>Hello {currentUser.name}!</p>
      <p>Start chatting 😊</p>
    </div>
  ) : (
    messages.map((msg, i) => (
      <div key={i} className={`flex ${msg.sender === 'nimi' ? 'justify-start' : 'justify-end'}`}>
        <div className="flex items-start max-w-xs md:max-w-md">
          {msg.sender === 'nimi' && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-2 mt-1 shadow-lg border border-white overflow-hidden">
              <img src="nimi-logo.jpg" alt="Nimi Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <div className={`px-4 py-2 rounded-2xl text-sm md:text-base ${msg.sender === 'nimi' ? 'bg-purple-100 text-gray-800 rounded-tl-none border border-purple-200' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-tr-none'}`}>
            {msg.text}
          </div>
          {msg.sender === 'user' && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center ml-2 mt-1 bg-gradient-to-br from-indigo-400 to-blue-500 text-white text-lg font-bold shadow-lg border border-white">
              {currentUser.avatar}
            </div>
          )}
        </div>
      </div>
    ))
  )}
  {isTyping && (
    <div className="flex justify-start items-center space-x-2">
      <div className="w-10 h-10 rounded-full flex items-center justify-center border border-purple-200 overflow-hidden">
        <img src="nimi-logo.jpg" alt="Nimi Logo" className="w-full h-full object-cover" />
      </div>
      <div className="w-16 h-6 bg-purple-100 rounded-full flex justify-between items-center px-2">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150" />
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-300" />
      </div>
    </div>
  )}
  <div ref={chatEndRef} />
</div>


      <ErrorMessage />

      {/* Input & Controls */}
      <div className="flex gap-2 items-center">
        <Input
          ref={chatInputRef}
          placeholder="Type your message..."
          className="flex-1"
          onKeyDown={e => { if(e.key==='Enter' && !isTyping && !isListening) handleSend(); }}
          disabled={isTyping || isListening}
        />
        <Button onClick={handleSend} size="icon" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          {isTyping ? <Loader2 className="animate-spin"/> : <Send />}
        </Button>
        {voiceEnabled && browserSupports.mic && (
          <Button onClick={isListening?stopVoiceInput:startVoiceInput} size="icon" className="bg-gradient-to-r from-green-400 to-teal-500 hover:from-green-500 hover:to-teal-600">
            <Mic className={`${isListening?'animate-pulse':''}`}/>
          </Button>
        )}
        {textToSpeechEnabled && browserSupports.tts && (
          <Button onClick={speakMessage} size="icon" className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600">
            {isSpeaking ? <VolumeX/> : <Volume2/>}
          </Button>
        )}
      </div>
    </div>
  );
};
