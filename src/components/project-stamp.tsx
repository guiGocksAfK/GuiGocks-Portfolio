'use client';

import { useEffect, useRef, useState } from 'react';
import { RobotSprite, StampToolSprite } from '@/components/robot-sprite';

type Phase = 'done' | 'waiting' | 'stamping';

const STAMP_SCENE = 1600;
const QUEUE_GAP = 250;

// Shared by every card: the inspector stamps one card at a time, in the order the cards came into view, even when
// the visitor scrolls past several at once.
let queue = Promise.resolve();

// Status stamp on a project card. The first time the card scrolls into view it joins the inspector's queue; in its turn
// an inspector robot drops in with a rubber stamp and stamps it. Without motion (or without JavaScript) the stamp is
// simply there.
export function ProjectStamp({ label, tone }: { label: string; tone: 'accent' | 'muted' }) {
  const [phase, setPhase] = useState<Phase>('done');
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Lets the queue move on even if this card goes away mid-stamp.
    let release: (() => void) | undefined;
    // Hide the stamp until the robot delivers it.
    setPhase('waiting');
    const stamp = () => new Promise<void>(resolve => {
      if (cancelled) return resolve();
      release = resolve;
      setPhase('stamping');
      timer = setTimeout(() => { setPhase('done'); setTimeout(resolve, QUEUE_GAP); }, STAMP_SCENE);
    });
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      queue = queue.then(stamp);
    }, { threshold: 1 });
    observer.observe(area);
    return () => { cancelled = true; observer.disconnect(); clearTimeout(timer); release?.(); };
  }, []);

  return (
    <div className="stamp-area" ref={areaRef}>
      <p className={`project-stamp stamp-${tone} stamp-${phase} font-mono`}>{label}</p>
      {phase === 'stamping' && (
        <span className="inspector" aria-hidden="true">
          <span className="inspector-tool"><StampToolSprite /></span>
          <span className="inspector-robot"><RobotSprite pose="carry" mood="normal" /></span>
        </span>
      )}
    </div>
  );
}
