import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "XQueue",
  description: "A private, server-side scheduler for X posts.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
