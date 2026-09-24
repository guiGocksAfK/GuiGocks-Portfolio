'use client';

import { useEffect, useRef, useState } from 'react';
import { CREW_HEIGHT, CREW_WIDTH, crewMarkup } from '@/components/robot-sprite';

type Step = { year: string; text: string };
type Phase = 'done' | 'waiting' | 'building' | 'spraying' | 'dismantling';

// Where the cable starts (bottom of the jib) and how far it hangs when retracted.
const CABLE_TOP = 14;
const CABLE_SHORT = 6;
const STEP_INTERVAL = 100;

class Cancelled extends Error {}

// The career timeline as a building, one floor per milestone, oldest at the bottom, topped by a dashed "next floor"
// that invites the reader to get in touch. It arrives as a site under construction, wrapped in scaffolding. The first
// time it scrolls into view the tower crane lowers each floor on its hook from the bottom up, a crew robot spray-paints
// the outline and then the text of the next floor, and two more pull the scaffolding down. Afterwards the hook waits
// above the empty next floor. Without motion the building is simply there, finished.
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
    const floors = [...area.querySelectorAll<HTMLElement>('.floor-step')];
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const intervals = new Set<ReturnType<typeof setInterval>>();
    // The site starts unfinished. This has to happen after mount, because the server cannot know whether the visitor allows motion.
    setPhase('waiting');

    const wait = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(resolve, ms); timers.add(timer); }).then(() => { if (cancelled) throw new Cancelled(); });
    const play = async (element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      try { await element.animate(keyframes, options).finished; } catch { throw new Cancelled(); }
      if (cancelled) throw new Cancelled();
    };
    // Calls onFrame with progress 0..1 on every animation frame.
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

    // Hard-hat crew member living in the site; legs alternate while it runs.
    function worker(x: number, y: number) {
      const el = document.createElement('span');
      el.className = 'site-crew';
      area.appendChild(el);
      let step = 0;
      let legs: ReturnType<typeof setInterval> | undefined;
      const draw = () => { el.innerHTML = crewMarkup(false, step); };
      const place = (nx: number, ny: number) => { el.style.transform = `translate(${nx}px, ${ny}px)`; };
      draw();
      place(x, y);
      return {
        el,
        place,
        run: (on: boolean) => { clearInterval(legs); if (legs) intervals.delete(legs); if (on) { legs = setInterval(() => { step += 1; draw(); }, STEP_INTERVAL); intervals.add(legs); } },
        remove: () => { clearInterval(legs); el.remove(); },
      };
    }

    async function raiseFloors() {
      crane.style.height = `${CABLE_SHORT}px`;
      for (let index = 0; index < floors.length; index++) {
        const floor = floors[index];
        const drop = floor.offsetTop - (CABLE_TOP + CABLE_SHORT);
        const duration = Math.min(800, 380 + drop * 1.6);
        // The floor hangs from the hook and both come down together.
        floor.classList.add('floor-hanging');
        crane.animate([{ height: `${CABLE_SHORT}px` }, { height: `${CABLE_SHORT + drop}px` }], { duration, easing: 'cubic-bezier(.45, 0, .35, 1)' });
        await play(floor, [{ transform: `translateY(${-drop}px)` }, { transform: 'none' }], { duration, easing: 'cubic-bezier(.45, 0, .35, 1)' });
        floor.classList.remove('floor-hanging');
        setPlaced(index + 1);
        // Released: the cable reels back up while the floor settles.
        await play(crane, [{ height: `${CABLE_SHORT + drop}px` }, { height: `${CABLE_SHORT}px` }], { duration: 300, easing: 'ease-in-out' });
        await wait(60);
      }
      // Back to the stylesheet's resting height: the hook waits above the next floor.
      crane.style.removeProperty('height');
    }

    // A crew member with a spray can runs along the top of the building drawing the next floor's dashed outline,
    // then goes back and writes the text. Each pass reveals its part from left to right, in step with the robot.
    async function sprayNextFloor() {
      const frame = area.querySelector<HTMLElement>('.floor-next');
      const text = frame?.querySelector<HTMLElement>('a');
      if (!frame || !text) return;
      frame.style.clipPath = 'inset(-2px 100% -2px -2px)';
      text.style.clipPath = 'inset(0 100% 0 0)';
      setPhase('spraying');
      const left = frame.offsetLeft;
      const width = frame.offsetWidth;
      const y = frame.offsetTop - CREW_HEIGHT;
      const painter = worker(area.clientWidth, y);
      const can = document.createElement('span');
      can.className = 'spray-can';
      painter.el.appendChild(can);
      const mist = (x: number) => {
        const puff = document.createElement('span');
        puff.className = 'spray-mist';
        puff.style.left = `${x + CREW_WIDTH + 2}px`;
        puff.style.top = `${y + 8}px`;
        area.appendChild(puff);
        setTimeout(() => puff.remove(), 400);
      };
      try {
        painter.run(true);
        await play(painter.el, [{ transform: `translate(${area.clientWidth}px, ${y}px)` }, { transform: `translate(${left - CREW_WIDTH}px, ${y}px)` }], { duration: 650, easing: 'ease-out' });
        painter.place(left - CREW_WIDTH, y);
        const pass = (duration: number, reveal: (t: number) => void) => {
          let lastPuff = 0;
          return tween(duration, t => {
            const x = left - CREW_WIDTH + width * t;
            painter.place(x, y);
            reveal(t);
            if (t - lastPuff > .03) { lastPuff = t; mist(x); }
          });
        };
        await pass(1100, t => { frame.style.clipPath = `inset(-2px ${(1 - t) * 100}% -2px -2px)`; });
        frame.style.removeProperty('clip-path');
        // Back to the start for the lettering: a quick hop, then the second pass.
        await tween(260, t => painter.place(left - CREW_WIDTH + width * (1 - t), y - Math.sin(Math.PI * t) * 10));
        await pass(900, t => { text.style.clipPath = `inset(0 ${(1 - t) * 100}% 0 0)`; });
        text.style.removeProperty('clip-path');
        await play(painter.el, [{ transform: `translate(${left - CREW_WIDTH + width}px, ${y}px)` }, { transform: `translate(${area.clientWidth + 20}px, ${y}px)`, opacity: 0 }], { duration: 450, easing: 'ease-in', fill: 'forwards' });
      } finally {
        frame.style.removeProperty('clip-path');
        text.style.removeProperty('clip-path');
        painter.remove();
      }
    }

    // Two crew members run in to the scaffold poles, give them a yank, and the scaffolding falls apart.
    async function dismantle() {
      const scaffold = area.querySelector<HTMLElement>('.scaffold');
      if (!scaffold) return;
      const groundY = area.clientHeight - CREW_HEIGHT - 2;
      const poles = [scaffold.offsetLeft - 4, scaffold.offsetLeft + scaffold.offsetWidth - CREW_WIDTH + 4];
      const crew = poles.map(() => worker(area.clientWidth + 20, groundY));
      try {
        await Promise.all(crew.map((member, index) => {
          member.run(true);
          return play(member.el, [{ transform: `translate(${area.clientWidth + 20}px, ${groundY}px)` }, { transform: `translate(${poles[index]}px, ${groundY}px)` }], { duration: 500 + index * 150, easing: 'ease-out', fill: 'forwards' });
        }));
        crew.forEach(member => member.run(false));
        // The yank.
        await Promise.all(crew.map((member, index) => play(member.el, [{ transform: `translate(${poles[index]}px, ${groundY}px)` }, { transform: `translate(${poles[index] + 5}px, ${groundY}px) scale(1.15, .85)`, offset: .5 }, { transform: `translate(${poles[index]}px, ${groundY}px)` }], { duration: 260, easing: 'ease-in-out' })));
        setPhase('dismantling');
        await wait(250);
        await Promise.all(crew.map((member, index) => {
          member.run(true);
          return play(member.el, [{ transform: `translate(${poles[index]}px, ${groundY}px)` }, { transform: `translate(${area.clientWidth + 20}px, ${groundY}px)`, opacity: 0 }], { duration: 700, easing: 'ease-in', fill: 'forwards' });
        }));
        await wait(300);
      } finally {
        crew.forEach(member => member.remove());
      }
    }

    async function build() {
      await raiseFloors();
      await sprayNextFloor();
      await dismantle();
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
      intervals.forEach(clearInterval);
      area.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      area.querySelectorAll('.site-crew, .spray-mist').forEach(element => element.remove());
    };
  }, [steps]);

  const floorClass = (index: number) => {
    if (phase === 'done' || phase === 'spraying' || phase === 'dismantling') return 'floor floor-step';
    return `floor floor-step ${index < placed ? 'floor-landed' : 'floor-pending'}`;
  };

  return (
    <div ref={siteRef} className={`building-site building-${phase}`}>
      <div className="crane" aria-hidden="true">
        <span className="crane-mast" />
        <span className="crane-jib" />
        <span ref={cableRef} className="crane-cable"><span className="crane-hook" /></span>
      </div>
      {/* Scaffolding around the building while it is under construction. */}
      {phase !== 'done' && (
        <div className="scaffold" aria-hidden="true">
          <span className="scaffold-pole" />
          <span className="scaffold-pole scaffold-pole-right" />
          {Array.from({ length: steps.length + 1 }, (_, index) => (
            <span key={index} className="scaffold-plank" style={{ top: `${((index + 1) / (steps.length + 2)) * 100}%`, animationDelay: `${index * 70}ms` }} />
          ))}
        </div>
      )}
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
