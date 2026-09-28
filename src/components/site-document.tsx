import { Geist, Geist_Mono, Pixelify_Sans } from 'next/font/google';
import { PAINT_BOOT_SCRIPT } from '@/components/robot-crew';
import '@/app/globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
// Pixel font for what the robots say, shout and hold up, and the comic sound effects; the site itself stays in Geist.
const pixel = Pixelify_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-pixel', display: 'swap' });

export const SITE_URL = 'https://guigocks-portfolio.vercel.app';

// The page's document, shared by the Portuguese (/) and English (/en) versions, which only differ in its language.
export function SiteDocument({ lang, children }: { lang: string; children: React.ReactNode }) {
  // The boot script runs before the first paint: it marks the robots' first-visit work (the name to paint, the contact
  // section to build) and handles a language switch in progress (see teleport.tsx).
  return (
    <html lang={lang} suppressHydrationWarning>
      {/* A root layout shared by two route groups, so the app router's <head> is right here. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head><script dangerouslySetInnerHTML={{ __html: PAINT_BOOT_SCRIPT }} /></head>
      <body className={`${sans.variable} ${mono.variable} ${pixel.variable} antialiased`}>{children}</body>
    </html>
  );
}
