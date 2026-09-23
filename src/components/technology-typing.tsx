'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CREW_HEIGHT, CREW_WIDTH, ROBOT_HEIGHT, ROBOT_WIDTH, RobotSprite, crewMarkup, type RobotMood, type RobotPose } from '@/components/robot-sprite';
import { whenNamePainted } from '@/components/robot-crew';

const HOP_DURATION = 520;
const TOSS_DURATION = 460;
const REST = 4000;
// Distance from a line's top to the top of its letters, where the robot's feet land.
const WORD_TOP = 15;
// Distance from a line's top to its baseline, where the crew's feet stand.
const CREW_FEET = 26;
// Stomp animations are timed from the landing, so this cancels part of the squash delay.
const STOMP_DELAY = '-210ms';

export type TechnologyGroup = { label: string; items: readonly string[] };
// One line of a group: the "// label" comment on top, then its technologies.
type Slot = { text: string; comment: boolean; comma: boolean };
type LineKind = 'place' | 'stomp';
// slot is null when a stomp left the line empty (the next group is shorter).
type Line = { id: number; slot: Slot | null; squashed: Slot | null; kind: LineKind };
type Point = { x: number; y: number };

class Cancelled extends Error {}

const lineDelay = (kind: LineKind) => (kind === 'stomp' ? STOMP_DELAY : '0ms');
const lineCount = (groups: readonly TechnologyGroup[]) => 1 + Math.max(0, ...groups.map(group => group.items.length));

function slotsFor(group: TechnologyGroup, lines: number): (Slot | null)[] {
  const slots: Slot[] = [{ text: `// ${group.label}`, comment: true, comma: false }, ...group.items.map((text, index) => ({ text, comment: false, comma: index < group.items.length - 1 }))];
  return Array.from({ length: lines }, (_, index) => slots[index] ?? null);
}

function SlotText({ slot }: { slot: Slot }) {
  return <>{slot.text}{slot.comma && <span className="tech-comma">,</span>}</>;
}

