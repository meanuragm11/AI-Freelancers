import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
// FIXED: Updated import paths to use the root alias '@/'
import { PostHogProvider } from "@/components/PostHogProvider";
import Navbar from "@/components/Navbar"; 
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zelance - The Global AI Exchange",
  description: "Hire elite AI talent. Buy production-ready components. Deploy instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 selection:bg-blue-500/30 min-h-screen flex flex-col`}>
        <Suspense>
          <PostHogProvider>
            <Navbar />
            
            <main className="flex-1">
              {children}
            </main>
            
            <Footer />
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}