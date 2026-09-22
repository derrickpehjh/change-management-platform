import type { Metadata } from "next";
import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

const headline = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-headline",
});
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const code = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: "ChangeOps",
  description: "HTX infrastructure change governance — vendor CR submission, approval, and maintenance calendar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headline.variable} ${body.variable} ${code.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-body antialiased text-[13px] bg-surface-canvas text-on-surface">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
