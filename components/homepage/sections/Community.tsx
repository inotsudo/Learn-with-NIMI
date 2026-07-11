"use client";

import { Heart, Users } from "lucide-react";
import Section from "@/components/homepage/ui/Section";
import Container from "@/components/homepage/ui/Container";
import Button from "@/components/homepage/ui/Button";

const CREATIONS = [
  { name: "Amara, 7",  emoji: "🎨", title: "My elephant story", likes: 24, bg: "bg-emerald-100" },
  { name: "Theo, 5",   emoji: "🖍️", title: "Coloring: The Baobab", likes: 18, bg: "bg-amber-100"  },
  { name: "Issa, 8",   emoji: "📖", title: "Le Petit Baobab fan art", likes: 31, bg: "bg-blue-100"   },
  { name: "Cleo, 6",   emoji: "⭐", title: "Star map mission", likes: 15, bg: "bg-purple-100" },
  { name: "Nadia, 9",  emoji: "🌺", title: "Kinyarwanda flower poem", likes: 42, bg: "bg-pink-100"   },
  { name: "Kofi, 7",   emoji: "🚀", title: "Zilo's space adventure", likes: 27, bg: "bg-indigo-100" },
];

const TESTIMONIALS = [
  { quote: "My daughter now corrects my Kinyarwanda. She's 6.", name: "Marie K.", role: "Parent, Kigali" },
  { quote: "We use it every morning before school. Best 15 minutes of our day.", name: "Jean-Paul N.", role: "Parent, Butare" },
];

export default function Community() {
  return (
    <Section id="community" bg="white">
      <Container>
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 font-nunito font-bold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full mb-4">
            <Users className="w-3.5 h-3.5" /> Families Learning Together
          </span>
          <h2 className="font-baloo font-black text-gray-900 text-3xl sm:text-4xl leading-tight" style={{textWrap:"balance"}}>
            A gallery of <span className="text-nimi-green">young creators</span>
          </h2>
          <p className="font-nunito text-gray-500 mt-3 max-w-md mx-auto text-sm sm:text-base">
            Kids share their stories, colorings, and artwork. Families cheer each other on.
          </p>
        </div>

        {/* Creations grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {CREATIONS.map((c) => (
            <div key={c.name} className={`${c.bg} rounded-2xl p-4 flex flex-col gap-2 hover:shadow-md transition-shadow`}>
              <div className="text-3xl">{c.emoji}</div>
              <p className="font-baloo font-black text-gray-900 text-xs leading-snug">{c.title}</p>
              <p className="font-nunito text-[10px] text-gray-500 font-semibold">{c.name}</p>
              <div className="flex items-center gap-1 mt-auto text-[10px] font-bold text-gray-500">
                <Heart className="w-3 h-3 text-red-400 fill-red-400" /> {c.likes}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <p className="font-nunito text-gray-700 text-sm leading-relaxed italic">"{t.quote}"</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-nimi-green rounded-full flex items-center justify-center text-white font-baloo font-black text-sm">{t.name[0]}</div>
                <div>
                  <p className="font-baloo font-black text-gray-900 text-sm">{t.name}</p>
                  <p className="font-nunito text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button href="/signuppage" variant="primary">Join the Community</Button>
        </div>
      </Container>
    </Section>
  );
}
