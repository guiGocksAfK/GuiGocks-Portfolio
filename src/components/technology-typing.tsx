'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ROBOT_HEIGHT, ROBOT_WIDTH, RobotSprite, type RobotPose } from '@/components/robot-sprite';

const VISIBLE_LINES = 6;
const CASCADE_STEP = 110;
const HOP_DURATION = 520;
// Distance from a line's top to the top of its letters, where the robot's feet land.
const WORD_TOP = 12;
// Swap animations are timed from the stomp, so this cancels the old word's cascade delay.
const STOMP_DELAY = '-210ms';

type Line = { id: number; word: string; squashed: string | null; stomped: boolean };
type Point = { x: number; y: number };

class Cancelled extends Error {}

// Technologies fall into the braces once; after that a pixel robot hops between them, and each stomp swaps the word it lands on.
export function TechnologyTyping({ words }: { words: readonly string[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [pose, setPose] = useState<RobotPose>('idle');
  const markRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!robotRef.current || !bodyRef.current || !stageRef.current || words.length === 0) return;
    const robot: HTMLDivElement = robotRef.current;
    const body: HTMLDivElement = bodyRef.current;
    const stage: HTMLDivElement = stageRef.current;

    let current: Line[] = [];
    let nextWord = 0;
    let nextId = 0;
    let inView = false;
    let cancelled = false;
    let position: Point = { x: 0, y: 0 };
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const canRun = () => inView && !document.hidden && !preference.matches;
    const render = () => setLines(current.map(line => ({ ...line })));
    const place = (point: Point) => { position = point; robot.style.transform = `translate(${point.x}px, ${point.y}px)`; };

    function sleep(ms: number) {
      return new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
    }

    // Waits the given time, then holds while the block is off-screen or the tab is hidden.
    async function pause(ms: number) {
      await sleep(ms);
      while (!canRun() && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }

    // Next technology in order, skipping any that are already on screen.
    function takeWord() {
      const visible = new Set(current.map(line => line.word));
      for (let tries = 0; visible.has(words[nextWord]) && tries < words.length; tries++) nextWord = (nextWord + 1) % words.length;
      const word = words[nextWord];
      nextWord = (nextWord + 1) % words.length;
      return word;
    }

    const lineElement = (index: number) => stage.querySelectorAll<HTMLLIElement>('.tech-list li')[index];
    const wordWidth = (index: number) => lineElement(index)?.querySelector<HTMLElement>('.tech-word:last-child')?.offsetWidth ?? 40;
    const home = (): Point => {
      const last = lineElement(VISIBLE_LINES - 1);
      return { x: stage.clientWidth - ROBOT_WIDTH - 4, y: last.offsetTop + last.offsetHeight - ROBOT_HEIGHT };
    };
    const onWord = (index: number): Point => {
      const line = lineElement(index);
      return { x: line.offsetLeft + Math.max(0, wordWidth(index) / 2 - ROBOT_WIDTH / 2), y: line.offsetTop + WORD_TOP - ROBOT_HEIGHT };
    };

    async function animate(element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = element.animate(keyframes, options);
      try { await animation.finished; } catch { throw new Cancelled(); }
      if (cancelled) throw new Cancelled();
    }

    function squashBody() {
      body.animate([{ transform: 'scale(1.3, .7)' }, { transform: 'scale(.95, 1.08)', offset: .6 }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    }

    // Projectile arc: x moves at a constant speed while y follows a parabola above both points.
    async function hop(target: Point) {
      setPose('crouch');
      await pause(110);
      setPose('jump');
      const start = position;
      const peak = 26 + Math.abs(target.y - start.y) * 0.35;
      const keyframes = Array.from({ length: 13 }, (_, step) => {
        const t = step / 12;
        const x = start.x + (target.x - start.x) * t;
        const y = start.y + (target.y - start.y) * t - peak * 4 * t * (1 - t);
        return { transform: `translate(${x}px, ${y}px)` };
      });
      await animate(robot, keyframes, { duration: HOP_DURATION, easing: 'linear' });
      place(target);
      setPose('crouch');
      squashBody();
    }

    async function blinkWhileIdle(ms: number) {
      setPose('idle');
      const blinkAt = ms * (0.35 + Math.random() * 0.3);
      await pause(blinkAt);
      setPose('blink');
      await pause(130);
      setPose('idle');
      await pause(Math.max(0, ms - blinkAt - 130));
    }

    async function stomp(index: number) {
      await hop(onWord(index));
      current[index] = { id: nextId++, word: takeWord(), squashed: current[index].word, stomped: true };
      render();
      // The new word grows out of the line and lifts the robot as it peaks.
      const { x, y } = position;
      robot.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x}px, ${y - 8}px)`, offset: .45 }, { transform: `translate(${x}px, ${y}px)` }], { duration: 380, delay: 170, easing: 'ease-out' });
      await pause(160);
      setPose('idle');
    }

    async function run() {
      current = Array.from({ length: Math.min(VISIBLE_LINES, words.length) }, () => ({ id: nextId++, word: takeWord(), squashed: null, stomped: false }));
      render();
      await pause(CASCADE_STEP * VISIBLE_LINES + 700);

      // Robot drops in at its spot beside the list.
      const start = home();
      place(start);
      setPose('jump');
      await animate(robot, [{ transform: `translate(${start.x}px, ${start.y - 70}px)`, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: `translate(${start.x}px, ${start.y}px)`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.55, 0, 1, .45)' });
      robot.style.opacity = '1';
      setPose('crouch');
      squashBody();
      await pause(140);

      let last = -1;
      for (;;) {
        await blinkWhileIdle(1600);
        // A short run of stomps, then back home for a breather.
        const stomps = 2 + Math.floor(Math.random() * 2);
        for (let count = 0; count < stomps; count++) {
          let index = Math.floor(Math.random() * (VISIBLE_LINES - 1));
          if (last !== -1 && index >= last) index += 1;
          last = index;
          await stomp(index);
          await blinkWhileIdle(900);
        }
        await hop(home());
        await pause(140);
      }
    }

    const resume = () => { if (canRun()) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); });
    if (markRef.current) observer.observe(markRef.current);
    document.addEventListener('visibilitychange', resume);
    preference.addEventListener('change', resume);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      waiters.forEach(resolve => resolve());
      robot.getAnimations().forEach(animation => animation.cancel());
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      preference.removeEventListener('change', resume);
    };
  }, [words]);

  return (
    <div className="technical-mark" ref={markRef}>
      <span className="sr-only">{words.join(', ')}</span>
      <div className="braces font-mono" aria-hidden="true">
        <span className="brace">{'{'}</span>
        <div className="tech-stage animated-tech" ref={stageRef}>
          <ul className="tech-list">
            {lines.map((line, index) => {
              const comma = index < lines.length - 1 && <span className="tech-comma">,</span>;
              return (
                <li key={index} style={{ '--d': line.stomped ? STOMP_DELAY : `${index * CASCADE_STEP}ms` } as CSSProperties}>
                  <span key={`flash-${line.id}`} className="line-flash" />
                  {line.squashed && <span key={`old-${line.id}`} className="tech-word tech-squash">{line.squashed}{comma}</span>}
                  <span key={line.id} className={`tech-word ${line.stomped ? 'tech-grow' : 'tech-drop'}`}>{line.word}{comma}</span>
                </li>
              );
            })}
          </ul>
          <div className="robot" ref={robotRef}>
            <div className="robot-body" ref={bodyRef}><RobotSprite pose={pose} /></div>
          </div>
        </div>
        <ul className="tech-list static-tech">
          {words.slice(0, VISIBLE_LINES).map((word, index) => <li key={word}>{word}{index < VISIBLE_LINES - 1 && <span className="tech-comma">,</span>}</li>)}
        </ul>
        <span className="brace">{'}'}</span>
      </div>
    </div>
  );
}
