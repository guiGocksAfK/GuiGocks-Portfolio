// Pixel-art robot drawn from character maps: each character is one pixel, "." is transparent.
export type RobotPose = 'idle' | 'blink' | 'crouch' | 'jump';

const COLORS: Record<string, string> = {
  B: '#dfe5f1', // body
  S: '#8f9bb3', // shade: antenna, arms, feet
  D: '#151a24', // visor
  A: '#6994ff', // accent: antenna tip, eyes, chest light
};

const HEAD = ['..BBBBBBB..', '.BDDDDDDDB.', '.BDADDDADB.', '.BDDDDDDDB.', '..BBBBBBB..'];
const BLINK_HEAD = ['..BBBBBBB..', '.BDDDDDDDB.', '.BDDDDDDDB.', '.BDSSDSSDB.', '..BBBBBBB..'];

const POSES: Record<RobotPose, string[]> = {
  idle: ['.....A.....', '.....S.....', ...HEAD, '...SSSSS...', '.SBBBABBBS.', '.S.BBBBB.S.', '...B...B...', '..SS...SS..'],
  blink: ['.....A.....', '.....S.....', ...BLINK_HEAD, '...SSSSS...', '.SBBBABBBS.', '.S.BBBBB.S.', '...B...B...', '..SS...SS..'],
  crouch: ['...........', '.....A.....', '.....S.....', ...HEAD, '.SBBBABBBS.', '.S.BBBBB.S.', '..B.....B..', '.SS.....SS.'],
  jump: ['.....A.....', 'S....S....S', 'S.BBBBBBB.S', ...HEAD.slice(1), '...SSSSS...', '...BBABB...', '...BBBBB...', '...BB.BB...', '...........'],
};

export const ROBOT_WIDTH = 22;
export const ROBOT_HEIGHT = 24;

export function RobotSprite({ pose }: { pose: RobotPose }) {
  const rows = POSES[pose];
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((pixel, x) => COLORS[pixel] && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[pixel]} />))}
    </svg>
  );
}
