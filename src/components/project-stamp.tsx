'use client';

import { useEffect, useRef, useState } from 'react';
import { RobotSprite, StampToolSprite } from '@/components/robot-sprite';

type Phase = 'done' | 'waiting' | 'stamping';

const STAMP_SCENE = 1600;

// Status stamp on a project card. The first time the card scrolls into view, an inspector robot drops in with a
// rubber stamp and stamps it. Without motion (or without JavaScript) the stamp is simply there.
export function ProjectStamp({ label, tone }: { label: string; tone: 'accent' | 'muted' }) {
  const [phase, setPhase] = useState<Phase>('done');
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Hide the stamp until the robot delivers it.
    setPhase('waiting');
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPhase('stamping');
      timer = setTimeout(() => setPhase('done'), STAMP_SCENE);
    }, { threshold: 1 });
    observer.observe(area);
    return () => { observer.disconnect(); clearTimeout(timer); };
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
