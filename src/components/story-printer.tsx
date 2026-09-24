'use client';

import { useEffect, useRef, useState } from 'react';
import { PrinterSprite } from '@/components/robot-sprite';
import { registerStep } from '@/components/scene';

type Phase = 'done' | 'waiting' | 'printing';
type Line = { top: number; bottom: number; left: number; right: number };

const HEAD_WIDTH = 20;
const HEAD_HEIGHT = 12;

class Cancelled extends Error {}

// The About story. It starts as a faint draft that can already be read; as step 1 of the About scene a printer-head
// robot rides along each line like a typewriter carriage, inking it into the final colour, with a "ding" at the end
// of every line before it returns to the start of the next. Without motion the text is simply final.
export function StoryPrinter({ paragraphs }: { paragraphs: readonly string[] }) {
  const [phase, setPhase] = useState<Phase>('done');
  const boxRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const ink = inkRef.current;
    if (!box || !ink || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const area: HTMLDivElement = box;
    const layer: HTMLDivElement = ink;
    let cancelled = false;
    // Show the draft until the printer inks it.
    setPhase('waiting');

    // Every visual line of the story, top to bottom, relative to the box.
    function measureLines(): Line[] {
      const origin = area.getBoundingClientRect();
      const lines: Line[] = [];
      for (const paragraph of layer.querySelectorAll('p')) {
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        for (const rect of range.getClientRects()) {
          if (!rect.width) continue;
          const line = { top: rect.top - origin.top, bottom: rect.bottom - origin.top, left: rect.left - origin.left, right: rect.right - origin.left };
          const same = lines.find(existing => Math.abs(existing.top - line.top) < 2);
          if (same) { same.left = Math.min(same.left, line.left); same.right = Math.max(same.right, line.right); } else lines.push(line);
        }
      }
      return lines;
    }

    // Ink covers every finished line in full plus the current line up to x.
    const clipTo = (line: Line, x: number) => {
      const width = area.clientWidth;
      layer.style.clipPath = `polygon(0 0, ${width}px 0, ${width}px ${line.top}px, ${x}px ${line.top}px, ${x}px ${line.bottom}px, 0 ${line.bottom}px)`;
    };

    const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return reject(new Cancelled());
        const t = Math.min(1, (now - start) / duration);
        onFrame(t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

    function ding(x: number, y: number) {
      const plim = document.createElement('span');
      plim.className = 'printer-ding';
      plim.textContent = '✦';
      plim.style.left = `${x}px`;
      plim.style.top = `${y}px`;
      area.appendChild(plim);
      setTimeout(() => plim.remove(), 500);
    }

    async function print() {
      const head = headRef.current;
      const rail = railRef.current;
      if (!head || !rail) return;
      const lines = measureLines();
      const place = (x: number, y: number) => { head.style.transform = `translate(${x - HEAD_WIDTH / 2}px, ${y}px)`; };
      const headY = (line: Line) => line.top - HEAD_HEIGHT - 1;
      layer.style.clipPath = 'inset(0 0 100% 0)';
      setPhase('printing');
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        rail.style.transform = `translateY(${line.top - 1}px)`;
        // The carriage slides along the rail over the line, leaving it inked behind the nozzle.
        await tween(Math.max(260, (line.right - line.left) * .55), t => {
          const x = line.left + (line.right - line.left) * t;
          place(x, headY(line));
          clipTo(line, x);
        });
        ding(line.right + 4, line.top - 6);
        // Carriage return: back to the start of the next line with a little hop.
        const nextLine = lines[index + 1];
        if (nextLine) await tween(200, t => place(line.right + (nextLine.left - line.right) * t, headY(line) + (headY(nextLine) - headY(line)) * t - Math.sin(Math.PI * t) * 6));
      }
      layer.style.removeProperty('clip-path');
      const last = lines[lines.length - 1];
      await tween(350, t => { head.style.opacity = String(1 - t); if (last) place(last.right + 30 * t, headY(last) - 14 * t); });
      setPhase('done');
    }

    // Step 1 of the About scene: the story is printed first, before anything else moves.
    const unregister = registerStep('about', 1, print);

    return () => {
      cancelled = true;
      unregister();
      layer.style.removeProperty('clip-path');
      area.querySelectorAll('.printer-ding').forEach(element => element.remove());
    };
  }, [paragraphs]);

  return (
    <div ref={boxRef} className={`about-story story-${phase}`}>
      {phase !== 'done' && <div className="story-draft" aria-hidden="true">{paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>}
      <div ref={inkRef} className="story-ink">{paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      {phase !== 'done' && <>
        <span ref={railRef} className="printer-rail" aria-hidden="true" />
        <span ref={headRef} className="printer-head" aria-hidden="true"><PrinterSprite /></span>
      </>}
    </div>
  );
}
