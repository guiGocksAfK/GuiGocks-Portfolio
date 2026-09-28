'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { switchLanguage } from '@/components/teleport';

const FLIP = 450; // ms for the sign to turn over (matches the CSS)
const THUMBS_UP = 300;
const HINT_FOR = 6000;

type LangSwitchProps = { current: string; target: string; href: string; tripLabel: string; action: string; hint: string };

// The language switch: a robot in the header holding up a sign with this page's language. Hovering, it looks up and
// gives the sign a little shake; clicking, it turns the sign over like a coin to the other language, gives a thumbs up
// and teleports the visitor to that version of the page. Visitors whose browser speaks the other language (and who
// haven't chosen yet) get a speech bubble offering it, for a few seconds. A plain link underneath, so it also works
// without JavaScript or opened in a new tab.
export function LangSwitch({ current, target, href, tripLabel, action, hint }: LangSwitchProps) {
  const [flipped, setFlipped] = useState(false);
  const [cheering, setCheering] = useState(false);
  const [hinting, setHinting] = useState(false);
  const busy = useRef(false);

  // The offer, in the other language, to a browser that speaks it.
  useEffect(() => {
    let chosen = false;
    try { chosen = !!localStorage.getItem('lang'); } catch {}
    const speaks = navigator.languages?.some(language => language.toLowerCase().startsWith(target.toLowerCase()));
    if (chosen || !speaks) return;
    const show = setTimeout(() => setHinting(true), 1500);
    const hide = setTimeout(() => setHinting(false), 1500 + HINT_FOR);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [target]);

  // Arriving from the other language, it gives a thumbs up.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cheer = () => { setCheering(true); timer = setTimeout(() => setCheering(false), 900); };
    window.addEventListener('lang-arrived', cheer);
    return () => { window.removeEventListener('lang-arrived', cheer); clearTimeout(timer); };
  }, []);

  function choose(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setHinting(false);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { void switchLanguage(href, tripLabel); return; }
    setFlipped(true);
    setTimeout(() => setCheering(true), FLIP);
    setTimeout(() => { void switchLanguage(href, tripLabel); }, FLIP + THUMBS_UP);
  }

  return (
    <a href={href} hrefLang={target.toLowerCase()} className={`lang-switch${flipped ? ' lang-flipped' : ''}${cheering ? ' lang-cheering' : ''}`} aria-label={action} onClick={choose}>
      <span className="lang-sign" aria-hidden="true">
        <span className="lang-sign-inner">
          <span className="lang-face lang-face-front">{current}</span>
          <span className="lang-face lang-face-back">{target}</span>
        </span>
      </span>
      <span className="lang-robot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: crewMarkup(cheering, 0) }} />
      {hinting && <span className="lang-hint" aria-hidden="true">{hint}</span>}
    </a>
  );
}
