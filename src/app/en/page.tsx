import type { Metadata } from 'next';
import { contentEn } from '@/data/content-en';
import { SITE_URL } from '@/components/site-document';

// The English page: its title and description (the site itself is in the root layout, in English at this address).
export const metadata: Metadata = {
  ...contentEn.metadata,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/en', languages: { 'pt-BR': '/', en: '/en' } },
};

// The document's language, set before anything is painted (the root layout is shared with the Portuguese page).
export default function EnglishPage() {
  return <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='en'" }} />;
}
