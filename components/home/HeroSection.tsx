"use client";

import Link from "next/link";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props {
  childName:    string;
  timeOfDay:    string;
  currentStory: StoryLibraryItem | undefined;
}

export default function HeroSection({ childName, timeOfDay, currentStory }: Props) {
  return (
    <section className="bg-gray-100 leaf-lg px-8 py-12 sm:px-12 sm:py-16">
      <p className="font-nunito text-gray-400 text-xs uppercase tracking-widest mb-2">
        {timeOfDay}
      </p>
      <h1 className="font-baloo font-black text-gray-900 text-4xl sm:text-5xl lg:text-6xl leading-tight mb-2">
        Hello, {childName}!
      </h1>
      <p className="font-baloo font-black text-gray-700 text-lg sm:text-xl mb-1">
        Grow with every story.
      </p>
      <p className="font-nunito text-gray-500 text-sm mb-8 max-w-xs">
        Read, create, explore and grow with Nimi, Piko &amp; Zilo.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {currentStory && (
          <Link
            href={`/stories/${currentStory.slug}`}
            className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-baloo font-bold text-sm px-6 py-3 rounded-full transition-colors"
          >
            ▶ Start Learning
          </Link>
        )}
        <Link
          href="/stories"
          className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-baloo font-bold text-sm px-6 py-3 rounded-full transition-colors"
        >
          Browse Stories
        </Link>
      </div>
    </section>
  );
}
