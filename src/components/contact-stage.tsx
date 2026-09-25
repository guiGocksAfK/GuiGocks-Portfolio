'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RobotSprite, crewMarkup, pixelMarkup, robotMarkup, type CrewFace, type RobotMood, type RobotPose } from '@/components/robot-sprite';

type Stage = 'blank' | 'playing' | 'done';
// What the robots say: the boss calling the crew, the boss stopping the fight, the painter grumbling.
type StageLines = { call: string; stop: string; grumble: string; typo: string; keep: string; sigh: string };

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
      let hat: 'O' | 'none' = 'O';
      let facing = 1;
      let tilt = 0;
      let legs: ReturnType<typeof setInterval> | undefined;
      const draw = () => { body.innerHTML = crewMarkup(arms, step, hat, face); };
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
        pose: (options: { arms?: boolean; face?: CrewFace; facing?: number; tilt?: number; hat?: 'O' | 'none' }) => {
          arms = options.arms ?? arms;
          hat = options.hat ?? hat;
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
      // Its stomp lays down the ground line.
      const spreading = spreadGroundLine(boss);
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
      await spreading;
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

    // The ground line spreads out from the boss's feet as it lands from its stomp, with a puff of dust on each side.
    async function spreadGroundLine(boss: Awaited<ReturnType<typeof bossArrives>>) {
      const footer = stageEl.querySelector('.section-footer');
      if (!footer) return;
      const footerBox = boxOf(footer);
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
    }

    // Meanwhile, four more of the crew dash across the screen from edge to edge, one on each of the list's lines,
    // drawing it under their feet as they go.
    async function runLines() {
      const list = stageEl.querySelector('.contact-list');
      const paint = stageEl.querySelector('.contact-paint');
      if (!list || !paint) return;
      const listBox = boxOf(list);
      const wall = boxOf(paint);
      const left = listBox.x;
      const right = listBox.x + listBox.w;
      const rowLines = [listBox.y, ...[...list.children].map(row => { const box = boxOf(row); return box.y + box.h - 1; })];
      const from = wall.x - CREW_W - 10;
      const to = wall.x + wall.w + 10;
      await Promise.all(rowLines.map(async (y, index) => {
        await pause(index * 300);
        const runner = crew('line-runner');
        const lift = groundY() - y;
        const line = stageLine(left, y);
        runner.place(from, lift);
        runner.pose({ facing: 1 });
        runner.legs(true);
        await tween((to - from) / LINE_SPEED * 1000, t => {
          const x = from + (to - from) * t;
          runner.place(x, lift);
          line.style.width = `${Math.min(right - left, Math.max(0, x + CREW_W / 2 - left))}px`;
        });
        runner.legs(false);
        runner.element.remove();
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

    // ——— The park: every piece of the happy ending is brought in by the crew, many at once. ———
    const part = (selector: string) => stageEl.querySelector<HTMLElement>(selector);
    // Shows a piece of the park at once, offset from its place (translate/rotate/scale compose with its own transform).
    function showPart(element: HTMLElement | null, offset: { x?: number; y?: number; rotate?: number; scale?: string } = {}) {
      if (!element) return null;
      element.style.transition = 'none';
      movePart(element, offset);
      element.classList.add('is-built');
      return element;
    }
    function movePart(element: HTMLElement, { x = 0, y = 0, rotate = 0, scale }: { x?: number; y?: number; rotate?: number; scale?: string }) {
      element.style.translate = `${x}px ${y}px`;
      element.style.rotate = `${rotate}deg`;
      if (scale) element.style.scale = scale;
    }
    // Everyone in the park walks on the grass, a little above the footer's line.
    const GRASS = 16;
    function helper(x: number) {
      const member = crew();
      member.place(x, GRASS);
      return member;
    }
    async function walkOnGrass(member: Member, toX: number, speed = CREW_WALK, onStep?: (x: number) => void) {
      const fromX = member.x;
      member.pose({ facing: toX < fromX ? -1 : 1 });
      member.legs(true);
      await tween(Math.abs(toX - fromX) / speed * 1000, t => { const x = fromX + (toX - fromX) * t; member.place(x, GRASS); onStep?.(x); });
      member.legs(false);
    }
    async function leave(member: Member, toX: number) {
      await walkOnGrass(member, toX);
      member.element.remove();
    }

    // The sky comes down like a theatre backdrop pulled by two of the crew, the sun is lowered on a rope by another one
    // hanging from it, the stars pop in, the hills rise from below and the lake is unrolled like a carpet.
    async function backdrop() {
      const scene = part('.ending');
      if (!scene) return;
      const box = boxOf(scene);
      const width = stageEl.clientWidth;
      const pullers = [helper(box.x + 30), helper(box.x + box.w - CREW_W - 30)];
      pullers.forEach(member => member.pose({ arms: true }));
      const sky = showPart(part('.ending-sky'), { y: -box.h });
      await tween(1300, t => {
        if (sky) movePart(sky, { y: -box.h * (1 - smooth(t)) });
        pullers.forEach(member => member.place(member.x, GRASS + Math.abs(Math.sin(t * Math.PI * 3)) * 4));
      });
      pullers.forEach(member => member.pose({ arms: false }));
      const leaving = Promise.all(pullers.map((member, index) => leave(member, index ? width + 40 : -CREW_W - 40)));

      const sun = part('.ending-sun');
      const lowering = (async () => {
        if (!sun) return;
        const sunBox = boxOf(sun);
        const drop = sunBox.y - box.y + sunBox.h;
        showPart(sun, { y: -drop });
        const rope = document.createElement('span');
        rope.className = 'stage-rope';
        rope.style.left = `${sunBox.x + sunBox.w / 2}px`;
        rope.style.top = `${box.y - 40}px`;
        actors.appendChild(rope);
        const rider = crew('rope-rider');
        rider.pose({ arms: true });
        const ride = (offset: number) => {
          const sunTop = sunBox.y - offset;
          rope.style.height = `${Math.max(0, sunTop - (box.y - 40))}px`;
          rider.place(sunBox.x + sunBox.w / 2 - CREW_W / 2, groundY() - sunTop + 2);
          if (sun) movePart(sun, { y: -offset });
        };
        await tween(1400, t => ride(drop * (1 - smooth(t))));
        await pause(250);
        // The rider climbs back up with the rope, leaving the sun hanging in the sky.
        await tween(700, t => {
          const up = (sunBox.y - box.y + 60) * smooth(t);
          rope.style.height = `${Math.max(0, sunBox.y - (box.y - 40) - up)}px`;
          rider.place(sunBox.x + sunBox.w / 2 - CREW_W / 2, groundY() - (sunBox.y - up) + 2);
        });
        rope.remove();
        rider.element.remove();
      })();

      const hills = showPart(part('.ending-hills'), { y: 50 });
      const rising = hills ? tween(900, t => movePart(hills, { y: 50 * (1 - smooth(t)) })) : Promise.resolve();

      await pause(500);
      for (const star of stageEl.querySelectorAll<HTMLElement>('.ending-star')) {
        showPart(star);
        const sparkle = spawn('fight-twinkle stage-click', actors, '✦');
        const starBox = boxOf(star);
        Object.assign(sparkle.style, { left: `${starBox.x - 5}px`, top: `${starBox.y - 6}px` });
        sparkle.addEventListener('animationend', () => sparkle.remove());
        await pause(260);
      }

      // The lake, unrolled from its left end by a crew member walking along it.
      const lake = part('.ending-lake');
      if (lake) {
        const lakeBox = boxOf(lake);
        lake.style.transformOrigin = 'left center';
        showPart(lake, { scale: '0 1' });
        const roller = helper(lakeBox.x - CREW_W);
        await walkOnGrass(roller, lakeBox.x + lakeBox.w - CREW_W / 2, 260, x => { lake.style.scale = `${Math.min(1, Math.max(0, (x + CREW_W / 2 - lakeBox.x) / lakeBox.w))} 1`; });
        lake.style.scale = '1 1';
        void leave(roller, width + 40);
      }
      await Promise.all([lowering, rising, leaving]);
    }

    // A painter runs a green roller along the ground and the grass comes up behind it.
    async function grass() {
      const lawn = part('.ending-grass');
      if (!lawn) return;
      const lawnBox = boxOf(lawn);
      showPart(lawn);
      lawn.style.clipPath = 'inset(0 100% 0 0)';
      const painter = helper(lawnBox.x - 40);
      const roller = spawn('hand-roller grass-roller', painter.element);
      await walkOnGrass(painter, lawnBox.x + lawnBox.w, 420, x => { lawn.style.clipPath = `inset(0 ${Math.max(0, lawnBox.x + lawnBox.w - x)}px 0 0)`; });
      lawn.style.clipPath = '';
      roller.remove();
      painter.element.remove();
    }

    // Two carry the tree in lying on their heads and stand it up; another brings the bush in its arms.
    async function trees() {
      const width = stageEl.clientWidth;
      const tree = part('.ending-tree');
      const bush = part('.ending-bush');
      const planting = (async () => {
        if (!tree) return;
        const treeBox = boxOf(tree);
        const carriers = [helper(-CREW_W - 90), helper(-CREW_W - 40)];
        carriers.forEach(member => member.pose({ arms: true }));
        const lift = 14;
        // Lying on its side over the front carrier's head, following it.
        const place = (x: number) => movePart(tree, { x: x - (treeBox.x + 6), y: -lift, rotate: -90 });
        showPart(tree);
        place(carriers[0].x);
        await Promise.all(carriers.map((member, index) => walkOnGrass(member, treeBox.x + index * 44 + 6, CREW_WALK, index ? undefined : place)));
        // Stand it up.
        await tween(600, t => movePart(tree, { y: -lift * (1 - t), rotate: -90 * (1 - smooth(t)) }));
        movePart(tree, {});
        carriers.forEach(member => member.pose({ arms: false }));
        await Promise.all(carriers.map(member => leave(member, -CREW_W - 40)));
      })();
      const potting = (async () => {
        if (!bush) return;
        const bushBox = boxOf(bush);
        const gardener = helper(width + 30);
        gardener.pose({ arms: true });
        showPart(bush);
        const hold = (x: number) => movePart(bush, { x: x + CREW_W / 2 - (bushBox.x + bushBox.w / 2), y: -CREW_H - 2 });
        hold(width + 30);
        await walkOnGrass(gardener, bushBox.x + bushBox.w / 2 - CREW_W / 2, CREW_WALK, hold);
        await tween(300, t => movePart(bush, { y: (-CREW_H - 2) * (1 - t) }));
        gardener.pose({ arms: false });
        await leave(gardener, width + 30);
      })();
      await Promise.all([planting, potting]);
    }

    // The blanket is spread, the basket put down; later two of the crew sit on it and a third flies the kite.
    async function picnic() {
      const scene = part('.ending-picnic');
      const blanket = part('.ending-blanket');
      const basket = part('.ending-basket');
      if (!scene || !blanket || !basket) return;
      showPart(scene);
      const blanketBox = boxOf(blanket);
      blanket.style.transformOrigin = 'left center';
      showPart(blanket, { scale: '0 1' });
      const spreader = helper(blanketBox.x - CREW_W - 10);
      await walkOnGrass(spreader, blanketBox.x + blanketBox.w - CREW_W / 2, 200, x => { blanket.style.scale = `${Math.min(1, Math.max(0, (x + CREW_W / 2 - blanketBox.x) / blanketBox.w))} 1`; });
      blanket.style.scale = '1 1';
      // The same one goes back for the basket and sets it down.
      const basketBox = boxOf(basket);
      spreader.pose({ arms: true });
      showPart(basket);
      const hold = (x: number) => movePart(basket, { x: x + CREW_W / 2 - (basketBox.x + basketBox.w / 2), y: -CREW_H + 4 });
      hold(spreader.x);
      await walkOnGrass(spreader, basketBox.x + basketBox.w / 2 - CREW_W / 2, CREW_WALK, hold);
      await tween(250, t => movePart(basket, { y: (-CREW_H + 4) * (1 - t) }));
      spreader.pose({ arms: false });
      await leave(spreader, stageEl.clientWidth + 40);
    }

    // The bench comes last: the boss taps its foot until two of the crew bring it, then sits down with a sigh and the
    // pigeons fly in.
    async function bench(boss: Awaited<ReturnType<typeof bossArrives>>, waiting: Promise<unknown>) {
      const seat = part('.ending-bench');
      if (!seat) return;
      let tapping = true;
      const impatience = (async () => {
        boss.draw('idle', 'normal');
        const dots = over(boss.element, 'stage-mark', '…');
        while (tapping) await boss.hop(3, 260);
        dots.remove();
      })();
      await waiting;
      const seatBox = boxOf(seat);
      // It steps aside to make room.
      await boss.walk(boss.x + 60);
      const carriers = [helper(-CREW_W - 100), helper(-CREW_W - 40)];
      carriers.forEach(member => member.pose({ arms: true }));
      showPart(seat);
      const hold = (x: number) => movePart(seat, { x: x - (seatBox.x + 6), y: -CREW_H + 2 });
      hold(-CREW_W - 100);
      await Promise.all(carriers.map((member, index) => walkOnGrass(member, seatBox.x + 6 + index * 40, CREW_WALK, index ? undefined : hold)));
      await tween(300, t => movePart(seat, { y: (-CREW_H + 2) * (1 - t) }));
      movePart(seat, {});
      carriers.forEach(member => member.pose({ arms: false }));
      const leaving = Promise.all(carriers.map(member => leave(member, -CREW_W - 40)));
      tapping = false;
      await impatience;
      // Hop onto the bench: the sitting boss of the scene takes over.
      const sitting = part('.ending-boss');
      const spot = sitting ? boxOf(sitting) : seatBox;
      boss.draw('jump', 'happy');
      const fromX = boss.x;
      const fromY = boss.y;
      await tween(500, t => boss.place(fromX + (spot.x - fromX) * t, fromY + (spot.y - fromY) * t - Math.sin(Math.PI * t) * 24));
      boss.element.remove();
      const sigh = spawn('stage-grumble stage-sigh font-mono', actors, lines.sigh);
      Object.assign(sigh.style, { left: `${spot.x + spot.w + 6}px`, top: `${spot.y - 18}px` });

      // The pigeons fly in from the sky and land in front of it.
      await Promise.all([...stageEl.querySelectorAll<HTMLElement>('.ending-pigeon')].map(async (pigeon, index) => {
        await pause(index * 250);
        showPart(pigeon, { x: 260, y: -160 });
        await tween(1300, t => movePart(pigeon, { x: 260 * (1 - smooth(t)), y: -160 * (1 - t) * (1 - t) + Math.sin(t * Math.PI * 6) * 3 * (1 - t) }));
        movePart(pigeon, {});
      }));
      await pause(600);
      sigh.remove();
      await leaving;
    }

    // Job done: the crew throw their hard hats in the air, two sit down for the picnic and one goes to fly the kite.
    async function celebrate(crewLeft: Member[]) {
      const width = stageEl.clientWidth;
      for (const member of crewLeft) {
        member.pose({ arms: true, hat: 'none' });
        const hat = spawn('flying-hat', actors);
        const x = member.x;
        const y = groundY() - CREW_H - member.lift;
        void tween(1100, t => { hat.style.transform = `translate(${x + 4 + t * 20}px, ${y - Math.sin(Math.PI * t) * 90 + t * 40}px) rotate(${t * 540}deg)`; hat.style.opacity = String(t > .8 ? (1 - t) / .2 : 1); }).then(() => hat.remove(), () => hat.remove());
      }
      await tween(600, t => crewLeft.forEach(member => member.place(member.x, GRASS + Math.sin(Math.PI * t) * 6)));
      crewLeft.forEach(member => member.pose({ arms: false }));
      await pause(500);
      const spots = ['.ending-picnic-crew-1', '.ending-picnic-crew-2', '.ending-flyer'].map(part);
      // From left to right: the two nearest the blanket sit down, the next one takes the kite.
      const byDistance = [...crewLeft].sort((a, b) => a.x - b.x);
      await Promise.all(spots.map(async (spot, index) => {
        const member = byDistance[index];
        if (!member) return;
        if (!spot) { await leave(member, width + 40); return; }
        const spotBox = boxOf(spot);
        await walkOnGrass(member, spotBox.x);
        member.element.remove();
        showPart(spot);
        if (spot.classList.contains('ending-flyer')) {
          const rig = spot.querySelector<HTMLElement>('.ending-kite-rig');
          if (rig) {
            rig.style.translate = '0 60px';
            rig.style.opacity = '0';
            await tween(1000, t => { rig.style.translate = `0 ${60 * (1 - smooth(t))}px`; rig.style.opacity = String(Math.min(1, t * 3)); });
          }
        }
      }));
      // Anyone left over walks off.
      await Promise.all(byDistance.slice(spots.length).map(member => leave(member, width + 40)));
    }

    async function buildPark(boss: Awaited<ReturnType<typeof bossArrives>>, team: Member[]) {
      // The crew still standing move down onto the grass.
      team.forEach(member => member.place(member.x, GRASS));
      const scenery = (async () => {
        const sky = backdrop();
        await pause(900);
        const lawn = grass();
        await pause(900);
        const woods = trees();
        await pause(1200);
        const blanket = picnic();
        await Promise.all([sky, lawn, woods, blanket]);
      })();
      await bench(boss, scenery);
      await celebrate(team);
    }

    async function run() {
      await pause(200);
      const boss = await bossArrives();
      await pause(200);
      let painting: Promise<Member> | undefined;
      const team = await crewPanics(() => { painting = paintWall(); });
      const painter = await (painting ?? paintWall());
      await pause(300);
      const lining = runLines();
      const streak = await slipAndFight(team, boss);
      await lining;
      await pause(300);
      await repaint(painter, streak);
      await pause(300);
      const crew = [...team, painter];
      await writeTitle([...crew].sort((a, b) => a.x - b.x)[0]);
      await pause(300);
      await placeWords(crew);
      await pause(400);
      await buildPark(boss, crew);
      // The happy ending stays; the stage is handed over to the finished section.
      await pause(600);
      setStage('done');
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
      // A skip in the middle of the park leaves no piece half way in.
      stageEl.querySelectorAll<HTMLElement>('.ending, .ending *').forEach(element => {
        for (const property of ['translate', 'rotate', 'scale', 'clip-path', 'transform-origin', 'opacity']) element.style.removeProperty(property);
      });
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
