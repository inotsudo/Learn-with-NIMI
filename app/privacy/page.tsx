"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const EFFECTIVE_DATE = "July 10, 2026";
const CONTACT_EMAIL = "privacy@nimipiko.com";

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } } };
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={fadeUp} className="mb-10">
      <h2 className="font-baloo font-black text-gray-900 text-[22px] sm:text-[26px] mb-3 border-b border-gray-100 pb-2">{title}</h2>
      <div className="space-y-3 font-nunito text-gray-600 text-[14px] sm:text-[15px] leading-relaxed">{children}</div>
    </motion.section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/nimi-logo.png" alt="NIMIPIKO" width={36} height={36} className="object-contain" />
            <span className="font-baloo font-black text-gray-800 text-[16px] hidden sm:block">NIMIPIKO</span>
          </Link>
          <div className="flex-1" />
          <Link href="/terms" className="font-nunito text-gray-500 hover:text-gray-800 text-[13px] transition-colors">Terms of Use</Link>
          <Link href="/" className="font-nunito text-gray-500 hover:text-gray-800 text-[13px] transition-colors">← Back to Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-20">
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          <motion.div variants={fadeUp} className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-[20px]">🔒</span>
              <span className="font-nunito text-green-700 text-[11px] font-bold uppercase tracking-[0.18em]">Legal Document</span>
            </div>
            <h1 className="font-baloo font-black text-gray-900 text-[32px] sm:text-[42px] leading-tight mb-2">Privacy Policy</h1>
            <p className="font-nunito text-gray-400 text-[13px]">Effective Date: {EFFECTIVE_DATE} · Last Updated: {EFFECTIVE_DATE}</p>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-10">
            <p className="font-baloo font-black text-green-800 text-[16px] mb-1">🌿 Our commitment to your family</p>
            <p className="font-nunito text-green-700 text-[14px] leading-relaxed">
              NIMIPIKO is designed for children ages 2–12. We take children&apos;s privacy seriously and comply with the
              Children&apos;s Online Privacy Protection Act (COPPA), the General Data Protection Regulation (GDPR), and applicable
              Rwandan data protection law. We collect only what we need to deliver a safe, educational experience and never
              sell personal information.
            </p>
          </motion.div>

          <Section title="1. Who We Are">
            <p><strong className="text-gray-800">Nimipiko Studio LTD</strong> (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates NIMIPIKO — an immersive early learning platform offering interactive story-based learning for children ages 2–12. Our service is accessible via our website and mobile app.</p>
            <p>Registered in Rwanda. Contact us: <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-600 hover:underline">{CONTACT_EMAIL}</a></p>
          </Section>

          <Section title="2. Information We Collect">
            <p><strong className="text-gray-800">From Parents (Account Registration):</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email address and password (for account creation and login)</li>
              <li>Parent/guardian name</li>
              <li>Payment information (processed securely by CyberSource and MTN Mobile Money — we do not store card numbers)</li>
              <li>Country and preferred language</li>
            </ul>

            <p className="mt-3"><strong className="text-gray-800">From Child Profiles (Created by Parents):</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Child&apos;s first name and age range (e.g., &quot;5–6 years&quot;)</li>
              <li>Chosen avatar emoji</li>
              <li>Learning language preference</li>
              <li>Story progress, stars earned, and badge achievements</li>
            </ul>

            <p className="mt-3"><strong className="text-gray-800">Photo Uploads (Champion Treasure Box & Masterpiece):</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Photos uploaded to the Champion Treasure Box are stored securely and linked to your family account</li>
              <li>Photos submitted for Masterpiece personalization are used solely to produce the personalized storybook and are deleted after fulfillment</li>
              <li>Parent consent is required via a checkbox before any photo is submitted</li>
              <li>We do not use child photos for advertising, training AI models, or any purpose beyond the feature described at submission</li>
            </ul>

            <p className="mt-3"><strong className="text-gray-800">Automatically Collected:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Device type and browser (for compatibility)</li>
              <li>Usage data (pages visited, features used, session duration)</li>
              <li>Push notification tokens (if opted in by parent)</li>
              <li>IP address (used only to determine regional pricing — Rwanda vs. international — and is not stored beyond the session)</li>
            </ul>

            <p className="mt-3"><strong className="text-gray-800">We do NOT collect:</strong> biometric data, precise location, or any information that directly identifies a child beyond their chosen first name, avatar, and age range.</p>
          </Section>

          <Section title="3. How We Use Information">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-gray-800">Deliver the service:</strong> Personalize stories, track progress, award achievements, and remember preferences.</li>
              <li><strong className="text-gray-800">Communicate with parents:</strong> Send progress reports, important service updates, and (if opted in) weekly learning summaries.</li>
              <li><strong className="text-gray-800">Process payments:</strong> Manage subscriptions, process refunds, and send receipts.</li>
              <li><strong className="text-gray-800">Regional pricing:</strong> Your IP address is checked once per session to apply the correct currency (RWF for Rwanda, USD for international). The IP is not logged or retained.</li>
              <li><strong className="text-gray-800">Improve NIMIPIKO:</strong> Aggregate, anonymized usage data helps us improve content and features. No personal data is used for advertising.</li>
              <li><strong className="text-gray-800">Safety and compliance:</strong> Prevent fraud, enforce our Terms, and comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="4. Children's Privacy (COPPA & GDPR)">
            <p>NIMIPIKO is directed at children under 13. We require verifiable parental consent before creating a child profile. Specifically:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Only parents or guardians may create an account and set up child profiles.</li>
              <li>We collect minimal information from child profiles (name, avatar, age range, language, progress data).</li>
              <li>We do not allow children to communicate with other users directly — community content is anonymous and moderated before display.</li>
              <li>We do not serve behavioral advertising to children.</li>
              <li><strong className="text-gray-800">Photo uploads</strong> require an explicit parental consent checkbox: &quot;I agree to the Terms of Use and confirm I have the right to share this content on Nimipiko.&quot; No photo is accepted without this confirmation.</li>
              <li>Parents may review, update, or delete their child&apos;s information at any time by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-600 hover:underline">{CONTACT_EMAIL}</a>.</li>
            </ul>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3">
              <p className="font-baloo font-black text-green-800 text-[14px] mb-1">GDPR — For Families in the European Economic Area</p>
              <p className="text-green-700 text-[13px] leading-relaxed">Our lawful basis for processing your data is <em>contract performance</em> (delivering the service you subscribed to) and <em>legitimate interests</em> (platform security and fraud prevention). You have the right to access, correct, delete, or port your data at any time. Contact <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 underline">{CONTACT_EMAIL}</a> to exercise these rights.</p>
            </div>
          </Section>

          <Section title="5. Information Sharing">
            <p>We do not sell, rent, or trade personal information. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-gray-800">Supabase (database hosting):</strong> Stores your account and progress data securely.</li>
              <li><strong className="text-gray-800">CyberSource / MTN Mobile Money (payments):</strong> For processing transactions. They operate under their own privacy policies.</li>
              <li><strong className="text-gray-800">Vercel (hosting):</strong> Our platform hosting provider.</li>
              <li><strong className="text-gray-800">Anthropic (AI):</strong> The Nimi AI chat feature sends child name and story context to Claude. No conversation history is stored beyond the session.</li>
              <li><strong className="text-gray-800">Law enforcement:</strong> If required by applicable law or court order.</li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <p>We retain account data as long as your account is active. If you close your account:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Child progress data is deleted within 30 days</li>
              <li>Champion Treasure Box photos are deleted within 14 days of account closure</li>
              <li>Masterpiece photos are deleted within 14 days of production completion</li>
              <li>Payment records are retained for 7 years (legal requirement)</li>
              <li>Anonymized, aggregated usage statistics may be retained indefinitely</li>
            </ul>
          </Section>

          <Section title="7. Security">
            <p>We use industry-standard security measures including encrypted HTTPS connections, secure password hashing, and row-level security in our database. Payment data is handled exclusively by PCI-compliant payment processors — we never store card numbers.</p>
            <p className="mt-2">Downloadable content (PDFs, coloring pages, certificates) includes embedded account metadata for IP protection purposes. This does not contain any sensitive personal information — only an anonymized account reference used to investigate unauthorized redistribution.</p>
          </Section>

          <Section title="8. Cookies">
            <p>We use only essential cookies and session tokens required to keep you logged in and maintain preferences. We do not use third-party advertising cookies. You can clear cookies through your browser settings, though this will log you out.</p>
          </Section>

          <Section title="9. Your Rights">
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Withdraw consent for push notifications</li>
              <li>Receive a copy of your data (data portability)</li>
              <li>Request deletion of any photo submitted through Champion Treasure Box or Masterpiece</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-600 hover:underline">{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you by email and post the updated policy with a new effective date. Continued use of NIMIPIKO after changes constitutes acceptance.</p>
          </Section>

          <Section title="11. Contact Us">
            <p>Questions, concerns, or requests regarding your privacy:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
              <p className="font-baloo font-black text-gray-800 text-[15px]">Nimipiko Studio LTD — Privacy Team</p>
              <p className="text-gray-600 mt-1">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-600 hover:underline">{CONTACT_EMAIL}</a></p>
              <p className="text-gray-600">Response time: Within 30 business days</p>
            </div>
          </Section>

        </motion.div>
      </main>

      <footer className="bg-white border-t border-gray-100 px-4 py-6 text-center">
        <p className="font-nunito text-gray-400 text-[12px]">
          © {new Date().getFullYear()} Nimipiko Studio LTD · <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Use</Link> · <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
