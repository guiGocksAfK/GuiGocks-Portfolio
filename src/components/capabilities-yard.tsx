'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RobotSprite, crewMarkup, forkliftMarkup } from '@/components/robot-sprite';

// A crate is just a name, or a name with what is inside: the projects that use the tool and, optionally, what of it was used.
type Crate = string | { name: string; projects: readonly string[]; used?: readonly string[] };
type Shelf = { label: string; items: readonly Crate[] };
type Languages = { label: string; items: readonly { name: string; level: string }[]; chat: readonly [string, string] };
type CounterLabels = { hint: string; projects: string; used: string; close: string };
type ProjectLink = { name: string; href: string };
type Opened = { name: string; projects: readonly string[]; used?: readonly string[]; shelf: string };
type Controller = { toggle: (button: HTMLButtonElement, opened: Opened) => void; close: () => void };

// The stock-taker is drawn bigger here (3px pixels instead of 2: 24×27, see .ladder-clerk).
const CLERK_HEIGHT = 27;
const RUNG_SPACING = 17;
const FORKLIFT_SPEED = 120;
const PIPE_Y = 10; // centre line of the pneumatic pipe, in the strip above the rack
const HOSE_SPEED = 300; // px per second, the suction hose reaching down to a crate
const SUCK_SPEED = 420;
const PIPE_SPEED = 380; // the crate's bulge travelling inside the pipe
const LID_TIME = 380; // matches the lid transition in CSS
const HAND_OUT = 350; // ms per thing taken out of the crate; matches the stagger of .crate-details-list items
const RETURN_FACTOR = 1.6; // putting a crate back is quicker than fetching it

class Cancelled extends Error {}
const ignoreCancelled = (error: unknown) => { if (!(error instanceof Cancelled)) throw error; };
const crateName = (crate: Crate) => typeof crate === 'string' ? crate : crate.name;

// Briefly outlines the project card a link points to, so the eye finds it after the scroll.
function flashCard(href: string) {
  const card = document.getElementById(href.slice(1))?.closest('.project-card');
  if (!card) return;
  card.classList.remove('project-card-flash');
  void (card as HTMLElement).offsetWidth;
  card.classList.add('project-card-flash');
}

