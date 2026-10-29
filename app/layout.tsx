import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  Inter,
  Noto_Sans_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_Malayalam,
  Noto_Sans_SC,
  Noto_Sans_Tamil,
  Rubik_Spray_Paint,
} from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SearchProvider } from "@/components/search-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/json-ld";
import { KEYWORDS, MAKERS, ORG_NAME, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { siteGraph } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const spray = Rubik_Spray_Paint({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-spray",
  display: "swap",
  preload: true,
});

const plex = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
  preload: false,
});

const notoMalayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  display: "swap",
  variable: "--font-ml",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  variable: "--font-deva",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  display: "swap",
  variable: "--font-ta",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  display: "swap",
  variable: "--font-bn",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoSC = Noto_Sans_SC({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zh",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ja",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoKR = Noto_Sans_KR({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ko",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-ar",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const verification: Metadata["verification"] = {};
if (process.env.GOOGLE_SITE_VERIFICATION) verification.google = process.env.GOOGLE_SITE_VERIFICATION;
if (process.env.BING_SITE_VERIFICATION) verification.other = { "msvalidate.01": process.env.BING_SITE_VERIFICATION };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: find, understand, and review your first open-source PR`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: MAKERS.map((name) => ({ name })),
  creator: "Nishal K",
  publisher: ORG_NAME,
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
    title: `${SITE_NAME}: find, understand, and review your first open-source PR`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: find, understand, and review your first open-source PR`,
    description: SITE_DESCRIPTION,
  },
  ...(Object.keys(verification).length ? { verification } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0473FD" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1730" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(
        "h-full antialiased",
        inter.variable,
        spray.variable,
        plex.variable,
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
        <ThemeProvider>
        <LanguageProvider>
          <SearchProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </SearchProvider>
        </LanguageProvider>
        </ThemeProvider>
        <Toaster />
        <JsonLd data={siteGraph()} />
      </body>
    </html>
  );
}
