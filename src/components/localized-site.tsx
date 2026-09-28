'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Home } from '@/components/home';
import { contentFor, htmlLang, localeOf } from '@/data/locale';

// The whole site, in the language of the address (/ or /en). It lives in the root layout, so switching language is a
// navigation inside the app that only swaps the copy: nothing is reloaded or remounted, and the robots' scenes, the
// teleporter and every animation in progress carry on. Any other address (a 404) shows just the page's own content.
export function LocalizedSite() {
  const pathname = usePathname();
  const known = pathname === '/' || pathname === '/en';
  const locale = localeOf(pathname);
  useEffect(() => { if (known) document.documentElement.lang = htmlLang(locale); }, [known, locale]);
  return known ? <Home content={contentFor(locale)} /> : null;
}