function CrateDetails({ opened, labels, projectLinks, onClose }: { opened: Opened; labels: CounterLabels; projectLinks: readonly ProjectLink[]; onClose: () => void }) {
  const used = opened.used ?? [];
  // Each thing comes out of the crate one after the other (CSS stagger by --i), projects first.
  const order = (index: number) => ({ '--i': index }) as CSSProperties;
  return (
    <div className="crate-details" role="region" aria-label={opened.name}>
      <p className="crate-details-head font-mono">
        <span>{opened.name}</span>
        <button type="button" className="crate-details-close" onClick={onClose} aria-label={labels.close} title={labels.close}>×</button>
      </p>
      <p className="crate-details-label font-mono">{labels.projects}</p>
      <ul className="crate-details-list">
        {opened.projects.map((project, index) => {
          const link = projectLinks.find(item => item.name === project);
          return <li key={project} style={order(index)}>{link ? <a href={link.href} onClick={() => flashCard(link.href)}>{project}</a> : project}</li>;
        })}
      </ul>
      {used.length > 0 && (
        <>
          <p className="crate-details-label font-mono">{labels.used}</p>
          <ul className="crate-details-list">
            {used.map((item, index) => <li key={item} style={order(opened.projects.length + index)}>{item}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

// The tool store ("almoxarifado"): one shelving unit with a shelf per area and the tools as crates standing on it, next
// to the storekeeper's office with the languages. A stock-taker stands still on the parked library ladder; the other
// robots only work, one job at a time: a forklift drives across the floor with a pallet, then the office robots greet
// each other. Clicking a crate sends it by pneumatic pipe to the office desk, where a robot climbs out of it and hands
// out what is inside; on narrow screens the crate opens in place instead. Runs only while the section is on screen;
// without motion everything is static and a crate just shows its contents.
export function CapabilitiesYard({ shelves, languages, counter, projectLinks }: {
  shelves: readonly Shelf[]; languages: Languages; counter: CounterLabels; projectLinks: readonly ProjectLink[];
}) {
  const yardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const rackRef = useRef<HTMLDivElement>(null);
  const ladderRef = useRef<HTMLSpanElement>(null);
  const officeRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLSpanElement>(null);
  const pipeRef = useRef<SVGSVGElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);

  useEffect(() => {
    const refs = [yardRef.current, gridRef.current, rackRef.current, ladderRef.current, officeRef.current, sceneRef.current, deskRef.current, pipeRef.current, fxRef.current] as const;
    if (refs.some(ref => !ref)) return;
    const [area, grid, rack, ladder, office, scene, desk, pipe, fx] = refs as unknown as [HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLSpanElement, HTMLElement, HTMLDivElement, HTMLSpanElement, SVGSVGElement, HTMLDivElement];
    const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrow = window.matchMedia('(max-width: 900px)');
    let cancelled = false;
    let inView = false;
    let phase: 'idle' | 'opening' | 'open' | 'closing' = 'idle';
    let current: { button: HTMLButtonElement; data: Opened; mode: 'desk' | 'inline' | 'still'; ghost?: HTMLElement; popper?: HTMLElement; robot?: HTMLElement; landed?: boolean } | null = null;
    let waiters: (() => void)[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const wait = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms); timers.add(timer); });

    // The background jobs also hold while a crate is out.
    async function pause(ms: number) {
      await wait(ms);
      while ((!inView || document.hidden || phase !== 'idle') && !cancelled) await new Promise<void>(resolve => waiters.push(resolve));
      if (cancelled) throw new Cancelled();
    }
    const resume = () => { if (inView && !document.hidden && phase === 'idle') { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); } };

    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return reject(new Cancelled());
        const t = Math.min(1, (now - start) / Math.max(duration, 1));
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    const smooth = (t: number) => t * t * (3 - 2 * t);

    // Box of an element in the grid's coordinates, where the pipe and the flying pieces live.
    const boxIn = (element: Element) => {
      const origin = grid.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height };
    };

    // The pipe runs along the top of the rack, down the gap next to the office and into the office scene, ending in a
    // nozzle right above the desk.
    function pipeRoute() {
      const rackBox = boxIn(rack);
      const officeBox = boxIn(office);
      const deskBox = boxIn(desk);
      return { startX: rackBox.x + 14, gapX: (rackBox.x + rackBox.w + officeBox.x) / 2, nozzleY: boxIn(scene).y + 14, deskX: deskBox.x + deskBox.w / 2 };
    }
    function drawPipe() {
      if (narrow.matches) return;
      const route = pipeRoute();
      const path = `M ${route.startX} ${PIPE_Y} H ${route.gapX} V ${route.nozzleY} H ${route.deskX + 4}`;
      pipe.querySelectorAll('path').forEach(element => element.setAttribute('d', path));
      const [elbow, mouth] = pipe.querySelectorAll('rect');
      Object.entries({ x: route.deskX - 4, y: route.nozzleY, width: 8, height: 8 }).forEach(([key, value]) => elbow.setAttribute(key, String(value)));
      Object.entries({ x: route.deskX - 8, y: route.nozzleY + 7, width: 16, height: 5 }).forEach(([key, value]) => mouth.setAttribute(key, String(value)));
    }

    // Suction hose dropping from the pipe down to a crate.
    function makeHose(x: number, bottom: number) {
      const hose = document.createElement('span');
      hose.className = 'hose';
      Object.assign(hose.style, { left: `${x - 4}px`, top: `${PIPE_Y}px`, height: `${bottom - PIPE_Y}px`, transform: 'scaleY(0)' });
      fx.appendChild(hose);
      return hose;
    }
    const stretch = (hose: HTMLElement, from: number, to: number, speed: number) =>
      tween(hose.offsetHeight * Math.abs(to - from) / speed * 1000, t => { hose.style.transform = `scaleY(${from + (to - from) * smooth(t)})`; });

    // Copy of the crate that travels; the real one leaves an empty dashed slot behind.
    function makeGhost(button: HTMLButtonElement) {
      const ghost = button.cloneNode(true) as HTMLElement;
      ghost.classList.add('crate-ghost');
      ghost.removeAttribute('aria-expanded');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.tabIndex = -1;
      fx.appendChild(ghost);
      return ghost;
    }
    const placeGhost = (ghost: HTMLElement, x: number, y: number, scale: number) => {
      ghost.style.transform = `translate(${x - ghost.offsetWidth / 2}px, ${y - ghost.offsetHeight / 2}px) scale(${scale})`;
    };
    const deskLanding = (ghost: HTMLElement) => {
      const deskBox = boxIn(desk);
      const scale = Math.min(1, (deskBox.w + 24) / ghost.offsetWidth);
      return { x: deskBox.x + deskBox.w / 2, y: deskBox.y - ghost.offsetHeight * scale / 2, scale };
    };

    // The crate's bulge running inside the pipe along a polyline.
    async function travel(points: [number, number][], speed: number) {
      const bulge = document.createElement('span');
      bulge.className = 'pipe-bulge';
      fx.appendChild(bulge);
      const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
      const total = lengths.reduce((sum, length) => sum + length, 0);
      try {
        await tween(total / speed * 1000, t => {
          let distance = smooth(t) * total;
          let index = 0;
          while (index < lengths.length - 1 && distance > lengths[index]) { distance -= lengths[index]; index += 1; }
          const f = lengths[index] ? Math.min(1, distance / lengths[index]) : 1;
          const [x0, y0] = points[index];
          const [x1, y1] = points[index + 1];
          bulge.style.transform = `translate(${x0 + (x1 - x0) * f}px, ${y0 + (y1 - y0) * f}px)`;
        });
      } finally {
        bulge.remove();
      }
    }
    const pipePath = (crateX: number): [number, number][] => {
      const route = pipeRoute();
      return [[crateX, PIPE_Y], [route.gapX, PIPE_Y], [route.gapX, route.nozzleY], [route.deskX, route.nozzleY]];
    };

    // The robot that lives in the crate: it rises out of it, hands things out with its arms up, and sinks back in.
    function popRobot(host: HTMLElement) {
      const popper = document.createElement('span');
      popper.className = 'crate-popper';
      const robot = document.createElement('span');
      robot.className = 'crate-popper-robot';
      robot.innerHTML = crewMarkup(false, 0);
      popper.appendChild(robot);
      host.appendChild(popper);
      return { popper, robot };
    }
    const rise = (robot: HTMLElement, from: number, to: number) => tween(450, t => { robot.style.transform = `translateY(${from + (to - from) * smooth(t)}%)`; });
    async function handOut(robot: HTMLElement, count: number) {
      for (let index = 0; index < count; index++) {
        robot.innerHTML = crewMarkup(true, index);
        await tween(HAND_OUT, t => { robot.style.transform = `translateY(${-4 * Math.sin(Math.PI * t)}px)`; });
      }
      robot.innerHTML = crewMarkup(false, 0);
    }
    const itemCount = (data: Opened) => data.projects.length + (data.used?.length ?? 0);

    async function openAtDesk(job: NonNullable<typeof current>) {
      const { button } = job;
      const crate = boxIn(button);
      const crateX = crate.x + crate.w / 2;
      const crateY = crate.y + crate.h / 2;
      // Suck the crate up the hose.
      const hose = makeHose(crateX, crate.y);
      const ghost = makeGhost(button);
      ghost.style.visibility = 'hidden';
      job.ghost = ghost;
      try {
        await stretch(hose, 0, 1, HOSE_SPEED);
        placeGhost(ghost, crateX, crateY, 1);
        ghost.style.visibility = 'visible';
        button.classList.add('crate-away');
        await tween((crateY - PIPE_Y) / SUCK_SPEED * 1000, t => { const e = t * t; placeGhost(ghost, crateX, crateY + (PIPE_Y - crateY) * e, 1 - .8 * e); });
        ghost.style.visibility = 'hidden';
        await stretch(hose, 1, 0, HOSE_SPEED);
      } finally {
        hose.remove();
      }
      // Through the pipe and out of the nozzle onto the desk, with a small bounce.
      await travel(pipePath(crateX), PIPE_SPEED);
      const route = pipeRoute();
      const mouthY = route.nozzleY + 12;
      const land = deskLanding(ghost);
      ghost.style.visibility = 'visible';
      await tween(550, t => placeGhost(ghost, route.deskX, mouthY + (land.y - mouthY) * t * t, .2 + (land.scale - .2) * Math.min(1, t * 1.6)));
      await tween(220, t => placeGhost(ghost, land.x, land.y - Math.sin(Math.PI * t) * 4, land.scale));
      job.landed = true;
      // Lid open, robot out, contents on the counter.
      ghost.classList.add('crate-opened');
      await wait(LID_TIME);
      const { popper, robot } = popRobot(ghost);
      Object.assign(job, { popper, robot });
      await rise(robot, 100, 0);
      setOpened(job.data);
      await handOut(robot, itemCount(job.data));
    }

    async function closeAtDesk(job: NonNullable<typeof current>) {
      const { button, ghost, popper, robot } = job;
      setOpened(null);
      if (!ghost) return;
      if (robot) await rise(robot, 0, 100);
      popper?.remove();
      ghost.classList.remove('crate-opened');
      await wait(LID_TIME);
      // Back up the nozzle, through the pipe and down the hose into its slot.
      job.landed = false;
      const route = pipeRoute();
      const mouthY = route.nozzleY + 12;
      const land = deskLanding(ghost);
      await tween(450, t => { const e = smooth(t); placeGhost(ghost, land.x, land.y + (mouthY - land.y) * e, land.scale + (.2 - land.scale) * e); });
      ghost.style.visibility = 'hidden';
      const crate = boxIn(button);
      const crateX = crate.x + crate.w / 2;
      const crateY = crate.y + crate.h / 2;
      await travel(pipePath(crateX).reverse(), PIPE_SPEED * RETURN_FACTOR);
      const hose = makeHose(crateX, crate.y);
      try {
        await stretch(hose, 0, 1, HOSE_SPEED * RETURN_FACTOR);
        ghost.style.visibility = 'visible';
        await tween((crateY - PIPE_Y) / (SUCK_SPEED * RETURN_FACTOR) * 1000, t => { const e = smooth(t); placeGhost(ghost, crateX, PIPE_Y + (crateY - PIPE_Y) * e, .2 + .8 * e); });
        ghost.remove();
        button.classList.remove('crate-away');
        await stretch(hose, 1, 0, HOSE_SPEED * RETURN_FACTOR);
      } finally {
        hose.remove();
      }
    }

    // Narrow screens: the crate opens where it stands and its contents show under the shelf.
    async function openInPlace(job: NonNullable<typeof current>) {
      job.button.classList.add('crate-opened');
      await wait(LID_TIME);
      const { popper, robot } = popRobot(job.button);
      Object.assign(job, { popper, robot });
      await rise(robot, 100, 0);
      setOpened(job.data);
      await handOut(robot, itemCount(job.data));
    }
    async function closeInPlace(job: NonNullable<typeof current>) {
      setOpened(null);
      if (job.robot) await rise(job.robot, 0, 100);
      job.popper?.remove();
      job.button.classList.remove('crate-opened');
      await wait(LID_TIME);
    }

    async function open(button: HTMLButtonElement, data: Opened) {
      phase = 'opening';
      // Only one robot at a time: the background jobs step aside.
      area.querySelectorAll('.forklift').forEach(element => element.remove());
      area.querySelectorAll('.office-bubble-on').forEach(element => element.classList.remove('office-bubble-on'));
      const job = { button, data, mode: !motion ? 'still' as const : narrow.matches ? 'inline' as const : 'desk' as const };
      current = job;
      if (job.mode === 'desk') await openAtDesk(job);
      else if (job.mode === 'inline') await openInPlace(job);
      else { button.classList.add('crate-opened'); setOpened(data); }
      phase = 'open';
    }

    async function close() {
      if (phase !== 'open' || !current) return;
      phase = 'closing';
      const job = current;
      if (job.mode === 'desk') await closeAtDesk(job);
      else if (job.mode === 'inline') await closeInPlace(job);
      else { job.button.classList.remove('crate-opened'); setOpened(null); }
      current = null;
      phase = 'idle';
      resume();
    }

    controllerRef.current = {
      // Clicking the open crate puts it back; clicking another one puts the open one back first.
      toggle: (button, data) => {
        if (phase === 'opening' || phase === 'closing') return;
        const same = current?.button === button;
        (async () => { await close(); if (!same) await open(button, data); })().catch(ignoreCancelled);
      },
      close: () => { close().catch(ignoreCancelled); },
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close().catch(ignoreCancelled); };
    const onClick = (event: MouseEvent) => {
      if (phase === 'open' && !(event.target as Element).closest('.crate-button, .crate-details')) close().catch(ignoreCancelled);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);

    // Keep the pipe and a crate lying on the desk in place when the layout changes (resizes, the counter opening).
    const refit = () => {
      drawPipe();
      if (current?.landed && current.ghost) { const land = deskLanding(current.ghost); placeGhost(current.ghost, land.x, land.y, land.scale); }
    };
    const resizer = new ResizeObserver(refit);
    resizer.observe(grid);
    resizer.observe(office);
    drawPipe();

    // Background jobs, only with motion.
    let observer: IntersectionObserver | undefined;
    let placeClerk = () => {};
    if (motion) {
      // The ladder stays parked in the free strip on the right (CSS) and the clerk stands still on one of its rungs, so
      // nothing ever passes over the text.
      const clerk = document.createElement('span');
      clerk.className = 'ladder-clerk';
      clerk.innerHTML = crewMarkup(false, 0);
      ladder.appendChild(clerk);
      placeClerk = () => {
        // Feet on the rung nearest to the middle of the ladder (rungs every 17px, the first at 14px).
        const rung = 14 + Math.round((ladder.clientHeight * .55 - 14) / RUNG_SPACING) * RUNG_SPACING;
        clerk.style.transform = `translate(-8px, ${rung - CLERK_HEIGHT}px)`;
      };
      placeClerk();
      clerk.style.opacity = '1';
      resizer.observe(ladder);

      // A forklift drives across the floor in front of the rack carrying a pallet with a crate, and out the other side.
      const forklift = async () => {
        const floor = rack.querySelector<HTMLElement>('.rack-floor');
        if (!floor) return;
        const truck = document.createElement('span');
        truck.className = 'forklift';
        truck.innerHTML = `<span class="forklift-load"></span>${forkliftMarkup()}`;
        floor.appendChild(truck);
        const start = -60;
        const end = floor.clientWidth + 20;
        try {
          await tween((end - start) / FORKLIFT_SPEED * 1000, t => {
            truck.style.transform = `translate(${start + (end - start) * t}px, ${Math.round(Math.sin(t * 90))}px)`;
          });
        } finally {
          truck.remove();
        }
      };

      // The storekeeper and a visitor say hello to each other, one after the other.
      const chat = async () => {
        for (const bubble of area.querySelectorAll<HTMLElement>('.office-bubble')) {
          bubble.classList.add('office-bubble-on');
          await pause(1400);
          bubble.classList.remove('office-bubble-on');
          await pause(250);
        }
      };

      const run = async () => {
        // One job at a time, alternating so the scene keeps varying.
        for (;;) {
          await pause(3000);
          await forklift();
          await pause(3000);
          await chat();
        }
      };

      observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resume(); }, { threshold: .2 });
      observer.observe(area);
      document.addEventListener('visibilitychange', resume);
      run().catch(ignoreCancelled);
    }
    const onResizeClerk = () => placeClerk();
    window.addEventListener('resize', onResizeClerk);

    return () => {
      cancelled = true;
      controllerRef.current = null;
      timers.forEach(clearTimeout);
      waiters.forEach(resolve => resolve());
      observer?.disconnect();
      resizer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResizeClerk);
      fx.replaceChildren();
      area.querySelectorAll('.ladder-clerk, .forklift, .crate-popper').forEach(element => element.remove());
      area.querySelectorAll('.crate-away, .crate-opened').forEach(element => element.classList.remove('crate-away', 'crate-opened'));
    };
  }, []);

  const details = opened && <CrateDetails opened={opened} labels={counter} projectLinks={projectLinks} onClose={() => controllerRef.current?.close()} />;

  return (
    <div ref={yardRef} className="yard">
      <p className="yard-hint font-mono">{counter.hint}</p>
      <div ref={gridRef} className="yard-grid">
        <div ref={rackRef} className="rack">
          <span className="rack-post rack-post-left" aria-hidden="true" />
          <span className="rack-post rack-post-right" aria-hidden="true" />
          {shelves.map(shelf => (
            <section key={shelf.label} className="rack-shelf" aria-label={shelf.label}>
              <h3 className="rack-tag font-mono">{shelf.label}</h3>
              <ul className="rack-crates">
                {shelf.items.map(item => {
                  const name = crateName(item);
                  if (typeof item === 'string') return <li key={name} className="crate font-mono">{name}</li>;
                  return (
                    <li key={name}>
                      <button
                        type="button" className="crate crate-button font-mono" aria-expanded={opened?.name === name}
                        onClick={event => controllerRef.current?.toggle(event.currentTarget, { ...item, shelf: shelf.label })}
                      >
                        <span className="crate-lid" aria-hidden="true" />{name}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {/* Narrow screens: what is inside shows right under the shelf. */}
              {opened?.shelf === shelf.label && <div className="crate-inline">{details}</div>}
            </section>
          ))}
          <div className="rack-floor" aria-hidden="true" />
          {/* Library ladder parked on the right, with the stock-taker standing on it. */}
          <span ref={ladderRef} className="rack-ladder" aria-hidden="true" />
        </div>
        <aside ref={officeRef} className="office" aria-label={languages.label}>
          <h3 className="rack-tag font-mono">{languages.label}</h3>
          <ul className="languages">
            {languages.items.map(item => (
              <li key={item.name}><strong>{item.name}</strong><span className="language-level font-mono">{item.level}</span></li>
            ))}
          </ul>
          {/* The counter: what came out of the crate lying on the desk. */}
          {opened && <div className="office-counter">{details}</div>}
          <div ref={sceneRef} className="office-scene" aria-hidden="true">
            {languages.chat.map((line, index) => (
              <span key={line} className={`office-robot office-robot-${index}`}>
                <span className="office-bubble font-mono">{line}</span>
                <RobotSprite pose="idle" mood="happy" />
              </span>
            ))}
            <span ref={deskRef} className="office-desk" />
          </div>
        </aside>
        {/* Pneumatic pipe from the rack to the office desk, and the layer where the travelling pieces are drawn. */}
        <svg ref={pipeRef} className="yard-pipe" aria-hidden="true">
          <path className="pipe-body" />
          <path className="pipe-core" />
          <rect className="pipe-nozzle" />
          <rect className="pipe-nozzle" />
        </svg>
        <div ref={fxRef} className="yard-fx" aria-hidden="true" />
      </div>
    </div>
  );
}
