'use client';

import { useEffect, useRef } from 'react';
import { RobotSprite, crewMarkup, forkliftMarkup } from '@/components/robot-sprite';

type Shelf = { label: string; items: readonly string[] };
type Languages = { label: string; items: readonly { name: string; level: string }[]; chat: readonly [string, string] };

// The stock-taker is drawn bigger here (3px pixels instead of 2: 24×27, see .ladder-clerk).
const CLERK_HEIGHT = 27;
const RUNG_SPACING = 17;
const FORKLIFT_SPEED = 120;

class Cancelled extends Error {}

// The tool store ("almoxarifado"): one shelving unit with a shelf per area and the tools as crates standing on it, next
// to the storekeeper's office with the languages. A stock-taker stands still on the parked library ladder; the other
// robots only work, one job at a time: a forklift drives across the floor with a pallet, then the office robots greet
// each other. Runs only while the section is on screen; without motion everything is static.
export function CapabilitiesYard({ shelves, languages }: { shelves: readonly Shelf[]; languages: Languages }) {
  const yardRef = useRef<HTMLDivElement>(null);
  const rackRef = useRef<HTMLDivElement>(null);
  const ladderRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const yard = yardRef.current;
    const rackEl = rackRef.current;
    const ladderEl = ladderRef.current;
    if (!yard || !rackEl || !ladderEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const area: HTMLDivElement = yard;
    const rack: HTMLDivElement = rackEl;
    const ladder: HTMLSpanElement = ladderEl;
    let cancelled = false;
    let inView = false;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    async function pause(ms: number) {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      while ((!inView || document.hidden) && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }

    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return reject(new Cancelled());
        const t = Math.min(1, (now - start) / Math.max(duration, 1));
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

    // The ladder stays parked in the free strip on the right (CSS) and the clerk stands still on one of its rungs, so
    // nothing ever passes over the text.
    const clerk = document.createElement('span');
    clerk.className = 'ladder-clerk';
    clerk.innerHTML = crewMarkup(false, 0);
    ladder.appendChild(clerk);
    const placeClerk = () => {
      // Feet on the rung nearest to the middle of the ladder (rungs every 17px, the first at 14px).
      const rung = 14 + Math.round((ladder.clientHeight * .55 - 14) / RUNG_SPACING) * RUNG_SPACING;
      clerk.style.transform = `translate(-8px, ${rung - CLERK_HEIGHT}px)`;
    };
    placeClerk();
    clerk.style.opacity = '1';

    // A forklift drives across the floor in front of the rack carrying a pallet with a crate, and out the other side.
    async function forklift() {
      const floor = rack.querySelector<HTMLElement>('.rack-floor');
      if (!floor) return;
      const truck = document.createElement('span');
      truck.className = 'forklift';
      truck.innerHTML = `<span class="forklift-load"></span>${forkliftMarkup()}`;
      floor.appendChild(truck);
      const start = -60;
      const end = floor.clientWidth + 20;
      try {
        await tween((end - start) / FORKLIFT_SPEED * 1000, t => {
          truck.style.transform = `translate(${start + (end - start) * t}px, ${Math.round(Math.sin(t * 90)) }px)`;
        });
      } finally {
        truck.remove();
      }
    }

    // The storekeeper and a visitor say hello to each other, one after the other.
    async function chat() {
      for (const bubble of area.querySelectorAll<HTMLElement>('.office-bubble')) {
        bubble.classList.add('office-bubble-on');
        await pause(1400);
        bubble.classList.remove('office-bubble-on');
        await pause(250);
      }
    }

    async function run() {
      // One job at a time, alternating so the scene keeps varying.
      for (;;) {
        await pause(3000);
        await forklift();
        await pause(3000);
        await chat();
      }
    }

    const resume = () => { if (inView && !document.hidden) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }, { threshold: .2 });
    observer.observe(area);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('resize', placeClerk);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      waiters.forEach(resolve => resolve());
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('resize', placeClerk);
      area.querySelectorAll('.ladder-clerk, .forklift').forEach(element => element.remove());
    };
  }, []);

  return (
    <div ref={yardRef} className="yard">
      <div className="yard-grid">
        <div ref={rackRef} className="rack">
          <span className="rack-post rack-post-left" aria-hidden="true" />
          <span className="rack-post rack-post-right" aria-hidden="true" />
          {shelves.map(shelf => (
            <section key={shelf.label} className="rack-shelf" aria-label={shelf.label}>
              <h3 className="rack-tag font-mono">{shelf.label}</h3>
              <ul className="rack-crates">
                {shelf.items.map(item => <li key={item} className="crate font-mono">{item}</li>)}
              </ul>
            </section>
          ))}
          <div className="rack-floor" aria-hidden="true" />
          {/* Library ladder parked on the right, with the stock-taker standing on it. */}
          <span ref={ladderRef} className="rack-ladder" aria-hidden="true" />
        </div>
        <aside className="office" aria-label={languages.label}>
          <h3 className="rack-tag font-mono">{languages.label}</h3>
          <ul className="languages">
            {languages.items.map(item => (
              <li key={item.name}><strong>{item.name}</strong><span className="language-level font-mono">{item.level}</span></li>
            ))}
          </ul>
          <div className="office-scene" aria-hidden="true">
            {languages.chat.map((line, index) => (
              <span key={line} className={`office-robot office-robot-${index}`}>
                <span className="office-bubble font-mono">{line}</span>
                <RobotSprite pose="idle" mood="happy" />
              </span>
            ))}
            <span className="office-desk" />
          </div>
        </aside>
      </div>
    </div>
  );
}
