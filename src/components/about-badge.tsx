'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AvatarSprite, DroneSprite, crewMarkup } from '@/components/robot-sprite';
import { registerStep } from '@/components/scene';

type Phase = 'done' | 'waiting' | 'delivering' | 'cleaning';

const SCENE = 2600;
// While the drone brings it, the photo arrives as big pixels, like the pixel-art avatar, and sharpens into the photo.
const PIXEL_STEPS = [6, 8, 11, 16, 24, 36, 56];
const PIXELS_FROM = 1200; // ms into the delivery when it starts sharpening
const PIXEL_STEP = 140; // ms per step
const CLEANER_W = 16;
const CLEANER_H = 18;
const WIPE = 750; // ms per pass of the cloth

class Cancelled extends Error {}

type BadgeProps = {
  name: string; role: string; location: string; lookingLabel: string; lookingText: string;
  photo: string | null; photoAlt: string; avatarLabel: string; spyLine: string;
};

// Construction-site ID badge hanging from a nail by its lanyard. The first time it scrolls into view, a drone flies it
// in, hooks the lanyard on the nail and leaves; the badge swings like a pendulum until it settles. The photo arrives as
// big pixels that sharpen into it, but dusty: a little robot climbs up with a cloth and wipes it clean in two passes,
// gives it a sparkle and hops off. Hovering the photo, another robot peeks out from behind it and vouches for the boss.
export function AboutBadge({ name, role, location, lookingLabel, lookingText, photo, photoAlt, avatarLabel, spyLine }: BadgeProps) {
  const [phase, setPhase] = useState<Phase>('done');
  const rigRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { timers.delete(timer); if (cancelled) reject(new Cancelled()); else resolve(); }, ms);
      timers.add(timer);
    });
    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return reject(new Cancelled());
        const t = Math.max(0, Math.min(1, (now - start) / duration));
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    const clearUp = () => rig.querySelectorAll('.badge-cleaner, .badge-sparkle').forEach(element => element.remove());

    // The cleaner: up the side of the badge, a pass along the top half of the photo and one back along the bottom
    // half, the dust coming off where the cloth goes; then a sparkle, and off it hops.
    async function clean() {
      const frame = photoRef.current;
      const card = frame?.closest<HTMLElement>('.badge-card');
      const dust = [...(frame?.querySelectorAll<HTMLElement>('.badge-dust') ?? [])];
      const slot = frame?.parentElement;
      if (!frame || !card || !slot || dust.length < 2) return;
      // The photo's box inside the card (its slot is what the card lays out).
      const box = { x: slot.offsetLeft, y: slot.offsetTop, w: frame.offsetWidth, h: frame.offsetHeight };
      const bot = document.createElement('span');
      bot.className = 'badge-cleaner';
      bot.innerHTML = `<span class="badge-cleaner-body">${crewMarkup(true, 0)}<span class="badge-cloth"></span></span>`;
      card.appendChild(bot);
      const body = bot.querySelector<HTMLElement>('.badge-cleaner-body')!;
      const place = (x: number, y: number) => { bot.style.transform = `translate(${x}px, ${y}px)`; };
      const rows = [box.y + box.h * .25 - CLEANER_H / 2, box.y + box.h * .75 - CLEANER_H / 2];
      const bottom = box.y + box.h - CLEANER_H;
      const leftX = box.x - CLEANER_W / 2;
      const rightX = box.x + box.w - CLEANER_W / 2;
      // Where the cloth is, as a share of the photo's width.
      const reach = (x: number) => Math.min(100, Math.max(0, (x + CLEANER_W / 2 - box.x) / box.w * 100));
      try {
        // Up the side, from the bottom corner.
        await tween(380, t => { place(leftX - 6 + 6 * t, bottom + (rows[0] - bottom) * t - Math.sin(Math.PI * t) * 10); bot.style.opacity = String(Math.min(1, t * 3)); });
        // First pass, left to right, along the top half.
        await tween(WIPE, t => { const x = leftX + (rightX - leftX) * t; place(x, rows[0]); dust[0].style.clipPath = `inset(0 0 0 ${reach(x)}%)`; });
        dust[0].style.clipPath = 'inset(0 0 0 100%)';
        // Down a row, turning round, and back along the bottom half.
        body.style.scale = '-1 1';
        await tween(220, t => place(rightX, rows[0] + (rows[1] - rows[0]) * t));
        await tween(WIPE, t => { const x = rightX + (leftX - rightX) * t; place(x, rows[1]); dust[1].style.clipPath = `inset(0 ${100 - reach(x)}% 0 0)`; });
        dust[1].style.clipPath = 'inset(0 100% 0 0)';
        // A sparkle or three on the clean photo, then it hops off.
        body.style.scale = '1 1';
        for (const [dx, dy] of [[.25, .3], [.78, .2], [.6, .82]]) {
          const sparkle = document.createElement('span');
          sparkle.className = 'badge-sparkle';
          sparkle.textContent = '✦';
          Object.assign(sparkle.style, { left: `${box.x + box.w * dx}px`, top: `${box.y + box.h * dy}px` });
          sparkle.addEventListener('animationend', () => sparkle.remove());
          card.appendChild(sparkle);
          await wait(120);
        }
        await wait(250);
        await tween(380, t => { place(leftX - 22 * t, rows[1] - Math.sin(Math.PI * t) * 12 + 14 * t); bot.style.opacity = String(1 - t); });
      } finally {
        bot.remove();
      }
    }

    // Keep the badge off the nail until the drone brings it.
    setPhase('waiting');
    // Step 1 of the About scene: the drone delivers the badge; its photo sharpens and gets cleaned.
    const unregister = registerStep('about', 1, async () => {
      setPhase('delivering');
      await wait(SCENE);
      if (photo) {
        setPhase('cleaning');
        await wait(50);
        await clean();
      }
      setPhase('done');
    }, () => { cancelled = true; timers.forEach(clearTimeout); clearUp(); setPhase('done'); });
    return () => { cancelled = true; unregister(); timers.forEach(clearTimeout); clearUp(); };
  }, [photo]);

  // The photo's pixel reveal, drawn on a canvas over it (which stays until the delivery ends, sharp by then).
  useEffect(() => {
    const frame = photoRef.current;
    const image = frame?.querySelector('img');
    if (phase !== 'delivering' || !frame || !image) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'badge-pixels';
    canvas.setAttribute('aria-hidden', 'true');
    frame.insertBefore(canvas, image.nextSibling);
    const context = canvas.getContext('2d');
    const source = new window.Image();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const draw = (cells: number) => {
      if (!context || !source.naturalWidth) return;
      canvas.width = cells;
      canvas.height = cells;
      context.drawImage(source, 0, 0, cells, cells);
    };
    source.onload = () => {
      draw(PIXEL_STEPS[0]);
      PIXEL_STEPS.slice(1).forEach((cells, index) => timers.push(setTimeout(() => draw(cells), PIXELS_FROM + index * PIXEL_STEP)));
      timers.push(setTimeout(() => draw(source.naturalWidth), PIXELS_FROM + (PIXEL_STEPS.length - 1) * PIXEL_STEP));
    };
    source.src = image.currentSrc || image.src;
    return () => { timers.forEach(clearTimeout); canvas.remove(); };
  }, [phase]);

  const dusty = photo && phase !== 'done';
  return (
    <div ref={rigRef} className={`badge-rig badge-${phase}`}>
      <span className="badge-nail" aria-hidden="true" />
      <div className="badge-flight">
        {phase === 'delivering' && <span className="badge-drone" aria-hidden="true"><DroneSprite /></span>}
        <div className="badge-hang">
          <svg className="badge-lanyard" viewBox="0 0 70 60" aria-hidden="true"><path d="M35 3 L9 58 M35 3 L61 58" /></svg>
          <div className="badge-card">
            <span className="badge-clip" aria-hidden="true" />
            <div className="badge-photo-slot">
              {/* Peeks out from behind the photo on hover. */}
              {photo && (
                <span className="badge-spy" aria-hidden="true">
                  <span className="badge-spy-robot" dangerouslySetInnerHTML={{ __html: crewMarkup(false, 0) }} />
                  <span className="badge-spy-line">{spyLine}</span>
                </span>
              )}
              <div ref={photoRef} className={`badge-photo${photo ? ' badge-photo-real' : ''}`}>
                {photo
                  ? <Image src={photo} alt={photoAlt} fill quality={90} sizes="124px" className="badge-image" />
                  : <span className="badge-avatar" role="img" aria-label={avatarLabel}><AvatarSprite /></span>}
                {/* The dust on a freshly delivered photo, in two halves for the cleaner's two passes. */}
                {dusty && <><span className="badge-dust badge-dust-top" aria-hidden="true" /><span className="badge-dust badge-dust-bottom" aria-hidden="true" /></>}
              </div>
            </div>
            <p className="badge-name">{name}</p>
            <p className="badge-role font-mono">{role}</p>
            <p className="badge-location font-mono">{location}</p>
            <div className="badge-looking">
              <p className="badge-looking-label font-mono">{lookingLabel}</p>
              <p>{lookingText}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
