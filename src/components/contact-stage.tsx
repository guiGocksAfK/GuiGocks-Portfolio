'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RobotSprite, crewMarkup, pixelMarkup, robotMarkup, type CrewFace, type RobotMood, type RobotPose } from '@/components/robot-sprite';

type Stage = 'blank' | 'playing' | 'done';
// What the robots say: the boss calling the crew, the boss stopping the fight, the painter grumbling.
type StageLines = { call: string; stop: string; grumble: string; typo: string; keep: string };

// Robots on this stage are drawn with 3px pixels (the big robot map is 11×12).
const BOSS_WIDTH = 33;
const BOSS_HEIGHT = 36;
const WALK_SPEED = 80; // px per second: an unhurried stroll
// The crew (8×9 map) with 3px pixels too.
const CREW_W = 24;
const CREW_H = 27;
const CREW_WALK = 150; // called by the boss, the crew comes at a brisk walk
const ANNOYED_WALK = 200; // the painter hurrying back to fix the streak
const RUN_SPEED = 220;
const ROLL_SPEED = 300; // the giant paint roller crossing the whole screen
const LINE_SPEED = 380; // a crew member running along a line, drawing it behind
const WRITE_INTERVAL = 105; // ms per letter written with the giant pencil
const ERASE_INTERVAL = 90;
const PENCIL_TILT = 24; // degrees the giant pencil leans back from upright
const STEP_INTERVAL = 130;
const BENCH = ['WWWWWWWWWWWW', 'wwwwwwwwwwww', '.K........K.', 'WWWWWWWWWWWW', 'wwwwwwwwwwww', '.K........K.', '.K........K.'];
const BENCH_COLORS = { W: '#7a5c46', w: '#5a4334', K: '#2c313b' };

class Cancelled extends Error {}

const finishBuild = () => { delete document.documentElement.dataset.build; };

