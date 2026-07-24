import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { REFERRAL_CODE_LENGTH } from "@/lib/referralConstants";
import { getServiceClient } from "@/lib/supabase/serviceClient";

async function getReferrer(code: string): Promise<{ name: string; parentId: string } | null> {
  const clean = code.toUpperCase().slice(0, REFERRAL_CODE_LENGTH);
  if (clean.length !== REFERRAL_CODE_LENGTH) return null;

  const { data } = await getServiceClient()
    .from("referral_codes")
    .select("parent_id, parents(name)")
    .eq("code", clean)
    .maybeSingle();

  if (!data) return null;
  const name = (data.parents as { name?: string } | null)?.name ?? "A friend";
  return { name, parentId: data.parent_id };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const referrer = await getReferrer(code);
  if (!referrer) {
    return {
      title: "Join NIMIPIKO — Multilingual Learning for Kids",
      description: "Stories, missions and Nimi AI for children learning English, French and Kinyarwanda.",
    };
  }
  return {
    title: `${referrer.name} invited you to NIMIPIKO! 🌿`,
    description: `${referrer.name} is inviting you to join NIMIPIKO — the kids' language learning app. Sign up and you both get 1 free month of Club.`,
    openGraph: {
      title: `${referrer.name} invited you to NIMIPIKO! 🌿`,
      description: "Stories, missions and Nimi AI for kids — join with your friend's code and you both get a free month.",
      images: ["/nimipiko.png"],
    },
  };
}

const BENEFITS = [
  { emoji: "📚", title: "100+ interactive stories", desc: "English, French & Kinyarwanda" },
  { emoji: "🤖", title: "Nimi AI companion", desc: "Personalised learning chats for kids" },
  { emoji: "🏆", title: "Missions & achievements", desc: "Stars, badges and certificates" },
  { emoji: "👨‍👩‍👧", title: "Parent dashboard", desc: "Track progress, set goals, get weekly reports" },
];

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().slice(0, REFERRAL_CODE_LENGTH);
  const referrer = await getReferrer(code);

  // Invalid code — show a generic landing with CTA to sign up anyway
  if (!referrer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center px-4 py-16">
        <img src="/nimi-logo-circle.png" alt="NIMI" className="w-20 h-20 rounded-full mb-6" />
        <h1 className="font-baloo font-black text-3xl text-gray-800 text-center mb-3">
          This invite link has expired
        </h1>
        <p className="font-nunito text-gray-500 text-center max-w-sm mb-8">
          This referral link is no longer valid. You can still create a free account and enjoy a 7-day trial.
        </p>
        <Link
          href="/signuppage"
          className="bg-emerald-600 text-white font-black text-[16px] px-8 py-4 rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-95 transition"
        >
          🚀 Start free trial
        </Link>
        <p className="font-nunito text-gray-400 text-sm mt-6 text-center">
          Have a code? You can enter it on the sign-up page.
        </p>
      </div>
    );
  }

  const signupUrl = `/signuppage?ref=${encodeURIComponent(code)}`;
  const firstName = referrer.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">

      {/* Top bar */}
      <header className="w-full px-5 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg font-black">🌿</div>
          <span className="font-baloo font-black text-[18px] text-gray-800">NIMIPIKO</span>
        </Link>
        <Link href="/loginpage" className="font-nunito font-bold text-[13px] text-gray-500 hover:text-gray-700 transition">
          Already have an account? Log in →
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-10 pb-20">

        {/* Hero */}
        <div className="text-center mb-10">
          {/* Mascot + referrer badge */}
          <div className="relative inline-block mb-6">
            <img
              src="/nimi-logo-circle.png"
              alt="NIMI"
              className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
            />
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow">
              🎁 Invite
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="font-nunito font-bold text-emerald-700 text-sm">{referrer.name} sent you an invite</span>
          </div>

          <h1 className="font-baloo font-black text-4xl sm:text-5xl text-gray-800 leading-tight mb-4">
            {firstName} thinks your<br />
            <span className="text-emerald-600">child will love this</span>
          </h1>

          <p className="font-nunito text-gray-500 text-[16px] max-w-md mx-auto leading-relaxed">
            Join NIMIPIKO — the multilingual learning app that makes reading feel like an adventure. Sign up with {firstName}&apos;s invite and <strong className="text-gray-700">you both get 1 free month of Club</strong>.
          </p>
        </div>

        {/* Reward callout */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-white text-center mb-8 shadow-lg">
          <p className="font-baloo font-black text-[28px] leading-tight mb-1">🎁 Referral reward</p>
          <p className="font-nunito text-white/90 text-[15px]">
            Sign up, subscribe to Club, and you <strong>both</strong> automatically receive <strong>1 free month</strong> — no coupon needed.
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-[13px] font-bold">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">👤</span>
              <span className="text-white/80">You get</span>
              <span className="text-white font-black">1 free month</span>
            </div>
            <div className="w-px h-10 bg-white/30" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">👥</span>
              <span className="text-white/80">{firstName} gets</span>
              <span className="text-white font-black">1 free month</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={signupUrl}
          className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[18px] text-center py-5 rounded-2xl shadow-xl transition active:scale-[0.98] mb-4"
        >
          🚀 Accept {firstName}&apos;s invite
        </Link>
        <p className="text-center font-nunito text-gray-400 text-[13px] mb-10">
          7-day free trial included · No credit card required
        </p>

        {/* Benefits grid */}
        <div className="mb-10">
          <h2 className="font-baloo font-black text-[22px] text-gray-800 text-center mb-5">
            What&apos;s inside NIMIPIKO
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map(b => (
              <div
                key={b.title}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm"
              >
                <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
                  {b.emoji}
                </div>
                <div>
                  <p className="font-baloo font-black text-[15px] text-gray-800 leading-tight">{b.title}</p>
                  <p className="font-nunito text-gray-400 text-[12px] mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof / trust */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm mb-8">
          <div className="flex items-center justify-center gap-1 mb-2 text-yellow-400 text-xl">
            {"⭐".repeat(5)}
          </div>
          <p className="font-nunito text-gray-600 text-[14px] italic leading-relaxed max-w-sm mx-auto">
            &ldquo;My daughter went from avoiding reading to asking for more stories every night. NIMIPIKO is genuinely magical.&rdquo;
          </p>
          <p className="font-nunito font-bold text-gray-400 text-[12px] mt-3">— Parent of a 6-year-old</p>
        </div>

        {/* Bottom CTA */}
        <Link
          href={signupUrl}
          className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[16px] text-center py-4 rounded-2xl shadow-lg transition active:scale-[0.98]"
        >
          🌿 Join {firstName} on NIMIPIKO
        </Link>

        <p className="text-center font-nunito text-gray-400 text-[11px] mt-5">
          Your invite code <strong className="text-gray-500 font-mono">{code}</strong> is applied automatically when you sign up.
        </p>
      </main>
    </div>
  );
}
