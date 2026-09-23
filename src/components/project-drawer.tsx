'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { crewMarkup } from '@/components/robot-sprite';

const SLIDE = 450;
const STEP_INTERVAL = 110;

// Collapsible list of a project's technical decisions, closed by default. Whenever it opens or closes, a hard-hat
// crew robot hanging from the drawer's bottom edge pulls it down or pushes it back up, then leaves.
export function ProjectDrawer({ items, openLabel, closeLabel }: { items: readonly string[]; openLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(0);
  const robotRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    const robot = robotRef.current;
    if (!working || !robot) return;
    let step = 0;
    const legs = setInterval(() => { robot.innerHTML = crewMarkup(true, ++step); }, STEP_INTERVAL);
    const stopLegs = setTimeout(() => clearInterval(legs), SLIDE);
    const leave = setTimeout(() => setWorking(0), SLIDE + 450);
    return () => { clearInterval(legs); clearTimeout(stopLegs); clearTimeout(leave); };
  }, [working]);

  function toggle() {
    setOpen(value => !value);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setWorking(count => count + 1);
  }

  return (
    <div className={`drawer${open ? ' drawer-open' : ''}`}>
      <button type="button" className="drawer-toggle font-mono" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
        {open ? closeLabel : openLabel}<span className="drawer-chevron" aria-hidden="true">▾</span>
      </button>
      <div className="drawer-body">
        <div className="drawer-panel" id={panelId} hidden={!open && !working}>
          <ul className="project-highlights">{items.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        {working > 0 && <span key={working} ref={robotRef} className="drawer-robot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: crewMarkup(true, 0) }} />}
      </div>
    </div>
  );
}
