'use client';

import { useEffect, useRef, useState } from 'react';

type Step = { year: string; text: string };
type Phase = 'done' | 'waiting' | 'building';

// Where the cable starts (bottom of the jib) and how far it hangs when retracted.
const CABLE_TOP = 14;
const CABLE_SHORT = 6;

class Cancelled extends Error {}

// The career timeline as a building, one floor per milestone, oldest at the bottom, topped by a dashed "next floor"
// that invites the reader to get in touch. The first time it scrolls into view, a tower crane lowers each floor on
// its hook from the bottom up; afterwards the hook waits above the empty next floor.
export function CareerBuilding({ steps, next }: { steps: readonly Step[]; next: { label: string; text: string; href: string } }) {
  const [phase, setPhase] = useState<Phase>('done');
  const [placed, setPlaced] = useState(0);
  const siteRef = useRef<HTMLDivElement>(null);
  const cableRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const site = siteRef.current;
    const cable = cableRef.current;
    if (!site || !cable || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const crane: HTMLSpanElement = cable;
    const area: HTMLDivElement = site;
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    // Floors stay off the site until the crane brings them.
    setPhase('waiting');

    const wait = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(resolve, ms); timers.add(timer); }).then(() => { if (cancelled) throw new Cancelled(); });
    const play = async (element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      try { await element.animate(keyframes, options).finished; } catch { throw new Cancelled(); }
      if (cancelled) throw new Cancelled();
    };
    const setCable = (height: number) => { crane.style.height = `${height}px`; };

    async function build() {
      setCable(CABLE_SHORT);
      const floors = [...area.querySelectorAll<HTMLElement>('.floor-step')];
      for (let index = 0; index < floors.length; index++) {
        const floor = floors[index];
        const hookY = CABLE_TOP + CABLE_SHORT;
        const drop = floor.offsetTop - hookY;
        const duration = Math.min(1100, 450 + drop * 2.2);
        // The floor hangs from the hook and both come down together.
        floor.classList.add('floor-hanging');
        crane.animate([{ height: `${CABLE_SHORT}px` }, { height: `${CABLE_SHORT + drop}px` }], { duration, easing: 'cubic-bezier(.45, 0, .35, 1)' });
        await play(floor, [{ transform: `translateY(${-drop}px)` }, { transform: 'none' }], { duration, easing: 'cubic-bezier(.45, 0, .35, 1)' });
        floor.classList.remove('floor-hanging');
        setPlaced(index + 1);
        // Released: the cable reels back up while the floor settles.
        await play(crane, [{ height: `${CABLE_SHORT + drop}px` }, { height: `${CABLE_SHORT}px` }], { duration: 380, easing: 'ease-in-out' });
        await wait(120);
      }
      // Back to the stylesheet's resting height: the hook waits above the next floor.
      crane.style.removeProperty('height');
      setPhase('done');
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPhase('building');
      build().catch(error => { if (!(error instanceof Cancelled)) throw error; });
    }, { threshold: .35 });
    observer.observe(area);

    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach(clearTimeout);
      crane.getAnimations().forEach(animation => animation.cancel());
    };
  }, [steps]);

  const floorClass = (index: number) => {
    if (phase === 'done') return 'floor floor-step';
    return `floor floor-step ${index < placed ? 'floor-landed' : 'floor-pending'}`;
  };

  return (
    <div ref={siteRef} className={`building-site building-${phase}`}>
      <div className="crane" aria-hidden="true">
        <span className="crane-mast" />
        <span className="crane-jib" />
        <span ref={cableRef} className="crane-cable"><span className="crane-hook" /></span>
      </div>
      {/* Chronological in the markup; the stack is drawn bottom-up. */}
      <ol className="building">
        {steps.map((step, index) => (
          <li key={step.text} className={floorClass(index)}>
            <span className="floor-year font-mono">{step.year}</span><span className="floor-text">{step.text}</span>
          </li>
        ))}
        <li className="floor floor-next">
          <a href={next.href}><span className="font-mono">{next.label}:</span> <strong>{next.text}</strong> <span aria-hidden="true">→</span></a>
        </li>
      </ol>
      <span className="building-ground" aria-hidden="true" />
    </div>
  );
}
