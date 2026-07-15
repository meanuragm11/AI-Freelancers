import type { Metadata } from 'next';
import './globals.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  metadataBase: new URL('https://zelance.co'),
  title: {
    template: '%s | Zelance - The Premium AI Talent Network',
    default: 'Zelance | Hire Elite AI Engineers & Buy AI Components',
  },
  description: 'Zelance is the exclusive marketplace connecting enterprise companies with top 1% AI engineers, prompt designers, and autonomous agent builders.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://zelance.com',
    siteName: 'Zelance',
    title: 'Zelance | The Premium AI Talent Network',
    description: 'Hire top 1% AI engineers or monetize your reusable AI architectures on the global marketplace.',
    images: [
      {
        url: 'https://zelance.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Zelance Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zelance | Hire Elite AI Engineers',
    description: 'The exclusive marketplace connecting enterprises with top AI talent.',
    creator: '@zelancehq',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900">
        <div className="flex-1 flex flex-col">
          <Navbar />
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}