'use client';

import { useEffect, useRef } from 'react';
import { CREW_HEIGHT, CREW_WIDTH, crewMarkup } from '@/components/robot-sprite';
import { registerStep } from '@/components/scene';

// Pause between the end of the construction and the letter falling off.
const FALL_DELAY = 5000;

class Cancelled extends Error {}

// The About story, final and readable from the start. As the last step of the About scene, the last letter of one word
// comes loose and falls, landing on its side below the paragraph; a crew robot picks it up, carries it back, drops it
// into the gap and tightens it with two turns of a wrench. Without motion nothing ever falls.
export function StoryDebug({ paragraphs, bugWord }: { paragraphs: readonly string[]; bugWord: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const area: HTMLDivElement = box;
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const wait = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(resolve, ms); timers.add(timer); }).then(() => { if (cancelled) throw new Cancelled(); });
    const play = async (element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      try { await element.animate(keyframes, options).finished; } catch { throw new Cancelled(); }
      if (cancelled) throw new Cancelled();
    };
    // Calls onFrame with progress 0..1 on every animation frame.
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
    const spawn = (className: string, text: string, left: number, top: number, life: number) => {
      const element = document.createElement('span');
      element.className = className;
      element.textContent = text;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      area.appendChild(element);
      setTimeout(() => element.remove(), life);
    };

    async function fix() {
      const letter = letterRef.current;
      const paragraph = letter?.closest('p');
      if (!letter || !paragraph) return;
      // The letter moves by transform, so its gap stays in the word; all positions are relative to the story box.
      const homeX = letter.offsetLeft;
      const homeY = letter.offsetTop;
      const setLetter = (dx: number, dy: number, angle = 0) => { letter.style.transform = `translate(${dx}px, ${dy}px) rotate(${angle}deg)`; };
      const floorDy = paragraph.offsetTop + paragraph.offsetHeight + 4 - (homeY + letter.offsetHeight);
      const robot = document.createElement('span');
      robot.className = 'debug-robot';
      robot.innerHTML = crewMarkup(false, 0);
      const placeRobot = (x: number, y: number) => { robot.style.transform = `translate(${x}px, ${y}px)`; };
      // A quiet moment after the building is finished, so the fall reads as its own little joke.
      await wait(FALL_DELAY);
      try {
        // It comes loose and falls with gravity, bounces once and lies on its side.
        await play(letter, [{ transform: 'none' }, { transform: `translate(6px, ${floorDy}px) rotate(80deg)` }], { duration: 480, easing: 'cubic-bezier(.55, 0, 1, .45)' });
        await play(letter, [{ transform: `translate(6px, ${floorDy}px) rotate(80deg)` }, { transform: `translate(9px, ${floorDy - 9}px) rotate(95deg)`, offset: .45 }, { transform: `translate(11px, ${floorDy}px) rotate(90deg)` }], { duration: 300, easing: 'ease-out' });
        setLetter(11, floorDy, 90);
        await wait(450);

        // The robot pops up next to it and lifts it over its head.
        const groundY = homeY + letter.offsetHeight + floorDy - CREW_HEIGHT + 2;
        const robotX = homeX + 24;
        placeRobot(robotX, groundY);
        area.appendChild(robot);
        await play(robot, [{ transform: `translate(${robotX}px, ${groundY + 8}px)`, opacity: 0 }, { transform: `translate(${robotX}px, ${groundY}px)`, opacity: 1 }], { duration: 240, easing: 'ease-out' });
        robot.innerHTML = crewMarkup(true, 0);
        const carriedDx = robotX + CREW_WIDTH / 2 - letter.offsetWidth / 2 - homeX;
        const carriedDy = groundY - letter.offsetHeight - homeY;
        await tween(220, t => setLetter(11 + (carriedDx - 11) * t, floorDy + (carriedDy - floorDy) * t, 90 * (1 - t)));

        // Hops up onto the word, carrying the letter, and drops it into the gap.
        const topX = homeX + letter.offsetWidth / 2 - CREW_WIDTH / 2;
        const topY = homeY - CREW_HEIGHT + 6;
        await tween(480, t => {
          const x = robotX + (topX - robotX) * t;
          const y = groundY + (topY - groundY) * t - 22 * 4 * t * (1 - t);
          placeRobot(x, y);
          setLetter(x + CREW_WIDTH / 2 - letter.offsetWidth / 2 - homeX, y - letter.offsetHeight - homeY);
        });
        robot.innerHTML = crewMarkup(false, 0);
        const aboveDy = topY - letter.offsetHeight - homeY;
        await play(letter, [{ transform: `translate(0, ${aboveDy}px)` }, { transform: 'none' }], { duration: 180, easing: 'ease-in' });
        letter.style.removeProperty('transform');

        // Two turns of the wrench to tighten it, then a sparkle.
        const wrench = document.createElement('span');
        wrench.className = 'debug-wrench';
        robot.appendChild(wrench);
        for (let turn = 0; turn < 2; turn++) {
          await play(wrench, [{ transform: 'rotate(-35deg)' }, { transform: 'rotate(40deg)' }], { duration: 200, easing: 'ease-in-out' });
          spawn('debug-tec font-mono', 'tec', topX + CREW_WIDTH + 2 + turn * 6, topY - 4 - turn * 6, 450);
          letter.animate([{ transform: 'none' }, { transform: 'translateY(2px)' }, { transform: 'none' }], { duration: 160 });
          await wait(160);
        }
        spawn('debug-sparkle', '✦', homeX + letter.offsetWidth, homeY - 4, 600);
        await wait(200);
        await play(robot, [{ transform: `translate(${topX}px, ${topY}px)`, opacity: 1 }, { transform: `translate(${topX}px, ${topY - 8}px)`, opacity: 1, offset: .4 }, { transform: `translate(${topX}px, ${topY - 4}px)`, opacity: 0 }], { duration: 320, easing: 'ease-out' });
      } finally {
        robot.remove();
        letter.getAnimations().forEach(animation => animation.cancel());
        letter.style.removeProperty('transform');
      }
    }

    // Last step of the About scene: everything else is finished before the letter falls.
    const unregister = registerStep('about', 5, fix);

    return () => {
      cancelled = true;
      unregister();
      timers.forEach(clearTimeout);
      area.querySelectorAll('.debug-robot, .debug-tec, .debug-sparkle').forEach(element => element.remove());
    };
  }, [paragraphs, bugWord]);

  // Only the first paragraph that contains the word gets the loose letter (its last one).
  const loose = paragraphs.findIndex(paragraph => paragraph.includes(bugWord));
  return (
    <div ref={boxRef} className="about-story">
      {paragraphs.map((paragraph, index) => {
        if (index !== loose) return <p key={paragraph}>{paragraph}</p>;
        const at = paragraph.indexOf(bugWord);
        return (
          <p key={paragraph}>
            {paragraph.slice(0, at)}
            <span className="loose-word">{bugWord.slice(0, -1)}<span ref={letterRef} className="loose-letter">{bugWord.slice(-1)}</span></span>
            {paragraph.slice(at + bugWord.length)}
          </p>
        );
      })}
    </div>
  );
}
