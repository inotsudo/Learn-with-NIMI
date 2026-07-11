"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Volume2 } from "lucide-react";

function isEmoji(word: string) {
  return /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/u.test(word);
}

interface NimiReaderButtonProps {
  hide?: boolean;
}

export default function NimiReaderButton({ hide }: NimiReaderButtonProps) {
  const { language } = useLanguage();
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const wordSpansRef = useRef<HTMLSpanElement[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 500 });
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        // pick a male voice (closest to a boy) — prioritize en-US
        const boyVoice = voices.find(v => v.lang.includes("en") && v.name.toLowerCase().includes("male")) 
                        || voices.find(v => v.lang.includes("en")) 
                        || voices[0];
        setSelectedVoice(boyVoice || null);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const wrapWordsWithSpans = (element: HTMLElement) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.nodeValue?.trim().length) textNodes.push(node);
    }

    wordSpansRef.current = [];

    textNodes.forEach((textNode) => {
      const parent = textNode.parentNode;
      if (!parent) return;
      const words = textNode.nodeValue!.split(/(\s+)/);
      const fragment = document.createDocumentFragment();

      words.forEach((word) => {
        if (!word.trim()) {
          fragment.appendChild(document.createTextNode(word));
          return;
        }
        const span = document.createElement("span");
        span.textContent = word;
        fragment.appendChild(span);
        wordSpansRef.current.push(span);
      });

      parent.replaceChild(fragment, textNode);
    });
  };

  const removeHighlights = () => {
    wordSpansRef.current.forEach(span => span.classList.remove("nimi-reader-highlight"));
  };

  const unwrapSpans = (element: HTMLElement) => {
    wordSpansRef.current.forEach(span => {
      const parent = span.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(span.textContent || ""), span);
    });
    wordSpansRef.current = [];
  };

  const handleClick = () => {
    if (typeof window === "undefined" || !voicesLoaded) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      removeHighlights();
      unwrapSpans(document.body);
      return;
    }

    const main = document.querySelector("main");
    if (!main) return;

    wrapWordsWithSpans(main);

    const wordsToRead = wordSpansRef.current.map(s => s.textContent || "").filter(w => !isEmoji(w.trim()));
    if (!wordsToRead.length) {
      unwrapSpans(main);
      return;
    }

    const textToSpeak = wordsToRead.join(" ");
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.lang = language || "en-US";
    if (selectedVoice) utterance.voice = selectedVoice;

    // 🟡 toddler boy effect
    utterance.pitch = 1.4;  // higher pitch = childlike
    utterance.rate = 0.8;   // slightly faster
    utterance.volume = 1;

    utteranceRef.current = utterance;
    let currentWordIndex = 0;
    setSpeaking(true);

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        removeHighlights();
        const wordSpan = wordSpansRef.current.find(span => (span.textContent || "").trim() === wordsToRead[currentWordIndex].trim());
        if (wordSpan) {
          wordSpan.classList.add("nimi-reader-highlight");
          wordSpan.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        currentWordIndex++;
      }
    };

    utterance.onend = () => {
      setSpeaking(false);
      removeHighlights();
      unwrapSpans(main);
    };

    utterance.onerror = () => {
      setSpeaking(false);
      removeHighlights();
      unwrapSpans(main);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // 🟡 Drag & Drop
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    offset.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    setPosition({ x: clientX - offset.current.x, y: clientY - offset.current.y });
  };

  const handleMouseUp = () => { isDragging.current = false; };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  if (hide) return null;

  return (
    <>
      <style>{`
        .nimi-reader-highlight {
          background-color: #fde68a;
          border-radius: 0.25rem;
          transition: background-color 0.3s ease;
        }
      `}</style>

      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={!voicesLoaded}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        style={{ position: "fixed", left: position.x, top: position.y, zIndex: 9999, touchAction: "none" }}
        className="bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white text-sm md:text-base font-bold px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 cursor-grab active:cursor-grabbing"
      >
        <Volume2 className="w-5 h-5" />
        {speaking ? "🔊 Stop Reading" : "🗣️ Hear from Nimi"}
      </button>
    </>
  );
}
