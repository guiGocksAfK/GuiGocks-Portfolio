'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { switchLanguage } from '@/components/teleport';

const PEEK = 280; // ms for the robot to pop up when the switch is clicked without hovering first (a tap on a phone)
const FLIP = 450; // ms for the sign to turn over (matches the CSS)
const THUMBS_UP = 300;

type LangSwitchProps = { current: string; target: string; href: string; tripLabel: string; action: string };

// The language switch: plain text in the header like the menu ("PT / EN", this page's language in white). Hovering it, a
// robot peeks out from behind holding up a sign asking for the other language ("EN?"); clicking, it turns the sign over
// ("EN!"), gives a thumbs up and teleports the visitor to that version of the page. A plain link underneath, so it also
// works without JavaScript or opened in a new tab.
export function LangSwitch({ current, target, href, tripLabel, action }: LangSwitchProps) {
  const [switching, setSwitching] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [cheering, setCheering] = useState(false);
  const busy = useRef(false);

  // Arriving from the other language, it pops up for a moment with a thumbs up.
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
    // Up it comes (if it wasn't already peeking), the sign turns over, a thumbs up, and off we go.
    setSwitching(true);
    setTimeout(() => setFlipped(true), PEEK);
    setTimeout(() => setCheering(true), PEEK + FLIP);
    setTimeout(() => { void switchLanguage(href, tripLabel); }, PEEK + FLIP + THUMBS_UP);
  }

  const state = `${switching ? ' lang-switching' : ''}${flipped ? ' lang-flipped' : ''}${cheering ? ' lang-cheering' : ''}`;
  return (
    <a href={href} hrefLang={target.toLowerCase()} className={`lang-switch font-mono${state}`} aria-label={action} onClick={choose}>
      <span className="lang-code lang-current" aria-hidden="true">{current}</span>
      <span className="lang-slash" aria-hidden="true">/</span>
      <span className="lang-code lang-target" aria-hidden="true">{target}</span>
      {/* The robot peeking out from behind the switch, and its sign. */}
      <span className="lang-peek" aria-hidden="true">
        <span className="lang-peeker">
          <span className="lang-sign">
            <span className="lang-sign-inner">
              <span className="lang-face lang-face-front">{target}?</span>
              <span className="lang-face lang-face-back">{target}!</span>
            </span>
          </span>
          <span className="lang-robot" dangerouslySetInnerHTML={{ __html: crewMarkup(cheering, 0) }} />
        </span>
      </span>
    </a>
  );
}
