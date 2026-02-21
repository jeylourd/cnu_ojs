import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalPreloader } from "@/components/ui/GlobalPreloader";
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
  title: "CNU OJS",
  description: "Open Journal System built with Next.js + Supabase Postgres",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    return (
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
          <GlobalPreloader />
        </body>
      </html>
    );
  } catch (err) {
    try {
      // eslint-disable-next-line no-console
      console.error("RootLayout render error:", err);
    } catch (_) {}

    return (
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div className="min-h-screen flex items-center justify-center text-yellow-100">
            <div className="max-w-lg rounded-xl border border-yellow-500/40 bg-red-900/70 p-6 text-center">
              <h2 className="text-lg font-semibold">Server render error</h2>
              <p className="mt-2 text-sm">An error occurred while rendering the page. Check server logs for details.</p>
            </div>
          </div>
        </body>
      </html>
    );
  }
}
