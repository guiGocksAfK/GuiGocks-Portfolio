// Sound effects the robots make from code (KABUM!, TCHIBUM!...), in the page's language: Portuguese on /, English on /en.
export const say = (portuguese: string, english: string) => (document.documentElement.lang.startsWith('en') ? english : portuguese);
