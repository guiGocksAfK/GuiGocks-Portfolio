'use client';

import { useEffect } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { finishScene } from '@/components/scene';

// Teleporting around the page. Clicking one of the site's shortcuts (the menu, the logo, a project link in a crate, the
// footer's lift) doesn't scroll: the link sinks in with a spark, the screen breaks up into pixels bubbling out from
// where the visitor clicked, a short trip screen shows where they're going (with speed lines rushing the right way)
// while the page jumps behind it, and the pixels clear away from the destination's title outwards. A section that
// is built by robots (About, Contact) is delivered already built. Then a robot materializes next to the destination's
// title, looks around, points at it and walks off; about one time in seven the teleport glitches (it arrives upside
// down, twice, in two halves or charred). On the visit's first teleport from the menu, an operator robot pops up behind
// the link and pulls a lever first. The skip link, links opened straight from the address bar and reduced motion keep
// plain scrolling.

// About 1.1s in all: out (~.42s), the trip (~.22s), in (~.44s), with the arriving robot starting before the end.
const CELL = 20; // px, the size of the pixels the screen breaks into
const COVER = 220; // ms for the wave of pixels to reach the far corner (it starts slowly and speeds up)
const GROW = 150; // ms for a pixel to grow in, overshooting a little
const TRAIL = 150; // ms of colour behind the wave's front, from light blue to the page's colour
const HOLD = 220; // ms of the trip screen: the destination's name and speed lines
const REVEAL = 260; // ms for the pixels to clear away from the destination's title (fast at first, then settling)
const SHRINK = 140; // ms for a pixel to shrink away
const JITTER = 50;
const OPEN_AT = .45; // how far into the reveal the robot starts beaming in
const LIGHT = '#a3bcff';
const DEEP = '#1d2540';
const GLITCH_CHANCE = .15;
const BOT_W = 24;
const BOT_H = 27;
const SHORTCUTS = '.nav-link[href^="#"], .wordmark[href^="#"], .crate-details a[href^="#"]';
// Where each destination's title is, for the robot to arrive next to it.
const TITLES: Record<string, string> = { main: '#hero-title', projetos: '#projects-title', sobre: '#about-title', capacidades: '#capabilities-title', contato: '#contact-title' };

type Teleport = (href: string, origin?: Element | null) => Promise<void>;
let active: Teleport | null = null;
let operatorDone = false;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Grows a little past full size and settles back (0..1 → 0..1, peaking about 1.05).
const overshoot = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>(resolve => {
  const start = performance.now();
  const step = (now: number) => { const t = Math.min(1, (now - start) / duration); onFrame(t); if (t < 1) requestAnimationFrame(step); else resolve(); };
  requestAnimationFrame(step);
});

// Where the page has to be for a destination, and the element to focus once there.
function destination(href: string) {
  const id = href.slice(1);
  const element = document.getElementById(id);
  if (!element) return null;
  if (id === 'main') return { top: 0, title: document.querySelector<HTMLElement>(TITLES.main) ?? element };
  const box = element.closest<HTMLElement>('.project-card') ?? element;
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const title = TITLES[id] ? document.querySelector<HTMLElement>(TITLES[id]) : null;
  return { top: Math.max(0, box.getBoundingClientRect().top + window.scrollY - padding), title: title ?? element };
}

// A plain jump (reduced motion, or no teleporter on the page).
function jump(href: string) {
  const target = destination(href);
  if (!target) return;
  window.scrollTo({ top: target.top, behavior: 'instant' });
  history.pushState(null, '', href);
  focusTitle(target.title);
}

function focusTitle(title: HTMLElement) {
  if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
  title.focus({ preventScroll: true });
}

// What the trip screen calls a destination: the menu's name for a section, a project's name, "home" for the top.
function labelFor(href: string, home: string) {
  if (href === '#main') return home;
  const menu = document.querySelector(`header a[href="${href}"]`)?.textContent?.trim();
  return menu || document.getElementById(href.slice(1))?.textContent?.trim() || home;
}

