'use client';

import { useRef } from 'react';
import { crewMarkup } from '@/components/robot-sprite';
import { PatrolRobot } from '@/components/patrol-robot';
import { teleport } from '@/components/teleport';

type Footer = { sign: readonly string[]; topLabel: string; topAction: string; disclaimer: string };


// The page's footer, thin and quiet: a line like the ones closing each section, with the site's sign (the "placa de
// obra") summed up in one line, a tiny builders' lift back to the top and the small print. The guard patrols the line
// like on the others, but only once the contact section has been built; the lift takes a robot up with it, waving, and
// teleports the visitor to the top.
export function SiteFooter({ footer }: { footer: Footer }) {
  const cabinRef = useRef<HTMLSpanElement>(null);
  const liftBusy = useRef(false);
  const year = new Date().getFullYear();

  // Back to the top by the builders' lift: a robot walks into the cabin, presses its button and rides it up, waving,
  // and at the top of the rail it's teleported up there (see teleport.tsx).
  async function goTop() {
    const cabin = cabinRef.current;
    if (!cabin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { await teleport('#main'); return; }
    if (liftBusy.current) return;
    liftBusy.current = true;
    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>(resolve => {
      const start = performance.now();
      const step = (now: number) => { const t = Math.max(0, Math.min(1, (now - start) / duration)); onFrame(t); if (t < 1) requestAnimationFrame(step); else resolve(); };
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
      // Up to the top of its rail (shorter on phones).
      const rise = (cabin.parentElement?.clientHeight ?? 40) - cabin.offsetHeight;
      await tween(900, t => {
        cabin.style.translate = `0 ${-rise * smooth(t)}px`;
        rider.innerHTML = crewMarkup(Math.floor(t * 6) % 2 === 0, 0, 'O');
      });
      await teleport('#main', cabin);
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
      <div className="footer-line"><PatrolRobot waitForBuild /></div>
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
