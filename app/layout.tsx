import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NimiReaderProvider } from "@/contexts/NimiReaderContext";
import NimiReaderButton from "@/components/NimiReaderButton";
import SupabaseProviderWrapper from "@/components/SupabaseProviderWrapper";
import { UserProvider } from "@/contexts/UserContext"; // added


export const metadata = {
  title: "Your Site",
  description: "Your description",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <NimiReaderProvider>
            <SupabaseProviderWrapper>
              <UserProvider> {/* wrap with UserProvider */}
                {children}
              </UserProvider>
            </SupabaseProviderWrapper>
          </NimiReaderProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
