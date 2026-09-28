'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { pixelMarkup } from '@/components/robot-sprite';
import { switchLanguage } from '@/components/teleport';

// The translator drone: a round hovering body with an antenna, a dark visor and one glowing eye, and a thruster
// underneath (its flame is drawn in CSS). "a" is the eye's light blue.
const DRONE = [
  '.....A.....',
  '.....S.....',
  '...BBBBB...',
  '..BBBBBBB..',
  '.BBDDDDDBB.',
  'SBDDDaDDDBS',
  '.BBDDDDDBB.',
  '..BBBBBBB..',
  '...SBBBS...',
  '....SAS....',
];
const DRONE_SVG = pixelMarkup(DRONE, { a: '#a3bcff' });

const PEEK = 280; // ms for the drone to rise when the switch is clicked without hovering first (a tap on a phone)
const FLIP = 450; // ms for the hologram to glitch over to the other language (matches the CSS)
const SPIN = 300; // ms of the drone's spin before the teleport starts

type LangSwitchProps = { current: string; target: string; href: string; tripLabel: string; action: string };

// The language switch: plain text in the header like the menu ("PT / EN", this page's language in white). Hovering it, a
// little translator drone rises from behind, hovering, and projects a hologram asking for the other language ("EN?");
// clicking, the hologram glitches over to "EN!", the drone does a spin and the visitor is teleported to that version of
// the page. A plain link underneath, so it also works without JavaScript or opened in a new tab.
export function LangSwitch({ current, target, href, tripLabel, action }: LangSwitchProps) {
  const [switching, setSwitching] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [cheering, setCheering] = useState(false);
  const busy = useRef(false);

  // Arriving from the other language, it rises for a moment and does a spin.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cheer = () => { setCheering(true); timer = setTimeout(() => setCheering(false), 1100); };
    window.addEventListener('lang-arrived', cheer);
    return () => { window.removeEventListener('lang-arrived', cheer); clearTimeout(timer); };
  }, []);

  function choose(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { void switchLanguage(href, tripLabel); return; }
    // Up it comes (if it wasn't already hovering there), the hologram glitches over, a spin, and off we go.
    setSwitching(true);
    setTimeout(() => setFlipped(true), PEEK);
    setTimeout(() => setCheering(true), PEEK + FLIP);
    setTimeout(() => { void switchLanguage(href, tripLabel); }, PEEK + FLIP + SPIN);
  }

  const state = `${switching ? ' lang-switching' : ''}${flipped ? ' lang-flipped' : ''}${cheering ? ' lang-cheering' : ''}`;
  return (
    <a href={href} hrefLang={target.toLowerCase()} className={`lang-switch font-mono${state}`} aria-label={action} onClick={choose}>
      <span className="lang-code lang-current" aria-hidden="true">{current}</span>
      <span className="lang-slash" aria-hidden="true">/</span>
      <span className="lang-code lang-target" aria-hidden="true">{target}</span>
      {/* The drone rising from behind the switch, and the hologram it projects. */}
      <span className="lang-peek" aria-hidden="true">
        <span className="lang-peeker">
          <span className="lang-holo">
            <span className="lang-holo-face lang-holo-front">{target}?</span>
            <span className="lang-holo-face lang-holo-back">{target}!</span>
          </span>
          <span className="lang-beam" />
          <span className="lang-drone">
            <span className="lang-drone-body" dangerouslySetInnerHTML={{ __html: DRONE_SVG }} />
            <span className="lang-thruster" />
          </span>
        </span>
      </span>
    </a>
  );
}
