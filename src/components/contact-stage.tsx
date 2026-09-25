'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { armZapGag, skipZapGag } from '@/components/zap-gag';
import { crewMarkup, pixelMarkup, robotMarkup, type CrewFace, type RobotMood, type RobotPose } from '@/components/robot-sprite';

type Stage = 'blank' | 'playing' | 'done';
// What the robots say or show: the boss calling the crew and stopping the fight, the title's typo, the boss's sigh, the sign.
type StageLines = {
  call: string; stop: string; typo: string; keep: string; sigh: string; nothing: string;
  // The skip robot: its jokes when it peeks out, and its last one before the park.
  jokes: readonly string[]; finale: string;
};
// The skip robot's moods: loud (in full view, waving its sign), quiet (half hidden at the edge), peek (out for a joke).
type SkipMode = 'loud' | 'quiet' | 'peek';

// Robots on this stage are drawn with 3px pixels (the big robot map is 11×12).
const BOSS_WIDTH = 33;
const BOSS_HEIGHT = 36;
const WALK_SPEED = 138; // px per second: the boss's walk
// The crew (8×9 map) with 3px pixels too.
const CREW_W = 24;
const CREW_H = 27;
const CREW_WALK = 150; // called by the boss, the crew comes at a brisk walk
const ANNOYED_WALK = 200; // a brisk walk: off to mop up the puddle, stepping up to throw a word
const RUN_SPEED = 220;
const DASH_SPEED = 520;
const COVER_RUN = 245; // the crew rushing to hide the patches
const FOOTER_AFTER = 1600; // ms into the e-mail's delivery (the "@" rolling off) when the footer's notes get thrown
const SKIP_PEEK_EVERY = 15000; // ms between the skip robot's peeks with a joke
const COVER_GAP = 550; // ms between one disguise's trick and the next
const ORDER_SINKS_IN = 400; // ms after the boss's shout before the crew react to it // the crew dashing off for paint and back
const LINE_SPEED = 380; // a crew member running along a line, drawing it behind
const RUNNER_LEAP = 34; // how high a line runner leaps over the gaps before and after its line
const WRITE_INTERVAL = 75; // ms per letter written with the giant pencil
const ERASE_INTERVAL = 70;
const PENCIL_TILT = 24; // degrees the giant pencil leans back from upright
const STEP_INTERVAL = 130;
const BUCKET = ['.SSSS.', 'S....S', 'DDDDDD', 'SBBBBS', '.SBBS.', '.SSSS.'];
// The damaged wall the crew must paint over, spread out and at different heights. Four patches the crew try to hide,
// each in its own way (see COVER); the rest up high: a big peeled area with a strip of paint hanging, a long crack, a
// cluster of chips and a patch with cracks running out of it.
type Defect = { level: 'low' | 'high'; kind: 'patch' | 'crack' | 'chips'; peel?: boolean; cracks?: boolean; style: Record<string, string | number> };
const DEFECTS: Defect[] = [
  { level: 'low', kind: 'patch', style: { left: '17%', bottom: 68, width: 22, height: 16 } },
  { level: 'low', kind: 'patch', style: { left: '31%', bottom: 150, width: 30, height: 22 } },
  { level: 'low', kind: 'patch', cracks: true, style: { left: '52%', bottom: 176, width: 70, height: 44 } },
  { level: 'low', kind: 'patch', style: { left: '86%', bottom: 70, width: 34, height: 22 } },
  { level: 'high', kind: 'patch', peel: true, style: { left: '3%', top: '16%', width: 110, height: 64 } },
  { level: 'high', kind: 'crack', style: { left: '35%', top: '7%', width: 150, height: 70 } },
  { level: 'high', kind: 'chips', style: { left: '68%', top: '20%', width: 60, height: 40 } },
  { level: 'high', kind: 'patch', cracks: true, style: { left: '90%', top: '46%', width: 62, height: 40 } },
];
// How the crew hide the four patches, one entry per patch: who hides it and how. One just stands in front of it, one
// jumps up to its patch and stays stuck to the wall over it, two throw a red sheet over theirs, one holds up a sign.
const COVER: { members: number[]; how: 'body' | 'jump' | 'sheet' | 'sign' }[] = [
  { members: [0], how: 'body' },
  { members: [1], how: 'jump' },
  { members: [2, 3], how: 'sheet' },
  { members: [4], how: 'sign' },
];

class Cancelled extends Error {}

const finishBuild = () => { delete document.documentElement.dataset.build; };