// The contact section is built by the robots in front of the visitor. The boot script marks the page before the first
// paint (html[data-build="pending"]), so the section starts as a blank off-white canvas with only a robot holding a
// "skip" sign; without JS or with reduced motion it is simply finished. The content is in the page all along (only
// hidden from sight), so screen readers and search engines get it right away. The show starts once the section's last
// line is on screen and pauses while it is off screen; clicking the sign at any moment jumps to the finished section.
export function ContactStage({ skipLabel, lines, children }: { skipLabel: string; lines: StageLines; children: ReactNode }) {
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
    const intervals = new Set<ReturnType<typeof setInterval>>();

    async function pause(ms: number) {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      while ((!inView || document.hidden) && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }
    const smooth = (t: number) => t * t * (3 - 2 * t);
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
      await pause(300);
      await boss.walk(target);
      boss.draw('idle', 'normal');
      await pause(300);

      // It pictures its bench.
      const thought = over(boss.element, 'thought', `<span class="thought-trail"></span>${pixelMarkup(BENCH, BENCH_COLORS)}`);
      await pause(1100);
      await fadeOut(thought);
      await pause(200);

      // No bench anywhere: it looks one way, then the other.
      const question = over(boss.element, 'stage-mark', '?');
      for (const look of ['left', 'right'] as const) {
        boss.draw('idle', 'normal', look);
        await pause(500);
      }
      boss.draw('idle', 'normal');
      await pause(300);

      // Then it notices the whole screen is blank.
      question.remove();
      const surprise = over(boss.element, 'stage-mark stage-mark-alert', '!');
      boss.draw('blink', 'normal');
      await boss.hop(8, 260);
      boss.draw('idle', 'normal');
      await pause(500);
      await fadeOut(surprise);

      // It gets angry: red eyes, steam out of its head, two stomping hops and a shout for the crew.
      boss.draw('idle', 'angry');
      await pause(350);
      for (let index = 0; index < 3; index++) {
        puff(boss.element, index % 2 ? 'right' : 'left');
        await pause(280);
      }
      boss.draw('jump', 'angry');
      const call = over(boss.element, 'stage-shout font-mono', lines.call);
      for (let jump = 0; jump < 2; jump++) await boss.hop(12, 320);
      await pause(900);
      await fadeOut(call);
      boss.draw('idle', 'angry');
      return boss;
    }

    // Fight clouds, sweat, the slip's streak: things at ground level go in a zero-height strip along the ground.
    const ground = document.createElement('span');
    ground.className = 'stage-ground';
    actors.appendChild(ground);
    ground.style.top = `${groundY()}px`;
    function spawn(className: string, parent: HTMLElement = ground, text = '') {
      const element = document.createElement('span');
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    }

    // A crew member with its hard hat: walks with alternating legs, can raise its arms, change face, turn and tip over.
    function crew(className = '') {
      const element = document.createElement('span');
      element.className = `actor crew-actor ${className}`;
      const body = document.createElement('span');
      body.className = 'actor-body';
      element.appendChild(body);
      actors.appendChild(element);
      let x = 0;
      let y = 0;
      let step = 0;
      let arms = false;
      let face: CrewFace = 'normal';
      let facing = 1;
      let tilt = 0;
      let legs: ReturnType<typeof setInterval> | undefined;
      const draw = () => { body.innerHTML = crewMarkup(arms, step, 'O', face); };
      const render = () => {
        element.style.transform = `translate(${x}px, ${y}px)`;
        body.style.transform = `scaleX(${facing}) rotate(${tilt}deg)`;
      };
      draw();
      const member = {
        element,
        get x() { return x; },
        get lift() { return groundY() - CREW_H - y; },
        place: (nextX: number, lift = 0) => { x = nextX; y = groundY() - CREW_H - lift; render(); },
        pose: (options: { arms?: boolean; face?: CrewFace; facing?: number; tilt?: number }) => {
          arms = options.arms ?? arms;
          face = options.face ?? face;
          facing = options.facing ?? facing;
          tilt = options.tilt ?? tilt;
          draw();
          render();
        },
        legs: (on: boolean) => {
          if (legs) { clearInterval(legs); intervals.delete(legs); legs = undefined; }
          if (on) { legs = setInterval(() => { step += 1; draw(); }, STEP_INTERVAL); intervals.add(legs); }
        },
        walk: async (toX: number, speed: number) => {
          const fromX = x;
          member.pose({ facing: toX < fromX ? -1 : 1 });
          member.legs(true);
          await tween(Math.abs(toX - fromX) / speed * 1000, t => member.place(fromX + (toX - fromX) * t));
          member.legs(false);
        },
      };
      return member;
    }
    type Member = ReturnType<typeof crew>;

    // Scene 2: the crew answers the call, sees the blank screen and panics: "!", arms up, shaking and sweating.
    // The crew comes in from the left, the boss's side; onPanic lets the next scene start while they are still panicking.
    async function crewPanics(onPanic: () => void) {
      const width = stageEl.clientWidth;
      const spots = [.22, .28, .34].map(fraction => width * fraction);
      const team = spots.map(() => crew());
      team.forEach((member, index) => member.place(-CREW_W - 16 - (spots.length - 1 - index) * 45));
      await Promise.all(team.map((member, index) => member.walk(spots[index], CREW_WALK)));
      await pause(200);
      const marks = team.map(member => over(member.element, 'stage-mark stage-mark-alert', '!'));
      await pause(600);
      marks.forEach(mark => mark.remove());
      team.forEach(member => member.pose({ arms: true, face: 'angry' }));
      onPanic();
      const sweat = setInterval(() => {
        const member = team[Math.floor(Math.random() * team.length)];
        const drop = spawn('sweat', member.element);
        drop.style.left = `${Math.random() < .5 ? 1 : 19}px`;
        drop.addEventListener('animationend', () => drop.remove());
      }, 160);
      intervals.add(sweat);
      await tween(1600, t => team.forEach((member, index) => member.place(spots[index] + Math.round(Math.sin(t * 70 + index * 2) * 1.5))));
      clearInterval(sweat);
      intervals.delete(sweat);
      team.forEach((member, index) => { member.place(spots[index]); member.pose({ arms: false, face: 'normal' }); });
      return team;
    }

    // Scene 3: a painter pushes a giant roller across the whole screen, painting the blank canvas dark behind it.
    async function paintWall() {
      const paint = stageEl.querySelector<HTMLElement>('.contact-paint');
      if (!paint) return crew('painter');
      const wall = boxOf(paint);
      const roller = document.createElement('span');
      roller.className = 'giant-roller';
      roller.innerHTML = '<span class="roller-drum"></span><span class="roller-pole"></span>';
      roller.style.height = `${groundY()}px`;
      actors.insertBefore(roller, actors.firstChild);
      const painter = crew('painter');
      const from = wall.x - 30;
      // It stops once the drum reaches the right edge, the painter still in sight at the far right.
      const to = wall.x + wall.w;
      const at = (x: number) => {
        roller.style.transform = `translateX(${x}px)`;
        painter.place(x - 62);
        paint.style.clipPath = `inset(0 ${Math.max(0, wall.x + wall.w - x - 11)}px 0 0)`;
      };
      at(from);
      painter.pose({ facing: 1 });
      painter.legs(true);
      await tween((to - from) / ROLL_SPEED * 1000, t => at(from + (to - from) * t));
      painter.legs(false);
      roller.remove();
      paint.style.clipPath = 'none';
      return painter;
    }

    // Scene 4: on the wet paint one of the crew slips and slides on its back, leaving a streak; a second one trips over
    // it; they get up furious and brawl until the boss yells at them to stop.
    async function slipAndFight(team: Member[], boss: Awaited<ReturnType<typeof bossArrives>>) {
      const width = stageEl.clientWidth;
      const slider = team[2];
      const tripper = team[1];
      const slipAt = width * .6;
      const slideTo = width * .68;

      // It dashes off toward the middle, the second one right behind it, and its feet go out from under it.
      const chase = (async () => { await pause(250); await tripper.walk(slideTo - 34, RUN_SPEED); })();
      await slider.walk(slipAt, RUN_SPEED);
      const streak = spawn('paint-streak');
      streak.style.left = `${slipAt + CREW_W / 2}px`;
      await tween(800, t => {
        const eased = 1 - (1 - t) * (1 - t);
        const x = slipAt + (slideTo - slipAt) * eased;
        slider.place(x, Math.sin(Math.PI * Math.min(1, t * 2)) * 10);
        slider.pose({ tilt: -90 * Math.min(1, t * 1.8) });
        streak.style.width = `${x - slipAt}px`;
      });

      // The second one trips right over it.
      await chase;
      const tripFrom = tripper.x;
      await tween(600, t => {
        tripper.place(tripFrom + 70 * t, Math.sin(Math.PI * t) * 18);
        tripper.pose({ tilt: 90 * Math.min(1, t * 1.3) });
      });
      await pause(400);

      // Both get up, glare at each other and brawl in a dust cloud.
      await tween(300, t => { slider.pose({ tilt: -90 * (1 - t) }); tripper.pose({ tilt: 90 * (1 - t) }); });
      slider.pose({ face: 'angry', facing: 1 });
      tripper.pose({ face: 'angry', facing: -1 });
      const middle = (slider.x + tripper.x) / 2 + CREW_W / 2;
      const alerts = [slider, tripper].map(member => over(member.element, 'stage-mark stage-mark-alert', '!'));
      const speedLines = spawn('fight-lines');
      speedLines.style.left = `${middle - 70}px`;
      await pause(600);
      alerts.forEach(alert => alert.remove());
      speedLines.remove();
      slider.element.style.opacity = '0';
      tripper.element.style.opacity = '0';
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
        bit.addEventListener('animationend', () => bit.remove());
      }, 110);
      intervals.add(debris);
      await pause(1200);

      // The boss stomps and yells; the cloud clears and the two are left apart, sulking.
      boss.draw('jump', 'angry');
      const stop = over(boss.element, 'stage-shout font-mono', lines.stop);
      for (let jump = 0; jump < 2; jump++) await boss.hop(12, 320);
      clearInterval(debris);
      intervals.delete(debris);
      cloud.remove();
      slider.place(middle - CREW_W / 2 - 34);
      tripper.place(middle - CREW_W / 2 + 34);
      slider.pose({ face: 'tired', facing: -1 });
      tripper.pose({ face: 'tired', facing: 1 });
      slider.element.style.opacity = '1';
      tripper.element.style.opacity = '1';
      boss.draw('idle', 'angry');
      await pause(800);
      await fadeOut(stop);
      return { streak, from: slipAt, to: slideTo };
    }

    // Scene 5: the painter comes back with a hand roller, grumbling, and paints over the streak.
    async function repaint(painter: Member, mark: { streak: HTMLElement; from: number; to: number }) {
      painter.pose({ face: 'angry' });
      const handRoller = spawn('hand-roller', painter.element);
      await painter.walk(mark.to + CREW_W / 2 + 6, ANNOYED_WALK);
      const grumble = over(painter.element, 'stage-grumble font-mono', lines.grumble);
      painter.legs(true);
      const start = painter.x;
      const length = mark.to - mark.from;
      await tween(1800, t => {
        // Back and forth, working its way to the left end of the streak and covering it as it goes.
        const reach = start - (start - mark.from) * t;
        painter.place(reach + Math.abs(Math.sin(t * Math.PI * 4)) * 18);
        mark.streak.style.width = `${Math.max(0, Math.min(length, reach - mark.from - CREW_W / 2))}px`;
      });
      painter.legs(false);
      mark.streak.remove();
      await pause(300);
      await fadeOut(grumble);
      handRoller.remove();
      painter.pose({ face: 'normal' });
      return painter;
    }

    // A line of the finished section drawn on stage (the real borders stay hidden until the end).
    function stageLine(x: number, y: number) {
      const line = document.createElement('span');
      line.className = 'stage-line';
      line.style.top = `${y}px`;
      line.style.left = `${x}px`;
      actors.insertBefore(line, ground);
      return line;
    }
    // A jump along an arc from where a crew member is to a spot some height above the ground.
    async function leap(member: Member, toX: number, toLift: number, duration: number, height: number) {
      const fromX = member.x;
      const fromLift = member.lift;
      member.pose({ facing: toX < fromX ? -1 : 1 });
      await tween(duration, t => member.place(fromX + (toX - fromX) * t, fromLift + (toLift - fromLift) * t + Math.sin(Math.PI * t) * height));
    }

    // Scene 6: the boss stomps and the ground line spreads out from its feet; then each crew member jumps onto the end of
    // one of the list's lines and runs along it, drawing it, and hops down at the other end.
    async function drawLines(team: Member[], boss: Awaited<ReturnType<typeof bossArrives>>) {
      const list = stageEl.querySelector('.contact-list');
      const footer = stageEl.querySelector('.section-footer');
      if (!list || !footer) return;
      const listBox = boxOf(list);
      const footerBox = boxOf(footer);

      boss.draw('jump', 'angry');
      await boss.hop(14, 380);
      boss.draw('idle', 'angry');
      const center = boss.x + BOSS_WIDTH / 2;
      const groundLine = stageLine(center, footerBox.y);
      for (const side of ['left', 'right'] as const) {
        const dust = spawn(`steam stage-dust stage-dust-${side}`);
        dust.style.left = `${center + (side === 'left' ? -14 : 6)}px`;
        dust.addEventListener('animationend', () => dust.remove());
      }
      await tween(700, t => {
        const eased = 1 - (1 - t) * (1 - t);
        const left = center - (center - footerBox.x) * eased;
        const right = center + (footerBox.x + footerBox.w - center) * eased;
        groundLine.style.left = `${left}px`;
        groundLine.style.width = `${right - left}px`;
      });
      boss.draw('idle', 'normal');
      await pause(300);

      const rowLines = [listBox.y, ...[...list.children].map(row => { const box = boxOf(row); return box.y + box.h - 1; })];
      const left = listBox.x;
      const right = listBox.x + listBox.w;
      // Top line to the robot furthest right, and so on; each starts at the end nearest to it.
      const runners = [...team].sort((a, b) => b.x - a.x).slice(0, rowLines.length);
      await Promise.all(runners.map(async (member, index) => {
        const y = rowLines[index];
        const lift = groundY() - y;
        const fromRight = member.x > (left + right) / 2;
        const start = fromRight ? right - CREW_W : left;
        const end = fromRight ? left : right - CREW_W;
        await pause(index * 350);
        await leap(member, start, lift, 520, 40);
        const line = stageLine(fromRight ? right : left, y);
        member.pose({ facing: fromRight ? -1 : 1 });
        member.legs(true);
        await tween(Math.abs(end - start) / LINE_SPEED * 1000, t => {
          const x = start + (end - start) * t;
          member.place(x, lift);
          const reach = fromRight ? right - (x + CREW_W / 2) : x + CREW_W / 2 - left;
          line.style.width = `${Math.max(0, reach)}px`;
          if (fromRight) line.style.left = `${right - Math.max(0, reach)}px`;
        });
        line.style.left = `${left}px`;
        line.style.width = `${right - left}px`;
        member.legs(false);
        // Down to the ground just past the end of the line.
        await leap(member, fromRight ? left + 8 + index * 30 : right - CREW_W - 8 - index * 30, 0, 460, 16);
      }));
    }

    // Scene 7: a crew member hops onto the line under the title and writes it with a giant pencil, letter by letter. It
    // misspells a word, stops, erases back with the other end of the pencil and writes it again.
    async function writeTitle(writer: Member) {
      const title = stageEl.querySelector('#contact-title');
      const list = stageEl.querySelector('.contact-list');
      if (!(title instanceof HTMLElement) || !list) return;
      const text = title.textContent ?? '';
      const titleBox = boxOf(title);
      const lineY = boxOf(list).y;
      // A stand-in with the title's own styles whose text the pencil writes; the real title shows at the end.
      const draft = title.cloneNode(false) as HTMLElement;
      draft.removeAttribute('id');
      draft.className = 'stage-title';
      Object.assign(draft.style, { left: `${titleBox.x}px`, top: `${titleBox.y}px` });
      actors.insertBefore(draft, ground);
      const endX = () => titleBox.x + draft.offsetWidth;
      const tipY = titleBox.y + titleBox.h * .82;

      const pencil = spawn('giant-pencil', writer.element);
      const handY = lineY - CREW_H + 7;
      const length = (handY - tipY) / Math.cos(PENCIL_TILT * Math.PI / 180);
      pencil.style.height = `${length}px`;
      const reach = length * Math.sin(PENCIL_TILT * Math.PI / 180);
      const lift = groundY() - lineY;
      const follow = () => writer.place(endX() - 5 + reach, lift);

      await leap(writer, titleBox.x - 5 + reach, lift, 560, 40);
      writer.pose({ facing: 1 });
      const write = async (from: string, to: string) => {
        writer.legs(true);
        for (let index = from.length; index < to.length; index++) {
          draft.textContent = to.slice(0, index + 1);
          await tween(WRITE_INTERVAL, t => { writer.place(writer.x + (endX() - 5 + reach - writer.x) * t, lift); });
        }
        writer.legs(false);
      };
      await write('', lines.typo);
      await pause(400);

      // It looks at what it wrote... and turns the pencil around.
      const oops = over(writer.element, 'stage-mark', '?');
      await pause(700);
      oops.remove();
      pencil.classList.add('giant-pencil-erasing');
      await pause(250);
      for (let length = lines.typo.length; length > lines.keep.length; length--) {
        draft.textContent = lines.typo.slice(0, length - 1);
        for (let crumb = 0; crumb < 2; crumb++) {
          const bit = spawn('eraser-crumb', actors);
          Object.assign(bit.style, { left: `${endX() + Math.random() * 10}px`, top: `${tipY - Math.random() * 14}px` });
          bit.addEventListener('animationend', () => bit.remove());
        }
        await tween(ERASE_INTERVAL, t => { writer.place(writer.x + (endX() - 5 + reach - writer.x) * t, lift); });
      }
      follow();
      pencil.classList.remove('giant-pencil-erasing');
      await pause(300);
      await write(lines.keep, text);
      await pause(300);

      // Done: the real title takes over and the writer jumps back down.
      title.style.transition = 'none';
      title.classList.add('is-built');
      draft.remove();
      pencil.remove();
      await leap(writer, Math.min(stageEl.clientWidth - CREW_W, writer.x + 40), 0, 500, 20);
    }

    // A crew member carries a piece of the section over its head (a copy of it), walks a few steps and throws it up into
    // place, where the real pieces appear with a little bounce. The e-mail's carrier drops the "@" on the way and has
    // to chase it and click it back in before throwing.
    async function deliver(member: Member, piece: HTMLElement, targets: HTMLElement[], dropAt = false) {
      const carried = piece.cloneNode(true) as HTMLElement;
      carried.removeAttribute('id');
      carried.classList.add('carried-piece');
      // The copy lives outside the piece's context, so it takes the piece's own text styles along.
      const look = getComputedStyle(piece);
      for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color', 'lineHeight'] as const) carried.style[property] = look[property];
      member.element.appendChild(carried);
      member.pose({ arms: true });
      const target = boxOf(piece);
      const direction = target.x + target.w / 2 > member.x ? 1 : -1;
      await member.walk(member.x + direction * 60, CREW_WALK);

      if (dropAt) {
        // The "@" slips off the pile, bounces on the ground and rolls away.
        const text = carried.textContent ?? '';
        const at = text.indexOf('@');
        if (at >= 0) {
          carried.innerHTML = `${text.slice(0, at)}<span class="carried-gap">@</span>${text.slice(at + 1)}`;
          const gap = carried.querySelector<HTMLElement>('.carried-gap');
          const start = gap ? boxOf(gap) : boxOf(carried);
          const sign = spawn('fallen-at font-mono', actors, '@');
          const groundTop = groundY() - 18;
          const rollTo = start.x + direction * 90;
          await tween(450, t => { sign.style.transform = `translate(${start.x}px, ${start.y + (groundTop - start.y) * t * t}px)`; });
          await tween(700, t => { sign.style.transform = `translate(${start.x + (rollTo - start.x) * (1 - (1 - t) * (1 - t))}px, ${groundTop - Math.abs(Math.sin(t * Math.PI * 2)) * 6 * (1 - t)}px) rotate(${direction * t * 540}deg)`; });
          const alarm = over(member.element, 'stage-mark stage-mark-alert', '!');
          await pause(450);
          alarm.remove();
          // It runs after it, picks it up and clicks it back into the e-mail.
          await member.walk(rollTo - direction * 6, RUN_SPEED);
          member.pose({ facing: direction });
          const back = gap ? boxOf(gap) : boxOf(carried);
          const from = { x: rollTo, y: groundTop };
          await tween(380, t => { sign.style.transform = `translate(${from.x + (back.x - from.x) * t}px, ${from.y + (back.y - from.y) * t - Math.sin(Math.PI * t) * 20}px)`; });
          sign.remove();
          gap?.classList.remove('carried-gap');
          const click = spawn('fight-twinkle stage-click', actors, '✦');
          Object.assign(click.style, { left: `${back.x}px`, top: `${back.y}px` });
          click.addEventListener('animationend', () => click.remove());
          await pause(350);
        }
      }

      // Throw: the copy flies along an arc into the real piece's place, growing to its real size.
      const start = boxOf(carried);
      carried.remove();
      const flyer = carried;
      flyer.classList.remove('carried-piece');
      flyer.classList.add('flying-piece');
      actors.appendChild(flyer);
      // offsetWidth ignores the carrying scale, so this is the copy's real size.
      const scale = start.w / Math.max(flyer.offsetWidth, 1);
      member.pose({ arms: false });
      await tween(700, t => {
        const eased = smooth(t);
        const x = start.x + (target.x - start.x) * eased;
        const y = start.y + (target.y - start.y) * eased - Math.sin(Math.PI * t) * 70;
        flyer.style.transform = `translate(${x}px, ${y}px) scale(${scale + (1 - scale) * eased})`;
      });
      flyer.remove();
      // Shown at once (no fade) so the piece takes over from the copy without a flicker.
      targets.forEach(element => { element.style.transition = 'none'; element.classList.add('is-built', 'just-built'); });
    }

    // Scene 8: the rest of the words and the buttons, thrown into place by the crew.
    async function placeWords(team: Member[]) {
      const status = stageEl.querySelector<HTMLElement>('.contact-status');
      const rows = [...stageEl.querySelectorAll<HTMLElement>('.contact-row')];
      const footerTexts = [...stageEl.querySelectorAll<HTMLElement>('.section-footer > *')];
      const crew = [...team].sort((a, b) => a.x - b.x);
      const partsOf = (row: HTMLElement) => [...row.children] as HTMLElement[];
      const valueOf = (row: HTMLElement) => row.querySelector<HTMLElement>('.contact-value') ?? row;
      const jobs: (() => Promise<void>)[] = [];
      if (status) jobs.push(() => deliver(crew[0], status, [status]));
      rows.forEach((row, index) => jobs.push(() => deliver(crew[(index + 1) % crew.length], valueOf(row), partsOf(row), index === 0)));
      await Promise.all(jobs.map(async (job, index) => { await pause(index * 550); await job(); }));
      // The footer's two notes, one after the other.
      for (const note of footerTexts) await deliver(crew[crew.length - 1], note, [note]);
    }

    async function run() {
      await pause(200);
      const boss = await bossArrives();
      await pause(200);
      let painting: Promise<Member> | undefined;
      const team = await crewPanics(() => { painting = paintWall(); });
      const painter = await (painting ?? paintWall());
      await pause(300);
      const streak = await slipAndFight(team, boss);
      await pause(300);
      await repaint(painter, streak);
      await pause(300);
      const crew = [...team, painter];
      await drawLines(crew, boss);
      await pause(300);
      await writeTitle([...crew].sort((a, b) => a.x - b.x)[0]);
      await pause(300);
      await placeWords(crew);
      // Next: the park and the happy ending.
    }

    const viewObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }, { threshold: .3 });
    viewObserver.observe(stageEl);
    document.addEventListener('visibilitychange', resume);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      waiters.forEach(resolve => resolve());
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', resume);
      actors.replaceChildren();
      // Pieces placed by the robots were shown without their fade; give them their normal transitions back.
      stageEl.querySelectorAll<HTMLElement>('.is-built').forEach(element => element.style.removeProperty('transition'));
    };
  }, [stage, lines]);

  return (
    <section ref={sectionRef} id="contato" aria-labelledby="contact-title" className="contact-section" data-stage={stage}>
      <span className="contact-canvas" aria-hidden="true" />
      <span className="contact-paint" aria-hidden="true" />
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
