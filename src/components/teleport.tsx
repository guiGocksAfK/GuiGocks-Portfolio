'use client';

import { useEffect, useRef } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { finishScene, isSceneRunning } from '@/components/scene';
import { say } from '@/components/say';

// Teleporting around the page. Clicking one of the site's shortcuts (the menu, the logo, a project link in a crate, the
// footer's lift) doesn't scroll: the link sinks in with a spark, and one pixel curtain sweeps across the screen the way
// the trip goes (down the page: top to bottom). It covers the page, a short trip screen made of the same pixels shows
// where they're going while the page jumps behind it, and the curtain carries on the same way, opening the destination. A section that
// is built by robots (About, Contact) is delivered already built. Then a robot materializes next to the destination's
// title, looks around, points at it and walks off; about one time in seven the teleport glitches (it arrives upside
// down, twice, in two halves or charred). The skip link, links opened straight from the address bar and reduced motion
// keep plain scrolling.

// About 1.1s in all: out (~.43s), the trip (~.22s), in (~.43s), with the arriving robot starting before the end.
const CELL = 20; // px, the size of the pixels the screen breaks into
const SWEEP = 240; // ms for the curtain's front to cross the window, both ways
const GROW = 150; // ms for a pixel to grow in, overshooting a little (and, on the way in, to shrink away)
const TRAIL = 150; // ms of colour behind the wave's front, from light blue to the page's colour
const PIXEL = Math.max(GROW, TRAIL); // ms each pixel takes, on the way out and back in
const HOLD = 220; // ms of the trip screen: the destination's name and speed lines
const JITTER = 40; // ms of raggedness along the curtain's edge
const FRONT = 55; // ms a cell shows as two half-size pixels right at the curtain's edge
const GLOW = 22; // px, half the height of the band of light along the curtain's edge
const PULL = 24; // px the page slides the way of the trip as it is pulled away (and arrives from the other side)
const SETTLE = 3; // px the page carries on past its place when it arrives, like a lift stopping
const LETTER_FONT = 11; // px, the size the destination's name is rendered at before being blown up into pixels
const LETTER_DOT = 6; // px per pixel of the name
const LIGHT = '#a3bcff';
const DEEP = '#1d2540';
// How far below the top of the window a destination's content lands.
const LAND_GAP = 32;
const GLITCH_CHANCE = .15;
const BOT_W = 24;
const BOT_H = 27;
const SHORTCUTS = '.nav-link[href^="#"], .wordmark[href^="#"], .social-internal[href^="#"], .crate-details a[href^="#"]';
// Where each destination's title is, for the robot to arrive next to it, and where its content starts, to land on
// (just below the top of the window, rather than on the section's empty space above its title).
const TITLES: Record<string, string> = { main: '#hero-title', projetos: '#projects-title', sobre: '#about-title', capacidades: '#capabilities-title', contato: '#contact-title' };
const LANDINGS: Record<string, string> = { projetos: '#projects-title', sobre: '#about-title', capacidades: '#capabilities-title', contato: '.contact-status' };

type Teleport = (href: string, origin?: Element | null) => Promise<void>;
let active: Teleport | null = null;
// navigate: the app's own navigation (Next's router), which swaps the page's copy without reloading it.
type Navigate = (href: string) => void;
let activeSwitch: ((href: string, way: 'right' | 'left', label: string, navigate: Navigate) => Promise<void>) | null = null;
// The sections, top to bottom, to find where the visitor is when switching language.
const SECTIONS = ['projetos', 'sobre', 'capacidades', 'contato'];
// What a language switch leaves for the other version of the page (in sessionStorage, read by the boot script and by
// the teleporter there): where the visitor was, what to call the destination on the trip screen, and whether to animate.
type SwitchNote = { id: string; offset: number; label: string; animate: boolean; way: Way };
// Which way a trip goes: down or up the page for the shortcuts; sideways for a language switch, to a parallel page
// (right into English, left back into Portuguese).
type Way = 'down' | 'up' | 'right' | 'left';
const ARROWS: Record<Way, string> = { down: '↓', up: '↑', right: '→', left: '←' };
const sideways = (way: Way) => way === 'right' || way === 'left';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Grows a little past full size and settles back (0..1 → 0..1, peaking about 1.05).
const overshoot = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
// The time (0..1) at which an eased-in-and-out move (smoothstep) reaches a position (0..1).
const unsmooth = (position: number) => .5 - Math.sin(Math.asin(1 - 2 * position) / 3);
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>(resolve => {
  const start = performance.now();
  const step = (now: number) => { const t = Math.max(0, Math.min(1, (now - start) / duration)); onFrame(t); if (t < 1) requestAnimationFrame(step); else resolve(); };
  requestAnimationFrame(step);
});

