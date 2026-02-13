import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://finger5d.com'), // Replace with actual domain
  title: "Finger5D - 探索生命延长的科学边界",
  description: "芬格健康模型：面向50+人群的抗衰老科普与干预技术平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col bg-slate-50`}
      >
        <AccessibilityProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
