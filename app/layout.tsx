import type { Metadata, Viewport } from "next";
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
import { SearchProvider } from "@/components/search-provider";
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

const siteDescription =
  "Find a beginner issue, see where to look, and check your PR before a maintainer does.";

export const metadata: Metadata = {
  metadataBase: new URL("https://firstpr-coral.vercel.app"),
  title: "FirstPR",
  description: siteDescription,
  openGraph: {
    title: "FirstPR",
    description: siteDescription,
    url: "https://firstpr-coral.vercel.app",
    images: [
      {
        url: "/brand/logo-full.png",
        width: 1874,
        height: 714,
        alt: "FirstPR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FirstPR",
    description: siteDescription,
    images: [
      {
        url: "/brand/logo-full.png",
        width: 1874,
        height: 714,
        alt: "FirstPR",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0473FD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
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
      <body className="flex min-h-full flex-col overflow-x-hidden bg-background font-sans text-foreground">
        <LanguageProvider>
          <SearchProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </SearchProvider>
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}
