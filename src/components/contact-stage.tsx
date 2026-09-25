'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RobotSprite, pixelMarkup, robotMarkup, type RobotMood, type RobotPose } from '@/components/robot-sprite';

type Stage = 'blank' | 'playing' | 'done';

// Robots on this stage are drawn with 3px pixels (the big robot map is 11×12).
const BOSS_WIDTH = 33;
const BOSS_HEIGHT = 36;
const WALK_SPEED = 60; // px per second: an unhurried stroll
const BENCH = ['WWWWWWWWWWWW', 'wwwwwwwwwwww', '.K........K.', 'WWWWWWWWWWWW', 'wwwwwwwwwwww', '.K........K.', '.K........K.'];
const BENCH_COLORS = { W: '#7a5c46', w: '#5a4334', K: '#2c313b' };

class Cancelled extends Error {}

const finishBuild = () => { delete document.documentElement.dataset.build; };

// The contact section is built by the robots in front of the visitor. The boot script marks the page before the first
// paint (html[data-build="pending"]), so the section starts as a blank off-white canvas with only a robot holding a
// "skip" sign; without JS or with reduced motion it is simply finished. The content is in the page all along (only
// hidden from sight), so screen readers and search engines get it right away. The show starts once the section's last
// line is on screen and pauses while it is off screen; clicking the sign at any moment jumps to the finished section.
export function ContactStage({ skipLabel, shout, children }: { skipLabel: string; shout: string; children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const actorsRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>('blank');

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || document.documentElement.dataset.build !== 'pending') return;
    const footer = section.querySelector('.section-footer') ?? section;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setStage(current => current === 'blank' ? 'playing' : current);
    }, { threshold: .6 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (stage === 'done') finishBuild();
    const section = sectionRef.current;
    const layer = actorsRef.current;
    if (stage !== 'playing' || !section || !layer) return;
    const stageEl: HTMLElement = section;
    const actors: HTMLDivElement = layer;
    let cancelled = false;
    let inView = true;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    async function pause(ms: number) {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      while ((!inView || document.hidden) && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }
    const resume = () => { if (inView && !document.hidden) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };

    // Frame-by-frame tween that also holds while the section is off screen.
    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
      let elapsed = 0;
      let last = performance.now();
      const step = (now: number) => {
        if (cancelled) return reject(new Cancelled());
        if (inView && !document.hidden) elapsed += now - last;
        last = now;
        const t = Math.min(1, elapsed / Math.max(duration, 1));
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

    // Positions are in the section's box; the ground is the line the section's footer will have.
    const boxOf = (element: Element) => {
      const origin = stageEl.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height };
    };
    const groundY = () => { const footer = stageEl.querySelector('.section-footer'); return footer ? boxOf(footer).y : stageEl.clientHeight; };

    // A robot actor: a positioned wrapper with the sprite inside, and helpers to redraw, move and hop it.
    function robot(className: string) {
      const element = document.createElement('span');
      element.className = `actor ${className}`;
      const body = document.createElement('span');
      body.className = 'actor-body';
      element.appendChild(body);
      actors.appendChild(element);
      let x = 0;
      let y = 0;
      const place = (nextX: number, nextY: number) => { x = nextX; y = nextY; element.style.transform = `translate(${x}px, ${y}px)`; };
      const draw = (pose: RobotPose, mood: RobotMood, look?: 'left' | 'right') => { body.innerHTML = robotMarkup(pose, mood, look); };
      return {
        element, draw, place,
        get x() { return x; },
        get y() { return y; },
        // Walks along the ground with a small bob.
        walk: async (toX: number) => {
          const fromX = x;
          const baseY = y;
          await tween(Math.abs(toX - fromX) / WALK_SPEED * 1000, t => {
            place(fromX + (toX - fromX) * t, baseY - Math.abs(Math.sin(t * Math.abs(toX - fromX) / 9)) * 2);
          });
          place(toX, baseY);
        },
        hop: async (height: number, duration: number) => {
          const baseY = y;
          await tween(duration, t => place(x, baseY - Math.sin(Math.PI * t) * height));
          place(x, baseY);
        },
      };
    }

    // Something shown over an actor's head for a while: a thought, a mark or a shout.
    function over(actor: HTMLElement, className: string, html: string) {
      const element = document.createElement('span');
      element.className = className;
      element.innerHTML = html;
      actor.appendChild(element);
      return element;
    }
    async function fadeOut(element: HTMLElement) {
      element.classList.add('stage-out');
      await pause(250);
      element.remove();
    }
    function puff(actor: HTMLElement, side: 'left' | 'right') {
      const element = document.createElement('span');
      element.className = `steam steam-${side}`;
      element.addEventListener('animationend', () => element.remove());
      actor.appendChild(element);
    }

    // Scene 1: the boss comes for its bench, finds a blank screen and calls the crew.
    async function bossArrives() {
      const boss = robot('boss-actor');
      const benchSpot = stageEl.querySelector('.ending-boss');
      const target = benchSpot ? boxOf(benchSpot).x : stageEl.clientWidth * .1;
      boss.draw('idle', 'normal', 'right');
      boss.place(-BOSS_WIDTH - 20, groundY() - BOSS_HEIGHT);
      await pause(500);
      await boss.walk(target);
      boss.draw('idle', 'normal');
      await pause(500);

      // It pictures its bench.
      const thought = over(boss.element, 'thought', `<span class="thought-trail"></span>${pixelMarkup(BENCH, BENCH_COLORS)}`);
      await pause(1800);
      await fadeOut(thought);
      await pause(300);

      // No bench anywhere: it looks one way, then the other.
      const question = over(boss.element, 'stage-mark', '?');
      for (const look of ['left', 'right', 'left', 'right'] as const) {
        boss.draw('idle', 'normal', look);
        await pause(look === 'left' ? 650 : 550);
      }
      boss.draw('idle', 'normal');
      await pause(500);

      // Then it notices the whole screen is blank.
      question.remove();
      const surprise = over(boss.element, 'stage-mark stage-mark-alert', '!');
      boss.draw('blink', 'normal');
      await boss.hop(8, 260);
      boss.draw('idle', 'normal');
      await pause(900);
      await fadeOut(surprise);

      // It gets angry: red eyes, steam out of its head, two stomping hops and a shout for the crew.
      boss.draw('idle', 'angry');
      await pause(500);
      for (let index = 0; index < 4; index++) {
        puff(boss.element, index % 2 ? 'right' : 'left');
        await pause(280);
      }
      boss.draw('jump', 'angry');
      const call = over(boss.element, 'stage-shout font-mono', shout);
      for (let jump = 0; jump < 2; jump++) await boss.hop(12, 320);
      await pause(1600);
      await fadeOut(call);
      boss.draw('idle', 'angry');
    }

    async function run() {
      await pause(400);
      await bossArrives();
      // The next scenes (the crew, the paint, the lines, the words and the park) come next.
    }

    const viewObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }, { threshold: .3 });
    viewObserver.observe(stageEl);
    document.addEventListener('visibilitychange', resume);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      waiters.forEach(resolve => resolve());
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', resume);
      actors.replaceChildren();
    };
  }, [stage, shout]);

  return (
    <section ref={sectionRef} id="contato" aria-labelledby="contact-title" className="contact-section" data-stage={stage}>
      <span className="contact-canvas" aria-hidden="true" />
      <div className="contact-built">{children}</div>
      <div ref={actorsRef} className="stage-actors" aria-hidden="true" />
      {stage !== 'done' && (
        <button type="button" className="skip-robot" onClick={() => setStage('done')}>
          <span className="robot-sign skip-sign font-mono">{skipLabel}</span>
          <RobotSprite pose="carry" mood="normal" />
        </button>
      )}
    </section>
  );
}