// Where the robot will beam in next to a title: the end of its last line (in the window's coordinates).
function titleSpot(title: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(title);
  const lines = [...range.getClientRects()].filter(rect => rect.width > 0);
  const box = lines.length ? lines[lines.length - 1] : title.getBoundingClientRect();
  return { x: Math.min(box.right, window.innerWidth - 20), y: box.top + box.height / 2 };
}

// Teleports to a destination on the page ("#projetos", "#main", ...); origin is what was clicked.
export function teleport(href: string, origin?: Element | null) {
  if (active && !reducedMotion()) return active(href, origin);
  jump(href);
  return Promise.resolve();
}

export function Teleporter({ homeLabel }: { homeLabel: string }) {
  useEffect(() => {
    let busy = false;
    const layer = document.createElement('div');
    layer.className = 'tp-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    // The trip screen draws the destination's name in the pixel font: load it now so it's ready by the first click.
    const pixelFont = getComputedStyle(document.body).getPropertyValue('--font-pixel').trim();
    if (pixelFont) void document.fonts.load(`700 26px ${pixelFont}`).catch(() => {});

    // What the pixels are drawn on, over the whole window.
    function screen() {
      const canvas = document.createElement('canvas');
      canvas.className = 'tp-screen';
      canvas.setAttribute('aria-hidden', 'true');
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      document.body.appendChild(canvas);
      const context = canvas.getContext('2d')!;
      context.scale(ratio, ratio);
      const styles = getComputedStyle(document.documentElement);
      const page = styles.getPropertyValue('--background').trim() || '#0d0f12';
      const accent = styles.getPropertyValue('--accent').trim() || '#6994ff';
      const font = getComputedStyle(document.body).getPropertyValue('--font-pixel').trim() || 'monospace';
      const cols = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);
      const cells = Array.from({ length: cols * rows }, (_, index) => ({ x: (index % cols) * CELL, y: Math.floor(index / cols) * CELL, delay: 0 }));
      // How far a wave starting at a point has to travel to reach every corner.
      const farthest = (from: { x: number; y: number }) => Math.max(...[[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => Math.hypot(x - from.x, y - from.y)));
      const distance = (cell: (typeof cells)[number], from: { x: number; y: number }) => Math.hypot(cell.x + CELL / 2 - from.x, cell.y + CELL / 2 - from.y);
      // A pixel of the given size (0..1+ of a cell), centred in its cell.
      const square = (cell: (typeof cells)[number], size: number, color: string) => {
        if (size <= .02) return;
        const side = CELL * size + .5;
        context.fillStyle = color;
        context.fillRect(cell.x + (CELL - side) / 2, cell.y + (CELL - side) / 2, side, side);
      };
      // The wave's colours: light blue at its front, the accent just behind, a dark blue, then the page's own colour.
      const tint = (age: number) => age < TRAIL * .3 ? LIGHT : age < TRAIL * .65 ? accent : age < TRAIL ? DEEP : page;
      return {
        // Out: pixels bubble up from where the visitor clicked, each growing from nothing to a little more than a
        // cell and back, in a wave that starts slowly and swallows the screen at the end.
        async cover(from: { x: number; y: number }) {
          const far = farthest(from);
          cells.forEach(cell => { cell.delay = Math.sqrt(distance(cell, from) / far) * COVER + Math.random() * JITTER; });
          await tween(COVER + JITTER + TRAIL, t => {
            const now = t * (COVER + JITTER + TRAIL);
            context.clearRect(0, 0, width, height);
            for (const cell of cells) {
              const age = now - cell.delay;
              if (age > 0) square(cell, overshoot(Math.min(1, age / GROW)), tint(age));
            }
          });
        },
        // The trip: the destination's name in the middle of the screen and speed lines rushing the way the page is going.
        async travel(label: string, down: boolean) {
          const streaks = Array.from({ length: 26 }, () => ({ x: Math.random() * width, y: Math.random() * height, length: 40 + Math.random() * 90, speed: 900 + Math.random() * 900, alpha: .15 + Math.random() * .3 }));
          const text = `${down ? '↓' : '↑'} ${label.toUpperCase()}`;
          await tween(HOLD, t => {
            context.fillStyle = page;
            context.fillRect(0, 0, width, height);
            context.fillStyle = accent;
            for (const streak of streaks) {
              const y = ((streak.y + (down ? -1 : 1) * streak.speed * t * HOLD / 1000) % (height + streak.length) + height + streak.length) % (height + streak.length) - streak.length;
              context.globalAlpha = streak.alpha;
              context.fillRect(streak.x, y, 2, streak.length);
            }
            context.globalAlpha = Math.min(1, t * 6, (1 - t) * 5);
            const size = 26 * (.85 + .15 * overshoot(Math.min(1, t * 4)));
            context.font = `700 ${size}px ${font}`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = LIGHT;
            context.fillText(text, width / 2, height / 2);
            context.globalAlpha = 1;
          });
          context.fillStyle = page;
          context.fillRect(0, 0, width, height);
        },
        // In: the pixels clear away from the destination's title outwards, fast at first and settling at the end,
        // each flashing light blue and shrinking to nothing. onOpen fires once the title's surroundings are clear.
        async reveal(from: { x: number; y: number }, onOpen: () => void) {
          canvas.style.pointerEvents = 'none';
          const far = farthest(from);
          cells.forEach(cell => { cell.delay = (1 - Math.sqrt(1 - Math.min(1, distance(cell, from) / far))) * REVEAL + Math.random() * JITTER; });
          let opened = false;
          await tween(REVEAL + JITTER + SHRINK, t => {
            const now = t * (REVEAL + JITTER + SHRINK);
            if (!opened && t > OPEN_AT) { opened = true; onOpen(); }
            context.clearRect(0, 0, width, height);
            for (const cell of cells) {
              const age = now - cell.delay;
              if (age < -TRAIL * .5) square(cell, 1, page);
              else if (age < 0) square(cell, 1, DEEP);
              else if (age < SHRINK) { const p = age / SHRINK; square(cell, 1 - p * p, p < .4 ? LIGHT : accent); }
            }
          });
          if (!opened) onOpen();
          canvas.remove();
        },
      };
    }

    // ——— Robots, drawn in a layer over the page (positions in page coordinates). ———
    type Bot = {
      element: HTMLSpanElement; body: HTMLSpanElement; x: number; y: number; facing: number; arms: boolean;
      draw: (arms?: boolean, step?: number) => void;
      place: (x?: number, y?: number) => void;
      face: (facing: number) => void;
      mark: (text: string, className?: string) => HTMLSpanElement;
      puff: () => void;
      hop: (height: number, duration: number) => Promise<void>;
      walk: (toX: number, duration: number, fade?: boolean) => Promise<void>;
    };
    function bot(x: number, y: number, hat: 'O' | 'A' | 'none' = 'O', small = false) {
      const element = document.createElement('span');
      element.className = `tp-bot${small ? ' tp-bot-small' : ''}`;
      const body = document.createElement('span');
      body.className = 'tp-body';
      element.appendChild(body);
      layer.appendChild(element);
      const self: Bot = {
        element, body, x, y, facing: 1, arms: false,
        draw(arms = self.arms, step = 0) { self.arms = arms; body.innerHTML = crewMarkup(arms, step, hat); },
        place(nextX = self.x, nextY = self.y) { self.x = nextX; self.y = nextY; element.style.transform = `translate(${nextX}px, ${nextY}px)`; },
        face(facing: number) { self.facing = facing; body.style.scale = `${facing} 1`; },
        mark(text: string, className = 'stage-mark stage-mark-alert') { const mark = document.createElement('span'); mark.className = className; mark.textContent = text; element.appendChild(mark); return mark; },
        puff() { const smoke = document.createElement('span'); smoke.className = 'steam steam-left'; smoke.addEventListener('animationend', () => smoke.remove()); element.appendChild(smoke); },
        async hop(height: number, duration: number) { const baseY = self.y; await tween(duration, t => self.place(self.x, baseY - Math.sin(Math.PI * t) * height)); },
        async walk(toX: number, duration: number, fade = false) {
          const fromX = self.x;
          self.face(toX < fromX ? -1 : 1);
          await tween(duration, t => { self.draw(self.arms, Math.floor(t * duration / 150)); self.place(fromX + (toX - fromX) * t); if (fade) element.style.opacity = String(1 - Math.max(0, t - .5) * 2); });
          self.draw(self.arms, 0);
        },
      };
      self.draw();
      self.place();
      return self;
    }
    const effect = (className: string, x: number, y: number, text = '') => {
      const element = document.createElement('span');
      element.className = className;
      element.textContent = text;
      Object.assign(element.style, { left: `${x}px`, top: `${y}px` });
      element.addEventListener('animationend', () => element.remove());
      layer.appendChild(element);
    };

    // Beamed in: it builds up from its feet to its antenna in a column of blue light, with a few sparkles.
    async function materialize(robot: Bot) {
      effect('tp-beam', robot.x + BOT_W / 2, robot.y + BOT_H);
      robot.element.style.clipPath = 'inset(100% -40px 0 -40px)';
      await tween(450, t => { robot.element.style.clipPath = `inset(${100 * (1 - t)}% -40px 0 -40px)`; });
      robot.element.style.clipPath = '';
      for (let spark = 0; spark < 3; spark++) effect('tp-spark', robot.x - 4 + spark * 13, robot.y + 4 + (spark % 2) * 10, '✦');
    }

    // The robot that arrives next to the destination's title: it looks around, points at the title and walks off.
    async function arrive(title: HTMLElement) {
      const range = document.createRange();
      range.selectNodeContents(title);
      const lines = [...range.getClientRects()].filter(rect => rect.width > 0);
      const box = lines.length ? lines[lines.length - 1] : title.getBoundingClientRect();
      const first = lines.length ? lines[0] : box;
      const right = box.right + 12 + BOT_W < document.documentElement.clientWidth - 8;
      const x = (right ? box.right + 12 : first.left - 12 - BOT_W) + window.scrollX;
      const y = box.bottom - BOT_H + window.scrollY;
      const towards = right ? -1 : 1;
      const robot = bot(x, y);
      robot.face(towards);
      try {
        const glitch = Math.random() < GLITCH_CHANCE ? ['upside', 'twins', 'halves', 'charred'][Math.floor(Math.random() * 4)] : null;
        if (glitch === 'upside') {
          // Upside down: a hop, turning the right way up in the air, and it straightens its hard hat.
          robot.body.style.rotate = '180deg';
          await materialize(robot);
          const huh = robot.mark('!');
          await sleep(500);
          huh.remove();
          const baseY = robot.y;
          await tween(420, t => { robot.place(robot.x, baseY - Math.sin(Math.PI * t) * 16); robot.body.style.rotate = `${180 + 180 * t}deg`; });
          robot.body.style.rotate = '';
          robot.draw(true);
          await sleep(250);
          robot.draw(false);
        } else if (glitch === 'twins') {
          // Two of them: they look at each other, one wonders ("?") and the other one goes pop.
          const twin = bot(x + (right ? 30 : -30), y);
          twin.face(right ? -1 : 1);
          robot.face(right ? 1 : -1);
          await Promise.all([materialize(robot), materialize(twin)]);
          await sleep(400);
          const wonder = robot.mark('?', 'stage-mark');
          await sleep(700);
          wonder.remove();
          effect('sfx', twin.x + BOT_W / 2, twin.y - 6, 'POP!');
          twin.puff();
          await sleep(120);
          twin.element.remove();
          await sleep(400);
          robot.face(towards);
        } else if (glitch === 'halves') {
          // Only its legs arrive, and wander about, lost; a moment later the top half drops in from above. PAM!
          robot.element.style.clipPath = 'inset(62% -40px 0 -40px)';
          effect('tp-beam', x + BOT_W / 2, y + BOT_H);
          await sleep(350);
          for (const dx of [10, -8, 4]) await robot.walk(robot.x + dx, 260);
          const top = bot(robot.x, robot.y - 90);
          top.element.style.clipPath = 'inset(-40px -40px 38% -40px)';
          top.face(robot.facing);
          const fromY = top.y;
          await tween(320, t => top.place(robot.x, fromY + (robot.y - fromY) * t * t));
          top.element.remove();
          robot.element.style.clipPath = '';
          effect('sfx', robot.x + BOT_W / 2, robot.y - 12, 'PAM!');
          await robot.hop(4, 160);
          await sleep(300);
          robot.face(towards);
        } else if (glitch === 'charred') {
          // Charred, smoking and buzzing, like the one from the lake.
          robot.element.classList.add('zap-charred');
          await materialize(robot);
          const bzzt = robot.mark('BZZT!', 'stage-mark zap-bzzt');
          for (let puff = 0; puff < 3; puff++) { robot.puff(); await sleep(260); }
          bzzt.remove();
        } else {
          await materialize(robot);
          for (const look of [-towards, towards]) { robot.face(look); await sleep(260); }
        }
        // It points at the title, then walks off the other way.
        robot.face(towards);
        robot.draw(true);
        await sleep(650);
        robot.draw(false);
        await robot.walk(robot.x - towards * 60, 900, true);
      } finally {
        robot.element.remove();
      }
    }

    // The operator, on the visit's first teleport from the menu: it pops up behind the link and pulls a lever.
    async function operator(link: Element) {
      const box = link.getBoundingClientRect();
      const x = box.right - 4 + window.scrollX;
      const y = box.top - 17 + window.scrollY;
      const robot = bot(x, y + 18, 'O', true);
      robot.element.style.clipPath = 'inset(-40px -20px 18px -20px)';
      robot.face(-1);
      const lever = document.createElement('span');
      lever.className = 'tp-lever';
      robot.element.appendChild(lever);
      // Rising from behind the link: whatever is still below its top edge stays hidden.
      await tween(240, t => {
        const below = 18 * (1 - t);
        robot.place(x, y + below);
        robot.element.style.clipPath = `inset(-40px -20px ${below}px -20px)`;
      });
      robot.element.style.clipPath = '';
      await sleep(150);
      lever.classList.add('tp-lever-pulled');
      robot.draw(true);
      await sleep(220);
      effect('tp-spark', x - 6, y - 4, '✦');
      return robot;
    }

    active = async (href, origin) => {
      if (busy) return;
      const target = destination(href);
      if (!target) return;
      busy = true;
      try {
        const box = origin?.getBoundingClientRect();
        const from = box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        // The click lands at once: the link sinks in a little, with a spark.
        if (origin) {
          origin.classList.remove('tp-press');
          void (origin as HTMLElement).offsetWidth;
          origin.classList.add('tp-press');
          origin.addEventListener('animationend', () => origin.classList.remove('tp-press'), { once: true });
          effect('tp-spark', from.x + window.scrollX - 4, from.y + window.scrollY - 14, '✦');
        }
        const helper = !operatorDone && origin?.closest('header') ? (operatorDone = true, await operator(origin)) : null;
        const down = target.top > window.scrollY;
        const pixels = screen();
        await pixels.cover(from);
        helper?.element.remove();
        // The trip, while behind the pixels a section built by robots is delivered finished and the page jumps.
        const id = href.slice(1);
        const trip = pixels.travel(labelFor(href, homeLabel), down);
        if (id === 'sobre') finishScene('about');
        if (id === 'contato') window.dispatchEvent(new CustomEvent('site:finish-build', { detail: 'contato' }));
        await frame();
        await frame();
        const landing = destination(href) ?? target;
        window.scrollTo({ top: landing.top, behavior: 'instant' });
        history.pushState(null, '', href);
        focusTitle(landing.title);
        await trip;
        let arriving: Promise<void> = Promise.resolve();
        await pixels.reveal(titleSpot(landing.title), () => { arriving = arrive(landing.title); });
        await arriving;
      } finally {
        busy = false;
      }
    };

    // The shortcuts: plain left clicks only (a new tab or window keeps the browser's own behaviour).
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion()) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(SHORTCUTS);
      const href = link?.getAttribute('href');
      if (!link || !href || href.length < 2 || !destination(href)) return;
      event.preventDefault();
      void teleport(href, link);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      active = null;
      layer.remove();
      document.querySelectorAll('.tp-screen').forEach(element => element.remove());
    };
  }, [homeLabel]);
  return null;
}
