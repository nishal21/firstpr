import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html lang="en" className={cn("h-full antialiased", inter.variable)}>
      <body className="flex min-h-full flex-col bg-white font-sans text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
            >
              <span className="size-2 rounded-full bg-blue-600" aria-hidden />
              FirstPR
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-slate-600 sm:gap-x-6">
              <Link
                href="/"
                className="outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
              >
                Find an issue
              </Link>
              <Link
                href="/issue/nishal21/NekoDroid/4"
                className="outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
              >
                Explain
              </Link>
              <Link
                href="/review"
                className="outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
              >
                Review my PR
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200">
          <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6">
            Built at AIBoomi Startup Weekend Kochi by DuoMatter
          </div>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
