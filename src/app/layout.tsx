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
  title: "LedgerFlow - Reconciliation Platform",
  description: "Reconciliation OS for Finance Teams, CAs & Accountants. Upload bank + Tally, auto-match in seconds, flag anomalies, export GST-ready — free.",
  keywords: ["reconciliation","ledger","Tally","GST","bank reconciliation","finance","accounting","India","CA","audit"],
  openGraph: {
    title: "LedgerFlow — Reconciliation OS for Finance Teams",
    description: "Auto-match bank + ledger, flag anomalies, export GST-ready. Free for CAs.",
    url: "https://ca-flow-ai.vercel.app",
    siteName: "LedgerFlow",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "LedgerFlow", description: "Reconciliation OS for Finance Teams" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
