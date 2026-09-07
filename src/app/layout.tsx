import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL('https://ca-flow-ai.vercel.app'),
  title: "CA-Flow AI - Reconciliation Platform",
  description: "Automated CA reconciliation and document intake platform for Chartered Accountants. Upload bank + Tally, auto-match in seconds, GST-ready exports.",
  keywords: ["CA", "Chartered Accountant", "reconciliation", "Tally", "GST", "bank reconciliation", "India"],
  openGraph: {
    title: "CA-Flow AI — Reconciliation OS for CAs",
    description: "Auto-match bank + ledger, flag anomalies, export GST-ready. Free for CAs.",
    url: "https://ca-flow-ai.vercel.app",
    siteName: "CA-Flow AI",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "CA-Flow AI", description: "Reconciliation OS for Chartered Accountants" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
