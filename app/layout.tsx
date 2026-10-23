import type { Metadata } from "next";
import {
  Inter,
  Noto_Sans_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_Malayalam,
  Noto_Sans_SC,
  Noto_Sans_Tamil,
} from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const notoMalayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  variable: "--font-ml",
  weight: ["400", "500", "600", "700"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-deva",
  weight: ["400", "500", "600", "700"],
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  variable: "--font-ta",
  weight: ["400", "500", "600", "700"],
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bn",
  weight: ["400", "500", "600", "700"],
});

const notoSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-zh",
  weight: ["400", "500", "700"],
});

const notoJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-ja",
  weight: ["400", "500", "700"],
});

const notoKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-ko",
  weight: ["400", "500", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-ar",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FirstPR",
  description:
    "Find a beginner issue, see where to look, and check your PR before a maintainer does.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        inter.variable,
        notoMalayalam.variable,
        notoDevanagari.variable,
        notoTamil.variable,
        notoBengali.variable,
        notoSC.variable,
        notoJP.variable,
        notoKR.variable,
        notoArabic.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-slate-900">
        <LanguageProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}
