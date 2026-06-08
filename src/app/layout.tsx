import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, buildWebsiteJsonLd, siteConfig } from "@/lib/seo";
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
  openGraph: {
    title: "ScreenOdds | Entertainment Prediction Markets",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: absoluteUrl(siteConfig.image),
        width: 1200,
        height: 675,
        alt: "ScreenOdds entertainment prediction-market desk",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScreenOdds | Entertainment Prediction Markets",
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.image)],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteJsonLd = buildWebsiteJsonLd();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
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
