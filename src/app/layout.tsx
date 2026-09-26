import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["800"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"] });
const dmMono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400"] });
const departure = localFont({ variable: "--font-departure", src: "./fonts/DepartureMono-Regular.woff2" });

const SITE = process.env.PUBLIC_ORIGIN ?? "https://sellvane.midelabs.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Sellvane | Unlocks without the dump",
  description: "A public daily sell cap on team tokens, enforced on Base. Sellvane's agent sells inside it, only when the pool can take it.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sellvane | Unlocks without the dump",
    description: "A public daily sell cap on team tokens, enforced on Base. An AI agent sells inside it, only when the pool can take it.",
    url: SITE,
    siteName: "Sellvane",
    type: "website",
  },
  twitter: { card: "summary_large_image", site: "@sellvane" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable} ${dmMono.variable} ${departure.variable} antialiased`}>
      <body className="min-h-screen bg-canvas text-ink font-sans">{children}</body>
    </html>
  );
}
