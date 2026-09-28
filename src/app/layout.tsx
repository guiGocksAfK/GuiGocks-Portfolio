import { SiteDocument } from '@/components/site-document';
import { LocalizedSite } from '@/components/localized-site';

// The root, shared by both languages: the site itself is rendered here (see localized-site.tsx), and each page (/ and
// /en) only brings its own title, description and language.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SiteDocument lang="pt-BR">
      {children}
      <LocalizedSite />
    </SiteDocument>
  );
}
