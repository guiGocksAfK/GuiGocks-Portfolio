import { crewMarkup, type CrewFace } from '@/components/robot-sprite';

// The WhatsApp button's gag, played once per visit on its first click, and only if the visitor watched the contact
// section being built (the show arms it when it ends). The green button shakes and breaks; at the picnic one of the
// crew notices, puts its sandwich down with a huff and makes a big jump up to it with its toolbox; it hammers the
// pieces together and tapes them; it reaches out and presses the button to test it... and it explodes: the tape blows
// off, the robot is thrown back, charred, the button burnt into the site's colours. The robot comes back and holds up
// a "now it works" sign, pointing at the button, for a few seconds or until the visitor clicks it (browsers only open
// a new tab straight from a click, so the robot can't press it for them); then it goes back to the picnic, smoking.
export type ZapStep = 'shaking' | 'broken' | 'taped' | 'burnt';

const CREW_W = 24;
const CREW_H = 27;

export const zapGagArmed = () => document.documentElement.dataset.zapGag === 'armed';
export const armZapGag = () => { document.documentElement.dataset.zapGag = 'armed'; };

class Aborted extends Error {}

// Plays the gag up to the robot holding its sign; resolves with a function that sends it back to the picnic.
export async function playZapGag(icon: HTMLElement, readyLabel: string, setStep: (step: ZapStep) => void, signal: AbortSignal) {
  const section = icon.closest<HTMLElement>('#contato');
  const layer = section?.querySelector<HTMLElement>('.stage-actors');
  if (!section || !layer) { setStep('burnt'); return async () => {}; }
  const stage: HTMLElement = section;
  const actors: HTMLElement = layer;
  const spawned: HTMLElement[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];
  const seat = stage.querySelector<HTMLElement>('.ending-picnic-crew-2');
  const food = seat?.parentElement?.querySelector<HTMLElement>('.ending-basket') ?? null;

  const wait = (ms: number) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Aborted());
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
  const cleanUp = () => {
    intervals.forEach(clearInterval);
    spawned.forEach(element => element.remove());
    if (seat) { seat.style.visibility = ''; seat.classList.add('zap-charred'); }
  };
  // If the section goes away (or the gag is cut short) at any point, nothing is left behind.
  signal.addEventListener('abort', cleanUp, { once: true });

  // The robot: off-duty crew (no hard hat), placed by its top-left corner.
  const robot = spawn('actor crew-actor zap-fixer');
  const body = spawn('actor-body', robot);
  let x = 0;
  let y = 0;
  let facing = 1;
  let face: CrewFace = 'normal';
  const draw = (arms: boolean, nextFace: CrewFace = face) => { face = nextFace; body.innerHTML = crewMarkup(arms, 0, 'none', face); };
  const place = (nextX: number, nextY: number, squash = 1) => {
    x = nextX;
    y = nextY;
    robot.style.transform = `translate(${x}px, ${y}px)`;
    body.style.transform = `scaleX(${facing}) scaleY(${squash})`;
  };
  // A jump along an arc, crouching before it and on landing.
  const jump = async (to: { x: number; y: number }, duration: number, height: number) => {
    const from = { x, y };
    facing = to.x < from.x ? -1 : 1;
    await tween(140, t => place(from.x, from.y, 1 - .18 * Math.sin(Math.PI * t)));
    await tween(duration, t => place(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * height));
    await tween(160, t => place(to.x, to.y, 1 - .15 * Math.sin(Math.PI * t)));
  };

  try {
    // The button shakes, then breaks, the halves flying apart.
    setStep('shaking');
    await wait(450);
    setStep('broken');
    await wait(600);

    // At the picnic, one of them notices ("!"), gets up, looks from the button to its sandwich, puts it down with a
    // huff and picks up its toolbox.
    const seatBox = seat ? boxOf(seat) : { x: stage.clientWidth * .6, y: stage.clientHeight - 100, w: CREW_W, h: 30 };
    if (seat) seat.style.visibility = 'hidden';
    const ground = seatBox.y + seatBox.h - CREW_H;
    draw(false, 'normal');
    place(seatBox.x, ground);
    const alert = spawn('stage-mark stage-mark-alert zap-mark', robot, '!');
    await tween(260, t => place(seatBox.x, ground - Math.sin(Math.PI * t) * 8));
    await wait(350);
    alert.remove();
    for (const look of [1, -1, 1]) { facing = look; place(x, y); await wait(260); }
    const sandwich = spawn('zap-sandwich');
    Object.assign(sandwich.style, { left: `${x + 22}px`, top: `${y + 14}px` });
    draw(false, 'tired');
    puff({ x: x + 4, y: y - 4 });
    await wait(500);
    const foodBox = food ? boxOf(food) : { x: x - 20, y: ground + 10, w: 20, h: 16 };
    const toolbox = spawn('zap-toolbox', robot);
    puff({ x: foodBox.x + 6, y: foodBox.y - 6 });
    draw(true);
    await wait(300);

    // A big jump up to the button's row, landing just left of it.
    const row = icon.closest('li') ?? icon;
    const rowBox = boxOf(row);
    const iconBox = boxOf(icon);
    const stand = { x: iconBox.x - CREW_W - 6, y: rowBox.y + rowBox.h - CREW_H };
    await jump(stand, 1300, 150);
    facing = 1;
    draw(false);
    place(stand.x, stand.y);

    // Hammer out: three whacks on the button, each with sparks and the button jolting.
    toolbox.remove();
    const hammer = spawn('zap-hammer', robot);
    for (let whack = 0; whack < 3; whack++) {
      hammer.classList.remove('zap-hammer-hit');
      void hammer.offsetWidth;
      hammer.classList.add('zap-hammer-hit');
      await wait(220);
      icon.classList.remove('zap-jolt');
      void icon.offsetWidth;
      icon.classList.add('zap-jolt');
      const spark = spawn('zap-spark', actors, '✦');
      Object.assign(spark.style, { left: `${iconBox.x + 2 + whack * 6}px`, top: `${iconBox.y - 6 + (whack % 2) * 10}px` });
      spark.addEventListener('animationend', () => spark.remove());
      await wait(260);
    }
    hammer.remove();
    // And a strip of tape across it.
    draw(true, 'normal');
    setStep('taped');
    await wait(700);

    // It reaches out, presses the button to test it... a beat... and it blows up.
    draw(false, 'normal');
    const arm = spawn('zap-arm', robot);
    const reach = iconBox.x + 4 - (x + CREW_W);
    await tween(350, t => { arm.style.width = `${8 + reach * t}px`; });
    const press = spawn('stage-mark zap-mark', robot, '…');
    await wait(600);
    press.remove();
    arm.remove();
    setStep('burnt');
    stage.classList.add('zap-shake');
    const center = { x: iconBox.x + iconBox.w / 2, y: iconBox.y + iconBox.h / 2 };
    for (const className of ['zap-flash', 'zap-smoke', 'zap-tape-flying']) Object.assign(spawn(className).style, { left: `${center.x}px`, top: `${center.y}px` });
    // Charred: dark, outlined, eyes wide and white, smoking from its antenna from now on.
    robot.classList.add('zap-charred');
    spawn('zap-eyes', robot);
    draw(false, 'tired');
    await tween(380, t => place(stand.x - 46 * t, stand.y - Math.sin(Math.PI * t) * 18));
    stage.classList.remove('zap-shake');
    intervals.push(setInterval(() => puff({ x: x + 9, y: y - 6 }), 420));
    await wait(1100);

    // It walks back up to the button and, deadpan, holds up a sign saying it works now, pointing at it.
    facing = 1;
    await tween(500, t => place(stand.x - 46 + 34 * t, stand.y));
    draw(true, 'tired');
    const sign = spawn('robot-sign zap-sign font-mono', robot, readyLabel);
    sign.setAttribute('aria-hidden', 'true');
  } catch (error) {
    cleanUp();
    throw error;
  }

  // Called on the visitor's click: back to the picnic, still smoking, and it sits down there as it is.
  return async () => {
    try {
      spawned.filter(element => element.classList.contains('zap-sign')).forEach(element => element.remove());
      draw(false, 'tired');
      const seatBox = seat ? boxOf(seat) : { x: x, y: y, w: CREW_W, h: CREW_H };
      await jump({ x: seatBox.x, y: seatBox.y + seatBox.h - CREW_H }, 1100, 110);
      puff({ x: x + 6, y: y - 4 });
      await wait(300);
    } finally {
      cleanUp();
    }
  };
}
