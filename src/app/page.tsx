import type { Metadata } from 'next';
import { content } from '@/data/content';
import { SITE_URL } from '@/components/site-document';

// The Portuguese page: its title and description (the site itself is in the root layout).
export const metadata: Metadata = {
  ...content.metadata,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/', languages: { 'pt-BR': '/', en: '/en' } },
};

export default function PortuguesePage() {
  return null;
}