// A pixel robot (the boss) shows the technologies one group at a time: it carries the first group in and tosses each line into place.
// Then it gets angry and stomps the group label; a hard-hat crew hauls the old words away and delivers the next group's stack,
// which the boss tosses in, celebrates, rests and starts again.
export function TechnologyTyping({ groups }: { groups: readonly TechnologyGroup[] }) {
  const lineTotal = lineCount(groups);
  const [lines, setLines] = useState<(Line | undefined)[]>([]);
  const [pose, setPose] = useState<RobotPose>('idle');
  const [mood, setMood] = useState<RobotMood>('normal');
  const [cargo, setCargo] = useState<Slot[]>([]);
  const [alert, setAlert] = useState(false);
  const markRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flyersRef = useRef<HTMLDivElement>(null);
  const crewRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!robotRef.current || !bodyRef.current || !stageRef.current || !flyersRef.current || !crewRef.current || groups.length === 0) return;
    const robot: HTMLDivElement = robotRef.current;
    const body: HTMLDivElement = bodyRef.current;
    const stage: HTMLDivElement = stageRef.current;
    const flyers: HTMLDivElement = flyersRef.current;
    const crewLayer: HTMLDivElement = crewRef.current;
    const total = lineCount(groups);

    let current: (Line | undefined)[] = [];
    let groupIndex = 0;
    let nextId = 0;
    let inView = false;
    let cancelled = false;
    let provoked = false;
    let position: Point = { x: 0, y: 0 };
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const intervals = new Set<ReturnType<typeof setInterval>>();

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

    const lineElement = (index: number) => stage.querySelectorAll<HTMLLIElement>('.tech-list li')[index];
    const wordWidth = (index: number) => lineElement(index)?.querySelector<HTMLElement>('.tech-word:last-child')?.offsetWidth ?? 40;
    const home = (): Point => {
      const last = lineElement(total - 1);
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

    // Intro: walks in with the first group stacked on its head and tosses each line into place, top to bottom.
    async function carryIn() {
      const stack = slotsFor(groups[0], total).filter((slot): slot is Slot => slot !== null);
      current = Array.from({ length: total }, () => undefined);
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
      await tossAll(stack);
    }

    // Tosses the carried lines into place one by one, top to bottom.
    async function tossAll(stack: Slot[]) {
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

    // Launches a line from the top of the stack along an arc into its place; it lands with a squash.
    function toss(slot: Slot, index: number) {
      const cargoWord = robot.querySelector<HTMLElement>('.robot-cargo span');
      const stageBox = stage.getBoundingClientRect();
      const line = lineElement(index);
      const flyer = document.createElement('span');
      flyer.className = `tech-flyer${slot.comment ? ' tech-comment' : ''}`;
      flyer.textContent = slot.text;
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
        current[index] = { id: nextId++, slot, squashed: null, kind: 'place' };
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

    // The boss's order: a short hop in place and a hard stomp that makes the whole list shake.
    async function stompFloor() {
      setPose('crouch');
      await pause(90);
      setPose('jump');
      lift(10, 220);
      await pause(200);
      setPose('crouch');
      squashBody();
      stage.querySelector('.tech-list')?.animate([0, 3, -2, 1, 0].map(y => ({ transform: `translateY(${y}px)` })), { duration: 260, easing: 'ease-out' });
      await pause(220);
      setPose('idle');
    }

    // Long hop onto a line that swaps its word. Not used by the current story; kept for an upcoming scene.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async function stomp(index: number, next: Slot | null) {
      await hop(onWord(index));
      current[index] = { id: nextId++, slot: next, squashed: current[index]?.slot ?? null, kind: 'stomp' };
      render();
      // The new line grows out of the floor and lifts the robot as it peaks.
      if (next) lift(8, 380, 170);
      await pause(160);
      setPose('idle');
    }

    // Crew members are plain DOM nodes in their own layer; their legs alternate while they run.
    function spawnCrew(at: Point) {
      const member = document.createElement('div');
      member.className = 'crew';
      member.style.transform = `translate(${at.x}px, ${at.y}px)`;
      const sprite = document.createElement('div');
      sprite.className = 'crew-sprite';
      sprite.innerHTML = crewMarkup(false, 0);
      member.appendChild(sprite);
      crewLayer.appendChild(member);
      let step = 0;
      let carrying = false;
      let running = false;
      const legs = setInterval(() => { if (running) sprite.innerHTML = crewMarkup(carrying, ++step); }, 110);
      intervals.add(legs);
      return {
        member,
        run: (value: boolean) => { running = value; },
        carry: (value: boolean) => { carrying = value; sprite.innerHTML = crewMarkup(carrying, step); },
        // Puts a label or a stack above the head, centred.
        load: (element: HTMLElement) => { member.appendChild(element); element.style.left = `${CREW_WIDTH / 2 - element.offsetWidth / 2}px`; },
        remove: () => { clearInterval(legs); intervals.delete(legs); member.remove(); },
      };
    }

    // A crew member runs in along a line, lifts its word over its head and runs off with it.
    async function fetchWord(index: number, delay: number) {
      await pause(delay);
      const line = lineElement(index);
      const slot = current[index]?.slot;
      if (!slot) return;
      const wordLeft = line.offsetLeft;
      const standX = wordLeft + wordWidth(index) + 4;
      const y = line.offsetTop + CREW_FEET - CREW_HEIGHT;
      const exitX = stage.clientWidth + 40;
      const crew = spawnCrew({ x: exitX, y });
      try {
        crew.run(true);
        await animate(crew.member, [{ transform: `translate(${exitX}px, ${y}px)` }, { transform: `translate(${standX}px, ${y}px)` }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
        crew.run(false);
        crew.carry(true);
        // Take the word out of the line and animate it from where it was up onto the head.
        current[index] = undefined;
        render();
        const load = document.createElement('span');
        load.className = `crew-load${slot.comment ? ' tech-comment' : ''}`;
        load.textContent = slot.text;
        crew.load(load);
        const stageBox = stage.getBoundingClientRect();
        const loadBox = load.getBoundingClientRect();
        const dx = wordLeft - (loadBox.left - stageBox.left);
        const dy = line.offsetTop + (line.offsetHeight - loadBox.height) / 2 - (loadBox.top - stageBox.top);
        await animate(load, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
        crew.run(true);
        await animate(crew.member, [{ transform: `translate(${standX}px, ${y}px)` }, { transform: `translate(${exitX + 40}px, ${y}px)` }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      } finally {
        crew.remove();
      }
    }

    // A crew member brings the next group's stack and hands it to the boss.
    async function deliver(stack: Slot[]) {
      const y = position.y + ROBOT_HEIGHT - CREW_HEIGHT;
      const exitX = stage.clientWidth + 40;
      // Stops on the boss's left (running past behind it) so the stack stays clear of the hero's right edge.
      const standX = position.x - CREW_WIDTH - 2;
      const crew = spawnCrew({ x: exitX, y });
      try {
        crew.carry(true);
        const tower = document.createElement('div');
        tower.className = 'crew-load crew-tower';
        stack.forEach(slot => {
          const item = document.createElement('span');
          item.textContent = slot.text;
          if (slot.comment) item.className = 'tech-comment';
          tower.appendChild(item);
        });
        crew.load(tower);
        crew.run(true);
        await animate(crew.member, [{ transform: `translate(${exitX}px, ${y}px)` }, { transform: `translate(${standX}px, ${y}px)` }], { duration: 450, easing: 'ease-out', fill: 'forwards' });
        crew.run(false);
        // Hand-off: the tower slides over onto the boss's head.
        setPose('carry');
        const shift = position.x + ROBOT_WIDTH / 2 - (standX + CREW_WIDTH / 2);
        await animate(tower, [{ transform: 'none' }, { transform: `translate(${shift}px, ${-(ROBOT_HEIGHT - CREW_HEIGHT)}px)` }], { duration: 220, easing: 'ease-in-out', fill: 'forwards' });
        tower.remove();
        setCargo(stack);
        squashBody();
        crew.carry(false);
        crew.run(true);
        await animate(crew.member, [{ transform: `translate(${standX}px, ${y}px)` }, { transform: `translate(${exitX + 40}px, ${y}px)` }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
      } finally {
        crew.remove();
      }
      await pause(200);
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
        // The boss stomps the group label, the crew hauls the old words away and brings the next group, and the boss tosses it in.
        await getAngry();
        await stompFloor();
        const haul: Promise<void>[] = [];
        for (let index = 0; index < total; index++) {
          if (current[index]?.slot) haul.push(fetchWord(index, haul.length * 150));
        }
        await Promise.all(haul);
        groupIndex = (groupIndex + 1) % groups.length;
        const stack = slotsFor(groups[groupIndex], total).filter((slot): slot is Slot => slot !== null);
        await deliver(stack);
        await tossAll(stack);
        await celebrate();
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
      [robot, body, ...flyers.children, ...crewLayer.querySelectorAll<HTMLElement>('*')].forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
      flyers.replaceChildren();
      intervals.forEach(clearInterval);
      crewLayer.replaceChildren();
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      preference.removeEventListener('change', resume);
      robot.removeEventListener('click', provoke);
    };
  }, [groups]);

  return (
    <div className="technical-mark" ref={markRef}>
      <span className="sr-only">{groups.map(group => `${group.label}: ${group.items.join(', ')}`).join('; ')}</span>
      <div className="braces font-mono" aria-hidden="true">
        <span className="brace">{'{'}</span>
        <div className="tech-stage animated-tech" ref={stageRef}>
          <ul className="tech-list" style={{ '--lines': lineTotal } as CSSProperties}>
            {Array.from({ length: lineTotal }, (_, index) => {
              const line = lines[index];
              return (
                <li key={index} style={{ '--d': line ? lineDelay(line.kind) : '0ms' } as CSSProperties}>
                  {line && <>
                    <span key={`flash-${line.id}`} className="line-flash" />
                    {line.squashed && <span key={`old-${line.id}`} className={`tech-word tech-squash${line.squashed.comment ? ' tech-comment' : ''}`}><SlotText slot={line.squashed} /></span>}
                    {line.slot && <span key={line.id} className={`tech-word tech-${line.kind === 'stomp' ? 'grow' : line.kind}${line.slot.comment ? ' tech-comment' : ''}`}><SlotText slot={line.slot} /></span>}
                  </>}
                </li>
              );
            })}
          </ul>
          <div className="tech-flyers" ref={flyersRef} />
          <div className="crew-layer" ref={crewRef} />
          <div className="robot" ref={robotRef}>
            {cargo.length > 0 && <div className="robot-cargo">{cargo.map(slot => <span key={slot.text} className={slot.comment ? 'tech-comment' : undefined}>{slot.text}</span>)}</div>}
            {alert && <span className="robot-alert">!</span>}
            <div className="robot-body" ref={bodyRef}><RobotSprite pose={pose} mood={mood} /></div>
          </div>
        </div>
        {/* Without motion every group is listed at once. */}
        <ul className="tech-list static-tech">
          {groups.map(group => [
            <li key={`${group.label}-label`} className="tech-comment">{`// ${group.label}`}</li>,
            <li key={`${group.label}-items`} className="static-items">{group.items.join(', ')}</li>,
          ])}
        </ul>
        <span className="brace">{'}'}</span>
      </div>
    </div>
  );
}
