'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RobotSprite, type RobotMood, type RobotPose } from '@/components/robot-sprite';
import { announceNamePainted, isNamePending } from '@/components/robot-crew';

type Point = { x: number; y: number };
type Line = { left: number; top: number; width: number };

class Cancelled extends Error {}

// Paint roller hanging in front of a robot of the given pixel size; color is the paint on the roller.
function Roller({ pixel, height, color }: { pixel: number; height: number; color: string }) {
  const rollerX = 11 * pixel + pixel;
  return (
    <svg className="painter-roller" width={rollerX + 5 * pixel} height={12 * pixel + height} style={{ left: 0, top: 0 }}>
      <line x1={10 * pixel} y1={7.5 * pixel} x2={rollerX + 2 * pixel} y2={12 * pixel} stroke="#8f9bb3" strokeWidth={pixel} />
      <rect x={rollerX} y={12 * pixel} width={4 * pixel} height={height} rx={pixel} fill={color} />
      <rect x={rollerX + 3 * pixel} y={12 * pixel} width={pixel} height={height} fill="#c9d0de" opacity=".5" />
    </svg>
  );
}

// The hero name. It starts blue and a pixel robot walks over the first name with a paint roller, painting it white
// line by line. On every load it then gets carried away and paints the last name white too; an angry supervisor turns
// up, the painter slinks off, and the supervisor repaints the last name blue.
export function PaintedName({ firstName, lastName }: { firstName: string; lastName: string }) {
  const [pose, setPose] = useState<RobotPose>('idle');
  const [mood, setMood] = useState<RobotMood>('normal');
  const [pixel, setPixel] = useState(4);
  const [rollerHeight, setRollerHeight] = useState(0);
  const [supervisor, setSupervisor] = useState(false);
  const [supervisorMood, setSupervisorMood] = useState<RobotMood>('angry');
  const [supervisorPose, setSupervisorPose] = useState<RobotPose>('idle');
  const [scolding, setScolding] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRef = useRef<HTMLSpanElement>(null);
  const painterRef = useRef<HTMLSpanElement>(null);
  const lastRef = useRef<HTMLSpanElement>(null);
  const supervisorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isNamePending() || !titleRef.current || !firstRef.current || !painterRef.current) return;
    const title: HTMLHeadingElement = titleRef.current;
    const first: HTMLSpanElement = firstRef.current;
    const painter: HTMLSpanElement = painterRef.current;
    const lastWord = lastRef.current;
    let cancelled = false;
    let frame = 0;
    let position: Point = { x: 0, y: 0 };

    const place = (point: Point, lift = 0) => { position = point; painter.style.transform = `translate(${point.x}px, ${point.y - lift}px)`; };
    const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)).then(() => { if (cancelled) throw new Cancelled(); });

    // Calls onFrame with progress 0..1 on every animation frame for the given duration.
    function tween(duration: number, onFrame: (t: number, elapsed: number) => void) {
      return new Promise<void>((resolve, reject) => {
        const start = performance.now();
        const step = (now: number) => {
          if (cancelled) return reject(new Cancelled());
          const elapsed = now - start;
          onFrame(Math.min(1, elapsed / duration), elapsed);
          if (elapsed < duration) frame = requestAnimationFrame(step);
          else resolve();
        };
        frame = requestAnimationFrame(step);
      });
    }

    async function paint() {
      // Measure the name: its lines (one on desktop, two on phones) and where the letters' tops sit.
      const style = getComputedStyle(first);
      const fontSize = parseFloat(style.fontSize);
      const size = Math.max(2, Math.round(fontSize / 23));
      const robot = { width: 11 * size, height: 12 * size };
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      context.font = style.font;
      const metrics = context.measureText(firstName);
      const capTop = metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent;
      const box = title.getBoundingClientRect();
      const lines: Line[] = [...first.getClientRects()].map(rect => ({ left: rect.left - box.left, top: rect.top - box.top, width: rect.width }));
      const total = lines.reduce((sum, line) => sum + line.width, 0);
      // The paint edge is the middle of the roller, which hangs in front of the robot.
      const edge = robot.width + 3 * size;
      setPixel(size);
      setRollerHeight(metrics.actualBoundingBoxAscent);
      const at = (line: Line, x: number): Point => ({ x: line.left + x - edge, y: line.top + capTop - robot.height });

      // Walk in from the left of the first line.
      const start = at(lines[0], 0);
      place({ x: start.x - 60, y: start.y });
      await tween(450, t => { painter.style.opacity = String(Math.min(1, t * 3)); place({ x: start.x - 60 + 60 * t, y: start.y }, Math.abs(Math.sin(t * Math.PI * 3)) * size * 1.5); });
      await wait(150);

      const speed = total / Math.min(2200, Math.max(1200, total / 0.45));
      let painted = 0;
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (index > 0) {
          // Hop down to the start of the next line.
          const from = position;
          const to = at(line, 0);
          setPose('jump');
          await tween(460, t => place({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - 40 * 4 * t * (1 - t) }));
          setPose('crouch');
          await wait(120);
        }
        setPose('idle');
        const before = painted;
        await tween(line.width / speed, (t, elapsed) => {
          painted = before + line.width * t;
          first.style.setProperty('--paint', `${painted}px`);
          place(at(line, line.width * t), Math.abs(Math.sin(elapsed / 70)) * size);
        });
      }
      first.style.setProperty('--paint', `${total + 10}px`);

      // Carried away: it hops down to the last name and paints that white too.
      const last = lastRef.current;
      const word = last?.firstChild;
      if (!last || !word) return;
      const range = document.createRange();
      range.selectNodeContents(word);
      const wordBox = range.getBoundingClientRect();
      const lastLine: Line = { left: wordBox.left - box.left, top: wordBox.top - box.top, width: wordBox.width };
      // White left of x, blue right of it: the same edge serves the mistake (moving right) and the fix (moving left).
      const paintLast = (x: number) => {
        last.style.color = 'transparent';
        last.style.setProperty('-webkit-background-clip', 'text');
        last.style.backgroundClip = 'text';
        last.style.backgroundImage = `linear-gradient(90deg, #f1f2f4 ${x}px, var(--accent) ${x}px)`;
      };
      setMood('happy');
      setPose('idle');
      // Walks back along the top of the letters it just painted until it is above the last name, then drops down onto it.
      const from = position;
      const to = at(lastLine, 0);
      await tween(Math.max(300, Math.abs(from.x - to.x) / 0.6), (t, elapsed) => place({ x: from.x + (to.x - from.x) * t, y: from.y }, Math.abs(Math.sin(elapsed / 60)) * size));
      setPose('crouch');
      await wait(100);
      setPose('jump');
      const above = position;
      await tween(420, t => place({ x: above.x, y: above.y + (to.y - above.y) * t - 18 * 4 * t * (1 - t) }));
      setPose('crouch');
      await wait(120);
      setPose('idle');
      await tween(lastLine.width / speed, (t, elapsed) => {
        paintLast(lastLine.width * t);
        place(at(lastLine, lastLine.width * t), Math.abs(Math.sin(elapsed / 70)) * size);
      });
      paintLast(lastLine.width + 10);
      await wait(300);

      // The supervisor storms in from the right, angry. It faces left, so its roller (and paint edge) is on its left side.
      setSupervisor(true);
      setSupervisorMood('angry');
      setSupervisorPose('idle');
      await wait(40);
      const boss = supervisorRef.current;
      if (!boss) return;
      const bossAt = (edgeX: number): Point => ({ x: lastLine.left + edgeX + 3 * size, y: lastLine.top + capTop - robot.height });
      const placeBoss = (point: Point, lift = 0) => { boss.style.transform = `translate(${point.x}px, ${point.y - lift}px)`; };
      const bossSpot = bossAt(lastLine.width + 24);
      await tween(450, t => { boss.style.opacity = String(Math.min(1, t * 3)); placeBoss({ x: bossSpot.x + 90 * (1 - t), y: bossSpot.y }, Math.abs(Math.sin(t * Math.PI * 3)) * size * 1.5); });
      // Scolding: "!" and an angry stomp; the painter cowers, then slinks off to the left.
      setScolding(true);
      setMood('normal');
      setPose('crouch');
      await tween(320, t => placeBoss(bossSpot, Math.sin(t * Math.PI) * 4 * size));
      await wait(450);
      const slink = position;
      await tween(500, t => { painter.style.opacity = String(1 - t); place({ x: slink.x - 70 * t, y: slink.y }); });
      setScolding(false);

      // Repaints the last name blue, right to left.
      await tween(250, t => placeBoss({ x: bossSpot.x + (bossAt(lastLine.width).x - bossSpot.x) * t, y: bossSpot.y }));
      await tween(lastLine.width / speed, (t, elapsed) => {
        const edgeX = lastLine.width * (1 - t);
        paintLast(edgeX);
        placeBoss(bossAt(edgeX), Math.abs(Math.sin(elapsed / 70)) * size);
      });
      for (const property of ['color', 'background-image', 'background-clip', '-webkit-background-clip']) last.style.removeProperty(property);

      // Satisfied: a happy double hop, then off to the right.
      setSupervisorMood('happy');
      setSupervisorPose('jump');
      const done = bossAt(0);
      for (let hop = 0; hop < 2; hop++) await tween(300, t => placeBoss(done, Math.sin(t * Math.PI) * 5 * size));
      setSupervisorPose('idle');
      await wait(250);
      await tween(700, t => { boss.style.opacity = String(1 - Math.max(0, t - .6) / .4); placeBoss({ x: done.x + (lastLine.width + 120) * t, y: done.y }, Math.abs(Math.sin(t * Math.PI * 5)) * size * 1.5); });
      setSupervisor(false);
    }

    // Starts once the name is on screen; whatever happens, the name ends up painted and the list robot is released.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      wait(350).then(paint).catch(error => { if (!(error instanceof Cancelled)) console.error(error); }).finally(() => { if (!cancelled) announceNamePainted(); });
    });
    observer.observe(title);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      // Never leave the last name half white if the scene is interrupted.
      if (lastWord) for (const property of ['color', 'background-image', 'background-clip', '-webkit-background-clip']) lastWord.style.removeProperty(property);
    };
  }, [firstName]);

  const robotSize = { width: 11 * pixel, height: 12 * pixel } as CSSProperties;
  return (
    <h1 id="hero-title" ref={titleRef} className="painted-name">
      <span ref={firstRef} className="name-first">{firstName}</span><br />
      <span ref={lastRef} className="text-accent">{lastName}<span className="name-period">.</span></span>
      <span ref={painterRef} className="painter" aria-hidden="true" style={robotSize}>
        <RobotSprite pose={pose} mood={mood} />
        {rollerHeight > 0 && <Roller pixel={pixel} height={rollerHeight} color="#f1f2f4" />}
      </span>
      {supervisor && (
        <span ref={supervisorRef} className="painter supervisor" aria-hidden="true" style={robotSize}>
          {scolding && <span className="supervisor-alert font-mono">!</span>}
          <span className="supervisor-flip">
            <RobotSprite pose={supervisorPose} mood={supervisorMood} />
            {rollerHeight > 0 && <Roller pixel={pixel} height={rollerHeight} color="#6994ff" />}
          </span>
        </span>
      )}
    </h1>
  );
}
