'use client';

import { useEffect, useRef, useState } from 'react';
import { CREW_HEIGHT, CREW_WIDTH, RobotSprite, crewMarkup, type RobotMood } from '@/components/robot-sprite';
import { registerStep } from '@/components/scene';

type Step = { year: string; text: string };
type Phase = 'done' | 'waiting' | 'building' | 'spraying' | 'dismantling';

// Where the cable starts (bottom of the jib) and how far it hangs when retracted.
const CABLE_TOP = 14;
const CABLE_SHORT = 6;
const STEP_INTERVAL = 100;
// The crane breaks down while lowering this floor (the second one), so the first shows the crane working normally.
const BREAK_AT = 1;

class Cancelled extends Error {}

// The career timeline as a building, one floor per milestone, oldest at the bottom, topped by a dashed "next floor"
// that invites the reader to get in touch. It arrives as a site under construction, wrapped in scaffolding. In its turn
// in the About scene the tower crane lowers each floor on its hook from the bottom up, a crew robot spray-paints
// the next floor (outline and text in one calm pass), and two more pull the scaffolding down. Halfway through the second
// floor the crane breaks down: the floor dangles, the cabin smokes, the operator pokes its head out looking miserable,
// and a mechanic hammers the mast until it runs again. Afterwards the hook waits
// above the empty next floor. Without motion the building is simply there, finished.
export function CareerBuilding({ steps, next }: { steps: readonly Step[]; next: { label: string; text: string; href: string } }) {
  const [phase, setPhase] = useState<Phase>('done');
  const [placed, setPlaced] = useState(0);
  // Plank heights (px from the top of the scaffolding): one at every floor joint, so the planks line up with the slabs.
  const [planks, setPlanks] = useState<number[]>([]);
  const [operatorOut, setOperatorOut] = useState(false);
  const [operatorMood, setOperatorMood] = useState<RobotMood>('normal');
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

    // The crane jams with a floor dangling: smoke from the cabin, the operator sticks its head out, sad, and a mechanic
    // runs to the foot of the mast and gives it three hammer blows until it starts again.
    async function breakdown(floor: HTMLElement, y: number) {
      const craneBox = area.querySelector<HTMLElement>('.crane');
      const sway = floor.animate([0, 2.5, -2.5, 0].map(angle => ({ transform: `translateY(${y}px) rotate(${angle}deg)` })), { duration: 900, iterations: Infinity, easing: 'ease-in-out' });
      const cabinX = area.clientWidth - 40;
      const smoke = setInterval(() => {
        const puff = document.createElement('span');
        puff.className = 'crane-smoke';
        puff.style.left = `${cabinX + Math.random() * 8}px`;
        puff.style.top = '8px';
        area.appendChild(puff);
        setTimeout(() => puff.remove(), 900);
      }, 220);
      intervals.add(smoke);
      craneBox?.animate([0, -3, 3, -2, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 280 });
      try {
        await wait(350);
        setOperatorMood('sad');
        setOperatorOut(true);
        await wait(900);

        const groundY = area.clientHeight - CREW_HEIGHT - 2;
        const mastX = area.clientWidth - 22 - CREW_WIDTH - 4;
        const mechanic = worker(area.clientWidth + 20, groundY);
        const hammer = document.createElement('span');
        hammer.className = 'mechanic-hammer';
        mechanic.el.appendChild(hammer);
        try {
          mechanic.run(true);
          await play(mechanic.el, [{ transform: `translate(${area.clientWidth + 20}px, ${groundY}px)` }, { transform: `translate(${mastX}px, ${groundY}px)` }], { duration: 550, easing: 'ease-out', fill: 'forwards' });
          mechanic.run(false);
          for (let blow = 0; blow < 3; blow++) {
            await play(hammer, [{ transform: 'rotate(-70deg)' }, { transform: 'rotate(25deg)' }], { duration: 170, easing: 'cubic-bezier(.6, 0, .9, .4)' });
            // Impact: "PAM!", sparks and the whole crane shaking.
            const pam = document.createElement('span');
            pam.className = 'hammer-pam font-mono';
            pam.textContent = 'PAM!';
            pam.style.left = `${mastX + 6 - blow * 4}px`;
            pam.style.top = `${groundY - 20 - blow * 6}px`;
            area.appendChild(pam);
            setTimeout(() => pam.remove(), 500);
            const spark = document.createElement('span');
            spark.className = 'hammer-spark';
            spark.textContent = '✦';
            spark.style.left = `${mastX + CREW_WIDTH + 4}px`;
            spark.style.top = `${groundY + 2}px`;
            area.appendChild(spark);
            setTimeout(() => spark.remove(), 400);
            craneBox?.animate([0, 3, -3, 2, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 220 });
            await wait(260);
          }
          // Running again: the smoke stops and the operator cheers up and ducks back in.
          clearInterval(smoke);
          setOperatorMood('happy');
          await play(mechanic.el, [{ transform: `translate(${mastX}px, ${groundY}px)` }, { transform: `translate(${mastX}px, ${groundY - 6}px)`, offset: .4 }, { transform: `translate(${mastX}px, ${groundY}px)` }], { duration: 280, easing: 'ease-out' });
          mechanic.run(true);
          const leave = play(mechanic.el, [{ transform: `translate(${mastX}px, ${groundY}px)` }, { transform: `translate(${area.clientWidth + 20}px, ${groundY}px)`, opacity: 0 }], { duration: 500, easing: 'ease-in', fill: 'forwards' });
          await wait(450);
          setOperatorOut(false);
          await leave;
        } finally {
          mechanic.remove();
        }
      } finally {
        clearInterval(smoke);
        sway.cancel();
        setOperatorOut(false);
        setOperatorMood('normal');
      }
    }

    async function raiseFloors() {
      crane.style.height = `${CABLE_SHORT}px`;
      for (let index = 0; index < floors.length; index++) {
        const floor = floors[index];
        const drop = floor.offsetTop - (CABLE_TOP + CABLE_SHORT);
        const duration = Math.min(800, 380 + drop * 1.6);
        // The floor hangs from the hook and both come down together.
        floor.classList.add('floor-hanging');
        if (index === BREAK_AT) {
          // Halfway down, the crane breaks: it only goes on once the mechanic has fixed it.
          const half = Math.round(drop / 2);
          crane.animate([{ height: `${CABLE_SHORT}px` }, { height: `${CABLE_SHORT + half}px` }], { duration: duration / 2, easing: 'ease-in' });
          await play(floor, [{ transform: `translateY(${-drop}px)` }, { transform: `translateY(${half - drop}px)` }], { duration: duration / 2, easing: 'ease-in', fill: 'forwards' });
          crane.style.height = `${CABLE_SHORT + half}px`;
          await breakdown(floor, half - drop);
          crane.animate([{ height: `${CABLE_SHORT + half}px` }, { height: `${CABLE_SHORT + drop}px` }], { duration: duration / 2, easing: 'ease-out' });
          await play(floor, [{ transform: `translateY(${half - drop}px)` }, { transform: 'none' }], { duration: duration / 2, easing: 'ease-out' });
          floor.getAnimations().forEach(animation => animation.cancel());
        } else {
          crane.animate([{ height: `${CABLE_SHORT}px` }, { height: `${CABLE_SHORT + drop}px` }], { duration, easing: 'cubic-bezier(.45, 0, .35, 1)' });
          await play(floor, [{ transform: `translateY(${-drop}px)` }, { transform: 'none' }], { duration, easing: 'cubic-bezier(.45, 0, .35, 1)' });
        }
        floor.classList.remove('floor-hanging');
        setPlaced(index + 1);
        // Released: the cable reels back up while the floor settles.
        await play(crane, [{ height: `${CABLE_SHORT + drop}px` }, { height: `${CABLE_SHORT}px` }], { duration: 300, easing: 'ease-in-out' });
        await wait(60);
      }
      // Back to the stylesheet's resting height: the hook waits above the next floor.
      crane.style.removeProperty('height');
    }

    // A crew member with a spray can appears at the left end of the next floor and, in one calm pass, sprays its dashed
    // outline and text together from left to right, then hops away. The frame and text are revealed in step with it.
    async function sprayNextFloor() {
      const frame = area.querySelector<HTMLElement>('.floor-next');
      const text = frame?.querySelector<HTMLElement>('a');
      if (!frame || !text) return;
      frame.style.clipPath = 'inset(-2px 100% -2px -2px)';
      setPhase('spraying');
      const left = frame.offsetLeft;
      const width = frame.offsetWidth;
      const y = frame.offsetTop - CREW_HEIGHT;
      const startX = left - CREW_WIDTH / 2;
      const painter = worker(startX, y);
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
      // Smooth start and stop instead of a constant rush.
      const ease = (t: number) => t * t * (3 - 2 * t);
      try {
        await play(painter.el, [{ transform: `translate(${startX}px, ${y - 10}px)`, opacity: 0 }, { transform: `translate(${startX}px, ${y}px)`, opacity: 1 }], { duration: 300, easing: 'ease-out' });
        painter.place(startX, y);
        await wait(150);
        painter.run(true);
        let lastPuff = 0;
        await tween(2000, t => {
          const progress = ease(t);
          const x = startX + width * progress;
          painter.place(x, y);
          frame.style.clipPath = `inset(-2px ${(1 - progress) * 100}% -2px -2px)`;
          if (progress - lastPuff > .06) { lastPuff = progress; mist(x); }
        });
        painter.run(false);
        frame.style.removeProperty('clip-path');
        const endX = startX + width;
        await play(painter.el, [{ transform: `translate(${endX}px, ${y}px)`, opacity: 1 }, { transform: `translate(${endX}px, ${y - 10}px)`, opacity: 1, offset: .4 }, { transform: `translate(${endX}px, ${y - 4}px)`, opacity: 0 }], { duration: 350, easing: 'ease-out', fill: 'forwards' });
      } finally {
        frame.style.removeProperty('clip-path');
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

    // Steps 2 to 4 of the About scene: floors, the sprayed next floor, then the scaffolding comes down.
    const unregister = [
      registerStep('about', 2, async () => { setPhase('building'); await raiseFloors(); }),
      registerStep('about', 3, sprayNextFloor),
      registerStep('about', 4, async () => { await dismantle(); setPhase('done'); }),
    ];

    return () => {
      cancelled = true;
      unregister.forEach(remove => remove());
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      area.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      area.querySelectorAll('.site-crew, .spray-mist').forEach(element => element.remove());
    };
  }, [steps]);

  // Measures the floor joints (the floors are laid out even before they are placed) and re-measures on resize, e.g.
  // when text wraps differently on a phone.
  const underConstruction = phase !== 'done';
  useEffect(() => {
    const area = siteRef.current;
    if (!underConstruction || !area) return;
    const measure = () => {
      const scaffold = area.querySelector<HTMLElement>('.scaffold');
      if (!scaffold) return;
      const floors = [...area.querySelectorAll<HTMLElement>('.building > li')];
      const joints = [Math.min(...floors.map(floor => floor.offsetTop)), ...floors.map(floor => floor.offsetTop + floor.offsetHeight)]
        .map(y => Math.round(y - scaffold.offsetTop))
        .sort((a, b) => a - b)
        .filter((y, index, all) => index === 0 || y - all[index - 1] > 3);
      setPlanks(joints);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  }, [underConstruction]);

  const floorClass = (index: number) => {
    if (phase === 'done' || phase === 'spraying' || phase === 'dismantling') return 'floor floor-step';
    return `floor floor-step ${index < placed ? 'floor-landed' : 'floor-pending'}`;
  };

  return (
    <div ref={siteRef} className={`building-site building-${phase}`}>
      <div className="crane" aria-hidden="true">
        <span className="crane-mast" />
        {/* Operator's cabin; the operator only shows when it leans out of the window. */}
        <span className={`crane-operator${operatorOut ? ' crane-operator-out' : ''}`}>
          <RobotSprite pose="idle" mood={operatorMood} />
          {operatorOut && operatorMood === 'sad' && <span className="operator-tear" />}
        </span>
        <span className="crane-cabin" />
        <span className="crane-jib" />
        <span ref={cableRef} className="crane-cable"><span className="crane-hook" /></span>
      </div>
      {/* Scaffolding around the building while it is under construction. */}
      {phase !== 'done' && (
        <div className="scaffold" aria-hidden="true">
          <span className="scaffold-pole" />
          <span className="scaffold-pole scaffold-pole-right" />
          {planks.map((top, index) => (
            <span key={top} className="scaffold-plank" style={{ top: `${top - 1}px`, animationDelay: `${index * 70}ms` }} />
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
