import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import JsonLd from '@/components/seo/JsonLd';
import { SITE_LANG, THEME_COLOR } from '@/lib/seo/constants';
import { generateRootMetadata } from '@/lib/seo/metadata';
import { generateGlobalSchemas } from '@/lib/seo/schema';
import './globals.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = generateRootMetadata();

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={SITE_LANG} suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900">
        <JsonLd data={generateGlobalSchemas()} />
        <div className="flex-1 flex flex-col">
          <Navbar />
          {children}
        </div>
        <Footer />
        {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
      </body>
    </html>
  );
}
