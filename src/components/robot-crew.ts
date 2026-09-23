// Coordination between the site's robots: the painter works on the name first, then the list robot starts.
const EVENT = 'name-painted';

// Runs before the page is painted (see layout.tsx) so the name already starts unpainted (blue) on every load.
export const PAINT_BOOT_SCRIPT = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.paint='pending'}catch(e){}`;

export const isNamePending = () => document.documentElement.dataset.paint === 'pending';

// Resolves once the painter is done, immediately when there is nothing to paint, or after a safety timeout.
export function whenNamePainted(timeout = 9000) {
  if (!isNamePending()) return Promise.resolve();
  return new Promise<void>(resolve => {
    const done = () => { clearTimeout(timer); window.removeEventListener(EVENT, done); resolve(); };
    const timer = setTimeout(done, timeout);
    window.addEventListener(EVENT, done);
  });
}

export function announceNamePainted() {
  delete document.documentElement.dataset.paint;
  window.dispatchEvent(new Event(EVENT));
}
