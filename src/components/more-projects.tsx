'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

// The project cards past the featured ones, folded behind a "see more" button. They stay in the page (hidden), so
// screen readers' search and search engines still find them, and a link to one of them (a tool crate's project link)
// unfolds the list before the teleport measures where to go.
export function MoreProjects({ count, moreLabel, lessLabel, children }: { count: number; moreLabel: string; lessLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Capture phase: runs before the teleporter's own click handler, which needs the card laid out to land on it.
    const onClick = (event: MouseEvent) => {
      const href = (event.target as Element).closest?.('a[href^="#"]')?.getAttribute('href');
      if (!href || href.length < 2 || !list.current?.hidden) return;
      const target = document.getElementById(href.slice(1));
      if (target && list.current.contains(target)) flushSync(() => setOpen(true));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return (
    <>
      <div ref={list} id="more-projects" className="project-list project-more" hidden={!open}>{children}</div>
      <button type="button" className="project-more-toggle font-mono" aria-expanded={open} aria-controls="more-projects" onClick={() => setOpen(value => !value)}>
        {open ? lessLabel : `${moreLabel} (${count})`}
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="arrow" style={open ? { transform: 'rotate(180deg)' } : undefined}><path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </>
  );
}
