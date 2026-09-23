'use client';

import { useEffect, useRef } from 'react';
import { CREW_WIDTH, crewMarkup } from '@/components/robot-sprite';

const SPEED = 110; // px per second
const STEP_INTERVAL = 140;

class Cancelled extends Error {}

// A guard robot that now and then walks the length of the divider line, alternating direction, with a stop midway to look around.
// Pauses while off-screen or in a background tab; absent without motion.
export function PatrolRobot() {
  const guardRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const guard = guardRef.current;
    const track = guard?.parentElement;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!guard || !track || preference.matches) return;
    const sprite: HTMLSpanElement = guard;
    const line: HTMLElement = track;

    let cancelled = false;
    let inView = false;
    let step = 0;
    let legs: ReturnType<typeof setInterval> | undefined;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const canRun = () => inView && !document.hidden;
    const draw = (walking: boolean) => { sprite.innerHTML = crewMarkup(false, walking ? ++step : 0, 'A'); };
    const walk = (on: boolean) => { clearInterval(legs); if (on) legs = setInterval(() => draw(true), STEP_INTERVAL); else draw(false); };

    async function pause(ms: number) {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      while (!canRun() && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }

    async function move(from: number, to: number) {
      walk(true);
      const animation = sprite.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration: Math.abs(to - from) / SPEED * 1000, easing: 'linear' });
      try { await animation.finished; } catch { throw new Cancelled(); }
      if (cancelled) throw new Cancelled();
      sprite.style.transform = `translateX(${to}px)`;
      walk(false);
    }

    async function run() {
      for (let rightward = true; ; rightward = !rightward) {
        await pause(6000 + Math.random() * 6000);
        const width = line.clientWidth;
        const [start, end] = rightward ? [-CREW_WIDTH - 10, width + 10] : [width + 10, -CREW_WIDTH - 10];
        const stop = start + (end - start) * (0.35 + Math.random() * 0.3);
        sprite.style.opacity = '1';
        await move(start, stop);
        // Stops to look around: a little "hm?" hop.
        await pause(500);
        const hop = sprite.animate([{ transform: `translate(${stop}px, 0)` }, { transform: `translate(${stop}px, -6px)`, offset: .4 }, { transform: `translate(${stop}px, 0)` }], { duration: 320, easing: 'ease-out' });
        try { await hop.finished; } catch { throw new Cancelled(); }
        await pause(700);
        await move(stop, end);
        sprite.style.opacity = '0';
      }
    }

    const resume = () => { if (canRun()) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); });
    observer.observe(line);
    document.addEventListener('visibilitychange', resume);
    draw(false);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      clearInterval(legs);
      timers.forEach(clearTimeout);
      waiters.forEach(resolve => resolve());
      sprite.getAnimations().forEach(animation => animation.cancel());
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  return <span ref={guardRef} className="patrol" aria-hidden="true" />;
}
