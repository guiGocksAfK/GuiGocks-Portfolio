'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { crewMarkup } from '@/components/robot-sprite';

const TUGS = 3;
const STEP_INTERVAL = 90;

class Cancelled extends Error {}

// Collapsible list of a project's technical decisions, closed by default. The drawer only moves because a hard-hat
// robot moves it: it runs in, grabs the handle on the drawer's bottom edge and yanks it open in three tugs (kicking up
// dust), or pushes it shut from below, then leaves. Without motion the drawer just opens and closes.
export function ProjectDrawer({ items, openLabel, closeLabel }: { items: readonly string[]; openLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<() => void>(() => {});
  const panelId = useId();

  useEffect(() => () => cancelRef.current(), []);

  async function toggle() {
    const body = bodyRef.current;
    const panel = panelRef.current;
    const edge = edgeRef.current;
    if (busy || !body || !panel || !edge) return;
    const opening = !open;
    setOpen(opening);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      body.style.height = opening ? 'auto' : '0px';
      return;
    }
    setBusy(true);
    try {
      await (opening ? pullOpen(body, panel, edge) : pushClosed(body, edge));
    } catch (error) {
      if (!(error instanceof Cancelled)) throw error;
    } finally {
      setBusy(false);
    }
  }

  // Shared robot controls: the robot hangs from the drawer's edge, so it moves with it.
  function crew(edge: HTMLElement) {
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const robot = document.createElement('span');
    robot.className = 'drawer-robot';
    const sprite = document.createElement('span');
    sprite.className = 'drawer-robot-sprite';
    robot.appendChild(sprite);
    edge.appendChild(robot);
    let step = 0;
    let legs: ReturnType<typeof setInterval> | undefined;
    const draw = () => { sprite.innerHTML = crewMarkup(true, step); };
    draw();
    const run = (on: boolean) => { clearInterval(legs); if (on) legs = setInterval(() => { step += 1; draw(); }, STEP_INTERVAL); };
    const stop = () => { cancelled = true; clearInterval(legs); timers.forEach(clearTimeout); robot.getAnimations({ subtree: true }).forEach(animation => animation.cancel()); robot.remove(); };
    cancelRef.current = stop;
    const check = () => { if (cancelled) throw new Cancelled(); };
    const wait = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); }).then(check);
    const play = async (element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      try { await element.animate(keyframes, options).finished; } catch { throw new Cancelled(); }
      check();
    };
    const dust = () => {
      for (const side of [-1, 1]) {
        const puff = document.createElement('span');
        puff.className = 'drawer-dust';
        puff.style.setProperty('--side', String(side));
        robot.appendChild(puff);
        setTimeout(() => puff.remove(), 450);
      }
    };
    // Enters from the right to its spot under the handle, and leaves the same way.
    const enter = () => { run(true); return play(robot, [{ transform: 'translateX(60px)', opacity: 0 }, { opacity: 1, offset: .3 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' }).then(() => run(false)); };
    const leave = async () => { run(true); await play(robot, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(60px)', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }); stop(); };
    return { robot, sprite, wait, play, dust, enter, leave };
  }

  async function pullOpen(body: HTMLElement, panel: HTMLElement, edge: HTMLElement) {
    // React has not re-rendered yet, so reveal the panel before measuring it.
    panel.hidden = false;
    const full = panel.scrollHeight;
    const robot = crew(edge);
    await robot.enter();
    let height = 0;
    for (let tug = 1; tug <= TUGS; tug++) {
      // Squat and yank: the drawer jerks down a third, overshooting a little.
      await robot.play(robot.sprite, [{ transform: 'none' }, { transform: 'scale(1.15, .8)' }], { duration: 110, easing: 'ease-in', fill: 'forwards' });
      robot.dust();
      const target = Math.round(full * tug / TUGS);
      robot.sprite.animate([{ transform: 'scale(1.15, .8)' }, { transform: 'scale(.92, 1.1)', offset: .5 }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
      await robot.play(body, [{ height: `${height}px` }, { height: `${target + 6}px`, offset: .6 }, { height: `${target}px` }], { duration: 260, easing: 'ease-out' });
      body.style.height = `${target}px`;
      height = target;
      if (tug < TUGS) await robot.wait(120);
    }
    body.style.height = 'auto';
    // Dusts off its hands with a little hop, then walks away.
    await robot.play(robot.robot, [{ transform: 'none' }, { transform: 'translateY(-6px)', offset: .4 }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    await robot.leave();
  }

  async function pushClosed(body: HTMLElement, edge: HTMLElement) {
    const full = body.offsetHeight;
    body.style.height = `${full}px`;
    const robot = crew(edge);
    await robot.enter();
    // Braces (stretches up) and shoves the drawer shut; it lands with a small thud.
    await robot.play(robot.sprite, [{ transform: 'none' }, { transform: 'scale(.9, 1.12)' }], { duration: 120, easing: 'ease-out', fill: 'forwards' });
    await robot.play(body, [{ height: `${full}px` }, { height: '0px' }], { duration: 320, easing: 'cubic-bezier(.5, 0, .9, .5)' });
    body.style.height = '0px';
    robot.sprite.animate([{ transform: 'scale(.9, 1.12)' }, { transform: 'none' }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
    robot.dust();
    await robot.play(edge, [{ transform: 'translateY(2px)' }, { transform: 'translateY(-1px)' }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
    await robot.leave();
  }

  return (
    <div className={`drawer${open ? ' drawer-open' : ''}${busy ? ' drawer-busy' : ''}`}>
      <button type="button" className="drawer-toggle font-mono" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
        {open ? closeLabel : openLabel}<span className="drawer-chevron" aria-hidden="true">▾</span>
      </button>
      <div ref={bodyRef} className="drawer-body" style={{ height: 0 }}>
        <div ref={panelRef} className="drawer-panel" id={panelId} hidden={!open && !busy}>
          <ul className="project-highlights">{items.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      {/* The drawer's bottom edge with its handle; the robot hangs from here. */}
      <div ref={edgeRef} className="drawer-edge" aria-hidden="true">
        <span className="drawer-handle" />
      </div>
    </div>
  );
}
