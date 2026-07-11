"use client";

import { BookOpen, Star, Play } from "lucide-react";
import Section from "@/components/homepage/ui/Section";
import Container from "@/components/homepage/ui/Container";
import Button from "@/components/homepage/ui/Button";

const FEATURED = [
  { title: "Inzovu n'Imbeba", lang: "🇷🇼 Kinyarwanda", level: "Beginner", emoji: "🐘", color: "from-emerald-50 to-teal-50", border: "border-emerald-100" },
  { title: "Le Petit Baobab",  lang: "🇫🇷 Français",    level: "Intermediate", emoji: "🌳", color: "from-amber-50 to-yellow-50",  border: "border-amber-100"   },
  { title: "Zilo and the Stars", lang: "🇬🇧 English",   level: "Beginner",     emoji: "⭐", color: "from-blue-50 to-indigo-50",   border: "border-blue-100"    },
  { title: "Niki na Inzuki",   lang: "🇷🇼 Kinyarwanda", level: "Advanced",     emoji: "🐝", color: "from-yellow-50 to-orange-50", border: "border-orange-100"  },
];

export default function Stories() {
  return (
    <Section id="stories" bg="white">
      <Container>
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 font-nunito font-bold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full mb-4">
            <BookOpen className="w-3.5 h-3.5" /> Featured Stories
          </span>
          <h2 className="font-baloo font-black text-gray-900 text-3xl sm:text-4xl leading-tight" style={{textWrap:"balance"}}>
            Stories kids actually <span className="text-nimi-green">want to read</span>
          </h2>
          <p className="font-nunito text-gray-500 mt-3 max-w-md mx-auto text-sm sm:text-base">
            Every story teaches language through adventure, culture, and characters kids love.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED.map((story) => (
            <div key={story.title}
              className={`bg-gradient-to-br ${story.color} border ${story.border} rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}>
              <div className="text-4xl">{story.emoji}</div>
              <div>
                <p className="font-baloo font-black text-gray-900 text-[15px] leading-snug">{story.title}</p>
                <p className="font-nunito text-[11px] font-bold text-gray-500 mt-0.5">{story.lang}</p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-white/70 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {story.level}
                </span>
                <button className="w-8 h-8 bg-nimi-green rounded-full flex items-center justify-center shadow-sm hover:brightness-105 transition" aria-label={`Play ${story.title}`}>
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button href="/signuppage" variant="primary">Browse All Stories</Button>
        </div>
      </Container>
    </Section>
  );
}
