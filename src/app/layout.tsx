import type { Metadata } from 'next';
import { Geist, Geist_Mono, Pixelify_Sans } from 'next/font/google';
import { content } from '@/data/content';
import { PAINT_BOOT_SCRIPT } from '@/components/robot-crew';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
// Pixel font for what the robots say, shout and hold up, and the comic sound effects; the site itself stays in Geist.
const pixel = Pixelify_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-pixel', display: 'swap' });

export const metadata: Metadata = { ...content.metadata };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The boot script marks first visits before the first paint, so the name already starts blue for the painter robot.
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: PAINT_BOOT_SCRIPT }} /></head>
      <body className={`${sans.variable} ${mono.variable} ${pixel.variable} antialiased`}>{children}</body>
    </html>
  );
}
