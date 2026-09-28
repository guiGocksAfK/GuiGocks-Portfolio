import { content } from '@/data/content';

// The English version of the site's copy. For now a copy of the Portuguese one (only the language switch differs),
// to be translated text by text.
export const contentEn = {
  ...content,
  language: { current: 'EN', target: 'PT', href: '/', tripLabel: 'Português', action: 'View the site in Portuguese' },
} as const;

// What a page's copy looks like, in either language.
export type SiteContent = typeof content | typeof contentEn;
