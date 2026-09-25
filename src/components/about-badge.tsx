'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AvatarSprite, DroneSprite } from '@/components/robot-sprite';
import { registerStep } from '@/components/scene';

type Phase = 'done' | 'waiting' | 'delivering';

const SCENE = 2600;

type BadgeProps = {
  name: string; role: string; location: string; lookingLabel: string; lookingText: string;
  photo: string | null; photoAlt: string; avatarLabel: string;
};

// Construction-site ID badge hanging from a nail by its lanyard. The first time it scrolls into view, a drone flies it
// in, hooks the lanyard on the nail and leaves; the badge swings like a pendulum until it settles.
export function AboutBadge({ name, role, location, lookingLabel, lookingText, photo, photoAlt, avatarLabel }: BadgeProps) {
  const [phase, setPhase] = useState<Phase>('done');
  const rigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Keep the badge off the nail until the drone brings it.
    setPhase('waiting');
    // Step 1 of the About scene: the drone delivers the badge; the step ends when the badge has stopped swinging.
    const unregister = registerStep('about', 1, () => new Promise<void>(resolve => {
      setPhase('delivering');
      timer = setTimeout(() => { setPhase('done'); resolve(); }, SCENE);
    }));
    return () => { unregister(); clearTimeout(timer); };
  }, []);

  return (
    <div ref={rigRef} className={`badge-rig badge-${phase}`}>
      <span className="badge-nail" aria-hidden="true" />
      <div className="badge-flight">
        {phase === 'delivering' && <span className="badge-drone" aria-hidden="true"><DroneSprite /></span>}
        <div className="badge-hang">
          <svg className="badge-lanyard" viewBox="0 0 70 60" aria-hidden="true"><path d="M35 3 L9 58 M35 3 L61 58" /></svg>
          <div className="badge-card">
            <span className="badge-clip" aria-hidden="true" />
            <div className="badge-photo">
              {photo
                ? <Image src={photo} alt={photoAlt} fill quality={90} sizes="160px" className="badge-image" />
                : <span className="badge-avatar" role="img" aria-label={avatarLabel}><AvatarSprite /></span>}
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
