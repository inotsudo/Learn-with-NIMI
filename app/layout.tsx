import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NimiReaderProvider } from "@/contexts/NimiReaderContext";
import SupabaseProviderWrapper from "@/components/SupabaseProviderWrapper";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata = {
  title: "Nimipiko",
  description: "Daily little victory",
  icons: {
    icon: "/nimi-logo-circle.png",
    shortcut: "/nimi-logo-circle.png",
    apple: "/nimi-logo-circle.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <NimiReaderProvider>
            <SupabaseProviderWrapper>
              <UserProvider>
              <ThemeProvider>
                {children}
                </ThemeProvider>
              </UserProvider>
            </SupabaseProviderWrapper>
          </NimiReaderProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