// Where the page has to be for a destination, and the element to focus once there.
function destination(href: string) {
  const id = href.slice(1);
  const element = document.getElementById(id);
  if (!element) return null;
  if (id === 'main') return { top: 0, title: document.querySelector<HTMLElement>(TITLES.main) ?? element };
  const box = element.closest<HTMLElement>('.project-card') ?? (LANDINGS[id] ? document.querySelector<HTMLElement>(LANDINGS[id]) : null) ?? element;
  const title = TITLES[id] ? document.querySelector<HTMLElement>(TITLES[id]) : null;
  return { top: Math.max(0, box.getBoundingClientRect().top + window.scrollY - LAND_GAP), title: title ?? element };
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

// The section the visitor is in, and how far into it ('' and the scroll itself above the first section).
function currentAnchor() {
  let id = '';
  let offset = window.scrollY;
  for (const section of SECTIONS) {
    const element = document.getElementById(section);
    if (!element) continue;
    const top = element.getBoundingClientRect().top + window.scrollY;
    if (top <= window.scrollY + 80) { id = section; offset = window.scrollY - top; }
  }
  return { id, offset };
}

const langOf = (href: string) => (href.startsWith('/en') ? 'en' : 'pt-BR');
// Resolves once the page's copy is in the given language (the root layout sets <html lang>), or after a while anyway.
async function languageIs(lang: string, timeout = 3000) {
  const start = performance.now();
  while (document.documentElement.lang !== lang && performance.now() - start < timeout) await frame();
}
// Puts the visitor back at the same point of the page (the same section, as far into it) after the copy changed.
function landAt({ id, offset }: { id: string; offset: number }) {
  const element = id ? document.getElementById(id) : null;
  const top = element ? element.getBoundingClientRect().top + window.scrollY : 0;
  window.scrollTo({ top: Math.max(0, top + offset), behavior: 'instant' });
}

// Switches to the page in the other language ("/en" or "/"), teleporting there sideways: the pixel curtain covers the
// page, the copy is swapped behind the trip screen (inside the app, no reload) and the curtain opens at the same point
// of the page. The choice is remembered for the next visit. Without the app's navigation (or without the teleporter)
// it falls back to loading the other page, leaving it a note to carry the trip on.
export async function switchLanguage(href: string, label: string, navigate?: Navigate) {
  try { localStorage.setItem('lang', href.startsWith('/en') ? 'en' : 'pt'); } catch {}
  const way = href.startsWith('/en') ? 'right' : 'left';
  if (navigate && activeSwitch && !reducedMotion()) return activeSwitch(href, way, label, navigate);
  if (navigate) {
    const anchor = currentAnchor();
    navigate(href);
    await languageIs(langOf(href));
    landAt(anchor);
    return;
  }
  const note: SwitchNote = { ...currentAnchor(), label, animate: !reducedMotion(), way };
  try { sessionStorage.setItem('lang-switch', JSON.stringify(note)); } catch {}
  window.location.href = href;
}

// Teleports to a destination on the page ("#projetos", "#main", ...); origin is what was clicked.
export function teleport(href: string, origin?: Element | null) {
  if (active && !reducedMotion()) return active(href, origin);
  jump(href);
  return Promise.resolve();
}

export function Teleporter({ homeLabel }: { homeLabel: string }) {
  // Read through a ref: switching language changes it, and the teleporter must not restart mid-trip because of that.
  const home = useRef(homeLabel);
  useEffect(() => { home.current = homeLabel; }, [homeLabel]);

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
      const cells = Array.from({ length: cols * rows }, (_, index) => ({ col: index % cols, row: Math.floor(index / cols), x: (index % cols) * CELL, y: Math.floor(index / cols) * CELL, delay: 0 }));
      // A pixel of the given size (0..1+ of a cell), centred on a point.
      const square = (x: number, y: number, side: number, size: number, color: string) => {
        if (size <= .02) return;
        const drawn = side * size + .5;
        context.fillStyle = color;
        context.fillRect(x + (side - drawn) / 2, y + (side - drawn) / 2, drawn, drawn);
      };
      // The wave's colours: light blue at its front, the accent just behind, a dark blue, then the page's own colour.
      const tint = (age: number) => age < TRAIL * .3 ? LIGHT : age < TRAIL * .65 ? accent : age < TRAIL ? DEEP : page;
      // One cell 'age' ms after the curtain's front reached it: right at the front it shows as two half-size pixels in
      // a checker pattern, then as a whole pixel growing a little past its size, through the wave's colours.
      const pixel = (cell: (typeof cells)[number], age: number) => {
        if (age <= 0) return;
        if (age < FRONT) {
          const half = CELL / 2;
          const size = overshoot(age / FRONT);
          square(cell.x, cell.y, half, size, LIGHT);
          square(cell.x + half, cell.y + half, half, size, LIGHT);
          return;
        }
        square(cell.x, cell.y, CELL, overshoot(Math.min(1, age / GROW)), tint(age));
      };
      // A soft band of light running along the curtain's edge while it crosses the window.
      const glow = (now: number, way: Way) => {
        const progress = now / SWEEP;
        if (progress <= 0 || progress >= 1) return;
        const across = sideways(way);
        const forward = way === 'down' || way === 'right';
        const edge = (forward ? smooth(progress) : 1 - smooth(progress)) * (across ? width : height);
        const band = across ? context.createLinearGradient(edge - GLOW, 0, edge + GLOW, 0) : context.createLinearGradient(0, edge - GLOW, 0, edge + GLOW);
        band.addColorStop(0, 'rgba(163, 188, 255, 0)');
        band.addColorStop(.5, 'rgba(163, 188, 255, .45)');
        band.addColorStop(1, 'rgba(163, 188, 255, 0)');
        context.fillStyle = band;
        if (across) context.fillRect(edge - GLOW, 0, GLOW * 2, height);
        else context.fillRect(0, edge - GLOW, width, GLOW * 2);
      };
      // The destination's name, in small pixels: shown on the trip screen and taken apart by the curtain on the way in.
      let letters: { x: number; y: number; delay: number; size: number }[] = [];
      // When the curtain's front reaches a point of the window, going the way of the trip. Its speed eases in and out;
      // its edge is a little ragged (column by column going up or down, row by row going sideways).
      const raggedCols = Array.from({ length: cols }, () => Math.random() * JITTER);
      const raggedRows = Array.from({ length: rows }, () => Math.random() * JITTER);
      const ragged = (x: number, y: number, way: Way) => sideways(way) ? raggedRows[Math.min(rows - 1, Math.max(0, Math.floor(y / CELL)))] : raggedCols[Math.min(cols - 1, Math.max(0, Math.floor(x / CELL)))];
      const reach = (x: number, y: number, way: Way, sweep: number) => {
        const along = way === 'down' ? y / height : way === 'up' ? 1 - y / height : way === 'right' ? x / width : 1 - x / width;
        return unsmooth(Math.min(1, Math.max(0, along))) * sweep;
      };
      const arrive = (x: number, y: number, way: Way) => reach(x, y, way, SWEEP) + ragged(x, y, way);
      return {
        // Out: the curtain sweeps over the page the way the trip goes, each pixel growing from nothing to a little
        // more than a cell as the wave's colours pass through it.
        async cover(way: Way, onProgress: (t: number) => void) {
          cells.forEach(cell => { cell.delay = arrive(cell.x + CELL / 2, cell.y + CELL / 2, way); });
          await tween(SWEEP + JITTER + PIXEL, t => {
            const now = t * (SWEEP + JITTER + PIXEL);
            onProgress(t);
            context.clearRect(0, 0, width, height);
            for (const cell of cells) pixel(cell, now - cell.delay);
            glow(now, way);
          });
        },
        // The trip, drawn with the same pixels: columns of them rushing the way the page is going, and the
        // destination's name spelt out in small pixels popping up one by one.
        async travel(label: string, way: Way) {
          // Streaks of pixels rushing against the trip (like scenery going by): along columns up or down, along rows
          // sideways. lane: the column (or row) a streak runs in; head: where along it it is.
          const across = sideways(way);
          const lanes = across ? rows : cols;
          const length = across ? cols : rows;
          const back = way === 'down' || way === 'right' ? -1 : 1;
          const streaks = Array.from({ length: Math.round(lanes * .45) }, () => ({ lane: Math.floor(Math.random() * lanes), head: Math.random() * length, size: 2 + Math.floor(Math.random() * 4), speed: 30 + Math.random() * 30, alpha: .12 + Math.random() * .22 }));
          // The name, rendered small off screen and read back pixel by pixel.
          const text = `${ARROWS[way]} ${label.toUpperCase()}`;
          const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
          probe.font = `700 ${LETTER_FONT}px ${font}`;
          const textWidth = Math.ceil(probe.measureText(text).width) + 2;
          probe.canvas.width = textWidth;
          probe.canvas.height = LETTER_FONT + 4;
          probe.font = `700 ${LETTER_FONT}px ${font}`;
          probe.textBaseline = 'top';
          probe.fillStyle = '#fff';
          probe.fillText(text, 1, 2);
          const data = probe.getImageData(0, 0, probe.canvas.width, probe.canvas.height).data;
          const dots: { x: number; y: number; delay: number; size: number }[] = [];
          const scale = Math.min(LETTER_DOT, (width - 48) / textWidth);
          const left = (width - textWidth * scale) / 2;
          const top = (height - probe.canvas.height * scale) / 2;
          for (let y = 0; y < probe.canvas.height; y++) {
            for (let x = 0; x < probe.canvas.width; x++) {
              if (data[(y * probe.canvas.width + x) * 4 + 3] > 110) dots.push({ x: left + x * scale, y: top + y * scale, delay: x / textWidth * 70 + Math.random() * 40, size: scale });
            }
          }
          await tween(HOLD, t => {
            const now = t * HOLD;
            context.fillStyle = page;
            context.fillRect(0, 0, width, height);
            for (const streak of streaks) {
              const head = streak.head + back * streak.speed * now / 1000;
              context.globalAlpha = streak.alpha;
              for (let piece = 0; piece < streak.size; piece++) {
                const at = Math.floor(((head - back * piece) % length + length) % length);
                if (across) square(at * CELL, streak.lane * CELL, CELL, .8 - piece * .12, accent);
                else square(streak.lane * CELL, at * CELL, CELL, .8 - piece * .12, accent);
              }
            }
            context.globalAlpha = 1;
            for (const dot of dots) {
              const age = now - dot.delay;
              if (age > 0) square(dot.x, dot.y, scale, overshoot(Math.min(1, age / 90)) * .86, LIGHT);
            }
          });
          // The name stays up: the curtain takes it apart on the way in.
          letters = dots;
        },
        // In: the curtain carries on the same way and opens the destination behind it, each pixel playing the way out
        // backwards (the page's colour, dark blue, blue, light blue, then shrinking away). onOpen fires as the curtain
        // passes the given height (the destination's title), for the robot to beam in there.
        // Covered at once (the page arriving from a language switch, already covered on the way out).
        fill() {
          context.fillStyle = page;
          context.fillRect(0, 0, width, height);
        },
        async reveal(way: Way, spot: { x: number; y: number }, onOpen: () => void, onProgress: (t: number) => void) {
          canvas.style.pointerEvents = 'none';
          cells.forEach(cell => { cell.delay = arrive(cell.x + CELL / 2, cell.y + CELL / 2, way); });
          letters.forEach(dot => { dot.delay = arrive(dot.x + dot.size / 2, dot.y + dot.size / 2, way); });
          const openAt = reach(spot.x, spot.y, way, SWEEP) + JITTER + PIXEL * .6;
          let opened = false;
          await tween(SWEEP + JITTER + PIXEL, t => {
            const now = t * (SWEEP + JITTER + PIXEL);
            onProgress(t);
            if (!opened && now > openAt) { opened = true; onOpen(); }
            context.clearRect(0, 0, width, height);
            // Each pixel plays the way out backwards: how far it is from being gone, on the way out's clock.
            for (const cell of cells) pixel(cell, PIXEL - (now - cell.delay));
            for (const dot of letters) {
              const age = PIXEL - (now - dot.delay);
              if (age > 0) square(dot.x, dot.y, dot.size, overshoot(Math.min(1, age / GROW)) * .86, LIGHT);
            }
            glow(now, way);
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
    function bot(x: number, y: number, hat: 'O' | 'A' | 'none' = 'O') {
      const element = document.createElement('span');
      element.className = 'tp-bot';
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
      // Where the title will be once the page has finished sliding in (the robots' layer slides along with it).
      const y = box.bottom - BOT_H + window.scrollY - pageShift;
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
          effect('sfx', robot.x + BOT_W / 2, robot.y - 12, say('PAM!', 'BAM!'));
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

    // The page's own part in the trip: it slides, shrinks or swells a little and dims, as if pulled into another
    // dimension and put back. The robots' layer slides along with it.
    const shell = document.querySelector<HTMLElement>('.site-shell');
    let pageShift = 0;
    // Set when this teleporter goes away (React also mounts it twice in development): whatever it still had running
    // must leave the page alone from then on.
    let disposed = false;
    // Which way the page slides: up and down for the shortcuts, sideways for a language switch.
    let axis: 'x' | 'y' = 'y';
    const centre = () => { if (shell && !disposed) shell.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2 - shell.offsetTop}px`; };
    function shift(y: number, scale: number, opacity: number, clear = false) {
      if (disposed) return;
      pageShift = clear || axis === 'x' ? 0 : y;
      const offset = axis === 'x' ? `${y}px 0` : `0 ${y}px`;
      layer.style.translate = clear ? '' : offset;
      if (!shell) return;
      shell.style.translate = clear ? '' : offset;
      shell.style.scale = clear ? '' : String(scale);
      shell.style.opacity = clear ? '' : String(opacity);
      if (clear) shell.style.transformOrigin = '';
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
        const down = target.top >= window.scrollY;
        const way: Way = down ? 'down' : 'up';
        axis = 'y';
        // Going down the page, the page is pulled upwards (and the destination arrives from below), and back.
        const drift = down ? -1 : 1;
        const pixels = screen();
        centre();
        await pixels.cover(way, t => shift(drift * PULL * t * t, 1 - .03 * t * t, 1 - .45 * t));
        // The trip, while behind the pixels a section built by robots is delivered finished and the page jumps.
        const id = href.slice(1);
        const trip = pixels.travel(labelFor(href, home.current), way);
        if (id === 'sobre') finishScene('about');
        if (id === 'contato') window.dispatchEvent(new CustomEvent('site:finish-build', { detail: 'contato' }));
        await frame();
        await frame();
        shift(0, 1, 1);
        const landing = destination(href) ?? target;
        window.scrollTo({ top: landing.top, behavior: 'instant' });
        history.pushState(null, '', href);
        focusTitle(landing.title);
        const spot = titleSpot(landing.title);
        centre();
        shift(-drift * PULL, 1.03, .55);
        await trip;
        let arriving: Promise<void> = Promise.resolve();
        await pixels.reveal(way, spot, () => { arriving = arrive(landing.title); }, t => {
          const eased = 1 - (1 - t) * (1 - t);
          shift(-drift * PULL * (1 - eased), 1 + .03 * (1 - eased), .55 + .45 * eased);
        });
        // Landing: it carries on a touch past its place and settles back.
        await tween(260, t => shift(drift * SETTLE * Math.sin(Math.PI * t), 1, 1));
        shift(0, 1, 1, true);
        await arriving;
      } finally {
        shift(0, 1, 1, true);
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

    // ——— Switching language: normally both ways at once, inside the app; after a full page load (the fallback), the way
    // in picks the trip up from the note left by the way out. ———
    activeSwitch = async (href, way, label, navigate) => {
      if (busy) return;
      busy = true;
      // Going right into the other language, the page is pulled away to the left (and the other one comes in from the
      // right), and the other way round.
      const drift = way === 'right' ? -1 : 1;
      axis = 'x';
      try {
        const anchor = currentAnchor();
        const pixels = screen();
        centre();
        await pixels.cover(way, t => shift(drift * PULL * t * t, 1 - .03 * t * t, 1 - .45 * t));
        // Behind the trip screen: anything still being built is finished (so nothing is left half done in the other
        // language), the copy is swapped, and the visitor is put back at the same point of the page.
        const trip = pixels.travel(label, way);
        if (isSceneRunning('about')) finishScene('about');
        if (document.querySelector('#contato[data-stage="playing"]')) window.dispatchEvent(new CustomEvent('site:finish-build', { detail: 'contato' }));
        navigate(href);
        await languageIs(langOf(href));
        await frame();
        shift(0, 1, 1);
        landAt(anchor);
        centre();
        shift(-drift * PULL, 1.03, .55);
        await trip;
        await pixels.reveal(way, { x: window.innerWidth / 2, y: window.innerHeight / 2 }, () => window.dispatchEvent(new Event('lang-arrived')), t => {
          const eased = 1 - (1 - t) * (1 - t);
          shift(-drift * PULL * (1 - eased), 1 + .03 * (1 - eased), .55 + .45 * eased);
        });
        await tween(260, t => shift(drift * SETTLE * Math.sin(Math.PI * t), 1, 1));
      } finally {
        shift(0, 1, 1, true);
        axis = 'y';
        busy = false;
      }
    };
    async function arriveInLanguage(note: SwitchNote) {
      // Only once this teleporter is sure to stay (a development double mount goes away before the next frame) does it
      // take the note and start the trip; the one that stays finds the note still there.
      await frame();
      if (disposed) return;
      try { sessionStorage.removeItem('lang-switch'); } catch {}
      const land = () => landAt(note);
      land();
      if (!note.animate || reducedMotion()) { delete document.documentElement.dataset.langSwitch; return; }
      busy = true;
      try {
        const pixels = screen();
        pixels.fill();
        delete document.documentElement.dataset.langSwitch;
        const way: Way = note.way === 'left' ? 'left' : 'right';
        const drift = way === 'right' ? -1 : 1;
        axis = 'x';
        centre();
        shift(-drift * PULL, 1.03, .55);
        // The destination's name is drawn in the pixel font: give a freshly loaded page a moment to have it.
        const pixelFont = getComputedStyle(document.body).getPropertyValue('--font-pixel').trim();
        if (pixelFont) await Promise.race([document.fonts.load(`700 11px ${pixelFont}`).catch(() => {}), sleep(300)]);
        if (disposed) return;
        await pixels.travel(note.label, way);
        land();
        await pixels.reveal(way, { x: window.innerWidth / 2, y: window.innerHeight / 2 }, () => window.dispatchEvent(new Event('lang-arrived')), t => {
          const eased = 1 - (1 - t) * (1 - t);
          shift(-drift * PULL * (1 - eased), 1 + .03 * (1 - eased), .55 + .45 * eased);
        });
        await tween(260, t => shift(drift * SETTLE * Math.sin(Math.PI * t), 1, 1));
      } finally {
        shift(0, 1, 1, true);
        axis = 'y';
        busy = false;
      }
    }
    let note: SwitchNote | null = null;
    try {
      const saved = sessionStorage.getItem('lang-switch');
      if (saved) note = JSON.parse(saved) as SwitchNote;
    } catch {}
    if (note) void arriveInLanguage(note);
    else delete document.documentElement.dataset.langSwitch;
    return () => {
      disposed = true;
      document.removeEventListener('click', onClick);
      active = null;
      activeSwitch = null;
      layer.remove();
      document.querySelectorAll('.tp-screen').forEach(element => element.remove());
    };
  }, []);
  return null;
}
