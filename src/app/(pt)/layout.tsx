import type { Metadata } from 'next';
import { content } from '@/data/content';
import { SITE_URL, SiteDocument } from '@/components/site-document';

export const metadata: Metadata = {
  ...content.metadata,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/', languages: { 'pt-BR': '/', en: '/en' } },
};

export default function PortugueseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteDocument lang="pt-BR">{children}</SiteDocument>;
}
