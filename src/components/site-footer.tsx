'use client';

import { useEffect, useRef } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { anySceneRunning } from '@/components/scene';

type Footer = {
  label: string; kicker: string; title: string; rows: readonly { label: string; value: string }[]; contactLabel: string; emailLabel: string;
  topLabel: string; owner: string; disclaimer: string;
};
type Link = { label: string; href: string };

const WATCH_SPEED = 75; // px per second: a slow night round
const STEP_INTERVAL = 160;
const BEAM_DOWN = 18; // degrees: the torch pointed at the ground ahead
const BEAM_UP = -32; // pointed up at the sign

class Cancelled extends Error {}

// The page's footer: the building site at night, closed for the day. The site's sign (the "placa de obra") stands on
// two posts in the dirt: what the work is, who is responsible for it, when it started and when it ends (never). Now
// and then the night watchman walks by with a torch, sometimes stopping to shine it on the sign. On the right, a
// builders' lift takes the visitor back to the top: a robot steps into the cabin, presses the button and rides up
// with it, waving, as the page scrolls up.
export function SiteFooter({ footer, links, email }: { footer: Footer; links: readonly Link[]; email: string }) {
  const watchRef = useRef<HTMLSpanElement>(null);
  const plaqueRef = useRef<HTMLElement>(null);
  const cabinRef = useRef<HTMLSpanElement>(null);
  const liftBusy = useRef(false);
  const year = new Date().getFullYear();

  // The night watchman's rounds.
  useEffect(() => {
    const layer = watchRef.current;
    const plaque = plaqueRef.current;
    if (!layer || !plaque || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const stage: HTMLSpanElement = layer;
    const sign: HTMLElement = plaque;
    let cancelled = false;
    let inView = false;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const canRun = () => inView && !document.hidden;
    const hold = async () => {
      while (!canRun() && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    };
    const pause = async (ms: number) => {
      await new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });
      await hold();
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
    const beam = bot.querySelector<HTMLElement>('.watch-beam')!;
    let x = 0;
    const draw = (step: number) => { sprite.innerHTML = crewMarkup(false, step, 'A'); };
    const place = (nextX: number) => { x = nextX; bot.style.transform = `translateX(${x}px)`; };
    const aim = (angle: number) => { beam.style.rotate = `${angle}deg`; };
    const walk = async (toX: number) => {
      const fromX = x;
      body.style.scale = `${toX < fromX ? -1 : 1} 1`;
      let step = 0;
      let lastStep = 0;
      await tween(Math.abs(toX - fromX) / WATCH_SPEED * 1000, t => {
        const now = performance.now();
        if (now - lastStep > STEP_INTERVAL) { lastStep = now; draw(++step); }
        place(fromX + (toX - fromX) * t);
      });
      draw(0);
    };

    async function round(rightward: boolean) {
      const width = stage.clientWidth;
      const [start, end] = rightward ? [-40, width + 40] : [width + 40, -40];
      place(start);
      aim(BEAM_DOWN);
      bot.style.opacity = '1';
      // Every other round or so it stops in front of the sign and shines its torch on it for a moment.
      if (Math.random() < .6) {
        const origin = stage.getBoundingClientRect();
        const box = sign.getBoundingClientRect();
        const spot = box.left - origin.left + box.width * (.3 + Math.random() * .4);
        await walk(spot);
        await pause(400);
        await tween(500, t => aim(BEAM_DOWN + (BEAM_UP - BEAM_DOWN) * t));
        await pause(1400);
        await tween(500, t => aim(BEAM_UP + (BEAM_DOWN - BEAM_UP) * t));
        await pause(300);
      }
      await walk(end);
      bot.style.opacity = '0';
    }

    async function run() {
      draw(0);
      for (let rightward = true; ; rightward = !rightward) {
        await pause(7000 + Math.random() * 6000);
        // One thing at a time: no rounds while a section is being built.
        if (anySceneRunning()) continue;
        await round(rightward);
      }
    }

    const resume = () => { if (canRun()) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); });
    observer.observe(stage.parentElement ?? stage);
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

  // Back to the top by the builders' lift.
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
      // It walks in from the right of the mast, turns round and presses the button.
      rider.style.scale = '-1 1';
      let step = 0;
      await tween(450, t => { if (Math.floor(t * 5) !== step) step = Math.floor(t * 5); rider.innerHTML = crewMarkup(false, step, 'O'); rider.style.translate = `${40 * (1 - t)}px 0`; });
      rider.style.scale = '1 1';
      rider.innerHTML = crewMarkup(true, 0, 'O');
      cabin.classList.add('lift-pressed');
      await tween(220, () => {});
      rider.innerHTML = crewMarkup(false, 0, 'O');
      // Up it goes, the robot waving, and the page scrolls up with it.
      const rise = (cabin.parentElement?.clientHeight ?? 180) - cabin.offsetHeight - 26;
      let scrolled = false;
      await tween(1100, t => {
        cabin.style.translate = `0 ${-rise * smooth(t)}px`;
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
      <span className="footer-star footer-star-1" aria-hidden="true" />
      <span className="footer-star footer-star-2" aria-hidden="true" />
      <span className="footer-star footer-star-3" aria-hidden="true" />
      <div className="footer-site">
        <section ref={plaqueRef} className="obra-plaque" aria-label={footer.label}>
          <div className="obra-board">
            <span className="obra-stripes" aria-hidden="true" />
            <div className="obra-body">
              <p className="obra-kicker font-mono">{footer.kicker}</p>
              <p className="obra-title">{footer.title}</p>
              <dl className="obra-rows">
                {footer.rows.map(row => (
                  <div key={row.label}><dt className="font-mono">{row.label}</dt><dd>{row.value}</dd></div>
                ))}
                <div>
                  <dt className="font-mono">{footer.contactLabel}</dt>
                  <dd className="obra-links">
                    {links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>)}
                    <a href={`mailto:${email}`}>{footer.emailLabel}</a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <span className="obra-post obra-post-left" aria-hidden="true" />
          <span className="obra-post obra-post-right" aria-hidden="true" />
        </section>
        <button type="button" className="footer-lift" onClick={() => void goTop()}>
          <span className="lift-label font-mono">{footer.topLabel} ↑</span>
          <span className="lift-mast" aria-hidden="true" />
          <span ref={cabinRef} className="lift-cabin" aria-hidden="true" />
        </button>
        <span ref={watchRef} className="footer-watch" aria-hidden="true" />
      </div>
      <div className="footer-ground">
        <p className="footer-legal font-mono"><span>© {year} {footer.owner}</span><span>{footer.disclaimer}</span></p>
      </div>
    </footer>
  );
}
