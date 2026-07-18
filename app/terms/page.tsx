"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const EFFECTIVE_DATE = "July 10, 2026";
const CONTACT_EMAIL = "support@nimipiko.com";

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

export default function TermsOfUsePage() {
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
          <Link href="/privacy" className="font-nunito text-gray-500 hover:text-gray-800 text-[13px] transition-colors">Privacy Policy</Link>
          <Link href="/" className="font-nunito text-gray-500 hover:text-gray-800 text-[13px] transition-colors">← Back to Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-20">
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          <motion.div variants={fadeUp} className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[20px]">📋</span>
              <span className="font-nunito text-blue-700 text-[11px] font-bold uppercase tracking-[0.18em]">Legal Document</span>
            </div>
            <h1 className="font-baloo font-black text-gray-900 text-[32px] sm:text-[42px] leading-tight mb-2">Terms of Use</h1>
            <p className="font-nunito text-gray-400 text-[13px]">Effective Date: {EFFECTIVE_DATE} · Last Updated: {EFFECTIVE_DATE}</p>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-10">
            <p className="font-baloo font-black text-blue-800 text-[16px] mb-1">📌 Please read before using NIMIPIKO</p>
            <p className="font-nunito text-blue-700 text-[14px] leading-relaxed">
              By creating an account or using NIMIPIKO, you agree to these Terms of Use. These terms apply to parents,
              guardians, and any adults who create accounts on behalf of children. Children under 13 may only use
              NIMIPIKO through a parent or guardian-controlled account.
            </p>
          </motion.div>

          <Section title="1. The Service">
            <p>NIMIPIKO is an online educational platform operated by <strong className="text-gray-800">Nimipiko Studio LTD</strong> (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), providing interactive stories, learning missions, AI-powered conversations, songs, coloring pages, and achievement tracking for children ages 2–12. The platform is available via web and mobile app.</p>
            <p>NIMIPIKO is operated from Rwanda and serves families globally. Access to certain features requires a paid subscription.</p>
          </Section>

          <Section title="2. Eligibility & Account Creation">
            <ul className="list-disc pl-5 space-y-2">
              <li>You must be at least 18 years old to create an account.</li>
              <li>You may create child profiles for children in your care (under age 18).</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You agree to provide accurate registration information and keep it updated.</li>
              <li>One account may manage multiple child profiles.</li>
            </ul>
          </Section>

          <Section title="3. Subscriptions and Payments">
            <p><strong className="text-gray-800">Free Access:</strong> The first story in each language is available free of charge with no time limit.</p>

            <p className="mt-2"><strong className="text-gray-800">Nimipiko Club (Monthly Subscription):</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Unlocks all published stories, all 6 learning missions per story, AI companion Nimi, challenges, and community features</li>
              <li>Billed monthly at <strong className="text-gray-800">$14.99 USD</strong> (international) or <strong className="text-gray-800">9,900 RWF</strong> (Rwanda)</li>
              <li>Language profile: choose French + English, Kinyarwanda + French, or all three languages</li>
              <li>Subscription renews automatically each month on the same date until cancelled</li>
            </ul>

            <p className="mt-2"><strong className="text-gray-800">Masterpiece (One-Time Purchase):</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A personalized digital storybook featuring your child as the hero — your child&apos;s photo is woven into the story</li>
              <li>One-time payment of <strong className="text-gray-800">$29.99 USD</strong> (international) or <strong className="text-gray-800">40,000 RWF</strong> (Rwanda)</li>
              <li>Includes: personalized story PDF, achievement certificate, and gallery feature</li>
              <li>Non-refundable once production begins (3 business days after order)</li>
            </ul>

            <p className="mt-3">Payments are processed by CyberSource (for card payments) and MTN Mobile Money (for Rwanda). All prices are inclusive of applicable taxes where required.</p>
          </Section>

          <Section title="4. Cancellation & Refunds">
            <p><strong className="text-gray-800">Cancellation:</strong> You may cancel your subscription at any time from your account settings or by contacting support. Cancellation takes effect at the end of the current billing period — you retain access until then.</p>
            <p className="mt-2"><strong className="text-gray-800">Refunds:</strong> We offer a full refund within 7 days of your first Club subscription payment if you are not satisfied. After 7 days, or for subsequent billing periods, refunds are at our discretion. To request a refund, contact <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.</p>
            <p className="mt-2"><strong className="text-gray-800">No partial refunds</strong> for unused time within a billing period.</p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Share your account credentials with people outside your household</li>
              <li>Use automated tools, bots, or scrapers to access, copy, or extract any content from the platform</li>
              <li>Attempt to download, reproduce, or redistribute our stories, music, artwork, or character assets</li>
              <li>Upload harmful, offensive, or illegal content through any community feature</li>
              <li>Use the service for any commercial purpose without our written consent</li>
              <li>Circumvent any technical protection measures (including watermarks or DRM)</li>
              <li>Misrepresent your identity or your child&apos;s age</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property & Proprietary Methods">
            <p>All content on NIMIPIKO — including stories, characters, artwork, music, songs, coloring pages, animations, and educational material — is owned by <strong className="text-gray-800">Nimipiko Studio LTD</strong> or licensed to us. You may not reproduce, distribute, or create derivative works from our content without written permission.</p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
              <p className="font-baloo font-black text-amber-800 text-[14px] mb-2">The Nimipiko Learning Method™</p>
              <p className="text-amber-700 text-[13px] leading-relaxed">The <strong>Nimipiko Learning Method™</strong> is a proprietary six-step sequential learning pathway exclusively designed and owned by Nimipiko Studio LTD. The six steps — <em>FlipFlop Audio, Story PDF, Coloring Page, Move & Explore, Karaoke & Song,</em> and <em>Bonus Animation</em> — are copyrighted works and may not be reproduced, adapted, or used in any form without written authorization.</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-3">
              <p className="font-baloo font-black text-purple-800 text-[14px] mb-2">Proprietary Characters</p>
              <p className="text-purple-700 text-[13px] leading-relaxed">The characters <strong>Nimi™</strong> (joyful explorer), <strong>Piko™</strong> (curious robot), and <strong>Zilo™</strong> (nature guardian) are proprietary intellectual properties of Nimipiko Studio LTD. Their likenesses, names, and associated artwork may not be reproduced, distributed, or used commercially without express written consent.</p>
            </div>

            <p className="mt-3">Content you create or share through community features (such as coloring page submissions) grants us a non-exclusive, royalty-free license to display within the platform for other families to enjoy.</p>
            <p className="mt-2"><strong className="text-gray-800">AI-Generated Content:</strong> Responses from Nimi AI are generated and may occasionally be imperfect. They should not replace professional educational or medical advice.</p>
          </Section>

          <Section title="7. Content Watermarking & Protection">
            <p>To protect our intellectual property and deter unauthorized distribution:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-gray-800">Dynamic watermarking:</strong> Downloadable content (story PDFs, coloring pages, certificates) contains embedded metadata linked to your account. This allows us to trace and investigate any unauthorized redistribution.</li>
              <li><strong className="text-gray-800">Technical protections:</strong> Platform assets (images, audio, video) are protected by technical measures. Circumventing these measures violates these Terms and applicable copyright law.</li>
              <li><strong className="text-gray-800">Permitted personal use:</strong> You may download content for your family&apos;s personal, non-commercial use only. Sharing downloads publicly or distributing them to third parties is prohibited.</li>
            </ul>
          </Section>

          <Section title="8. Nimi AI Companion">
            <p>The Nimi AI chat feature uses large language model technology to provide educational conversations tailored to your child&apos;s current story and learning level. By using this feature, you agree that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conversation context (child name, story progress) is sent to our AI provider (Anthropic) to generate responses</li>
              <li>Conversations are not stored permanently — they reset each session</li>
              <li>AI responses are generated content and may not always be perfect</li>
              <li>NIMIPIKO is not responsible for AI responses that a child may find confusing or upsetting</li>
            </ul>
          </Section>

          <Section title="9. Community Features & Champion Treasure Box">
            <p>The Community Square displays moderated achievement cards and artwork shared by families. By participating:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Posts are reviewed before public display</li>
              <li>We reserve the right to remove content that violates community guidelines</li>
              <li>Child profiles in community posts are represented only by their first name and avatar</li>
              <li>You may report inappropriate content using the report button on any post</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-3">
              <p className="font-baloo font-black text-blue-800 text-[14px] mb-2">Champion Treasure Box — Photo Uploads</p>
              <p className="text-blue-700 text-[13px] leading-relaxed">Before uploading a photo to the Champion Treasure Box gallery, the parent or guardian must confirm: <em>&quot;I agree to the Terms of Use and confirm I have the right to share this content on Nimipiko.&quot;</em> Photos are stored privately and visible only to your family unless you explicitly choose to share them.</p>
            </div>
          </Section>

          <Section title="10. Parental Controls & Safety">
            <p>NIMIPIKO is designed with child safety as a priority:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All content is reviewed by educators before publication</li>
              <li>Children cannot contact other users directly</li>
              <li>Push notifications require explicit parental opt-in</li>
              <li>Parents can view all child activity through the Parent Dashboard</li>
              <li>Parents may delete a child profile at any time from Account Settings</li>
            </ul>
          </Section>

          <Section title="11. Disclaimers & Limitation of Liability">
            <p>NIMIPIKO is provided &quot;as is.&quot; We strive for 99.9% uptime but cannot guarantee uninterrupted access. We are not responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Temporary service outages for maintenance or technical issues</li>
              <li>Loss of progress due to technical errors (though we back up data regularly)</li>
              <li>Third-party services (payment processors, device compatibility)</li>
            </ul>
            <p className="mt-2">To the maximum extent permitted by law, Nimipiko Studio LTD&apos;s total liability to you for any claim shall not exceed the amount you paid for the service in the 12 months preceding the claim.</p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>We may update these Terms at any time. We will notify you via email with 14 days&apos; notice before material changes take effect. Continued use after that date constitutes your agreement to the updated Terms.</p>
          </Section>

          <Section title="13. Governing Law">
            <p>These Terms are governed by the laws of Rwanda. Disputes will be resolved through good-faith negotiation. If unresolved, disputes will be submitted to the courts of Rwanda.</p>
          </Section>

          <Section title="14. Contact Us">
            <p>Questions about these Terms:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
              <p className="font-baloo font-black text-gray-800 text-[15px]">Nimipiko Studio LTD — Support Team</p>
              <p className="text-gray-600 mt-1">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a></p>
              <p className="text-gray-600">Response time: Within 5 business days</p>
            </div>
          </Section>

          <Section title="15. Copyright Notice">
            <div className="bg-gray-900 text-white rounded-2xl p-6 text-center">
              <p className="font-baloo font-black text-[18px] mb-1">© 2026 Nimipiko Studio LTD</p>
              <p className="text-gray-300 text-[13px] leading-relaxed">All rights reserved. All content, characters, artwork, music, educational methods, and platform features are the exclusive intellectual property of Nimipiko Studio LTD.</p>
              <p className="text-gray-400 text-[12px] mt-3">Nimi™ · Piko™ · Zilo™ · Nimipiko Learning Method™ · Champion Treasure Gallery™</p>
              <p className="text-gray-500 text-[11px] mt-2">Unauthorized reproduction, distribution, or commercial use of any Nimipiko content is strictly prohibited and may result in civil and criminal liability under applicable copyright law.</p>
            </div>
          </Section>

        </motion.div>
      </main>

      <footer className="bg-white border-t border-gray-100 px-4 py-6 text-center">
        <p className="font-nunito text-gray-400 text-[12px]">
          © 2026 Nimipiko Studio LTD. All rights reserved. · <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Use</Link> · <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
