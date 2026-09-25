import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["800"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"] });
const dmMono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400"] });
const departure = localFont({ variable: "--font-departure", src: "./fonts/DepartureMono-Regular.woff2" });

export const metadata: Metadata = {
  title: "Sellvane | Unlocks without the dump",
  description: "A public daily sell cap on team tokens, enforced on Base. Sellvane's agent sells inside it, only when the pool can take it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable} ${dmMono.variable} ${departure.variable} antialiased`}>
      <body className="min-h-screen bg-canvas text-ink font-sans">{children}</body>
    </html>
  );
}
