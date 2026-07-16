"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-ds-bg flex flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg text-center"
      >
        <div className="text-6xl mb-4">👋</div>
        <h1 className="font-baloo font-black text-ds-text text-[32px] mb-2">
          Contact Us
        </h1>
        <p className="text-gray-500 text-[15px] mb-10">
          We&apos;d love to hear from you. Reach us through any of the channels below.
        </p>

        <div className="space-y-4 text-left">
          <a
            href="mailto:hello@nimipiko.com"
            className="flex items-center gap-4 p-5 bg-ds-card border border-ds-border rounded-2xl hover:border-[var(--ds-brand-primary)] transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-[var(--nimi-green)]" />
            </div>
            <div>
              <p className="font-bold text-ds-text text-[14px]">Email</p>
              <p className="text-gray-500 text-[13px] group-hover:text-[var(--nimi-green)] transition-colors">
                hello@nimipiko.com
              </p>
            </div>
          </a>

          <a
            href="https://wa.me/250780000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 bg-ds-card border border-ds-border rounded-2xl hover:border-[var(--ds-brand-primary)] transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-[var(--nimi-green)]" />
            </div>
            <div>
              <p className="font-bold text-ds-text text-[14px]">WhatsApp</p>
              <p className="text-gray-500 text-[13px] group-hover:text-[var(--nimi-green)] transition-colors">
                +250 780 000 000
              </p>
            </div>
          </a>

          <a
            href="https://instagram.com/nimipiko"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 bg-ds-card border border-ds-border rounded-2xl hover:border-[var(--ds-brand-primary)] transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <p className="font-bold text-ds-text text-[14px]">Instagram</p>
              <p className="text-gray-500 text-[13px] group-hover:text-pink-500 transition-colors">
                @nimipiko
              </p>
            </div>
          </a>
        </div>

        <p className="mt-10 text-gray-400 text-[12px]">
          Based in Kigali, Rwanda. We typically respond within 24 hours.
        </p>

        <Link
          href="/"
          className="inline-block mt-6 text-[13px] font-bold text-[var(--nimi-green)] hover:underline"
        >
          ← Back to home
        </Link>
      </motion.div>
    </main>
  );
}
