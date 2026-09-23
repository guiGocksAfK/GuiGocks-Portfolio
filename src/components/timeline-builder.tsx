'use client';

import { useEffect, useRef, useState } from 'react';
import { CREW_HEIGHT, CREW_WIDTH, crateMarkup, crewMarkup } from '@/components/robot-sprite';

const STAGGER = 280;
const STEP_INTERVAL = 100;

type Phase = 'done' | 'waiting' | 'building';

// The career timeline. The first time it scrolls into view, hard-hat crew members run in one after another, each
// carrying a crate, and set down one milestone apiece from top to bottom. Without motion (or JavaScript) it is just a list.
export function TimelineBuilder({ steps }: { steps: readonly { year: string; text: string }[] }) {
  const [phase, setPhase] = useState<Phase>('done');
  const [placed, setPlaced] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const crewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const layer = crewRef.current;
    if (!list || !layer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    // Hide the milestones until the crew delivers them.
    setPhase('waiting');

    const wait = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(resolve, ms); cleanups.push(() => clearTimeout(timer)); });

    async function deliver(index: number) {
      await wait(index * STAGGER);
      if (cancelled || !list || !layer) return;
      const row = list.children[index] as HTMLElement;
      const y = row.offsetTop + row.offsetHeight - CREW_HEIGHT;
      const standX = Math.min(row.offsetWidth - CREW_WIDTH - 12, 240);
      const exitX = layer.clientWidth + 30;

      const member = document.createElement('div');
      member.className = 'timeline-crew';
      member.innerHTML = `<span class="timeline-crate">${crateMarkup()}</span><span class="timeline-sprite"></span>`;
      layer.appendChild(member);
      const sprite = member.querySelector('.timeline-sprite') as HTMLElement;
      const crate = member.querySelector('.timeline-crate') as HTMLElement;
      let step = 0;
      let carrying = true;
      const legs = setInterval(() => { sprite.innerHTML = crewMarkup(carrying, ++step); }, STEP_INTERVAL);
      sprite.innerHTML = crewMarkup(true, 0);
      cleanups.push(() => { clearInterval(legs); member.remove(); });

      try {
        await member.animate([{ transform: `translate(${exitX}px, ${y}px)` }, { transform: `translate(${standX}px, ${y}px)` }], { duration: 420, easing: 'ease-out', fill: 'forwards' }).finished;
        if (cancelled) return;
        // Drops the crate: it turns into the milestone.
        await crate.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(10px) scale(.6)', opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished;
        if (cancelled) return;
        carrying = false;
        setPlaced(count => Math.max(count, index + 1));
        await member.animate([{ transform: `translate(${standX}px, ${y}px)` }, { transform: `translate(${standX}px, ${y - 6}px)`, offset: .4 }, { transform: `translate(${standX}px, ${y}px)` }], { duration: 240, easing: 'ease-out' }).finished;
        await member.animate([{ transform: `translate(${standX}px, ${y}px)`, opacity: 1 }, { transform: `translate(${exitX}px, ${y}px)`, opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' }).finished;
      } catch {
        return;
      } finally {
        clearInterval(legs);
        member.remove();
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPhase('building');
      steps.forEach((_, index) => { deliver(index); });
      const done = setTimeout(() => { if (!cancelled) setPhase('done'); }, steps.length * STAGGER + 1600);
      cleanups.push(() => clearTimeout(done));
    }, { threshold: .4 });
    observer.observe(list);

    return () => {
      cancelled = true;
      observer.disconnect();
      cleanups.forEach(cleanup => cleanup());
    };
  }, [steps]);

  return (
    <div className="timeline-wrap">
      <ol ref={listRef} className="timeline">
        {steps.map((step, index) => (
          <li key={step.text} className={phase === 'done' ? undefined : index < placed ? 'timeline-placed' : 'timeline-pending'}>
            <span className="timeline-year font-mono">{step.year}</span><span>{step.text}</span>
          </li>
        ))}
      </ol>
      <div ref={crewRef} className="timeline-crew-layer" aria-hidden="true" />
    </div>
  );
}
