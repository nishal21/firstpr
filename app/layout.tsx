import type { Metadata } from "next";
import {
  Inter,
  Noto_Sans_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_SC,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import { LangProvider } from "@/components/lang-provider";
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
  preload: false,
});

const notoTelugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  variable: "--font-te",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoKannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  variable: "--font-kn",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bn",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  variable: "--font-gu",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ["gurmukhi"],
  variable: "--font-pa",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoSc = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-zh",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-ja",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-ko",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-ar",
  weight: ["400", "500", "600", "700"],
  preload: false,
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
        notoTelugu.variable,
        notoKannada.variable,
        notoBengali.variable,
        notoGujarati.variable,
        notoGurmukhi.variable,
        notoSc.variable,
        notoJp.variable,
        notoKr.variable,
        notoArabic.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-slate-900">
        <LangProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200">
            <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6">
              Built at AIBoomi Startup Weekend Kochi by DuoMatter
            </div>
          </footer>
        </LangProvider>
        <Toaster />
      </body>
    </html>
  );
}
