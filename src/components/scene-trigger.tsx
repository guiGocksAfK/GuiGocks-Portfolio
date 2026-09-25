'use client';

import { useEffect, useRef } from 'react';
import { sceneSteps, setSceneRunning } from '@/components/scene';

const GAP = 300;

// Starts a scene as soon as its section (this element's parent) is well into view and plays the steps one after another,
// with a short gap between them. Between steps it holds while the section is off-screen, so nothing
// is missed.
export function SceneTrigger({ name }: { name: string }) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = markerRef.current?.parentElement;
    if (!section) return;
    let inView = false;
    let stopped = false;
    let waiters: (() => void)[] = [];
    const inViewNow = () => new Promise<void>(resolve => { if (inView) resolve(); else waiters.push(resolve); });

    async function play() {
      setSceneRunning(name, true);
      try {
        for (const step of sceneSteps(name)) {
          await inViewNow();
          if (stopped) return;
          await step.run();
          if (stopped) return;
          await new Promise(resolve => setTimeout(resolve, GAP));
        }
      } catch {
        // A step's component went away: the scene simply ends.
      } finally {
        setSceneRunning(name, false);
      }
    }

    let started = false;
    // Fires once the top of the section has passed the middle of the screen, not when it barely peeks in at the bottom.
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) { const ready = waiters; waiters = []; ready.forEach(resolve => resolve()); }
      if (inView && !started) { started = true; play(); }
    }, { rootMargin: '0px 0px -50% 0px' });
    observer.observe(section);

    return () => {
      stopped = true;
      observer.disconnect();
      waiters.forEach(resolve => resolve());
      setSceneRunning(name, false);
    };
  }, [name]);

  return <span ref={markerRef} hidden />;
}
