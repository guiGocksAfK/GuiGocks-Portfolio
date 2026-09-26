'use client';

import { useEffect, useRef } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { anySceneRunning } from '@/components/scene';

type Footer = { sign: readonly string[]; topLabel: string; topAction: string; disclaimer: string };

const WATCH_SPEED = 70; // px per second: a slow night round
const STEP_INTERVAL = 160;
const LIFT_RISE = 18; // px the cabin rides up its rail

class Cancelled extends Error {}

// The page's footer, thin and quiet: a line like the ones closing each section, with the site's sign (the "placa de
// obra") summed up in one line, a tiny builders' lift back to the top and the small print. Now and then the night
// watchman walks along the line with a torch; the lift takes a robot up with it, waving, as the page scrolls up.
export function SiteFooter({ footer }: { footer: Footer }) {
  const watchRef = useRef<HTMLSpanElement>(null);
  const cabinRef = useRef<HTMLSpanElement>(null);
  const liftBusy = useRef(false);
  const year = new Date().getFullYear();

  // The night watchman's rounds.
  useEffect(() => {
    const layer = watchRef.current;
    if (!layer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const stage: HTMLSpanElement = layer;
    let cancelled = false;
    let inView = false;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const canRun = () => inView && !document.hidden;
    const pause = async (ms: number) => {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      while (!canRun() && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    };
    // A tween whose clock stops while the footer is off-screen or the tab hidden.
    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
      let elapsed = 0;
      let last = performance.now();
      const step = (now: number) => {
        if (cancelled) return reject(new Cancelled());
        if (canRun()) elapsed += now - last;
        last = now;
        const t = Math.min(1, elapsed / duration);
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

    const bot = document.createElement('span');
    bot.className = 'watch-bot';
    bot.innerHTML = '<span class="watch-body"><span class="watch-sprite"></span><span class="watch-beam"></span></span>';
    stage.appendChild(bot);
    const body = bot.querySelector<HTMLElement>('.watch-body')!;
    const sprite = bot.querySelector<HTMLElement>('.watch-sprite')!;
    const draw = (step: number) => { sprite.innerHTML = crewMarkup(false, step, 'A'); };
    let x = 0;
    const place = (nextX: number) => { x = nextX; bot.style.transform = `translateX(${x}px)`; };

    async function round(rightward: boolean) {
      const width = stage.clientWidth;
      const [start, end] = rightward ? [-30, width + 30] : [width + 30, -30];
      place(start);
      body.style.scale = `${rightward ? 1 : -1} 1`;
      bot.style.opacity = '1';
      let step = 0;
      let lastStep = 0;
      await tween(Math.abs(end - start) / WATCH_SPEED * 1000, t => {
        const now = performance.now();
        if (now - lastStep > STEP_INTERVAL) { lastStep = now; draw(++step); }
        place(start + (end - start) * t);
      });
      bot.style.opacity = '0';
      draw(0);
    }

    async function run() {
      draw(0);
      for (let rightward = true; ; rightward = !rightward) {
        await pause(8000 + Math.random() * 7000);
        // One thing at a time: no rounds while a section is being built.
        if (anySceneRunning()) continue;
        await round(rightward);
      }
    }

    const resume = () => { if (canRun()) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); });
    observer.observe(stage);
    document.addEventListener('visibilitychange', resume);
    run().catch(error => { if (!(error instanceof Cancelled)) throw error; });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      waiters.forEach(resolve => resolve());
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      bot.remove();
    };
  }, []);

  // Back to the top by the builders' lift: a robot walks into the cabin, presses its button and rides it up, waving,
  // as the page starts scrolling up.
  async function goTop() {
    const toTop = (smooth: boolean) => {
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
      document.querySelector<HTMLElement>('.wordmark')?.focus({ preventScroll: true });
    };
    const cabin = cabinRef.current;
    if (!cabin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { toTop(false); return; }
    if (liftBusy.current) return;
    liftBusy.current = true;
    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>(resolve => {
      const start = performance.now();
      const step = (now: number) => { const t = Math.min(1, (now - start) / duration); onFrame(t); if (t < 1) requestAnimationFrame(step); else resolve(); };
      requestAnimationFrame(step);
    });
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const rider = document.createElement('span');
    rider.className = 'lift-rider';
    cabin.appendChild(rider);
    try {
      // In from the right, turning round to press the button.
      rider.style.scale = '-1 1';
      await tween(400, t => { rider.innerHTML = crewMarkup(false, Math.floor(t * 5), 'O'); rider.style.translate = `${22 * (1 - t)}px 0`; });
      rider.style.scale = '1 1';
      rider.innerHTML = crewMarkup(true, 0, 'O');
      cabin.classList.add('lift-pressed');
      await tween(200, () => {});
      let scrolled = false;
      await tween(900, t => {
        cabin.style.translate = `0 ${-LIFT_RISE * smooth(t)}px`;
        rider.innerHTML = crewMarkup(Math.floor(t * 6) % 2 === 0, 0, 'O');
        if (!scrolled && t > .4) { scrolled = true; toTop(true); }
      });
      await new Promise(resolve => setTimeout(resolve, 1200));
    } finally {
      // Back down, out of sight, ready for the next ride.
      rider.remove();
      cabin.classList.remove('lift-pressed');
      cabin.style.translate = '';
      liftBusy.current = false;
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-line"><span ref={watchRef} className="footer-watch" aria-hidden="true" /></div>
      <div className="footer-row">
        <p className="footer-sign font-mono">
          <span className="footer-stripes" aria-hidden="true" />
          {footer.sign.map(item => <span key={item} className="footer-sign-item">{item}</span>)}
        </p>
        <button type="button" className="footer-lift font-mono" aria-label={footer.topAction} onClick={() => void goTop()}>
          <span className="lift-shaft" aria-hidden="true">
            <span className="lift-rail" />
            <span ref={cabinRef} className="lift-cabin" />
          </span>
          <span className="lift-label" aria-hidden="true">{footer.topLabel} ↑</span>
        </button>
      </div>
      <p className="footer-legal font-mono">© {year} · {footer.disclaimer}</p>
    </footer>
  );
}
