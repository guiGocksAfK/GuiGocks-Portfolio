'use client';

import { useEffect } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { finishScene } from '@/components/scene';

// Teleporting around the page. Clicking one of the site's shortcuts (the menu, the logo, a project link in a crate, the
// footer's lift) doesn't scroll: the screen breaks up into pixels spreading out from where the visitor clicked, the page
// jumps to the destination behind them, and the pixels clear away from the top down, "assembling" it. A section that
// is built by robots (About, Contact) is delivered already built. Then a robot materializes next to the destination's
// title, looks around, points at it and walks off; about one time in seven the teleport glitches (it arrives upside
// down, twice, in two halves or charred). On the visit's first teleport from the menu, an operator robot pops up behind
// the link and pulls a lever first. The skip link, links opened straight from the address bar and reduced motion keep
// plain scrolling.

const CELL = 24; // px, the size of the pixels the screen breaks into
const COVER = 260; // ms for the pixels to spread over the whole screen (plus a little jitter)
const REVEAL = 300; // ms for them to clear from top to bottom
const JITTER = 90;
const FLASH = 70; // ms a pixel shows in the accent colour as it appears or goes
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

// Teleports to a destination on the page ("#projetos", "#main", ...); origin is what was clicked.
export function teleport(href: string, origin?: Element | null) {
  if (active && !reducedMotion()) return active(href, origin);
  jump(href);
  return Promise.resolve();
}

export function Teleporter() {
  useEffect(() => {
    let busy = false;
    const layer = document.createElement('div');
    layer.className = 'tp-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    // What the pixels are drawn on, over the whole window.
    function screen() {
      const canvas = document.createElement('canvas');
      canvas.className = 'tp-screen';
      canvas.setAttribute('aria-hidden', 'true');
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(window.innerWidth * ratio);
      canvas.height = Math.ceil(window.innerHeight * ratio);
      document.body.appendChild(canvas);
      const context = canvas.getContext('2d')!;
      context.scale(ratio, ratio);
      const styles = getComputedStyle(document.documentElement);
      const colors = { page: styles.getPropertyValue('--background').trim() || '#0d0f12', accent: styles.getPropertyValue('--accent').trim() || '#6994ff' };
      const cols = Math.ceil(window.innerWidth / CELL);
      const rows = Math.ceil(window.innerHeight / CELL);
      const cells = Array.from({ length: cols * rows }, (_, index) => ({ x: (index % cols) * CELL, y: Math.floor(index / cols) * CELL, delay: 0 }));
      const paint = (visible: (cell: (typeof cells)[number]) => 'page' | 'accent' | null) => {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (const cell of cells) {
          const color = visible(cell);
          if (!color) continue;
          context.fillStyle = colors[color];
          context.fillRect(cell.x, cell.y, CELL + .5, CELL + .5);
        }
      };
      return {
        canvas,
        // Pixels appear spreading out from a point, each flashing blue for a moment.
        async cover(from: { x: number; y: number }) {
          const far = Math.max(...[[0, 0], [window.innerWidth, 0], [0, window.innerHeight], [window.innerWidth, window.innerHeight]].map(([x, y]) => Math.hypot(x - from.x, y - from.y)));
          cells.forEach(cell => { cell.delay = Math.hypot(cell.x + CELL / 2 - from.x, cell.y + CELL / 2 - from.y) / far * COVER + Math.random() * JITTER; });
          await tween(COVER + JITTER + FLASH, t => {
            const now = t * (COVER + JITTER + FLASH);
            paint(cell => now < cell.delay ? null : now - cell.delay < FLASH ? 'accent' : 'page');
          });
          paint(() => 'page');
        },
        // And clear away from the top down, flashing blue just before they go.
        async reveal() {
          canvas.style.pointerEvents = 'none';
          cells.forEach(cell => { cell.delay = cell.y / window.innerHeight * REVEAL + Math.random() * JITTER; });
          await tween(REVEAL + JITTER, t => {
            const now = t * (REVEAL + JITTER);
            paint(cell => now >= cell.delay ? null : cell.delay - now < FLASH ? 'accent' : 'page');
          });
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
        const helper = !operatorDone && origin?.closest('header') ? (operatorDone = true, await operator(origin)) : null;
        const pixels = screen();
        await pixels.cover(from);
        helper?.element.remove();
        // Behind the pixels: a section built by robots is delivered finished, and the page jumps.
        const id = href.slice(1);
        if (id === 'sobre') finishScene('about');
        if (id === 'contato') window.dispatchEvent(new CustomEvent('site:finish-build', { detail: 'contato' }));
        await frame();
        await frame();
        const landing = destination(href) ?? target;
        window.scrollTo({ top: landing.top, behavior: 'instant' });
        history.pushState(null, '', href);
        focusTitle(landing.title);
        await frame();
        const arriving = pixels.reveal().then(() => arrive(landing.title));
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
  }, []);
  return null;
}
