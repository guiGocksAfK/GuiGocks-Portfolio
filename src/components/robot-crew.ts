// Shared state of the name painter: the boot script marks the name as unpainted before the first paint.

// Runs before the page is painted (see layout.tsx) so the name already starts unpainted (blue) on every load.
export const PAINT_BOOT_SCRIPT = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.paint='pending'}catch(e){}`;

export const isNamePending = () => document.documentElement.dataset.paint === 'pending';

// Called when the painter is done (or gave up): the name goes back to its normal colours.
export function announceNamePainted() {
  delete document.documentElement.dataset.paint;
}
