"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  hidden:  { opacity:0, y:30 },
  visible: { opacity:1, y:0, transition:{ duration:0.55, ease:[0.22,1,0.36,1] as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition:{ staggerChildren:0.11 } },
};

const FAQ_ITEMS = [
  {
    q: "What age is NIMIPIKO designed for?",
    a: "Stories and missions are crafted for children aged 3–10. Each story is tagged by age range so you always pick the perfect fit — and content grows with your child.",
  },
  {
    q: "Is it safe? No ads, no strangers?",
    a: "Completely. NIMIPIKO is ad-free, has no social chat features, and children cannot make in-app purchases. Every story is reviewed by certified child development educators. Your child's data is never shared or sold — ever.",
  },
  {
    q: "Can my child switch between languages?",
    a: "Yes! Switch between English, French, and Kinyarwanda anytime from settings. Progress in each language is saved separately — nothing is lost when you switch.",
  },
  {
    q: "How many children can share one account?",
    a: "A single family account supports multiple children, each with their own profile, adventure map, badge collection, and progress dashboard.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel anytime from your account settings in one tap. You keep full access until the end of your current billing period. No penalties, no awkward calls, no hidden fees.",
  },
  {
    q: "Does it work on slow or mobile internet?",
    a: "NIMIPIKO is optimised for lower-bandwidth connections and loads quickly on mobile data. We're also building offline-first features — coming soon.",
  },
  {
    q: "Do I need to be there while my child uses it?",
    a: "That's entirely up to you. NIMIPIKO is safe for independent use, but learning together makes it even more magical. The parent dashboard keeps you fully informed either way.",
  },
] as const;

export default function LandingFAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="relative px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white">
      <div className="max-w-3xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="eyebrow inline-block text-gray-700 mb-4 bg-gray-100 px-4 py-1.5 rounded-full">
              💬 Quick Answers
            </span>
            <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
              Questions parents ask
            </h2>
            <p className="font-nunito text-gray-500 mt-3 text-[15px] max-w-lg mx-auto">
              Everything you need to know before getting started.
            </p>
          </motion.div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between text-left px-6 py-5 hover:bg-gray-50 transition-colors gap-4">
                  <span className="font-baloo font-black text-gray-900 text-[15px] sm:text-[17px] leading-snug">
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[18px] font-light shrink-0 transition-colors"
                    style={{
                      background: open === i ? "var(--nimi-green)" : "var(--ds-brand-subtle)",
                      color: open === i ? "white" : "var(--ds-brand-primary)",
                    }}>
                    +
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden">
                      <p className="font-nunito text-gray-500 text-[14px] sm:text-[15px] leading-relaxed px-6 pb-6 pt-1">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <p className="font-nunito text-gray-400 text-[14px]">
              Still have questions?{" "}
              <Link href="/help" className="font-bold hover:underline transition-colors" style={{ color: "var(--ds-brand-primary)" }}>
                Visit our Help Center →
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
