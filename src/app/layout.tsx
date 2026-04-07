import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import MainLayoutWrapper from "@/components/layout/MainLayoutWrapper";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GSM Guide Academy - Smartphone Repair Expert",
  description: "Become a Smartphone Repair Expert with GSM Guide Academy. High-quality practical training with certified experts.",
  icons: {
    icon: "/gsmlogo.png",
    apple: "/gsmlogo.png",
  },
};

import WhatsAppButton from "@/components/layout/WhatsAppButton";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <AnalyticsProvider>
            <MainLayoutWrapper>
              {children}
            </MainLayoutWrapper>
            <WhatsAppButton />
          </AnalyticsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

