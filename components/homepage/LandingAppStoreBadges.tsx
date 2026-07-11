"use client";

const IOS_URL     = process.env.NEXT_PUBLIC_IOS_URL     ?? "";
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? "";
const APK_URL     = process.env.NEXT_PUBLIC_APK_URL     ?? "";

export default function AppStoreBadges({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-9" : "h-11";
  const textSm = size === "sm" ? "text-[10px]" : "text-[11px]";
  const textLg = size === "sm" ? "text-[12px]" : "text-[13px]";

  const androidUrl    = ANDROID_URL || APK_URL || "/signuppage";
  const androidDirect = !ANDROID_URL && !!APK_URL;
  const iosUrl        = IOS_URL || "/signuppage";
  const isExternal    = (u: string) => u.startsWith("http");

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>

      <a href={iosUrl}
        target={isExternal(iosUrl) ? "_blank" : undefined}
        rel={isExternal(iosUrl) ? "noopener noreferrer" : undefined}
        aria-label="Download on the App Store"
        className={`${h} inline-flex items-center hover:opacity-85 active:scale-95 transition-all duration-150 rounded-[7px] overflow-hidden`}>
        <svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" className={`${h} w-auto`} aria-hidden>
          <rect width="120" height="40" rx="7" fill="black"/>
          <text x="38" y="14" fontFamily="system-ui,sans-serif" fontSize="7" fill="white" fontWeight="400">Download on the</text>
          <text x="38" y="27" fontFamily="system-ui,sans-serif" fontSize="13" fill="white" fontWeight="600">App Store</text>
          <path d="M16 10.5c1.8-2.2 4.6-2 4.6-2s.4 2.6-1.4 4.2c-1.9 1.7-4 1.4-4 1.4s-.5-2.2.8-3.6zm-1.2 4.8c.9 0 2.5-1.2 4.6-1.2 3.6 0 5 2.6 5 2.6s-2.8 1.4-2.8 4.8c0 3.8 3.4 5.2 3.4 5.2s-2.4 6.7-5.6 6.7c-1.5 0-2.6-.9-4-.9-1.5 0-3 1-4 1C8 33.5 5 27 5 22c0-4.6 2.9-7 5.6-7 1.6 0 2.8 1.3 4.2 1.3z" fill="white"/>
        </svg>
      </a>

      {androidDirect ? (
        <a href={androidUrl} download aria-label="Download APK for Android"
          className={`${h} inline-flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#16213e] active:scale-95 transition-all duration-150 rounded-[7px] px-3`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M7 18h10V9H7v9zm4-1H9v-2h2v2zm4 0h-2v-2h2v2zm-6-4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" fill="#3DDC84"/>
            <path d="M5 20h14a1 1 0 001-1V8a1 1 0 00-1-1H5a1 1 0 00-1 1v11a1 1 0 001 1z" stroke="#3DDC84" strokeWidth="1.5" fill="none"/>
            <path d="M8.5 7L7 4.5M15.5 7L17 4.5" stroke="#3DDC84" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9.5" cy="6" r="0.75" fill="#3DDC84"/>
            <circle cx="14.5" cy="6" r="0.75" fill="#3DDC84"/>
          </svg>
          <div className="flex flex-col leading-tight">
            <span className={`${textSm} text-gray-400 font-medium`}>Download</span>
            <span className={`${textLg} text-white font-bold`}>Android APK</span>
          </div>
        </a>
      ) : (
        <a href={androidUrl}
          target={isExternal(androidUrl) ? "_blank" : undefined}
          rel={isExternal(androidUrl) ? "noopener noreferrer" : undefined}
          aria-label="Get it on Google Play"
          className={`${h} inline-flex items-center hover:opacity-85 active:scale-95 transition-all duration-150 rounded-[7px] overflow-hidden`}>
          <svg viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg" className={`${h} w-auto`} aria-hidden>
            <rect width="135" height="40" rx="7" fill="black"/>
            <text x="42" y="14" fontFamily="system-ui,sans-serif" fontSize="7" fill="white" fontWeight="400">GET IT ON</text>
            <text x="42" y="27" fontFamily="system-ui,sans-serif" fontSize="13" fill="white" fontWeight="600">Google Play</text>
            <path d="M12 8l16 12-16 12V8z" fill="#00C853"/>
            <path d="M12 8l8.5 8.5L12 25V8z" fill="#00BCD4"/>
            <path d="M20.5 16.5L28 20l-7.5 3.5-8.5-7 8-7 8 7z" fill="#FFD600"/>
            <path d="M12 25l8.5-8.5L28 20l-8 7.5-8-2.5z" fill="#FF3D00"/>
          </svg>
        </a>
      )}
    </div>
  );
}
