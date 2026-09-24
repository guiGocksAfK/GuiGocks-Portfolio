'use client';

import { useEffect, useRef } from 'react';
import { CREW_WIDTH, crewMarkup } from '@/components/robot-sprite';
import { anySceneRunning } from '@/components/scene';

const SPEED = 110; // px per second
const STEP_INTERVAL = 140;
// Chance that a round turns into a brawl with a hard-hat rival.
const FIGHT_CHANCE = .25;
const BRAWL = 1800;

class Cancelled extends Error {}

type Walker = { el: HTMLSpanElement; x: number; walk: (on: boolean) => void; angry: (on: boolean) => void };

// A guard robot that now and then walks the length of a section's divider line, alternating direction, with a stop
// midway to look around. About one round in four a hard-hat worker comes the other way: they bump, stare each other
// down anime-style, brawl inside a cartoon dust cloud and one of them gets punched off into the sky with a twinkle.
// Pauses while off-screen or in a background tab; absent without motion.
export function PatrolRobot() {
  const stageRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    const track = stageEl?.parentElement;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!stageEl || !track || preference.matches) return;
    const stage: HTMLSpanElement = stageEl;
    const line: HTMLElement = track;

    let cancelled = false;
    let inView = false;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const intervals = new Set<ReturnType<typeof setInterval>>();

    const canRun = () => inView && !document.hidden;

    async function pause(ms: number) {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      while (!canRun() && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }

    async function play(element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      try { await element.animate(keyframes, options).finished; } catch { throw new Cancelled(); }
      if (cancelled) throw new Cancelled();
    }

    function spawn(className: string, html = '') {
      const element = document.createElement('span');
      element.className = className;
      element.innerHTML = html;
      stage.appendChild(element);
      return element;
    }

    function walker(hat: 'A' | 'O'): Walker {
      const el = spawn('patrol-bot');
      let step = 0;
      let isAngry = false;
      let legs: ReturnType<typeof setInterval> | undefined;
      const draw = (moving: boolean) => { el.innerHTML = crewMarkup(false, moving ? ++step : 0, hat, isAngry ? 'angry' : 'normal'); };
      draw(false);
      return {
        el,
        x: 0,
        walk: on => { clearInterval(legs); if (legs) intervals.delete(legs); if (on) { legs = setInterval(() => draw(true), STEP_INTERVAL); intervals.add(legs); } else draw(false); },
        angry: on => { isAngry = on; draw(false); },
      };
    }

    const place = (bot: Walker, x: number, y = 0) => { bot.x = x; bot.el.style.transform = `translate(${x}px, ${y}px)`; };

    async function move(bot: Walker, to: number) {
      bot.walk(true);
      await play(bot.el, [{ transform: `translateX(${bot.x}px)` }, { transform: `translateX(${to}px)` }], { duration: Math.abs(to - bot.x) / SPEED * 1000, easing: 'linear' });
      place(bot, to);
      bot.walk(false);
    }

    // Plain round: walk across, stop midway for a little "hm?" hop, walk off.
    async function patrol(guard: Walker, start: number, end: number) {
      place(guard, start);
      guard.el.style.opacity = '1';
      const stop = start + (end - start) * (0.35 + Math.random() * 0.3);
      await move(guard, stop);
      await pause(500);
      await play(guard.el, [{ transform: `translate(${stop}px, 0)` }, { transform: `translate(${stop}px, -6px)`, offset: .4 }, { transform: `translate(${stop}px, 0)` }], { duration: 320, easing: 'ease-out' });
      await pause(700);
      await move(guard, end);
      guard.el.style.opacity = '0';
    }

    // Fight round: the guard and a hard-hat rival meet in the middle and brawl.
    async function fight(guard: Walker, start: number, end: number, width: number) {
      const rival = walker('O');
      try {
        const direction = Math.sign(end - start);
        const middle = width * (0.35 + Math.random() * 0.3);
        const guardSpot = middle - direction * (CREW_WIDTH / 2 + 1) - CREW_WIDTH / 2;
        const rivalSpot = middle + direction * (CREW_WIDTH / 2 + 1) - CREW_WIDTH / 2;
        place(guard, start);
        place(rival, end);
        guard.el.style.opacity = '1';
        rival.el.style.opacity = '1';
        await Promise.all([move(guard, guardSpot), move(rival, rivalSpot)]);

        // Bump: both bounce back a little.
        await Promise.all([
          play(guard.el, [{ transform: `translateX(${guardSpot}px)` }, { transform: `translateX(${guardSpot - direction * 5}px)`, offset: .35 }, { transform: `translateX(${guardSpot}px)` }], { duration: 260, easing: 'ease-out' }),
          play(rival.el, [{ transform: `translateX(${rivalSpot}px)` }, { transform: `translateX(${rivalSpot + direction * 5}px)`, offset: .35 }, { transform: `translateX(${rivalSpot}px)` }], { duration: 260, easing: 'ease-out' }),
        ]);

        // Anime stare-down: red eyes, "!" over both heads, speed lines behind them.
        guard.angry(true);
        rival.angry(true);
        const alerts = [guardSpot, rivalSpot].map(x => { const alert = spawn('fight-alert', '!'); alert.style.left = `${x + CREW_WIDTH / 2 - 3}px`; return alert; });
        const lines = spawn('fight-lines');
        lines.style.left = `${middle - 70}px`;
        await pause(900);
        alerts.forEach(alert => alert.remove());
        lines.remove();

        // Brawl: both vanish into a dust cloud that throws out fists, boots, stars and impact flashes.
        guard.el.style.opacity = '0';
        rival.el.style.opacity = '0';
        const cloud = spawn('fight-cloud');
        cloud.style.left = `${middle - 26}px`;
        const bits = ['fight-fist', 'fight-boot', 'fight-star', 'fight-flash'];
        const debris = setInterval(() => {
          const bit = spawn(`fight-bit ${bits[Math.floor(Math.random() * bits.length)]}`);
          if (bit.classList.contains('fight-star')) bit.textContent = '✦';
          const angle = Math.random() * Math.PI - Math.PI;
          bit.style.left = `${middle}px`;
          bit.style.setProperty('--dx', `${Math.cos(angle) * (22 + Math.random() * 20)}px`);
          bit.style.setProperty('--dy', `${Math.sin(angle) * (16 + Math.random() * 14)}px`);
          setTimeout(() => bit.remove(), 500);
        }, 110);
        intervals.add(debris);
        await pause(BRAWL);
        clearInterval(debris);
        intervals.delete(debris);
        cloud.remove();

        // Knockout: a random winner stays; the loser flies off into the sky, spinning, and twinkles out.
        const guardWins = Math.random() < .5;
        const winner = guardWins ? guard : rival;
        const loser = guardWins ? rival : guard;
        const flyDirection = guardWins ? direction : -direction;
        place(winner, middle - CREW_WIDTH / 2);
        place(loser, middle - CREW_WIDTH / 2);
        winner.el.style.opacity = '1';
        loser.el.style.opacity = '1';
        const flight = Array.from({ length: 13 }, (_, step) => {
          const t = step / 12;
          const x = middle - CREW_WIDTH / 2 + flyDirection * t * width * .35;
          const y = -170 * t - 40 * Math.sin(Math.PI * t);
          return { transform: `translate(${x}px, ${y}px) rotate(${flyDirection * t * 1080}deg) scale(${1 - t * .6})`, opacity: t > .85 ? (1 - t) / .15 : 1 };
        });
        const endX = middle + flyDirection * width * .35;
        await play(loser.el, flight, { duration: 900, easing: 'cubic-bezier(.2, .6, .4, 1)', fill: 'forwards' });
        const twinkle = spawn('fight-twinkle', '✦');
        twinkle.style.left = `${endX - 5}px`;
        setTimeout(() => twinkle.remove(), 600);

        // The winner dusts off its hands and carries on its way.
        winner.angry(false);
        await play(winner.el, [{ transform: `translate(${winner.x}px, 0)` }, { transform: `translate(${winner.x}px, -6px)`, offset: .4 }, { transform: `translate(${winner.x}px, 0)` }], { duration: 300, easing: 'ease-out' });
        await pause(400);
        await move(winner, guardWins ? end : start);
        winner.el.style.opacity = '0';
      } finally {
        // If the guard was knocked out, it waits hidden until its next round.
        guard.angry(false);
        guard.el.getAnimations().forEach(animation => animation.cancel());
        guard.el.style.opacity = '0';
        rival.walk(false);
        rival.el.remove();
      }
    }

    async function run() {
      const guard = walker('A');
      for (let rightward = true; ; rightward = !rightward) {
        await pause(6000 + Math.random() * 6000);
        const width = line.clientWidth;
        const [start, end] = rightward ? [-CREW_WIDTH - 10, width + 10] : [width + 10, -CREW_WIDTH - 10];
        // No brawls while a section is being built: one thing at a time.
        if (Math.random() < FIGHT_CHANCE && !anySceneRunning()) await fight(guard, start, end, width);
        else await patrol(guard, start, end);
      }
    }

    const resume = () => { if (canRun()) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); });
    observer.observe(line);
    document.addEventListener('visibilitychange', resume);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      waiters.forEach(resolve => resolve());
      stage.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      stage.replaceChildren();
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  return <span ref={stageRef} className="patrol-stage" aria-hidden="true" />;
}
