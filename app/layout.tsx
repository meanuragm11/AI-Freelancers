import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // This is the critical line that injects Tailwind

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Discovery Platform",
  description: "The central dashboard for your AI stack.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}