import { crewMarkup, type CrewFace } from '@/components/robot-sprite';

// The WhatsApp button's gag, played once per visit on its first click, and only if the visitor watched the contact
// section being built (the show arms it when it ends). The green button shakes and breaks; at the picnic one of the
// crew notices, puts its sandwich down with a huff and makes a big jump up to it with its toolbox; it hammers the
// pieces together and tapes them; it reaches out and presses the button to test it... and it explodes: the tape blows
// off, the robot is thrown back, charred, the button burnt into the site's colours. The robot comes back and, deadpan,
// holds up a "now it works" sign (from here on the button opens WhatsApp; browsers only open a new tab straight from a
// click, so the robot can't press it for the visitor). Then an ember flares up on it: it panics, throws the sign away,
// runs about and dives into the lake... where, being a robot, it shorts out. The fisher fishes it out (the water has
// washed the soot off), lays it on the grass and brings it round; it goes back to its picnic, clean.
export type ZapStep = 'shaking' | 'broken' | 'taped' | 'burnt';

const CREW_W = 24;
const CREW_H = 27;
const RUN = 260;
const WALK = 150;

export const zapGagArmed = () => document.documentElement.dataset.zapGag === 'armed';
export const armZapGag = () => { document.documentElement.dataset.zapGag = 'armed'; };
export const skipZapGag = () => { document.documentElement.dataset.zapGag = 'skipped'; };

class Aborted extends Error {}

