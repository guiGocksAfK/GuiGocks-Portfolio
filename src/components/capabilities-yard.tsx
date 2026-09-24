'use client';

import { useEffect, useRef } from 'react';
import { CREW_HEIGHT, CREW_WIDTH, RobotSprite, crewMarkup } from '@/components/robot-sprite';

type Use = 'production' | 'project';
type Shelf = { label: string; items: readonly { name: string; use: Use }[] };
type Languages = { label: string; items: readonly { name: string; level: string }[]; chat: readonly [string, string] };

const WALK_SPEED = 70; // px per second: an unhurried stock check
const STEP_INTERVAL = 140;

class Cancelled extends Error {}

// The tool store: every capability as a crate on a shelf per area, marked by where it has been used, plus a languages
// shelf. The robots here only work, one job at a time: a stock-taker with a clipboard walks along the top of one shelf,
// ticking each crate as it passes, then the two robots on the languages shelf greet each other ("Olá!" / "Hello!"),
// then the next shelf. Runs only while the section is on screen; without motion everything is static.
export function CapabilitiesYard({ shelves, languages, legend }: { shelves: readonly Shelf[]; languages: Languages; legend: { production: string; project: string } }) {
  const yardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const yard = yardRef.current;
    if (!yard || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const area: HTMLDivElement = yard;
    let cancelled = false;
    let inView = false;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const intervals = new Set<ReturnType<typeof setInterval>>();

    async function pause(ms: number) {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      while ((!inView || document.hidden) && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }

    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return reject(new Cancelled());
        const t = Math.min(1, (now - start) / duration);
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

    // Stock check: the robot walks along the top edge of the shelf; each crate gets a tick as the robot reaches its share of the way.
    async function inspect(shelf: HTMLElement) {
      const crates = [...shelf.querySelectorAll<HTMLElement>('.crate')];
      const robot = document.createElement('span');
      robot.className = 'stock-robot';
      const sprite = document.createElement('span');
      sprite.className = 'stock-sprite';
      const clipboard = document.createElement('span');
      clipboard.className = 'stock-clipboard';
      robot.append(sprite, clipboard);
      shelf.appendChild(robot);
      let step = 0;
      sprite.innerHTML = crewMarkup(false, 0);
      const legs = setInterval(() => { step += 1; sprite.innerHTML = crewMarkup(false, step); }, STEP_INTERVAL);
      intervals.add(legs);
      const startX = 12;
      const endX = shelf.clientWidth - CREW_WIDTH - 12;
      const y = -CREW_HEIGHT;
      let ticked = 0;
      try {
        await tween(250, t => { robot.style.opacity = String(t); robot.style.transform = `translate(${startX}px, ${y - 8 * (1 - t)}px)`; });
        await tween((endX - startX) / WALK_SPEED * 1000, t => {
          robot.style.transform = `translate(${startX + (endX - startX) * t}px, ${y}px)`;
          while (ticked < crates.length && t >= (ticked + .5) / crates.length) {
            const crate = crates[ticked++];
            crate.classList.remove('crate-checked');
            void crate.offsetWidth;
            crate.classList.add('crate-checked');
          }
        });
        clearInterval(legs);
        sprite.innerHTML = crewMarkup(false, 0);
        await tween(250, t => { robot.style.opacity = String(1 - t); robot.style.transform = `translate(${endX}px, ${y - 8 * t}px)`; });
      } finally {
        clearInterval(legs);
        intervals.delete(legs);
        robot.remove();
      }
    }

    // The two robots on the languages shelf say hello to each other, one after the other.
    async function chat() {
      const bubbles = [...area.querySelectorAll<HTMLElement>('.lang-bubble')];
      for (const bubble of bubbles) {
        bubble.classList.add('lang-bubble-on');
        await pause(1300);
        bubble.classList.remove('lang-bubble-on');
        await pause(250);
      }
    }

    async function run() {
      const shelfElements = [...area.querySelectorAll<HTMLElement>('.shelf:not(.shelf-languages)')];
      for (;;) {
        for (const shelf of shelfElements) {
          await pause(2200);
          await inspect(shelf);
          await pause(1200);
          await chat();
        }
      }
    }

    const resume = () => { if (inView && !document.hidden) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }, { threshold: .25 });
    observer.observe(area);
    document.addEventListener('visibilitychange', resume);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      waiters.forEach(resolve => resolve());
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      area.querySelectorAll('.stock-robot').forEach(element => element.remove());
    };
  }, []);

  return (
    <div ref={yardRef} className="yard">
      <p className="yard-legend font-mono">
        <span className="legend-item"><span className="crate-mark crate-mark-production" aria-hidden="true" />{legend.production}</span>
        <span className="legend-item"><span className="crate-mark crate-mark-project" aria-hidden="true" />{legend.project}</span>
      </p>
      <div className="shelves">
        {shelves.map(shelf => (
          <section key={shelf.label} className="shelf" aria-label={shelf.label}>
            <h3 className="shelf-label font-mono">{shelf.label}</h3>
            <ul className="shelf-tools">
              {shelf.items.map(item => (
                <li key={item.name} className={`crate crate-${item.use} font-mono`}>
                  <span className={`crate-mark crate-mark-${item.use}`} aria-hidden="true" />
                  {item.name}
                  <span className="sr-only"> ({legend[item.use]})</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="shelf shelf-languages" aria-label={languages.label}>
          <h3 className="shelf-label font-mono">{languages.label}</h3>
          <ul className="languages">
            {languages.items.map(item => (
              <li key={item.name}><strong>{item.name}</strong><span className="language-level font-mono">{item.level}</span></li>
            ))}
          </ul>
          <div className="lang-robots" aria-hidden="true">
            {languages.chat.map((line, index) => (
              <span key={line} className={`lang-robot lang-robot-${index}`}>
                <span className="lang-bubble font-mono">{line}</span>
                <RobotSprite pose="idle" mood="happy" />
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
