'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RobotSprite } from '@/components/robot-sprite';

type Stage = 'blank' | 'playing' | 'done';

const finishBuild = () => { delete document.documentElement.dataset.build; };

// The contact section is built by the robots in front of the visitor. The boot script marks the page before the first
// paint (html[data-build="pending"]), so the section starts as a blank off-white canvas with only a robot holding a
// "skip" sign; without JS or with reduced motion it is simply finished. The content is in the page all along (only
// hidden from sight), so screen readers and search engines get it right away. The show starts once the section's last
// line is on screen; clicking the sign at any moment jumps to the finished section.
export function ContactStage({ skipLabel, children }: { skipLabel: string; children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<Stage>('blank');

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || document.documentElement.dataset.build !== 'pending') return;
    const footer = section.querySelector('.section-footer') ?? section;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setStage(current => current === 'blank' ? 'playing' : current);
    }, { threshold: .6 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // The show itself comes scene by scene; for now it waits until the visitor skips.
  useEffect(() => {
    if (stage === 'done') finishBuild();
  }, [stage]);

  return (
    <section ref={sectionRef} id="contato" aria-labelledby="contact-title" className="contact-section" data-stage={stage}>
      <span className="contact-canvas" aria-hidden="true" />
      <div className="contact-built">{children}</div>
      {stage !== 'done' && (
        <button type="button" className="skip-robot" onClick={() => setStage('done')}>
          <span className="robot-sign skip-sign font-mono">{skipLabel}</span>
          <RobotSprite pose="carry" mood="normal" />
        </button>
      )}
    </section>
  );
}