// Plays the whole gag; onReady is called once the button works again (the robot holding up its sign), and the rest of
// the scene then plays on by itself.
export async function playZapGag(icon: HTMLElement, readyLabel: string, setStep: (step: ZapStep) => void, signal: AbortSignal, onReady: () => void) {
  const section = icon.closest<HTMLElement>('#contato');
  const layer = section?.querySelector<HTMLElement>('.stage-actors');
  if (!section || !layer) { setStep('burnt'); onReady(); return; }
  const stage: HTMLElement = section;
  const actors: HTMLElement = layer;
  const spawned: HTMLElement[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];
  const seat = stage.querySelector<HTMLElement>('.ending-picnic-crew-2');
  const food = seat?.parentElement?.querySelector<HTMLElement>('.ending-basket') ?? null;
  const fisherSeat = stage.querySelector<HTMLElement>('.ending-fisher');
  let washed = false;

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
  // A short-lived effect at a point on the stage, gone when its animation ends.
  const burst = (className: string, at: { x: number; y: number }, text = '', vars: Record<string, string> = {}) => {
    const element = spawn(className, actors, text);
    Object.assign(element.style, { left: `${at.x}px`, top: `${at.y}px` });
    for (const [name, value] of Object.entries(vars)) element.style.setProperty(name, value);
    element.addEventListener('animationend', () => element.remove());
  };
  const puff = (at: { x: number; y: number }) => burst('steam zap-puff', at);
  const cleanUp = () => {
    intervals.forEach(clearInterval);
    spawned.forEach(element => element.remove());
    if (seat) { seat.style.visibility = ''; seat.classList.toggle('zap-charred', !washed); }
    if (fisherSeat) fisherSeat.style.visibility = '';
  };
  // If the section goes away at any point, nothing is left behind.
  signal.addEventListener('abort', cleanUp, { once: true });

  // An off-duty crew member (no hard hat), placed by its top-left corner; it can lie on its back (lying 0..1).
  type Member = {
    element: HTMLElement; x: number; y: number; facing: number; arms: boolean; face: CrewFace; step: number; lying: number;
    draw: (arms?: boolean, face?: CrewFace, step?: number) => void;
    place: (x: number, y: number, squash?: number) => void;
    turn: (facing: number) => void;
    walk: (toX: number, speed: number) => Promise<void>;
    hop: (height: number, duration: number) => Promise<void>;
    jump: (to: { x: number; y: number }, duration: number, height: number, land?: boolean) => Promise<void>;
    mark: (text: string, className?: string) => HTMLElement;
  };
  function member() {
    const element = spawn('actor crew-actor');
    const body = spawn('actor-body', element);
    const self: Member = {
      element, x: 0, y: 0, facing: 1, arms: false, face: 'normal', step: 0, lying: 0,
      draw(arms = self.arms, face = self.face, step = self.step) {
        if (arms === self.arms && face === self.face && step === self.step && body.innerHTML) return;
        Object.assign(self, { arms, face, step });
        body.innerHTML = crewMarkup(arms, step, 'none', face);
      },
      place(x: number, y: number, squash = 1) {
        self.x = x;
        self.y = y;
        element.style.transform = `translate(${x}px, ${y}px)`;
        // Lying down: turned about its feet, head to the right, lifted so it rests on the ground.
        body.style.transform = `translateY(${-12 * self.lying}px) rotate(${90 * self.lying}deg) scaleX(${self.facing}) scaleY(${squash})`;
      },
      turn(facing: number) { self.facing = facing; self.place(self.x, self.y); },
      async walk(toX: number, speed: number) {
        const fromX = self.x;
        self.turn(toX < fromX ? -1 : 1);
        const distance = Math.abs(toX - fromX);
        await tween(distance / speed * 1000, t => { self.draw(self.arms, self.face, Math.floor(t * distance / 9) % 2); self.place(fromX + (toX - fromX) * t, self.y); });
        self.draw(self.arms, self.face, 0);
      },
      async hop(height: number, duration: number) {
        const baseY = self.y;
        await tween(duration, t => self.place(self.x, baseY - Math.sin(Math.PI * t) * height));
      },
      // A jump along an arc, crouching before it and (on solid ground) on landing.
      async jump(to: { x: number; y: number }, duration: number, height: number, land = true) {
        const from = { x: self.x, y: self.y };
        self.turn(to.x < from.x ? -1 : 1);
        await tween(140, t => self.place(from.x, from.y, 1 - .18 * Math.sin(Math.PI * t)));
        await tween(duration, t => self.place(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * height));
        if (land) await tween(160, t => self.place(to.x, to.y, 1 - .15 * Math.sin(Math.PI * t)));
      },
      mark(text: string, className = 'stage-mark stage-mark-alert zap-mark') { return spawn(className, element, text); },
    };
    return self;
  }

  const robot = member();
  robot.element.classList.add('zap-fixer');

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
    robot.draw(false, 'normal');
    robot.place(seatBox.x, ground);
    const alert = robot.mark('!');
    await robot.hop(8, 260);
    await wait(350);
    alert.remove();
    for (const look of [1, -1, 1]) { robot.turn(look); await wait(260); }
    const sandwich = spawn('zap-sandwich');
    Object.assign(sandwich.style, { left: `${robot.x + 22}px`, top: `${robot.y + 14}px` });
    robot.draw(false, 'tired');
    puff({ x: robot.x + 4, y: robot.y - 4 });
    await wait(500);
    const foodBox = food ? boxOf(food) : { x: robot.x - 20, y: ground + 10, w: 20, h: 16 };
    const toolbox = spawn('zap-toolbox', robot.element);
    puff({ x: foodBox.x + 6, y: foodBox.y - 6 });
    robot.draw(true);
    await wait(300);

    // A big jump up to the button's row, landing just left of it.
    const row = icon.closest('li') ?? icon;
    const rowBox = boxOf(row);
    const iconBox = boxOf(icon);
    const stand = { x: iconBox.x - CREW_W - 6, y: rowBox.y + rowBox.h - CREW_H };
    await robot.jump(stand, 1300, 150);
    robot.draw(false);
    robot.turn(1);

    // Hammer out: three whacks on the button, each with sparks and the button jolting.
    toolbox.remove();
    const hammer = spawn('zap-hammer', robot.element);
    for (let whack = 0; whack < 3; whack++) {
      hammer.classList.remove('zap-hammer-hit');
      void hammer.offsetWidth;
      hammer.classList.add('zap-hammer-hit');
      await wait(220);
      icon.classList.remove('zap-jolt');
      void icon.offsetWidth;
      icon.classList.add('zap-jolt');
      burst('zap-spark', { x: iconBox.x + 2 + whack * 6, y: iconBox.y - 6 + (whack % 2) * 10 }, '✦');
      await wait(260);
    }
    hammer.remove();
    // And a strip of tape across it.
    robot.draw(true, 'normal');
    setStep('taped');
    await wait(700);

    // It reaches out, presses the button to test it... a beat... and it blows up.
    robot.draw(false, 'normal');
    const arm = spawn('zap-arm', robot.element);
    const reach = iconBox.x + 4 - (robot.x + CREW_W);
    await tween(350, t => { arm.style.width = `${8 + reach * t}px`; });
    const press = robot.mark('…', 'stage-mark zap-mark');
    await wait(600);
    press.remove();
    arm.remove();
    setStep('burnt');
    stage.classList.add('zap-shake');
    const center = { x: iconBox.x + iconBox.w / 2, y: iconBox.y + iconBox.h / 2 };
    for (const className of ['zap-flash', 'zap-smoke', 'zap-tape-flying']) Object.assign(spawn(className).style, { left: `${center.x}px`, top: `${center.y}px` });
    // Charred: dark, outlined, eyes wide and white, smoking from its antenna from now on.
    robot.element.classList.add('zap-charred');
    const eyes = spawn('zap-eyes', robot.element);
    robot.draw(false, 'tired');
    await tween(380, t => robot.place(stand.x - 46 * t, stand.y - Math.sin(Math.PI * t) * 18));
    stage.classList.remove('zap-shake');
    const smoking = setInterval(() => puff({ x: robot.x + 9, y: robot.y - 6 }), 420);
    intervals.push(smoking);
    await wait(1100);

    // It walks back up to the button and, deadpan, holds up a sign saying it works now, pointing at it.
    await robot.walk(stand.x - 12, WALK);
    robot.turn(1);
    robot.draw(true, 'tired');
    const sign = spawn('robot-sign zap-sign font-mono', robot.element, readyLabel);
    sign.setAttribute('aria-hidden', 'true');
    onReady();
    await wait(2000);

    // An ember flares up on it. It notices ("!!"), throws the sign up in the air and panics: running back and forth
    // along the row, trailing smoke, until it spots the lake down in the park.
    spawn('zap-ember', robot.element);
    await wait(700);
    robot.draw(false, 'normal');
    const alarm = robot.mark('!!');
    const signBox = boxOf(sign);
    sign.remove();
    const flying = spawn('robot-sign zap-sign-flying font-mono', actors, readyLabel);
    flying.setAttribute('aria-hidden', 'true');
    void tween(900, t => {
      flying.style.transform = `translate(${signBox.x - 30 * t}px, ${signBox.y - 90 * Math.sin(Math.PI * t * .8) + 60 * t * t}px) rotate(${-300 * t}deg)`;
      flying.style.opacity = String(t > .7 ? (1 - t) / .3 : 1);
    }).then(() => flying.remove(), () => {});
    await robot.hop(10, 220);
    alarm.remove();
    for (const dx of [-70, 10, -60, 0]) await robot.walk(stand.x + dx, RUN);
    const lake = stage.querySelector('.ending-lake');
    const lakeBox = lake ? boxOf(lake) : { x: stage.clientWidth * .3, y: stage.clientHeight - 80, w: stage.clientWidth * .4, h: 22 };
    robot.turn(lakeBox.x + lakeBox.w / 2 < robot.x ? -1 : 1);
    const spotted = robot.mark('!');
    await wait(450);
    spotted.remove();

    // The dive: a long leap down into the middle of the lake, a splash, and it sinks until only its antenna shows.
    const water = lakeBox.y + lakeBox.h * .55;
    const dive = { x: lakeBox.x + lakeBox.w / 2 - CREW_W / 2, y: water - CREW_H };
    robot.draw(true, 'normal');
    await robot.jump(dive, 1300, 90, false);
    clearInterval(smoking);
    for (let drop = 0; drop < 7; drop++) burst('zap-drop', { x: dive.x + CREW_W / 2, y: water }, '', { '--dx': `${(drop - 3) * 7}px`, '--dy': `${-18 - (drop % 3) * 8}px` });
    puff({ x: dive.x + 8, y: water - 10 });
    const sink = (depth: number) => { robot.element.style.clipPath = `inset(-60px -60px ${depth}px -60px)`; robot.place(dive.x, dive.y + depth); };
    await tween(600, t => sink((CREW_H - 7) * (1 - (1 - t) * (1 - t))));

    // Being a robot, it shorts out: blue sparks and bubbles, a "bzzt"... and then nothing.
    robot.draw(false, 'tired');
    const bubbling = setInterval(() => burst('zap-bubble', { x: dive.x + 8 + Math.random() * 10, y: water - 2 }), 260);
    intervals.push(bubbling);
    for (let spark = 0; spark < 3; spark++) {
      burst('zap-spark zap-spark-blue', { x: dive.x + 4 + spark * 7, y: water - 12 - (spark % 2) * 6 }, '✦');
      await wait(180);
    }
    const bzzt = robot.mark('bzzt', 'stage-mark zap-mark zap-bzzt');
    await wait(800);
    bzzt.remove();
    clearInterval(bubbling);
    await wait(600);

    // The fisher jumps up ("!!"), casts at it and yanks it out of the water by its antenna, clean now, dripping, and
    // lays it down on the grass next to itself.
    const fisherBox = fisherSeat ? boxOf(fisherSeat) : null;
    const shore = fisherBox && fisherBox.w ? fisherBox : { x: lakeBox.x - 40, y: seatBox.y, w: CREW_W, h: seatBox.h };
    const grassY = shore.y + shore.h - CREW_H;
    if (fisherSeat) fisherSeat.style.visibility = 'hidden';
    const fisher = member();
    fisher.draw(false, 'normal');
    fisher.place(shore.x, grassY);
    const worried = fisher.mark('!!');
    await fisher.hop(10, 260);
    await wait(200);
    worried.remove();
    const rod = spawn('zap-rod-layer');
    rod.innerHTML = '<svg><path class="zap-rod" /><path class="zap-line" /></svg>';
    const [pole, line] = [...rod.querySelectorAll('path')];
    const drawRod = (tip: { x: number; y: number }, end: { x: number; y: number }) => {
      const hand = { x: fisher.x + 20, y: fisher.y + 15 };
      pole.setAttribute('d', `M ${hand.x} ${hand.y} L ${tip.x} ${tip.y}`);
      line.setAttribute('d', `M ${tip.x} ${tip.y} Q ${(tip.x + end.x) / 2} ${Math.max(tip.y, end.y) + 8} ${end.x} ${end.y}`);
    };
    const antenna = () => ({ x: robot.x + CREW_W / 2, y: robot.y + 1 });
    const forward = { x: fisher.x + 60, y: fisher.y - 35 };
    const back = { x: fisher.x + 10, y: fisher.y - 45 };
    // The cast: the line flies out from the tip to the antenna.
    await tween(450, t => { const to = antenna(); drawRod(forward, { x: forward.x + (to.x - forward.x) * t, y: forward.y + (to.y - forward.y) * t - Math.sin(Math.PI * t) * 20 }); });
    await wait(250);
    const lieX = shore.x + 38;
    const from = { x: robot.x, y: robot.y };
    await tween(900, t => {
      const depth = (CREW_H - 7) * Math.max(0, 1 - t / .25);
      robot.element.style.clipPath = `inset(-60px -60px ${depth}px -60px)`;
      if (!washed && t > .2) {
        // The soot comes off in the water.
        washed = true;
        robot.element.classList.remove('zap-charred');
        eyes.remove();
        for (let drop = 0; drop < 4; drop++) burst('zap-drop', { x: robot.x + CREW_W / 2, y: robot.y + CREW_H }, '', { '--dx': `${(drop - 1.5) * 6}px`, '--dy': '-10px' });
      }
      const tip = { x: forward.x + (back.x - forward.x) * t, y: forward.y + (back.y - forward.y) * t };
      robot.place(from.x + (lieX - from.x) * t, from.y + (grassY - from.y) * t - Math.sin(Math.PI * t) * 60);
      drawRod(tip, antenna());
    });
    robot.element.style.clipPath = '';
    rod.remove();
    await tween(250, t => { robot.lying = t; robot.place(lieX, grassY); });

    // It tries to bring it round: three pushes on its chest, nothing ("…"); then a good whack on the side, like an old
    // telly. A spark from the antenna, its eyes open, and it jumps to its feet.
    await fisher.walk(lieX + 12, WALK);
    fisher.draw(true);
    for (let push = 0; push < 3; push++) {
      await tween(260, t => { fisher.place(fisher.x, grassY + Math.sin(Math.PI * t) * 3, 1 - .12 * Math.sin(Math.PI * t)); robot.place(lieX, grassY + Math.sin(Math.PI * t) * 1.5); });
      await wait(180);
    }
    fisher.draw(false);
    const nothing = fisher.mark('…', 'stage-mark zap-mark');
    await wait(800);
    nothing.remove();
    fisher.draw(true);
    await fisher.hop(12, 260);
    burst('fight-twinkle stage-click', { x: lieX + 18, y: grassY + 10 }, '✦');
    await tween(220, t => robot.place(lieX + Math.sin(t * Math.PI * 6) * 2, grassY));
    fisher.draw(false);
    await wait(500);
    burst('zap-spark zap-spark-blue', { x: lieX + 34, y: grassY + 6 }, '✦');
    robot.draw(false, 'normal');
    await wait(300);
    const awake = robot.mark('!');
    await tween(300, t => { robot.lying = 1 - t; robot.place(lieX, grassY - Math.sin(Math.PI * t) * 12); });
    awake.remove();

    // They look at each other; the fisher goes back to its rod and the other one back to its picnic, where it picks up
    // its sandwich and sits down.
    robot.turn(1);
    fisher.turn(-1);
    await wait(900);
    await Promise.all([
      (async () => {
        await fisher.walk(shore.x, WALK);
        fisher.element.remove();
        if (fisherSeat) fisherSeat.style.visibility = '';
      })(),
      (async () => {
        await robot.walk(seatBox.x, WALK);
        sandwich.remove();
        robot.element.remove();
      })(),
    ]);
  } finally {
    cleanUp();
  }
}
