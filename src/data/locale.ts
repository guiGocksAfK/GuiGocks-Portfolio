import { content } from '@/data/content';
import { contentEn } from '@/data/content-en';

// The site's two languages: Portuguese at /, English at /en.
export type Locale = 'pt' | 'en';
export const localeOf = (pathname: string): Locale => (pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'pt');
export const contentFor = (locale: Locale) => (locale === 'en' ? contentEn : content);
export const htmlLang = (locale: Locale) => (locale === 'en' ? 'en' : 'pt-BR');
