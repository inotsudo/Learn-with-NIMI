import "./globals.css";
import { Baloo_2, Nunito } from "next/font/google";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NimiReaderProvider } from "@/contexts/NimiReaderContext";
import SupabaseProviderWrapper from "@/components/SupabaseProviderWrapper";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppThemeProvider } from "@/contexts/AppThemeProvider";
import CookieConsentBanner from "@/components/CookieConsentBanner";

const baloo  = Baloo_2({ subsets: ["latin"], variable: "--font-baloo",  weight: ["400","500","600","700","800"] });
const nunito = Nunito ({  subsets: ["latin"], variable: "--font-nunito", weight: ["400","600","700","800","900"] });

export const metadata = {
  title: "NIMIPIKO — Interactive Stories for Kids | English, French & Kinyarwanda",
  description: "Give your child a magical learning adventure through interactive stories, AI companion Nimi, songs, coloring and achievement certificates — in English, French and Kinyarwanda. Ages 2–12. Now in early access.",
  metadataBase: new URL("https://nimipiko.com"),
  keywords: ["kids learning app", "interactive stories for children", "Kinyarwanda learning app", "educational app Rwanda", "bilingual children stories", "AI learning companion for kids", "children language app"],
  icons: {
    icon:     "/nimi-logo.png",
    shortcut: "/nimi-logo.png",
    apple:    "/nimi-logo.png",
  },
  openGraph: {
    title: "NIMIPIKO — Interactive Stories for Kids",
    description: "Interactive stories, AI companion Nimi & achievement certificates for ages 2–12. English, French & Kinyarwanda. Now in early access.",
    url: "https://nimipiko.com",
    siteName: "NIMIPIKO",
    images: [{ url: "/nimipiko.png", width: 1200, height: 630, alt: "NIMIPIKO — Interactive Learning Stories for Kids" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NIMIPIKO — Interactive Stories for Kids",
    description: "Interactive stories, AI companion Nimi & achievement certificates for ages 2–12. English, French & Kinyarwanda.",
    images: ["/nimipiko.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Theme injection script — runs before first paint to avoid flash.
          Reads the saved child theme from localStorage and writes CSS custom
          properties onto <html> so every --theme-* consumer gets the right
          value immediately, with no layout shift.

          ── GARDEN (default) ──────────────────────────────────────────────
          Redesigned from warm-orange to the new NIMIPIKO visual language:
          white surface, green accent, cool-gray borders and text.
          All other themes are preserved exactly as-is.
        */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{
var r=document.documentElement.style;
r.setProperty("--theme-bg","#FFFFFF");
r.setProperty("--theme-card","#FFFFFF");
r.setProperty("--theme-darker","#F9FAFB");
r.setProperty("--theme-card-hover","#F3F4F6");
r.setProperty("--theme-card-active","#E5E7EB");
r.setProperty("--theme-accent","#15803D");
r.setProperty("--theme-accent-soft","rgba(21,128,61,0.10)");
r.setProperty("--theme-accent-muted","rgba(21,128,61,0.18)");
r.setProperty("--theme-border","rgba(229,231,235,1)");
r.setProperty("--theme-border-strong","rgba(156,163,175,0.8)");
r.setProperty("--theme-text","#111827");
r.setProperty("--theme-text-muted","#6B7280");
r.setProperty("--theme-text-faint","rgba(107,114,128,0.45)");
r.setProperty("--theme-sidebar","#FFFFFF");
}catch(e){}}())` }} />
      </head>
      <body className="font-nunito" style={{ backgroundColor: "var(--theme-bg, #FFFFFF)" }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <LanguageProvider>
          <NimiReaderProvider>
            <SupabaseProviderWrapper>
              <UserProvider>
                <ThemeProvider>
                  <AppThemeProvider>
                    {children}
                    <CookieConsentBanner />
                  </AppThemeProvider>
                </ThemeProvider>
              </UserProvider>
            </SupabaseProviderWrapper>
          </NimiReaderProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
