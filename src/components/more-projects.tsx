'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { forkliftMarkup } from '@/components/robot-sprite';

// The project cards past the featured ones, kept in a depot under the list: a pallet of crates labelled with their
// names and a parked forklift. Clicking the depot unloads them one at a time: the forklift drives to a crate, picks it
// up, lifts it and the crate opens into the card, which grows up out of the depot (the page follows, so the depot stays
// put on screen). Clicking again puts them away. The cards stay in the page while folded (only hidden), and a link to
// one of them (a tool crate's project link) unfolds the list at once, before the teleport measures where to go.

const SPEED = 480; // px/s, the forklift on the depot floor
const MAX_DRIVE = 1000; // ms: on a wide screen it crosses the floor faster rather than taking longer
const PARK = 14; // px, the parked forklift's distance from the right end
const FORKS = 14; // px of the forks reaching under a crate
const GAP = 28; // px between cards (the project list's gap)
const PHONE_GAP = 20;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const cardsIn = (list: HTMLElement | null) => [...(list?.children ?? [])] as HTMLElement[];

export function MoreProjects({ names, moreLabel, lessLabel, children }: { names: readonly string[]; moreLabel: string; lessLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const depot = useRef<HTMLButtonElement>(null);
  const truck = useRef<HTMLSpanElement>(null);
  // Set while the forklift works; hurry() makes every remaining move jump to its end.
  const busy = useRef(false);
  const hurry = useRef(false);
  // A link to a folded card clicked while the forklift works: whatever it was doing, the cards end up out.
  const wantOpen = useRef(false);

  // Every card shown (or folded) at once, with the depot in its matching state: no forklift trip.
  const settle = useCallback((shown: boolean) => {
    flushSync(() => setOpen(shown));
    for (const card of cardsIn(list.current)) { card.style.height = ''; card.style.marginTop = ''; card.style.overflow = ''; card.classList.remove('more-card-waiting'); }
    depot.current?.querySelectorAll<HTMLElement>('.depot-crate').forEach(crate => {
      crate.style.transform = '';
      crate.style.opacity = '';
      crate.classList.toggle('depot-crate-gone', shown);
      crate.classList.remove('depot-crate-lifted');
    });
    if (truck.current) truck.current.style.cssText = '';
  }, []);
  const cards = () => cardsIn(list.current);

  useEffect(() => {
    // Capture phase: runs before the teleporter's own click handler, which needs the card laid out to land on it.
    const onClick = (event: MouseEvent) => {
      const href = (event.target as Element).closest?.('a[href^="#"]')?.getAttribute('href');
      if (!href || href.length < 2 || !list.current) return;
      const target = document.getElementById(href.slice(1));
      if (!target || !list.current.contains(target)) return;
      if (busy.current) { hurry.current = true; wantOpen.current = true; }
      else if (list.current.hidden) settle(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [settle]);

  // A move of `ms` milliseconds; with the page in a hurry, it lands on its end right away.
  const tween = (ms: number, onFrame: (t: number) => void) => new Promise<void>(resolve => {
    const start = performance.now();
    const step = (now: number) => {
      const t = hurry.current ? 1 : Math.max(0, Math.min(1, (now - start) / ms));
      onFrame(t);
      if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
  const wait = async (ms: number) => { if (!hurry.current) await pause(ms); };
  const ease = (t: number) => t * t * (3 - 2 * t);

  // Drives the forklift from one spot to another (x is its left edge on the floor), with the crate on its forks, if
  // it carries one, riding along (picked up at `from`, so its offset is measured from there).
  const drive = (from: number, to: number, crate?: HTMLElement, lift = 0) => {
    const ms = Math.min(MAX_DRIVE, Math.abs(to - from) / SPEED * 1000);
    return tween(ms, t => {
      const x = from + (to - from) * ease(t);
      const bump = Math.round(Math.sin(t * ms / 70)) * .5;
      // Parked, it sits against the right end (CSS); moving, it is placed from the left end of the floor.
      truck.current!.style.cssText = `left: 0; right: auto; transform: translate(${x}px, ${bump}px)`;
      if (crate) crate.style.transform = `translate(${x - from}px, ${bump - lift}px)`;
    });
  };

  // Grows a waiting card from nothing to its height, scrolling the page by as much so the depot stays where it is.
  const grow = async (card: HTMLElement, gap: number) => {
    card.classList.remove('more-card-waiting');
    card.style.overflow = 'hidden';
    card.style.height = 'auto';
    const height = card.offsetHeight;
    card.style.height = '0px';
    card.style.marginTop = '0px';
    const inView = () => { const box = depot.current!.getBoundingClientRect(); return box.top < window.innerHeight && box.bottom > 0; };
    const follow = inView();
    let grown = 0;
    await tween(420, t => {
      const size = (height + gap) * ease(t);
      card.style.height = `${Math.max(0, size - gap)}px`;
      card.style.marginTop = `${Math.min(gap, size)}px`;
      if (follow) window.scrollBy({ top: size - grown, behavior: 'instant' });
      grown = size;
    });
    card.style.height = '';
    card.style.marginTop = '';
    card.style.overflow = '';
  };

  const unload = async () => {
    const floor = depot.current!.querySelector<HTMLElement>('.depot-floor')!;
    // Crates by card order: the first card's crate is the rightmost one, the nearest to the parked forklift.
    const crates = [...depot.current!.querySelectorAll<HTMLElement>('.depot-crate')].reverse();
    const gap = window.matchMedia('(max-width: 600px)').matches ? PHONE_GAP : GAP;
    flushSync(() => setOpen(true));
    for (const card of cards()) card.classList.add('more-card-waiting');
    const width = truck.current!.offsetWidth;
    const park = floor.clientWidth - width - PARK;
    const floorLeft = floor.getBoundingClientRect().left;
    let x = park;
    for (const [index, crate] of crates.entries()) {
      const box = crate.getBoundingClientRect();
      // Forks first (the truck faces left): its left edge under the crate's right part.
      const pick = box.right - floorLeft - FORKS;
      await drive(x, pick);
      await wait(150);
      // Forks up a little, then it reverses to the middle with the crate.
      crate.classList.add('depot-crate-lifted');
      await tween(200, t => { crate.style.transform = `translate(0px, ${-4 * t}px)`; });
      // It only backs out a little before lifting, instead of crossing to the middle of the floor.
      const to = pick + 70;
      await drive(pick, to, crate, 4);
      x = to;
      // The forks lift the crate high, its lid pops off and the card grows up out of it.
      await tween(280, t => { crate.style.transform = `translate(${to - pick}px, ${-4 - 18 * ease(t)}px)`; });
      crate.classList.add('depot-crate-gone');
      const card = cards()[index];
      if (card) await grow(card, gap);
      crate.style.transform = '';
      crate.classList.remove('depot-crate-lifted');
      await wait(150);
    }
    await drive(x, park);
    truck.current!.style.cssText = '';
  };

  // Puts the cards away: they fold back down into the depot and the crates drop back onto the pallet.
  const putAway = async () => {
    const gap = window.matchMedia('(max-width: 600px)').matches ? PHONE_GAP : GAP;
    const box = depot.current!.getBoundingClientRect();
    const follow = box.top < window.innerHeight && box.bottom > 0;
    const sizes = cards().map(card => card.offsetHeight + gap);
    for (const card of cards()) card.style.overflow = 'hidden';
    let shrunk = 0;
    await tween(320, t => {
      cards().forEach((card, index) => {
        const size = sizes[index] * (1 - ease(t));
        card.style.height = `${Math.max(0, size - gap)}px`;
        card.style.marginTop = `${Math.min(gap, size)}px`;
      });
      const total = sizes.reduce((sum, size) => sum + size, 0) * ease(t);
      if (follow) window.scrollBy({ top: -(total - shrunk), behavior: 'instant' });
      shrunk = total;
    });
    settle(false);
    depot.current?.querySelectorAll('.depot-crate').forEach(crate => crate.classList.add('depot-crate-back'));
    await wait(500);
    depot.current?.querySelectorAll('.depot-crate').forEach(crate => crate.classList.remove('depot-crate-back'));
  };

  const onDepot = async () => {
    // A second click while the forklift works finishes the job at once.
    if (busy.current) { hurry.current = true; return; }
    if (reducedMotion()) { settle(!open); return; }
    const opening = !open;
    busy.current = true;
    hurry.current = false;
    wantOpen.current = false;
    try {
      if (opening) await unload(); else await putAway();
    } finally {
      if (hurry.current) settle(opening || wantOpen.current);
      busy.current = false;
      hurry.current = false;
    }
  };

  return (
    <>
      <div ref={list} id="more-projects" className="project-more" hidden={!open}>{children}</div>
      <button ref={depot} type="button" className="depot" aria-expanded={open} aria-controls="more-projects" onClick={onDepot}>
        <span className="depot-sign font-mono">{open ? lessLabel : `${moreLabel} (${names.length})`}</span>
        <span className="depot-floor" aria-hidden="true">
          <span className="depot-pallet">
            {/* Right to left in card order: the first card's crate is the nearest to the forklift. */}
            {[...names].reverse().map(name => <span key={name} className="depot-crate font-mono"><span className="depot-lid" />{name}</span>)}
          </span>
          <span ref={truck} className="depot-truck" dangerouslySetInnerHTML={{ __html: forkliftMarkup() }} />
        </span>
      </button>
    </>
  );
}
