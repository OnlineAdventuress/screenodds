import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://screenodds.com"),
  title: {
    default: "ScreenOdds | Entertainment Prediction Markets",
    template: "%s | ScreenOdds",
  },
  description:
    "Live movie, box office, awards, TV, streaming, and reality TV prediction-market odds.",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-800 px-5 py-6 text-center text-xs text-zinc-500">
          ScreenOdds is an informational prediction-market research site. Market
          probabilities are not financial advice.
        </footer>
      </body>
    </html>
  );
}
