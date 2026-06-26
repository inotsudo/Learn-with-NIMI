import "./globals.css";
import { Baloo_2, Nunito } from "next/font/google";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NimiReaderProvider } from "@/contexts/NimiReaderContext";
import SupabaseProviderWrapper from "@/components/SupabaseProviderWrapper";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { KidThemeProvider } from "@/contexts/ThemeProvider";

const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", weight: ["400", "500", "600", "700", "800"] });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["400", "600", "700", "800", "900"] });

export const metadata = {
  title: "Nimipiko",
  description: "Daily little victory",
  icons: {
    icon: "/nimi-logo.png",
    shortcut: "/nimi-logo.png",
    apple: "/nimi-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{
var THEMES={galaxy:{bg:"#150b35",card:"#1c1055",darker:"#0f0830",cardHover:"#251466",cardActive:"#1a0e3e",accent:"#7c3aed",accentSoft:"rgba(139,92,246,0.15)",accentMuted:"rgba(139,92,246,0.25)",border:"rgba(139,92,246,0.15)",borderStrong:"rgba(139,92,246,0.3)",text:"#e9d5ff",textMuted:"#c4b5fd",textFaint:"rgba(196,181,253,0.4)",sidebar:"#0f0a2a"},ocean:{bg:"#0c2d4a",card:"#0f3a5e",darker:"#082240",cardHover:"#134a72",cardActive:"#0b3050",accent:"#38bdf8",accentSoft:"rgba(56,189,248,0.15)",accentMuted:"rgba(56,189,248,0.25)",border:"rgba(56,189,248,0.2)",borderStrong:"rgba(56,189,248,0.35)",text:"#bae6fd",textMuted:"#7dd3fc",textFaint:"rgba(125,211,252,0.4)",sidebar:"#0a2540"},forest:{bg:"#0a2a15",card:"#0f3a1e",darker:"#071f0d",cardHover:"#134a28",cardActive:"#0c3218",accent:"#34d399",accentSoft:"rgba(52,211,153,0.15)",accentMuted:"rgba(52,211,153,0.25)",border:"rgba(52,211,153,0.2)",borderStrong:"rgba(52,211,153,0.35)",text:"#bbf7d0",textMuted:"#86efac",textFaint:"rgba(134,239,172,0.4)",sidebar:"#082510"},sunset:{bg:"#2d1520",card:"#3a1a28",darker:"#200e18",cardHover:"#4a2035",cardActive:"#32182a",accent:"#fb923c",accentSoft:"rgba(251,146,60,0.15)",accentMuted:"rgba(251,146,60,0.25)",border:"rgba(251,146,60,0.2)",borderStrong:"rgba(251,146,60,0.35)",text:"#fed7aa",textMuted:"#fdba74",textFaint:"rgba(253,186,116,0.4)",sidebar:"#25101a"},candy:{bg:"#2a0f30",card:"#381545",darker:"#1e0a22",cardHover:"#451a55",cardActive:"#30103a",accent:"#f472b6",accentSoft:"rgba(244,114,182,0.15)",accentMuted:"rgba(244,114,182,0.25)",border:"rgba(244,114,182,0.2)",borderStrong:"rgba(244,114,182,0.35)",text:"#fbcfe8",textMuted:"#f9a8d4",textFaint:"rgba(249,168,212,0.4)",sidebar:"#220c28"},sunshine:{bg:"#2a2008",card:"#3a2c10",darker:"#1f1805",cardHover:"#4a3a15",cardActive:"#30260c",accent:"#fbbf24",accentSoft:"rgba(251,191,36,0.15)",accentMuted:"rgba(251,191,36,0.25)",border:"rgba(251,191,36,0.2)",borderStrong:"rgba(251,191,36,0.35)",text:"#fef9c3",textMuted:"#fde047",textFaint:"rgba(253,224,71,0.4)",sidebar:"#22190a"},rainbow:{bg:"#1a1030",card:"#251545",darker:"#120a22",cardHover:"#301a58",cardActive:"#1f1238",accent:"#a78bfa",accentSoft:"rgba(167,139,250,0.15)",accentMuted:"rgba(167,139,250,0.25)",border:"rgba(167,139,250,0.2)",borderStrong:"rgba(167,139,250,0.35)",text:"#ddd6fe",textMuted:"#c4b5fd",textFaint:"rgba(196,181,253,0.4)",sidebar:"#150c28"},space:{bg:"#08081a",card:"#0e0e28",darker:"#050512",cardHover:"#151535",cardActive:"#0a0a20",accent:"#818cf8",accentSoft:"rgba(129,140,248,0.15)",accentMuted:"rgba(129,140,248,0.25)",border:"rgba(129,140,248,0.15)",borderStrong:"rgba(129,140,248,0.3)",text:"#c7d2fe",textMuted:"#a5b4fc",textFaint:"rgba(165,180,252,0.4)",sidebar:"#06061a"}};
var cid=localStorage.getItem("nimipiko_active_child");
var tid=cid?localStorage.getItem("nimipiko_child_theme_"+cid):null;
var t=THEMES[tid||"galaxy"]||THEMES.galaxy;
var r=document.documentElement.style;
r.setProperty("--theme-bg",t.bg);r.setProperty("--theme-card",t.card);r.setProperty("--theme-darker",t.darker);r.setProperty("--theme-card-hover",t.cardHover);r.setProperty("--theme-card-active",t.cardActive);r.setProperty("--theme-accent",t.accent);r.setProperty("--theme-accent-soft",t.accentSoft);r.setProperty("--theme-accent-muted",t.accentMuted);r.setProperty("--theme-border",t.border);r.setProperty("--theme-border-strong",t.borderStrong);r.setProperty("--theme-text",t.text);r.setProperty("--theme-text-muted",t.textMuted);r.setProperty("--theme-text-faint",t.textFaint);r.setProperty("--theme-sidebar",t.sidebar);
}catch(e){}}())` }} />
      </head>
      <body className="font-nunito" style={{ backgroundColor: "var(--theme-bg, #150b35)" }}>
        <LanguageProvider>
          <NimiReaderProvider>
            <SupabaseProviderWrapper>
              <UserProvider>
              <ThemeProvider>
                <KidThemeProvider childId={null}>
                  {children}
                </KidThemeProvider>
              </ThemeProvider>
              </UserProvider>
            </SupabaseProviderWrapper>
          </NimiReaderProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
