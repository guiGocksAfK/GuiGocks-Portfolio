import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { content } from '@/data/content';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = { ...content.metadata };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${sans.variable} ${mono.variable} antialiased`}>{children}</body></html>;
}
