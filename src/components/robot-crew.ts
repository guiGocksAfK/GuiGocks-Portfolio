// Coordination between the hero's robots: the painter works on the name first, then the list boss and its crew start.
const EVENT = 'name-painted';

// Runs before the page is painted (see site-document.tsx):
// - A language switch in progress (teleport.tsx left a note on the way out): the page stays covered until the teleport
//   finishes arriving, and it comes finished, with nothing left to build.
// - Otherwise, a visitor who chose the other language before is sent to that version.
// - Otherwise, the name starts unpainted (blue) on every load, and the contact section is marked as still to be built by
//   the robots (see contact-stage.tsx), except on phones, which get it finished (the show is made for a wide screen).
export const PAINT_BOOT_SCRIPT = `try{var d=document.documentElement,s=null,l=null,p=location.pathname,en=p==='/en'||p.indexOf('/en/')===0;try{s=sessionStorage.getItem('lang-switch')}catch(e){}try{l=localStorage.getItem('lang')}catch(e){}if(s){d.dataset.langSwitch='1'}else if(l==='en'&&!en){location.replace('/en'+location.hash)}else if(l==='pt'&&en){location.replace('/'+location.hash)}else if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.paint='pending';if(matchMedia('(min-width: 701px)').matches)d.dataset.build='pending'}}catch(e){}`;

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

// Called when the painter is done (or gave up): the name goes back to its normal colours and the list robots may start.
export function announceNamePainted() {
  delete document.documentElement.dataset.paint;
  window.dispatchEvent(new Event(EVENT));
}
