import { crewMarkup, type CrewFace } from '@/components/robot-sprite';

// The WhatsApp button's gag, played once per visit on its first click, and only if the visitor watched the contact
// section being built (the show arms it when it ends; skipping it, or reduced motion, never does). The green button
// breaks; a robot from the picnic huffs, grabs its toolbox, leaps up to it and tapes it back together; it presses it
// to test it and it explodes: the tape blows off, the robot is left charred, the button burnt into the site's colours.
// Deadpan, the robot points at it (the visitor's next click opens WhatsApp: browsers only open a new tab straight
// from a click) and goes back to the picnic, still smoking.
export type ZapStep = 'broken' | 'taped' | 'burnt';

const CREW_W = 24;
const CREW_H = 27;

export const zapGagArmed = () => document.documentElement.dataset.zapGag === 'armed';
export const armZapGag = () => { document.documentElement.dataset.zapGag = 'armed'; };

class Aborted extends Error {}

export async function playZapGag(icon: HTMLElement, setStep: (step: ZapStep) => void, signal: AbortSignal) {
  const section = icon.closest<HTMLElement>('#contato');
  const layer = section?.querySelector<HTMLElement>('.stage-actors');
  if (!section || !layer) { setStep('burnt'); return; }
  const stage: HTMLElement = section;
  const actors: HTMLElement = layer;
  const spawned: HTMLElement[] = [];
  const seat = stage.querySelector<HTMLElement>('.ending-picnic-crew-2');

  const check = () => { if (signal.aborted) throw new Aborted(); };
  const wait = (ms: number) => new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Aborted()); }, { once: true });
  });
  const tween = (duration: number, onFrame: (t: number) => void) => new Promise<void>((resolve, reject) => {
    const start = performance.now();
    const step = (now: number) => {
      if (signal.aborted) return reject(new Aborted());
      const t = Math.min(1, (now - start) / duration);
      onFrame(t);
      if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
  const boxOf = (element: Element) => {
    const origin = stage.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height };
  };
  const spawn = (className: string, parent: HTMLElement = actors, text = '') => {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    spawned.push(element);
    return element;
  };
  const puff = (at: { x: number; y: number }) => {
    const smoke = spawn('steam zap-puff');
    Object.assign(smoke.style, { left: `${at.x}px`, top: `${at.y}px` });
    smoke.addEventListener('animationend', () => smoke.remove());
  };

  // The robot: off-duty crew (no hard hat), placed by its top-left corner.
  const robot = spawn('actor crew-actor zap-fixer');
  const body = spawn('actor-body', robot);
  let x = 0;
  let y = 0;
  let facing = 1;
  const draw = (arms: boolean, face: CrewFace = 'normal') => { body.innerHTML = crewMarkup(arms, 0, 'none', face); };
  const place = (nextX: number, nextY: number) => { x = nextX; y = nextY; robot.style.transform = `translate(${x}px, ${y}px)`; body.style.transform = `scaleX(${facing})`; };
  const arc = async (to: { x: number; y: number }, duration: number, height: number) => {
    const from = { x, y };
    facing = to.x < from.x ? -1 : 1;
    await tween(duration, t => place(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * height));
  };

  try {
    // It breaks.
    setStep('broken');
    await wait(700);

    // Someone at the picnic puts its sandwich down with a huff, grabs its toolbox and leaps up to the button.
    const seatBox = seat ? boxOf(seat) : { x: stage.clientWidth * .6, y: stage.clientHeight - 100, w: CREW_W, h: 30 };
    if (seat) seat.style.visibility = 'hidden';
    draw(false, 'tired');
    place(seatBox.x, seatBox.y + seatBox.h - CREW_H);
    puff({ x: x + 4, y: y - 4 });
    await wait(450);
    const toolbox = spawn('zap-toolbox', robot);
    draw(true);
    const row = icon.closest('li') ?? icon;
    const rowBox = boxOf(row);
    const iconBox = boxOf(icon);
    await arc({ x: iconBox.x - CREW_W - 8, y: rowBox.y + rowBox.h - CREW_H }, 850, 90);
    facing = 1;
    place(x, y);

    // Three whacks with sparks, and the pieces go back together with a strip of tape.
    for (let whack = 0; whack < 3; whack++) {
      await tween(160, t => place(x, y - Math.sin(Math.PI * t) * 4));
      const spark = spawn('zap-spark', actors, '✦');
      Object.assign(spark.style, { left: `${iconBox.x + 4 + whack * 5}px`, top: `${iconBox.y - 4 + (whack % 2) * 8}px` });
      spark.addEventListener('animationend', () => spark.remove());
      await wait(150);
    }
    setStep('taped');
    toolbox.remove();
    await wait(500);

    // It presses it to test it... and it blows up.
    const standX = x;
    await tween(160, t => place(standX + 10 * t, y));
    check();
    setStep('burnt');
    const flash = spawn('zap-flash');
    const smoke = spawn('zap-smoke');
    const tape = spawn('zap-tape-flying');
    const center = { x: iconBox.x + iconBox.w / 2, y: iconBox.y + iconBox.h / 2 };
    for (const element of [flash, smoke, tape]) Object.assign(element.style, { left: `${center.x}px`, top: `${center.y}px` });
    robot.classList.add('zap-charred');
    draw(false, 'tired');
    await tween(260, t => place(standX + 10 - 22 * t, y - Math.sin(Math.PI * t) * 10));
    for (let wisp = 0; wisp < 3; wisp++) { puff({ x: x + 8, y: y - 6 }); await wait(300); }

    // Charred and deadpan, it points at the button: now it works.
    draw(true, 'tired');
    await wait(700);
    draw(false, 'tired');

    // Back to the picnic, still smoking, with a cough, and it sits down again as it is.
    await arc({ x: seatBox.x, y: seatBox.y + seatBox.h - CREW_H }, 800, 70);
    puff({ x: x + 6, y: y - 4 });
    await wait(300);
  } finally {
    spawned.forEach(element => element.remove());
    if (seat) {
      seat.style.visibility = '';
      seat.classList.add('zap-charred');
    }
  }
}
