import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { content } from '@/data/content';
import { PAINT_BOOT_SCRIPT } from '@/components/robot-crew';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = { ...content.metadata };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The boot script marks first visits before the first paint, so the name already starts blue for the painter robot.
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: PAINT_BOOT_SCRIPT }} /></head>
      <body className={`${sans.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
