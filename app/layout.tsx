import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SearchProvider } from "@/components/search-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/json-ld";
import { KEYWORDS, MAKERS, ORG_NAME, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { siteGraph } from "@/lib/structured-data";
import "./fonts.css";
import "./globals.css";

// Fonts are self-hosted (app/fonts.css, public/fonts) so builds never fetch from Google.
// Regenerate with: node scripts/fetch-fonts.mjs
const PRELOAD_FONTS = ["/fonts/inter/6ab57b19c69b5042.woff2", "/fonts/rubikspraypaint/5398bb60cfd5fa79.woff2"];

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
  for (const href of PRELOAD_FONTS) preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className="h-full antialiased"
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
