"use client";

import { Mic, MessageCircle, Sparkles, Volume2 } from "lucide-react";
import Section from "@/components/homepage/ui/Section";
import Container from "@/components/homepage/ui/Container";
import Button from "@/components/homepage/ui/Button";

const FEATURES = [
  { icon: Mic,           title: "Speaks back",      desc: "NIMI listens and responds in your child's language — real conversation, not just buttons." },
  { icon: MessageCircle, title: "Answers questions", desc: "Kids ask anything about the story or a word. NIMI explains it at exactly their level." },
  { icon: Volume2,       title: "Reads aloud",       desc: "Native-quality pronunciation in Kinyarwanda, French, and English so kids hear it right." },
  { icon: Sparkles,      title: "Always encouraging",desc: "NIMI celebrates every attempt and gently corrects — no frustration, just growth." },
];

export default function AI() {
  return (
    <Section id="ai" bg="cream">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center gap-2 bg-nimi-green/10 text-nimi-green font-nunito font-bold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Powered by AI
            </span>
            <h2 className="font-baloo font-black text-gray-900 text-3xl sm:text-4xl leading-tight" style={{textWrap:"balance"}}>
              Meet NIMI — your child's <span className="text-nimi-green">AI language tutor</span>
            </h2>
            <p className="font-nunito text-gray-600 mt-4 leading-relaxed text-sm sm:text-base max-w-md">
              NIMI isn't a chatbot — it's a patient, encouraging tutor that adapts to every child's pace and speaks their language fluently.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                    <Icon className="w-4.5 h-4.5 text-nimi-green" />
                  </div>
                  <p className="font-baloo font-black text-gray-900 text-sm">{title}</p>
                  <p className="font-nunito text-gray-500 text-xs mt-1 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Button href="/talk-to-nimi" variant="primary">Try Talking to NIMI</Button>
            </div>
          </div>

          {/* Right: mock chat bubble UI */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 space-y-4 max-w-sm mx-auto lg:mx-0">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-nimi-green rounded-full flex items-center justify-center text-white font-baloo font-black text-lg">N</div>
              <div>
                <p className="font-baloo font-black text-gray-900 text-sm">NIMI</p>
                <p className="font-nunito text-xs text-emerald-500 font-bold">● Online</p>
              </div>
            </div>
            {[
              { from: "nimi", text: "Muraho! Let's practice Kinyarwanda today. 🌍" },
              { from: "child", text: "What does 'imbeba' mean?" },
              { from: "nimi", text: "Great question! 'Imbeba' means mouse 🐭 — you saw it in the story we just read!" },
              { from: "child", text: "Oh! Can you say it again?" },
              { from: "nimi", text: "Im-BE-ba! Your turn! 🎤" },
            ].map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "child" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-nunito font-semibold leading-snug ${
                  msg.from === "nimi"
                    ? "bg-emerald-50 text-gray-800 rounded-bl-sm"
                    : "bg-nimi-green text-white rounded-br-sm"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
