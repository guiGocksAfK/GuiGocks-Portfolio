// Coordination between the site's robots: the painter works on the name first, then the list robot starts.
export const NAME_PAINTED_KEY = 'name-painted';
const EVENT = 'name-painted';

// Runs before the page is painted (see layout.tsx): first visits start with the name unpainted (blue).
export const PAINT_BOOT_SCRIPT = `try{if(sessionStorage.getItem('${NAME_PAINTED_KEY}')!=='1'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.paint='pending'}catch(e){}`;

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
  try { sessionStorage.setItem(NAME_PAINTED_KEY, '1'); } catch { /* storage unavailable: the painter just works again next time */ }
  window.dispatchEvent(new Event(EVENT));
}
