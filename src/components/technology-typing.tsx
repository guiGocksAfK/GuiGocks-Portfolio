'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ROBOT_HEIGHT, ROBOT_WIDTH, RobotSprite, type RobotMood, type RobotPose } from '@/components/robot-sprite';
import { whenNamePainted } from '@/components/robot-crew';

const VISIBLE_LINES = 6;
const HOP_DURATION = 520;
const TOSS_DURATION = 460;
const REST = 4000;
// Distance from a line's top to the top of its letters, where the robot's feet land.
const WORD_TOP = 15;
// Stomp animations are timed from the landing, so this cancels part of the squash delay.
const STOMP_DELAY = '-210ms';

type LineKind = 'place' | 'stomp';
type Line = { id: number; word: string; squashed: string | null; kind: LineKind };
type Point = { x: number; y: number };

class Cancelled extends Error {}

const lineDelay = (kind: LineKind) => (kind === 'stomp' ? STOMP_DELAY : '0ms');

// A pixel robot runs the technology list as a little story: it carries the words in and tosses them into place,
// gets angry at them, stomps them top to bottom (each stomp swaps the word), celebrates, rests and starts again.
export function TechnologyTyping({ words }: { words: readonly string[] }) {
  const [lines, setLines] = useState<(Line | undefined)[]>([]);
  const [pose, setPose] = useState<RobotPose>('idle');
  const [mood, setMood] = useState<RobotMood>('normal');
  const [cargo, setCargo] = useState<string[]>([]);
  const [alert, setAlert] = useState(false);
  const markRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flyersRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!robotRef.current || !bodyRef.current || !stageRef.current || !flyersRef.current || words.length === 0) return;
    const robot: HTMLDivElement = robotRef.current;
    const body: HTMLDivElement = bodyRef.current;
    const stage: HTMLDivElement = stageRef.current;
    const flyers: HTMLDivElement = flyersRef.current;

    let current: (Line | undefined)[] = [];
    let nextWord = 0;
    let nextId = 0;
    let inView = false;
    let cancelled = false;
    let provoked = false;
    let position: Point = { x: 0, y: 0 };
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const canRun = () => inView && !document.hidden && !preference.matches;
    const render = () => setLines(current.map(line => line && { ...line }));
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
      const visible = new Set(current.map(line => line?.word));
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

    // Projectile arc: x moves at a constant speed while y follows a parabola above both points.
    function arc(start: Point, target: Point, peak: number, extra: (t: number) => string = () => '') {
      return Array.from({ length: 13 }, (_, step) => {
        const t = step / 12;
        const x = start.x + (target.x - start.x) * t;
        const y = start.y + (target.y - start.y) * t - peak * 4 * t * (1 - t);
        return { transform: `translate(${x}px, ${y}px)${extra(t)}` };
      });
    }

    function squashBody() {
      body.animate([{ transform: 'scale(1.3, .7)' }, { transform: 'scale(.95, 1.08)', offset: .6 }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    }

    function lift(height: number, duration: number, delay = 0) {
      const { x, y } = position;
      return robot.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x}px, ${y - height}px)`, offset: .45 }, { transform: `translate(${x}px, ${y}px)` }], { duration, delay, easing: 'ease-out' });
    }

    async function hop(target: Point) {
      setPose('crouch');
      await pause(110);
      setPose('jump');
      await animate(robot, arc(position, target, 26 + Math.abs(target.y - position.y) * 0.35), { duration: HOP_DURATION, easing: 'linear' });
      place(target);
      setPose('crouch');
      squashBody();
    }

    // Idle with an occasional blink; a click on the robot cuts the rest short.
    async function rest(ms: number) {
      setPose('idle');
      const blinkAt = ms * (0.35 + Math.random() * 0.3);
      for (let elapsed = 0, blinked = false; elapsed < ms && !provoked; elapsed += 100) {
        if (!blinked && elapsed >= blinkAt) {
          blinked = true;
          setPose('blink');
          await pause(130);
          setPose('idle');
        }
        await pause(100);
      }
    }

    // Intro: walks in with all the words stacked on its head and tosses them into their lines, top to bottom.
    async function carryIn() {
      const stack = Array.from({ length: VISIBLE_LINES }, takeWord);
      current = Array.from({ length: VISIBLE_LINES }, () => undefined);
      render();
      setCargo(stack);
      setPose('carry');
      const target = home();
      const start = { x: stage.clientWidth + 30, y: target.y };
      place(target);
      await animate(robot, Array.from({ length: 13 }, (_, step) => {
        const t = step / 12;
        const bob = -Math.abs(Math.sin(t * Math.PI * 3)) * 5;
        return { transform: `translate(${start.x + (target.x - start.x) * t}px, ${target.y + bob}px)`, opacity: Math.min(1, t * 4) };
      }), { duration: 850, easing: 'linear' });
      robot.style.opacity = '1';
      await pause(250);

      for (let index = 0; index < stack.length; index++) {
        setPose('crouch');
        await pause(70);
        setPose('carry');
        toss(stack[index], index);
        setCargo(stack.slice(index + 1));
        await pause(300);
      }
      setPose('idle');
      await pause(TOSS_DURATION + 300);
    }

    // Launches a word from the top of the stack along an arc into its line; it lands with a squash.
    function toss(word: string, index: number) {
      const cargoWord = robot.querySelector<HTMLElement>('.robot-cargo span');
      const stageBox = stage.getBoundingClientRect();
      const line = lineElement(index);
      const flyer = document.createElement('span');
      flyer.className = 'tech-flyer';
      flyer.textContent = word;
      flyers.appendChild(flyer);
      const from = cargoWord?.getBoundingClientRect();
      const start = from
        ? { x: from.left - stageBox.left, y: from.top - stageBox.top - (line.offsetHeight - from.height) / 2 }
        : { x: position.x, y: position.y - 30 };
      const target = { x: line.offsetLeft, y: line.offsetTop };
      const flight = flyer.animate(arc(start, target, 40 + Math.abs(target.y - start.y) * 0.25, t => ` rotate(${(1 - t) * -12}deg)`), { duration: TOSS_DURATION, easing: 'linear', fill: 'forwards' });
      flight.finished.then(() => {
        flyer.remove();
        if (cancelled) return;
        current[index] = { id: nextId++, word, squashed: null, kind: 'place' };
        render();
      }, () => flyer.remove());
    }

    async function getAngry() {
      provoked = false;
      setPose('idle');
      setMood('angry');
      setAlert(true);
      await animate(body, [0, -2, 2, -2, 2, -1, 1, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 420, easing: 'linear' });
      await pause(380);
      setAlert(false);
    }

    async function stomp(index: number) {
      await hop(onWord(index));
      const old = current[index];
      current[index] = { id: nextId++, word: takeWord(), squashed: old?.word ?? null, kind: 'stomp' };
      render();
      // The new word grows out of the line and lifts the robot as it peaks.
      lift(8, 380, 170);
      await pause(160);
      setPose('idle');
    }

    async function celebrate() {
      setMood('happy');
      setPose('jump');
      for (let jump = 0; jump < 2; jump++) {
        const animation = lift(10, 300);
        try { await animation.finished; } catch { throw new Cancelled(); }
      }
      setPose('idle');
      await pause(350);
      setMood('normal');
    }

    async function run() {
      // The painter robot works on the name first.
      await whenNamePainted();
      await pause(200);
      await carryIn();
      await rest(1400);
      for (;;) {
        await getAngry();
        for (let index = 0; index < VISIBLE_LINES; index++) {
          await stomp(index);
          await pause(240);
        }
        await celebrate();
        await hop(home());
        await pause(140);
        await rest(REST);
      }
    }

    const resume = () => { if (canRun()) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const provoke = () => { provoked = true; };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); });
    if (markRef.current) observer.observe(markRef.current);
    document.addEventListener('visibilitychange', resume);
    preference.addEventListener('change', resume);
    robot.addEventListener('click', provoke);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      waiters.forEach(resolve => resolve());
      [robot, body, ...flyers.children].forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
      flyers.replaceChildren();
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      preference.removeEventListener('change', resume);
      robot.removeEventListener('click', provoke);
    };
  }, [words]);

  return (
    <div className="technical-mark" ref={markRef}>
      <span className="sr-only">{words.join(', ')}</span>
      <div className="braces font-mono" aria-hidden="true">
        <span className="brace">{'{'}</span>
        <div className="tech-stage animated-tech" ref={stageRef}>
          <ul className="tech-list">
            {Array.from({ length: VISIBLE_LINES }, (_, index) => {
              const line = lines[index];
              const comma = index < VISIBLE_LINES - 1 && <span className="tech-comma">,</span>;
              return (
                <li key={index} style={{ '--d': line ? lineDelay(line.kind) : '0ms' } as CSSProperties}>
                  {line && <>
                    <span key={`flash-${line.id}`} className="line-flash" />
                    {line.squashed && <span key={`old-${line.id}`} className="tech-word tech-squash">{line.squashed}{comma}</span>}
                    <span key={line.id} className={`tech-word tech-${line.kind === 'stomp' ? 'grow' : line.kind}`}>{line.word}{comma}</span>
                  </>}
                </li>
              );
            })}
          </ul>
          <div className="tech-flyers" ref={flyersRef} />
          <div className="robot" ref={robotRef}>
            {cargo.length > 0 && <div className="robot-cargo">{cargo.map(word => <span key={word}>{word}</span>)}</div>}
            {alert && <span className="robot-alert">!</span>}
            <div className="robot-body" ref={bodyRef}><RobotSprite pose={pose} mood={mood} /></div>
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
