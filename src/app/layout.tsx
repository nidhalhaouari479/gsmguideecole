import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import MainLayoutWrapper from "@/components/layout/MainLayoutWrapper";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import PwaRegistration from "@/components/PwaRegistration";
import WhatsAppButton from "@/components/layout/WhatsAppButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GSM Guide Academy - Expert en réparation de smartphones",
  description:
    "Devenez expert en réparation de smartphones avec GSM Guide Academy grâce à des formations pratiques de haute qualité.",
  manifest: "/manifest.webmanifest",
  applicationName: "GSM Guide Academy Admin",
  appleWebApp: {
    capable: true,
    title: "GSM Admin",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/gsmlogo.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="light" style={{ colorScheme: "light" }}>
      <body className={inter.className}>
        <LanguageProvider>
          <AnalyticsProvider>
            <PwaRegistration />
            <MainLayoutWrapper>{children}</MainLayoutWrapper>
            <WhatsAppButton />
          </AnalyticsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
