// Pixel-art robot drawn from character maps: each character is one pixel, "." is transparent.
export type RobotPose = 'idle' | 'blink' | 'crouch' | 'jump' | 'carry';
export type RobotMood = 'normal' | 'angry' | 'happy';

const COLORS: Record<string, string> = {
  B: '#dfe5f1', // body
  S: '#8f9bb3', // shade: antenna, arms, feet
  D: '#151a24', // visor
  A: '#6994ff', // accent: antenna tip, eyes, chest light
  R: '#ff6b6b', // angry eyes
  O: '#ffb347', // crew hard hats
  K: '#2b2118', // avatar hair
  F: '#d9a47c', // avatar skin
  M: '#9b5b4a', // avatar mouth
};

function pixelRects(rows: string[]) {
  return rows.flatMap((row, y) => [...row].map((pixel, x) => COLORS[pixel] && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[pixel]} />));
}

// Delivery drone: two frames of the rotors (wide/narrow) alternate in CSS to look like spinning.
const DRONE_BODY = ['.S.........S.', '.SSSSBBBSSSS.', '....BDADB....', '....BBBBB....', '.....S.S.....', '.....S.S.....'];
const DRONE_ROTORS = ['SSS.......SSS', '.S.........S.'];

export function DroneSprite() {
  return (
    <svg viewBox="0 0 13 7" aria-hidden="true">
      <g className="drone-rotor-a">{pixelRects([DRONE_ROTORS[0]])}</g>
      <g className="drone-rotor-b">{pixelRects([DRONE_ROTORS[1]])}</g>
      <g transform="translate(0 1)">{pixelRects(DRONE_BODY)}</g>
    </svg>
  );
}

// Stand-in portrait for the badge until a real photo exists: a person in a hard hat.
const AVATAR = ['...OOOOOO...', '..OOOOOOOO..', '.OOOOOOOOOO.', '..KKKKKKKK..', '..KFFFFFFK..', '..FDFFFFDF..', '..FFFFFFFF..', '..FFFMMFFF..', '...FFFFFF...', '....FFFF....', '.AAAAAAAAAA.', 'AAAAAAAAAAAA'];

export function AvatarSprite() {
  return <svg viewBox="0 0 12 12" aria-hidden="true">{pixelRects(AVATAR)}</svg>;
}

// Five rows: top, three visor rows, bottom.
const HEADS: Record<RobotMood | 'blink', string[]> = {
  normal: ['..BBBBBBB..', '.BDDDDDDDB.', '.BDADDDADB.', '.BDDDDDDDB.', '..BBBBBBB..'],
  blink: ['..BBBBBBB..', '.BDDDDDDDB.', '.BDDDDDDDB.', '.BDSSDSSDB.', '..BBBBBBB..'],
  angry: ['..BBBBBBB..', '.BRDDDDDRB.', '.BDRDDDRDB.', '.BDDDDDDDB.', '..BBBBBBB..'],
  happy: ['..BBBBBBB..', '.BDADDDADB.', '.BADADADAB.', '.BDDDDDDDB.', '..BBBBBBB..'],
};

function rows(pose: RobotPose, mood: RobotMood) {
  const head = HEADS[pose === 'blink' && mood === 'normal' ? 'blink' : mood];
  // Arms raised: the top of the head is replaced by the hands' row.
  const armsUp = ['.....A.....', 'S....S....S', 'S.BBBBBBB.S', ...head.slice(1)];
  switch (pose) {
    case 'crouch': return ['...........', '.....A.....', '.....S.....', ...head, '.SBBBABBBS.', '.S.BBBBB.S.', '..B.....B..', '.SS.....SS.'];
    case 'jump': return [...armsUp, '...SSSSS...', '...BBABB...', '...BBBBB...', '...BB.BB...', '...........'];
    case 'carry': return [...armsUp, '...SSSSS...', '...BBABB...', '...BBBBB...', '...B...B...', '..SS...SS..'];
    default: return ['.....A.....', '.....S.....', ...head, '...SSSSS...', '.SBBBABBBS.', '.S.BBBBB.S.', '...B...B...', '..SS...SS..'];
  }
}

export const ROBOT_WIDTH = 22;
export const ROBOT_HEIGHT = 24;

export function RobotSprite({ pose, mood }: { pose: RobotPose; mood: RobotMood }) {
  const pixels = rows(pose, mood);
  return (
    <svg viewBox={`0 0 ${pixels[0].length} ${pixels.length}`} aria-hidden="true">
      {pixels.flatMap((row, y) => [...row].map((pixel, x) => COLORS[pixel] && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[pixel]} />))}
    </svg>
  );
}

// Envelope carried by the mail robot.
const ENVELOPE = ['SSSSSSSSS', 'SBBBBBBBS', 'SSBBBBBSS', 'SBSBBBSBS', 'SBBSSSBBS', 'SSSSSSSSS'];

export function EnvelopeSprite() {
  return (
    <svg viewBox="0 0 9 6" aria-hidden="true">
      {ENVELOPE.flatMap((row, y) => [...row].map((pixel, x) => COLORS[pixel] && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[pixel]} />))}
    </svg>
  );
}

// Rubber stamp held by the inspector robot.
const STAMP_TOOL = ['..SSS..', '..SSS..', '...S...', '...S...', '.AAAAA.', 'AAAAAAA', 'AAAAAAA'];

export function StampToolSprite() {
  return (
    <svg viewBox="0 0 7 7" aria-hidden="true">
      {STAMP_TOOL.flatMap((row, y) => [...row].map((pixel, x) => COLORS[pixel] && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[pixel]} />))}
    </svg>
  );
}

// Wooden crate carried by the archivist crew; plain markup because crew members are created outside React.
const CRATE = ['SSSSSS', 'SOOOOS', 'SOSSOS', 'SOSSOS', 'SOOOOS', 'SSSSSS'];

export function crateMarkup() {
  const rects = CRATE.flatMap((row, y) => [...row].map((pixel, x) => `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${COLORS[pixel]}"/>`)).join('');
  return `<svg viewBox="0 0 6 6" aria-hidden="true">${rects}</svg>`;
}

// Crew: smaller robots with hard hats that carry words in and out. They are created outside React, so they render to markup.
export const CREW_WIDTH = 16;
export const CREW_HEIGHT = 18;

const CREW_LEGS = [['..B..B..', '.SS..SS.'], ['.B....B.', 'SS....SS']];

// hat: 'O' is the crew's orange hard hat, 'A' the patrol guard's blue cap.
export function crewMarkup(carrying: boolean, step: number, hat: 'O' | 'A' = 'O') {
  const top = carrying
    ? ['..OOOO..', 'SOOOOOOS', 'SBDDDDBS', 'SBADDABS', '..BBBB..', '..BABB..', '..BBBB..']
    : ['..OOOO..', '.OOOOOO.', '.BDDDDB.', '.BADDAB.', '..BBBB..', '.SBABBS.', '..BBBB..'];
  const pixels = [...top, ...CREW_LEGS[step % 2]].map((row, index) => (index < 2 ? row.replaceAll('O', hat) : row));
  const rects = pixels.flatMap((row, y) => [...row].map((pixel, x) => COLORS[pixel] ? `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${COLORS[pixel]}"/>` : '')).join('');
  return `<svg viewBox="0 0 8 9" aria-hidden="true">${rects}</svg>`;
}
