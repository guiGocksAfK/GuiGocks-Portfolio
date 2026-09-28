import type { Metadata } from 'next';
import { contentEn } from '@/data/content-en';
import { SITE_URL, SiteDocument } from '@/components/site-document';

export const metadata: Metadata = {
  ...contentEn.metadata,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/en', languages: { 'pt-BR': '/', en: '/en' } },
};

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteDocument lang="en">{children}</SiteDocument>;
}
