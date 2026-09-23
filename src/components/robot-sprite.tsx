// Pixel-art robot drawn from character maps: each character is one pixel, "." is transparent.
export type RobotPose = 'idle' | 'blink' | 'crouch' | 'jump' | 'carry';
export type RobotMood = 'normal' | 'angry' | 'happy';

const COLORS: Record<string, string> = {
  B: '#dfe5f1', // body
  S: '#8f9bb3', // shade: antenna, arms, feet
  D: '#151a24', // visor
  A: '#6994ff', // accent: antenna tip, eyes, chest light
  R: '#ff6b6b', // angry eyes
};

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
