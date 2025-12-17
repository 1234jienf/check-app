import type { Metadata, Viewport } from "next";
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
  title: "Check Mate",
  description: "수능 국어 강의 학습 및 관리 시스템",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Check Mate",
  },
  icons: {
    icon: [
      { url: "/bishop-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/bishop-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/bishop-logo.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={geistSans.variable}>
        {children}
      </body>
    </html>
  );
}