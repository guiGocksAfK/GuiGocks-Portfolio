'use client';

import { useEffect, useRef } from 'react';
import { RobotSprite, crewMarkup, forkliftMarkup } from '@/components/robot-sprite';

type Use = 'production' | 'project';
type Shelf = { label: string; items: readonly { name: string; use: Use }[] };
type Languages = { label: string; items: readonly { name: string; level: string }[]; chat: readonly [string, string] };

// The stock-taker is drawn bigger here (3px pixels instead of 2: 24×27, see .ladder-clerk).
const CLERK_HEIGHT = 27;
const LADDER_WIDTH = 22;
const SLIDE_SPEED = 160; // px per second, the ladder rolling along its rail
const CHECK_SPEED = 80; // px per second while checking crates: an unhurried stock take
const CLIMB_SPEED = 110;
const FORKLIFT_SPEED = 120;
const STEP_INTERVAL = 140;

class Cancelled extends Error {}

// The tool store ("almoxarifado"): one shelving unit with a shelf per area and the tools as crates standing on it,
// marked by where they have been used, next to the storekeeper's office with the languages. The robots only work, one
// job at a time: a stock-taker rides a rolling library ladder to a shelf and ticks its crates as the ladder slides past
// them; then either a forklift drives across the floor with a pallet or the office robots greet each other. Runs only
// while the section is on screen; without motion everything is static.
export function CapabilitiesYard({ shelves, languages, legend }: { shelves: readonly Shelf[]; languages: Languages; legend: { production: string; project: string } }) {
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
        const t = Math.min(1, (now - start) / Math.max(duration, 1));
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    const smooth = (t: number) => t * t * (3 - 2 * t);

    // Parking spot of the ladder: the free strip on the right of the rack.
    const parkX = () => rack.clientWidth - LADDER_WIDTH - 14;
    let ladderX = parkX();
    const placeLadder = (x: number) => { ladderX = x; ladder.style.transform = `translateX(${x}px)`; };
    placeLadder(ladderX);

    // A crew member drawn from markup, with alternating legs while it moves.
    function crewMember(className: string) {
      const el = document.createElement('span');
      el.className = className;
      let step = 0;
      let legs: ReturnType<typeof setInterval> | undefined;
      const draw = () => { el.innerHTML = crewMarkup(false, step); };
      draw();
      return {
        el,
        move: (on: boolean) => { clearInterval(legs); if (legs) intervals.delete(legs); if (on) { legs = setInterval(() => { step += 1; draw(); }, STEP_INTERVAL); intervals.add(legs); } },
        stop: () => { clearInterval(legs); if (legs) intervals.delete(legs); },
      };
    }

    // Stock take of one shelf: the clerk climbs the ladder to the shelf, rides it along the crates ticking each one,
    // rides back to the parking spot and climbs down.
    async function inspect(shelf: HTMLElement) {
      const crates = [...shelf.querySelectorAll<HTMLElement>('.crate')];
      if (!crates.length) return;
      const clerk = crewMember('ladder-clerk');
      ladder.appendChild(clerk.el);
      const floorY = ladder.clientHeight - CLERK_HEIGHT;
      // Feet on the shelf's plank line, i.e. level with the crates' bottoms.
      const shelfY = shelf.offsetTop + shelf.offsetHeight - CLERK_HEIGHT - 6;
      const setClerk = (y: number, bob = 0) => { clerk.el.style.transform = `translate(-8px, ${y - bob}px)`; };
      const rackBox = rack.getBoundingClientRect();
      const centerOf = (crate: HTMLElement) => { const box = crate.getBoundingClientRect(); return box.left - rackBox.left + box.width / 2; };
      try {
        setClerk(floorY);
        await tween(250, t => { clerk.el.style.opacity = String(t); });
        // Climb up.
        clerk.move(true);
        await tween(Math.abs(floorY - shelfY) / CLIMB_SPEED * 1000, t => setClerk(floorY + (shelfY - floorY) * t));
        clerk.move(false);
        await pause(250);
        // Roll to the first crate, then along the row, ticking crates as the ladder passes their middle.
        const firstX = Math.min(...crates.map(crate => centerOf(crate))) - LADDER_WIDTH / 2 - 10;
        const lastX = Math.max(...crates.map(crate => centerOf(crate))) - LADDER_WIDTH / 2 + 10;
        const from = ladderX;
        await tween(Math.abs(from - firstX) / SLIDE_SPEED * 1000, t => placeLadder(from + (firstX - from) * smooth(t)));
        const pending = new Set(crates);
        await tween(Math.abs(lastX - firstX) / CHECK_SPEED * 1000, t => {
          placeLadder(firstX + (lastX - firstX) * t);
          for (const crate of pending) {
            if (centerOf(crate) <= ladderX + LADDER_WIDTH / 2) {
              pending.delete(crate);
              crate.classList.remove('crate-checked');
              void crate.offsetWidth;
              crate.classList.add('crate-checked');
            }
          }
        });
        await pause(300);
        const back = ladderX;
        const park = parkX();
        await tween(Math.abs(park - back) / SLIDE_SPEED * 1000, t => placeLadder(back + (park - back) * smooth(t)));
        // Climb down and leave.
        clerk.move(true);
        await tween(Math.abs(floorY - shelfY) / CLIMB_SPEED * 1000, t => setClerk(shelfY + (floorY - shelfY) * t));
        clerk.move(false);
        await tween(250, t => { clerk.el.style.opacity = String(1 - t); });
      } finally {
        clerk.stop();
        clerk.el.remove();
      }
    }

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
      const shelfElements = [...rack.querySelectorAll<HTMLElement>('.rack-shelf')];
      for (;;) {
        for (let index = 0; index < shelfElements.length; index++) {
          await pause(1800);
          await inspect(shelfElements[index]);
          await pause(900);
          // Alternate the in-between job so the scene keeps varying.
          if (index % 2 === 0) await forklift(); else await chat();
        }
      }
    }

    const resume = () => { if (inView && !document.hidden) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }, { threshold: .2 });
    observer.observe(area);
    document.addEventListener('visibilitychange', resume);
    const onResize = () => { if (ladderX > parkX()) placeLadder(parkX()); };
    window.addEventListener('resize', onResize);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      waiters.forEach(resolve => resolve());
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('resize', onResize);
      area.querySelectorAll('.ladder-clerk, .forklift').forEach(element => element.remove());
    };
  }, []);

  return (
    <div ref={yardRef} className="yard">
      <p className="yard-legend font-mono">
        <span className="legend-item"><span className="crate-mark crate-mark-production" aria-hidden="true" />{legend.production}</span>
        <span className="legend-item"><span className="crate-mark crate-mark-project" aria-hidden="true" />{legend.project}</span>
      </p>
      <div className="yard-grid">
        <div ref={rackRef} className="rack">
          <span className="rack-post rack-post-left" aria-hidden="true" />
          <span className="rack-post rack-post-right" aria-hidden="true" />
          {shelves.map(shelf => (
            <section key={shelf.label} className="rack-shelf" aria-label={shelf.label}>
              <h3 className="rack-tag font-mono">{shelf.label}</h3>
              <ul className="rack-crates">
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
          <div className="rack-floor" aria-hidden="true" />
          {/* Rolling library ladder on its rail; parked on the right when idle. */}
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