// The contact section is built by the robots in front of the visitor. The boot script marks the page before the first
// paint (html[data-build="pending"]), so the section starts empty, its wall full of bare patches, with only a robot
// holding a "skip" sign; without JS or with reduced motion it is simply finished. The content is in the page all along (only
// hidden from sight), so screen readers and search engines get it right away. The show starts once the section's last
// line is on screen and pauses while it is off screen; clicking the sign at any moment jumps to the finished section.
export function ContactStage({ skipLabel, lines, children }: { skipLabel: string; lines: StageLines; children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const actorsRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const skipBodyRef = useRef<HTMLSpanElement>(null);
  // The skip robot's reactions to the show, set up by the show itself.
  const skip = useRef<{ flinch: () => Promise<void>; coverEyes: (on: boolean) => void; laugh: () => Promise<void> } | null>(null);
  const [stage, setStage] = useState<Stage>('blank');
  const [skipMode, setSkipMode] = useState<SkipMode>('loud');
  const [skipLine, setSkipLine] = useState<string | null>(null);

  // The skip robot's sprite is drawn by hand (so the show can change its face); it starts happy. Its rope hangs from a
  // pulley at the end of the line above the section (the previous section's footer line), measured here.
  useEffect(() => {
    if (skipBodyRef.current) skipBodyRef.current.innerHTML = robotMarkup('idle', 'happy');
    const section = sectionRef.current;
    const line = section?.previousElementSibling?.querySelector('.section-footer');
    if (section && line && skipRef.current) {
      skipRef.current.style.setProperty('--anchor', `${line.getBoundingClientRect().top - section.getBoundingClientRect().top}px`);
    }
  }, []);

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

    // The unfinished wall: patches of bare plaster (and one dark hole) the crew has to paint over.
    const holeCenter = (hole: HTMLElement) => { const box = boxOf(hole); return { x: box.x + box.w / 2, y: box.y + box.h / 2, box }; };

    // Little notes floating up from a whistling crew member.
    function whistle(member: Member, count: number) {
      return (async () => {
        for (let index = 0; index < count; index++) {
          const note = spawn('whistle-note', member.element, index % 2 ? '♫' : '♪');
          note.addEventListener('animationend', () => note.remove());
          await pause(300);
        }
      })();
    }

    // Scene 1: the boss and the crew arrive together. The crew notice the patches first and try to hide them: each one
    // hides one in its own way, the tricks one after the other; then, one of them whistling, the boss stands there
    // confused. The sheet slides off its patch: the boss sees it and orders paint, and a moment later the crew react,
    // the disguise falls apart and they leave their posts.
    async function arrive() {
      const boss = robot('boss-actor');
      const team = [0, 1, 2, 3, 4].map(() => crew());
      const benchSpot = stageEl.querySelector('.ending-boss');
      const bossTarget = benchSpot ? boxOf(benchSpot).x : stageEl.clientWidth * .1;
      const low = [...stageEl.querySelectorAll<HTMLElement>('.stage-hole-low')].map(hole => holeCenter(hole));
      let sign: HTMLElement | null = null;
      let sheet: HTMLElement | null = null;
      let hanging: { member: Member; lift: number } | null = null;

      // In they come, the crew a few steps ahead of the boss.
      boss.draw('idle', 'normal', 'right');
      boss.place(-BOSS_WIDTH - 40, groundY() - BOSS_HEIGHT);
      team.forEach((member, index) => member.place(-CREW_W - 10 - (team.length - 1 - index) * 34));
      const crewStops = team.map((_, index) => bossTarget + 70 + index * 34);
      await Promise.all([boss.walk(bossTarget), ...team.map((member, index) => member.walk(crewStops[index], (crewStops[index] - member.x) / ((bossTarget - boss.x) / WALK_SPEED)))]);
      boss.draw('idle', 'normal');

      // The crew see the patches ("!", a quick look at each other) and hide them, one disguise at a time.
      const marks = team.map(member => over(member.element, 'stage-mark stage-mark-alert', '!'));
      await pause(250);
      marks.forEach(mark => mark.remove());
      team.forEach((member, index) => member.pose({ facing: index % 2 ? 1 : -1 }));
      await pause(150);
      // Each patch hidden its own way (see COVER). They all run off together; the tricks themselves come one after the
      // other, each waiting for its turn once its robots get there.
      const started = performance.now();
      await Promise.all(COVER.flatMap((cover, patch) => cover.members.map(async (index, slot) => {
        const member = team[index];
        const center = low[patch];
        const x = (center ? center.x - CREW_W / 2 : member.x) + (cover.how === 'sheet' ? (slot ? 20 : -20) : 0);
        await member.walk(x, COVER_RUN);
        await pause(Math.max(0, patch * COVER_GAP - (performance.now() - started)));
        if (cover.how === 'jump' && center) {
          // A big jump up to its patch, and it stays there, stuck to the wall with its arms spread over it.
          const lift = groundY() - center.y - CREW_H / 2;
          member.pose({ arms: true });
          await tween(420, t => member.place(x, lift * (1 - (1 - t) * (1 - t)) + Math.sin(Math.PI * t) * 18));
          member.place(x, lift);
          hanging = { member, lift };
        }
        if (cover.how === 'sheet' && slot === 0 && center) {
          // The two of them throw a red sheet up over their patch, as if that would help.
          await pause(100);
          const partner = team[cover.members[1]];
          sheet = await throwSheet(center, member, partner);
        }
        if (cover.how === 'sign') {
          // Arms up, holding a little sign over its head.
          sign = spawn('robot-sign nothing-sign font-mono', member.element, lines.nothing);
          member.pose({ arms: true, facing: 1 });
        }
      })));
      team[0].pose({ facing: 1 });

      // With everyone in place trying to look normal, the boss stands there confused for a while: "?", looking one
      // way and the other, a puzzled little hop, looking around again.
      void whistle(team[3], 4).catch(() => {});
      const question = over(boss.element, 'stage-mark', '?');
      for (const side of ['left', 'right', 'left'] as const) { boss.draw('idle', 'normal', side); await pause(390); }
      boss.draw('idle', 'normal');
      await boss.hop(4, 240);
      await pause(300);
      for (const side of ['right', 'left'] as const) { boss.draw('idle', 'normal', side); await pause(350); }
      boss.draw('idle', 'normal');
      question.remove();
      await pause(200);

      // The giveaway: the sheet slides off its patch all by itself.
      const fallen = sheet as HTMLElement | null;
      if (fallen) {
        fallen.classList.add('red-sheet-fall');
        fallen.addEventListener('animationend', () => fallen.remove());
        await pause(380);
      }
      // The boss sees it: "!" and a start. The crew hold still in their disguises, hoping.
      const surprise = over(boss.element, 'stage-mark stage-mark-alert', '!');
      boss.draw('blink', 'normal');
      await boss.hop(8, 220);
      boss.draw('idle', 'normal');
      await pause(220);
      surprise.remove();

      // The boss blows up and gives the order.
      boss.draw('idle', 'angry');
      for (let index = 0; index < 2; index++) { puff(boss.element, index % 2 ? 'right' : 'left'); await pause(150); }
      boss.draw('jump', 'angry');
      const call = over(boss.element, 'stage-shout font-mono', lines.call);
      void skip.current?.flinch().catch(() => {});
      const stomping = (async () => {
        for (let jump = 0; jump < 2; jump++) await boss.hop(12, 250);
        boss.draw('idle', 'angry');
      })();

      // Right after the shout the order sinks in: "!!" over the crew one after the other, and the disguise falls apart
      // as they leave their posts: the sign drops, the one stuck to the wall slides down, arms go up.
      await pause(ORDER_SINKS_IN);
      const alarms: HTMLElement[] = [];
      for (const member of team) {
        alarms.push(over(member.element, 'stage-mark stage-mark-alert', '!!'));
        await pause(70);
      }
      (sign as HTMLElement | null)?.classList.add('nothing-sign-drop');
      const stuck = hanging as { member: Member; lift: number } | null;
      if (stuck) await tween(280, t => stuck.member.place(stuck.member.x, stuck.lift * (1 - t * t)));
      team.forEach(member => member.pose({ arms: true, face: 'angry' }));
      await pause(200);
      alarms.forEach(alarm => alarm.remove());
      await stomping;
      void fadeOut(call).catch(() => {});
      return { boss, team };
    }

    // A red sheet thrown by two of the crew from over their heads up onto a patch, where it floats down and hangs still.
    async function throwSheet(center: { x: number; y: number; box: { w: number; h: number } }, first: Member, second: Member) {
      const cloth = spawn('red-sheet', actors);
      const width = center.box.w + 28;
      const height = center.box.h + 32;
      Object.assign(cloth.style, { width: `${width}px`, height: `${height}px` });
      // It flies up bunched into a bundle high above the patch, opens out in the air and floats down onto it like a
      // blanket, swaying and rippling less and less until it lands.
      const from = { x: (first.x + second.x) / 2 + CREW_W / 2, y: groundY() - CREW_H - 10 };
      const top = { x: center.x, y: center.y - center.box.h / 2 - 10 };
      const high = top.y - 70;
      const place = (x: number, y: number, extra = '') => { cloth.style.transform = `translate(${x - width / 2}px, ${y}px) ${extra}`; };
      first.pose({ arms: true });
      second.pose({ arms: true });
      await tween(380, t => {
        const eased = 1 - (1 - t) * (1 - t);
        place(from.x + (top.x - from.x) * eased, from.y + (high - from.y) * eased, `scale(.25, .15) rotate(${(1 - eased) * -40}deg)`);
      });
      first.pose({ arms: false });
      second.pose({ arms: false });
      await tween(220, t => {
        const eased = 1 - (1 - t) ** 3;
        place(top.x, high - 4 * eased, `scale(${.25 + .75 * eased}, ${.15 + .6 * eased})`);
      });
      await tween(650, t => {
        const eased = 1 - (1 - t) * (1 - t);
        const calm = 1 - t;
        place(top.x + Math.sin(t * Math.PI * 2) * 12 * calm, high - 4 + (top.y - high + 4) * eased,
          `rotate(${Math.sin(t * Math.PI * 2) * 6 * calm}deg) skewX(${Math.sin(t * Math.PI * 3) * 9 * calm}deg) scale(1, ${.75 + .25 * eased})`);
      });
      place(top.x, top.y);
      return cloth;
    }

    // A paint bucket held in a crew member's hand.
    function bucket(member: Member) {
      const element = spawn('paint-bucket', member.element);
      element.innerHTML = pixelMarkup(BUCKET);
      return element;
    }

    // A glob of paint thrown along an arc at a patch; it splats over it and dries into the wall's own colour.
    async function throwPaint(member: Member, target: { x: number; y: number; box: { w: number; h: number } }, hole: HTMLElement | null) {
      const direction = target.x > member.x + CREW_W / 2 ? 1 : -1;
      member.pose({ facing: direction, arms: true });
      const from = { x: member.x + CREW_W / 2 + direction * 8, y: groundY() - CREW_H - member.lift };
      const glob = spawn('paint-glob', actors);
      const peak = Math.min(from.y, target.y) - 50;
      const control = 2 * peak - (from.y + target.y) / 2;
      await tween(420, t => {
        const x = from.x + (target.x - from.x) * t;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * control + t * t * target.y;
        glob.style.transform = `translate(${x}px, ${y}px)`;
      });
      glob.remove();
      member.pose({ arms: false });
      const splat = spawn('paint-splat', actors);
      const size = Math.max(target.box.w, target.box.h) * 1.5;
      Object.assign(splat.style, { left: `${target.x - size / 2}px`, top: `${target.y - size / 2}px`, width: `${size}px`, height: `${size * .8}px` });
      splat.addEventListener('animationend', () => splat.remove());
      for (let index = 0; index < 5; index++) {
        const drop = spawn('paint-drop', actors);
        const angle = Math.random() * Math.PI * 2;
        Object.assign(drop.style, { left: `${target.x}px`, top: `${target.y}px` });
        drop.style.setProperty('--dx', `${Math.cos(angle) * (size * .6 + Math.random() * 12)}px`);
        drop.style.setProperty('--dy', `${Math.sin(angle) * (size * .5 + Math.random() * 10)}px`);
        drop.addEventListener('animationend', () => drop.remove());
      }
      hole?.classList.add('hole-covered');
    }

    // Scene 2: they dash off the screen for paint and come back with buckets. One drops its bucket on the way, which
    // leaves a puddle; it picks the bucket up and carries on. Then they throw paint at every patch.
    async function paintHoles(team: Member[]) {
      const width = stageEl.clientWidth;
      const sides = team.map(member => member.x < width / 2 ? -1 : 1);
      // The one who drops its bucket is the one with the sign (far right): it overshoots into the open middle of the
      // screen on the way back, and that is where the puddle ends up.
      const dropper = 4;
      team.forEach(member => member.pose({ arms: false, face: 'normal' }));
      stageEl.querySelector('.nothing-sign')?.remove();
      await Promise.all(team.map(async (member, index) => {
        await pause(index * 60);
        await member.walk(sides[index] < 0 ? -CREW_W - 30 : width + 30, DASH_SPEED);
      }));
      await pause(150);

      const low = [...stageEl.querySelectorAll<HTMLElement>('.stage-hole-low')];
      const high = [...stageEl.querySelectorAll<HTMLElement>('.stage-hole-high')];
      const buckets = team.map(member => bucket(member));
      let puddle: { element: HTMLElement; x: number } | null = null;

      await Promise.all(team.map(async (member, index) => {
        await pause(index * 60);
        // Each low patch is painted by the first of those who hid it; anyone else comes back to the middle.
        const patch = COVER.findIndex(cover => cover.members[0] === index);
        const hole = patch >= 0 ? low[patch] : undefined;
        const center = hole ? holeCenter(hole) : null;
        const spot = center ? center.x - sides[index] * 60 - CREW_W / 2 : width * .5;
        if (index === dropper) {
          // On the way back, in the open middle of the screen, the bucket slips out of its hand, tips over and spills.
          await member.walk(width * .62, DASH_SPEED);
          const pail = buckets[index];
          const start = boxOf(pail);
          pail.remove();
          const falling = spawn('paint-bucket paint-bucket-loose', actors);
          falling.innerHTML = pixelMarkup(BUCKET);
          const direction = spot > member.x ? 1 : -1;
          const landX = start.x + direction * 34;
          const landY = groundY() - 12;
          await tween(300, t => { falling.style.transform = `translate(${start.x + (landX - start.x) * t}px, ${start.y + (landY - start.y) * t * t - Math.sin(Math.PI * t) * 14}px) rotate(${direction * 90 * t}deg)`; });
          const spill = spawn('puddle');
          spill.style.left = `${landX + direction * 8}px`;
          puddle = { element: spill, x: landX + direction * 8 };
          await tween(250, t => { spill.style.width = `${70 * t}px`; if (direction < 0) spill.style.left = `${landX - 8 - 70 * t}px`; });
          if (direction < 0) puddle.x = landX - 8 - 70;
          const oops = over(member.element, 'stage-mark', '…');
          member.pose({ face: 'tired' });
          await member.walk(landX - direction * 18, CREW_WALK);
          await pause(100);
          falling.remove();
          buckets[index] = bucket(member);
          oops.remove();
          member.pose({ face: 'normal' });
          await member.walk(spot, DASH_SPEED);
        } else {
          await member.walk(spot, DASH_SPEED);
        }
        if (hole && center) await throwPaint(member, center, hole);
      }));

      // The patches up high, shared out among the crew.
      await Promise.all(team.map(async (thrower, index) => {
        for (const hole of high.filter((_, holeIndex) => holeIndex % team.length === index)) {
          const center = holeCenter(hole);
          await thrower.walk(center.x - 40, DASH_SPEED);
          await throwPaint(thrower, center, hole);
        }
      }));
      buckets.forEach(pail => pail.remove());
      return { puddle: puddle as { element: HTMLElement; x: number } | null, dropper: team[dropper] };
    }

    // Scene 3: one of the crew runs across and slips on the puddle, a second one trips over it; they get up furious and
    // brawl until the boss yells at them to stop (and its stomp lays down the ground line).
    async function slipAndFight(team: Member[], boss: ReturnType<typeof robot>, puddle: { element: HTMLElement; x: number } | null) {
      const width = stageEl.clientWidth;
      const slider = team[2];
      const tripper = team[3];
      // First the stage is cleared: the rest step back to watch, near the boss and at the far right, and the two about
      // to fall line up on the right, so the slip and the brawl happen alone in the middle.
      const spots: [Member, number][] = [[team[0], .2], [team[1], .26], [team[4], .92], [slider, .8], [tripper, .86]];
      await Promise.all(spots.map(([member, fraction]) => member.walk(width * fraction, DASH_SPEED)));
      await pause(150);
      const puddleX = puddle ? puddle.x : width * .5;
      const puddleWidth = puddle ? puddle.element.offsetWidth : 0;
      const direction = puddleX < slider.x ? -1 : 1;
      const slipAt = (direction < 0 ? puddleX + puddleWidth - 20 : puddleX + 20) - CREW_W / 2;
      const slideTo = slipAt + direction * width * .08;

      const chase = (async () => { await pause(250); await tripper.walk(slideTo - direction * 34, RUN_SPEED); })();
      await slider.walk(slipAt, RUN_SPEED);
      await tween(800, t => {
        const eased = 1 - (1 - t) * (1 - t);
        slider.place(slipAt + (slideTo - slipAt) * eased, Math.sin(Math.PI * Math.min(1, t * 2)) * 10);
        slider.pose({ tilt: -90 * Math.min(1, t * 1.8) });
      });
      await chase;
      const tripFrom = tripper.x;
      await tween(600, t => {
        tripper.place(tripFrom + direction * 70 * t, Math.sin(Math.PI * t) * 18);
        tripper.pose({ tilt: 90 * Math.min(1, t * 1.3) });
      });
      await pause(400);

      await tween(300, t => { slider.pose({ tilt: -90 * (1 - t) }); tripper.pose({ tilt: 90 * (1 - t) }); });
      const [left, right] = slider.x < tripper.x ? [slider, tripper] : [tripper, slider];
      left.pose({ face: 'angry', facing: 1 });
      right.pose({ face: 'angry', facing: -1 });
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
      skip.current?.coverEyes(true);
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

      boss.draw('jump', 'angry');
      const stop = over(boss.element, 'stage-shout font-mono', lines.stop);
      skip.current?.coverEyes(false);
      // One big stomp, and the ground line spreads out from where it lands.
      await boss.hop(22, 460);
      const spreading = spreadGroundLine(boss);
      clearInterval(debris);
      intervals.delete(debris);
      cloud.remove();
      left.place(middle - CREW_W / 2 - 34);
      right.place(middle - CREW_W / 2 + 34);
      left.pose({ face: 'tired', facing: -1 });
      right.pose({ face: 'tired', facing: 1 });
      slider.element.style.opacity = '1';
      tripper.element.style.opacity = '1';
      boss.draw('idle', 'angry');
      await pause(800);
      await fadeOut(stop);
      await spreading;
    }

    // Scene 4: the one who spilled the paint mops the puddle up.
    async function mop(member: Member, puddle: { element: HTMLElement; x: number } | null) {
      if (!puddle) return;
      const width = puddle.element.offsetWidth;
      const start = puddle.x + width + 6;
      const tool = spawn('stage-mop', member.element);
      await member.walk(start, ANNOYED_WALK);
      member.pose({ facing: -1 });
      member.legs(true);
      await tween(1600, t => {
        const reach = start - (width + 6) * t;
        member.place(reach + Math.abs(Math.sin(t * Math.PI * 4)) * 14);
        puddle.element.style.width = `${Math.max(0, reach - puddle.x - 6)}px`;
      });
      member.legs(false);
      puddle.element.remove();
      await pause(250);
      tool.remove();
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
    async function spreadGroundLine(boss: ReturnType<typeof robot>) {
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
      if (!list) return;
      const listBox = boxOf(list);
      // From the window's left edge to its right edge, in the section's coordinates.
      const sectionLeft = stageEl.getBoundingClientRect().left;
      const wall = { x: -sectionLeft, w: document.documentElement.clientWidth };
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
          // No line out past the list's ends: the runner leaps from the edge of the screen onto its line and off the
          // far end of it again.
          const end = right - CREW_W;
          const leap = x < left ? Math.sin(Math.PI * (x - from) / (left - from)) : x > end ? Math.sin(Math.PI * (x - end) / (to - end)) : 0;
          runner.place(x, lift + leap * RUNNER_LEAP);
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

      await leap(writer, titleBox.x - 5 + reach, lift, 450, 40);
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
      await pause(250);

      // It looks at what it wrote... and turns the pencil around.
      const oops = over(writer.element, 'stage-mark', '?');
      await pause(450);
      oops.remove();
      pencil.classList.add('giant-pencil-erasing');
      await pause(150);
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
      await pause(200);
      await write(lines.keep, text);
      await pause(150);

      // Done: the real title takes over and the writer jumps back down.
      title.style.transition = 'none';
      title.classList.add('is-built');
      draft.remove();
      pencil.remove();
      await leap(writer, Math.min(stageEl.clientWidth - CREW_W, writer.x + 40), 0, 400, 20);
    }

    // A crew member carries a piece of the section over its head (a copy of it), walks a few steps and throws it up into
    // place, where the real pieces appear with a little bounce. The e-mail's carrier drops the "@" on the way and has
    // to chase it and click it back in before throwing.
    async function deliver(member: Member, piece: HTMLElement, targets: HTMLElement[], dropAt = false, walk = true) {
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
      if (walk) await member.walk(member.x + direction * 40, ANNOYED_WALK);
      else { member.pose({ facing: direction }); await pause(150); }

      if (dropAt) {
        // The "@" pops off the pile, bounces on the ground and rolls away; just as the robot is about to catch it, it
        // rolls off again; the second time the robot pounces on it.
        const text = carried.textContent ?? '';
        const at = text.indexOf('@');
        if (at >= 0) {
          carried.innerHTML = `${text.slice(0, at)}<span class="carried-gap">@</span>${text.slice(at + 1)}`;
          const gap = carried.querySelector<HTMLElement>('.carried-gap');
          const start = gap ? boxOf(gap) : boxOf(carried);
          const sign = spawn('fallen-at', actors, '@');
          const groundTop = groundY() - 26;
          let signX = start.x;
          let spin = 0;
          const put = (x: number, y: number) => { signX = x; sign.style.transform = `translate(${x}px, ${y}px) rotate(${spin}deg)`; };
          // Up out of the pile, down to the ground, two shrinking bounces.
          await tween(500, t => { spin = direction * t * 200; put(start.x + direction * 30 * t, start.y - 34 * Math.sin(Math.PI * Math.min(1, t * 1.4)) + (groundTop - start.y) * t * t); });
          for (const height of [18, 8]) {
            const bounceX = signX;
            await tween(200, t => { spin += direction * 6; put(bounceX + direction * 14 * t, groundTop - Math.sin(Math.PI * t) * height); });
          }
          const roll = async (distance: number, duration: number) => {
            const fromX = signX;
            await tween(duration, t => { spin += direction * 9; put(fromX + direction * distance * (1 - (1 - t) * (1 - t)), groundTop); });
          };
          void skip.current?.laugh().catch(() => {});
          await roll(130, 600);
          const alarm = over(member.element, 'stage-mark stage-mark-alert', '!!');
          await pause(350);
          alarm.remove();
          // First try: it runs over, and the "@" rolls off again right under its nose.
          await member.walk(signX - direction * 30, RUN_SPEED);
          await roll(80, 450);
          const huff = over(member.element, 'stage-mark stage-mark-alert', '!');
          await pause(200);
          huff.remove();
          // Second try: it leaps onto it.
          const leapFrom = member.x;
          const target = signX - direction * 4;
          await tween(350, t => member.place(leapFrom + (target - leapFrom) * t, Math.sin(Math.PI * t) * 22));
          member.pose({ facing: direction });
          await pause(100);
          // Back into the e-mail with a click and a twinkle.
          const back = gap ? boxOf(gap) : boxOf(carried);
          const from = { x: signX, y: groundTop };
          await tween(350, t => { spin = 0; put(from.x + (back.x - from.x) * t, from.y + (back.y - from.y) * t - Math.sin(Math.PI * t) * 30); });
          sign.remove();
          gap?.classList.remove('carried-gap');
          const click = spawn('fight-twinkle stage-click', actors, '✦');
          Object.assign(click.style, { left: `${back.x}px`, top: `${back.y}px` });
          click.addEventListener('animationend', () => click.remove());
          await pause(250);
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
      // A little hop to put some strength into the throw; the piece goes up past its place and drops into it.
      const standX = member.x;
      const standLift = member.lift;
      const hop = tween(250, t => member.place(standX, standLift + Math.sin(Math.PI * t) * 10));
      const peak = Math.min(start.y, target.y) - 70;
      const control = 2 * peak - (start.y + target.y) / 2;
      await tween(650, t => {
        const x = start.x + (target.x - start.x) * t;
        const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control + t * t * target.y;
        flyer.style.transform = `translate(${x}px, ${y}px) scale(${scale + (1 - scale) * t}) rotate(${Math.sin(Math.PI * t) * -6}deg)`;
      });
      await hop;
      member.pose({ arms: false });
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
      // A row's three pieces (label, value, action) thrown by one robot, one after the other; only the first throw
      // needs a few steps first. The e-mail's value is the one whose "@" falls off.
      const throwRow = async (member: Member, row: HTMLElement, dropAt = false) => {
        const parts = [...row.children] as HTMLElement[];
        for (const [index, part] of parts.entries()) {
          await deliver(member, part, [part], dropAt && part.classList.contains('contact-value'), index === 0);
        }
      };
      const [email, ...others] = rows;
      const jobs: (() => Promise<void>)[] = [];
      if (status) jobs.push(() => deliver(crew[0], status, [status]));
      others.forEach((row, index) => jobs.push(() => throwRow(crew[(index + 2) % crew.length], row)));
      await Promise.all(jobs.map(async (job, index) => { await pause(index * 300); await job(); }));
      // The e-mail comes last; while its robot is busy chasing the "@" it dropped, another one quietly throws the
      // footer's two notes into place.
      await Promise.all([
        email ? throwRow(crew[1], email, true) : Promise.resolve(),
        (async () => {
          await pause(FOOTER_AFTER);
          for (const note of footerTexts) await deliver(crew[crew.length - 1], note, [note]);
        })(),
      ]);
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
      // The backdrop unrolls downwards from the top of the park.
      const sky = showPart(part('.ending-sky'));
      if (sky) sky.style.clipPath = 'inset(0 0 100% 0)';
      await tween(1300, t => {
        if (sky) sky.style.clipPath = `inset(0 0 ${100 * (1 - smooth(t))}% 0)`;
        pullers.forEach(member => member.place(member.x, GRASS + Math.abs(Math.sin(t * Math.PI * 3)) * 4));
      });
      if (sky) sky.style.clipPath = '';
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

      const hills = showPart(part('.ending-hills'), { y: 20 });
      if (hills) hills.style.clipPath = 'inset(100% 0 0 0)';
      const rising = hills ? tween(900, t => { movePart(hills, { y: 20 * (1 - smooth(t)) }); hills.style.clipPath = `inset(${100 * (1 - smooth(t))}% 0 0 0)`; }).then(() => { hills.style.clipPath = ''; }) : Promise.resolve();

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
        // Walking along the lake's far edge, at its height.
        const edge = groundY() - lakeBox.y;
        const roller = crew();
        roller.place(lakeBox.x - CREW_W, edge);
        roller.pose({ facing: 1 });
        roller.legs(true);
        const fromX = roller.x;
        const toX = lakeBox.x + lakeBox.w - CREW_W / 2;
        await tween((toX - fromX) / 260 * 1000, t => {
          const x = fromX + (toX - fromX) * t;
          roller.place(x, edge);
          lake.style.scale = `${Math.min(1, Math.max(0, (x + CREW_W / 2 - lakeBox.x) / lakeBox.w))} 1`;
        });
        roller.legs(false);
        lake.style.scale = '1 1';
        void (async () => { await leap(roller, roller.x + 40, GRASS, 450, 16); await leave(roller, width + 40); })().catch(() => {});
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
      const spreaderOff = leave(spreader, stageEl.clientWidth + 40);
      // Someone else brings the basket in from the right and sets it down.
      const basketBox = boxOf(basket);
      const bringer = helper(stageEl.clientWidth + 40);
      bringer.pose({ arms: true });
      showPart(basket);
      const hold = (x: number) => movePart(basket, { x: x + CREW_W / 2 - (basketBox.x + basketBox.w / 2), y: -CREW_H + 4 });
      hold(bringer.x);
      await walkOnGrass(bringer, basketBox.x + basketBox.w / 2 - CREW_W / 2, CREW_WALK, hold);
      await tween(250, t => movePart(basket, { y: (-CREW_H + 4) * (1 - t) }));
      bringer.pose({ arms: false });
      await Promise.all([spreaderOff, leave(bringer, stageEl.clientWidth + 40)]);
    }

    // The bench comes last: the boss taps its foot until two of the crew bring it, then sits down with a sigh and the
    // pigeons fly in.
    async function bench(boss: ReturnType<typeof robot>, waiting: Promise<unknown>) {
      const seat = part('.ending-bench');
      if (!seat) return;
      // While it waits, now and then a short fit of impatience: tapping its foot, huffing, rolling its eyes up.
      let tapping = true;
      const impatience = (async () => {
        const fits = [
          async () => { const dots = over(boss.element, 'stage-mark', '…'); for (let tap = 0; tap < 3; tap++) await boss.hop(3, 220); dots.remove(); },
          async () => { boss.draw('idle', 'angry'); puff(boss.element, 'left'); await pause(500); boss.draw('idle', 'normal'); },
          async () => { boss.draw('blink', 'normal'); await pause(600); boss.draw('idle', 'normal', 'right'); await pause(400); boss.draw('idle', 'normal'); },
        ];
        for (let fit = 0; tapping; fit++) {
          await fits[fit % fits.length]();
          for (let wait = 0; wait < 8 && tapping; wait++) await pause(200);
        }
        boss.draw('idle', 'normal');
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
      showPart(sitting);
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

    async function buildPark(boss: ReturnType<typeof robot>, team: Member[]) {
      // Everyone steps up onto the grass; the crew clear the stage to watch from two gaps in the park (clapping now and
      // then: a little hop with their arms up) until it's time for their hats.
      const width = stageEl.clientWidth;
      const bossY = boss.y;
      void tween(250, t => boss.place(boss.x, bossY - GRASS * t - Math.sin(Math.PI * t) * 8)).catch(() => {});
      const seats = [.3, .34, .38, .68, .72];
      await Promise.all(team.map(async (member, index) => {
        await leap(member, member.x, GRASS, 250, 8);
        await walkOnGrass(member, width * seats[index % seats.length]);
        member.pose({ facing: index < 3 ? -1 : 1 });
      }));
      let watching = true;
      const cheering = (async () => {
        for (let round = 0; watching; round++) {
          const fan = team[round % team.length];
          fan.pose({ arms: true });
          await tween(260, t => fan.place(fan.x, GRASS + Math.sin(Math.PI * t) * 5));
          fan.pose({ arms: false });
          for (let wait = 0; wait < 5 && watching; wait++) await pause(200);
        }
      })();
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
      watching = false;
      await cheering;
      await celebrate(team);
    }

    async function run() {
      await pause(200);
      const { boss, team } = await arrive();
      await pause(200);
      const { puddle, dropper } = await paintHoles(team);
      await pause(200);
      const lining = runLines();
      await slipAndFight(team, boss, puddle);
      await lining;
      await pause(200);
      // The title's writer (the leftmost of the others) sets off half a second after the one with the mop.
      const mopping = mop(dropper, puddle);
      await pause(500);
      const crew = team;
      await Promise.all([mopping, writeTitle(crew.filter(member => member !== dropper).sort((a, b) => a.x - b.x)[0])]);
      await pause(300);
      await placeWords(crew);
      await pause(400);
      parkStarted = true;
      void skipFinale().catch(() => {});
      await buildPark(boss, crew);
      // The happy ending stays; the stage is handed over to the finished section, and since the visitor watched it all,
      // the WhatsApp button's gag is armed for its first click.
      await pause(600);
      armZapGag();
      setStage('done');
    }

    const viewObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }, { threshold: .3 });
    viewObserver.observe(stageEl);
    document.addEventListener('visibilitychange', resume);
    // The skip robot, hanging on its rope at the top of the section. Its face is redrawn by hand (blinks, looks, moods);
    // it waves at first, then hangs back calmly with popcorn watching the show, reacts to it (flinches at the boss's
    // order, can't watch the brawl, laughs at the runaway "@"), and every so often comes down on its rope
    // with a joke on its sign, making the matching face; before the park it throws its sign away.
    let parkStarted = false;
    let skipFace: { pose: RobotPose; mood: RobotMood } = { pose: 'idle', mood: 'happy' };
    let skipBusy = false;
    const skipDraw = (pose: RobotPose, mood: RobotMood, look?: 'left' | 'right') => {
      const body = skipBodyRef.current;
      if (body) body.innerHTML = robotMarkup(pose, mood, look);
    };
    const skipSet = (pose: RobotPose, mood: RobotMood) => { skipFace = { pose, mood }; skipDraw(pose, mood); };
    const skipClass = (name: string, on: boolean) => skipRef.current?.classList.toggle(name, on);
    // While hanging back it blinks now and then and its eyes follow the action.
    async function skipIdle() {
      const looks: ('left' | 'right' | undefined)[] = ['left', undefined, 'left', 'right', 'left', undefined];
      for (let index = 0; ; index++) {
        await pause(900 + (index % 3) * 400);
        if (skipBusy) continue;
        skipDraw(skipFace.pose, skipFace.mood, looks[index % looks.length]);
        if (index % 3 === 2) {
          skipDraw('blink', 'normal');
          await pause(130);
          skipDraw(skipFace.pose, skipFace.mood, looks[index % looks.length]);
        }
      }
    }
    skip.current = {
      flinch: async () => {
        if (skipBusy) return;
        skipBusy = true;
        skipDraw('blink', 'normal');
        skipClass('skip-flinch', true);
        await pause(700);
        skipClass('skip-flinch', false);
        skipDraw(skipFace.pose, skipFace.mood);
        skipBusy = false;
      },
      coverEyes: (on: boolean) => {
        if (skipBusy && on) return;
        skipBusy = on;
        // Hands up to its head, eyes droopy: it can't watch.
        if (on) skipDraw('carry', 'sad'); else skipDraw(skipFace.pose, skipFace.mood);
        skipClass('skip-covering', on);
      },
      laugh: async () => {
        if (skipBusy) return;
        skipBusy = true;
        skipDraw('idle', 'happy');
        skipClass('skip-laughing', true);
        await pause(1200);
        skipClass('skip-laughing', false);
        skipDraw(skipFace.pose, skipFace.mood);
        skipBusy = false;
      },
    };
    // Down the rope with a joke and the face that goes with it, then back up.
    const JOKE_FACES: { mood: RobotMood; wink?: boolean; nervous?: boolean }[] = [{ mood: 'sad' }, { mood: 'happy', wink: true }, { mood: 'normal', nervous: true }];
    async function peek(line: string, face: { mood: RobotMood; wink?: boolean; nervous?: boolean }) {
      skipBusy = true;
      setSkipMode('peek');
      setSkipLine(line);
      skipDraw('idle', face.mood);
      await pause(500);
      if (face.wink) {
        for (let wink = 0; wink < 2; wink++) { skipDraw('blink', 'normal'); await pause(150); skipDraw('idle', face.mood); await pause(350); }
      } else if (face.nervous) {
        skipClass('skip-nervous', true);
        for (let look = 0; look < 4; look++) { skipDraw('idle', face.mood, look % 2 ? 'right' : 'left'); await pause(250); }
        skipClass('skip-nervous', false);
        skipDraw('idle', face.mood);
      } else {
        await pause(1000);
      }
      await pause(500);
      setSkipLine(null);
      setSkipMode('quiet');
      skipDraw(skipFace.pose, skipFace.mood);
      skipBusy = false;
    }
    async function skipRobot() {
      // A few seconds swinging on its rope, waving its sign, in full view.
      skipSet('idle', 'happy');
      await pause(3000);
      setSkipMode('quiet');
      skipSet('idle', 'normal');
      void skipIdle().catch(() => {});
      for (const [index, joke] of lines.jokes.entries()) {
        await pause(SKIP_PEEK_EVERY);
        if (parkStarted) return;
        await peek(joke, JOKE_FACES[index % JOKE_FACES.length]);
      }
    }
    // Just before the park: one last joke, and away goes the sign; then it settles back with its popcorn.
    async function skipFinale() {
      await peek(lines.finale, { mood: 'happy' });
      skipClass('skip-no-sign', true);
    }
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });
    skipRobot().catch(error => { if (!(error instanceof Cancelled)) throw error; });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      waiters.forEach(resolve => resolve());
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', resume);
      actors.replaceChildren();
      skip.current = null;
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
      <div className="stage-holes" aria-hidden="true">
        {DEFECTS.map((hole, index) => (
          <span key={index} className={`stage-hole stage-hole-${hole.level}`} style={hole.style}>
            {hole.kind === 'patch' && <span className="defect-fill" />}
            {hole.kind === 'chips' && [0, 1, 2].map(chip => <span key={chip} className={`defect-fill defect-chip defect-chip-${chip}`} />)}
            {hole.peel && <span className="defect-peel" />}
            {(hole.kind === 'crack' || hole.cracks) && (
              <svg className={`defect-crack${hole.kind === 'patch' ? ' defect-crack-out' : ''}`} viewBox="0 0 100 50" preserveAspectRatio="none">
                <path d="M0 6 L12 10 L20 20 L34 18 L42 28 L56 26 L64 36 L78 38 L88 46 L100 50 M34 18 L38 8 L48 4 M64 36 L70 46" />
              </svg>
            )}
          </span>
        ))}
      </div>
      <div className="contact-built">{children}</div>
      <div ref={actorsRef} className="stage-actors" aria-hidden="true" />
      {stage !== 'done' && (
        // Hanging on a rope from a pulley at the end of the line above, just past the section's right edge, its sign
        // hanging under its seat on two strings (and some popcorn while it watches). Hovering brings it down.
        <button ref={skipRef} type="button" className="skip-robot" data-mode={skipMode} aria-label={skipLabel} onClick={() => { skipZapGag(sectionRef.current); setStage('done'); }}>
          <span className="skip-pulley" aria-hidden="true" />
          <span className="skip-swing" aria-hidden="true">
            <span className="skip-rope" />
            <span className="skip-rider">
              {/* A bosun's chair: the rope splits above its head into two lines down to a little plank it sits on. */}
              <svg className="skip-bridle" viewBox="0 0 41 50" preserveAspectRatio="none"><path d="M20.5 0 L1 50 M20.5 0 L40 50" /></svg>
              <span className="skip-seat" />
              <span ref={skipBodyRef} className="skip-body" />
              <span className="skip-popcorn" />
              <span className="skip-strings" />
              <span className="skip-sign font-mono">
                <span className="skip-label">{skipLabel}</span>
                {skipLine && <span className="skip-joke">{skipLine}</span>}
              </span>
            </span>
          </span>
        </button>
      )}
    </section>
  );
}
