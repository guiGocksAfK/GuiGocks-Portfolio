// The page's happy ending: a park at dusk above the last footer line. The boss rests on a bench feeding pigeons, two of
// the crew have a picnic by the lake without their hard hats and a third one flies a kite. Pixel art drawn from character
// maps like the other sprites ("." is transparent); only small calm idle loops in CSS, and still without motion.

const COLORS: Record<string, string> = {
  B: '#dfe5f1', // robot body
  S: '#8f9bb3', // robot shade
  D: '#151a24', // visor
  A: '#6994ff', // accent
  a: '#a3bcff', // light accent
  W: '#7a5c46', // bench wood
  w: '#5a4334', // bench wood, shade
  K: '#2c313b', // bench iron
  G: '#9aa3b8', // pigeon
  g: '#5d6678', // pigeon, shade
  P: '#c9a07a', // beak, bread
  L: '#2a4d3c', // leaves
  l: '#1f3a2e', // leaves, shade
  M: '#36624b', // leaves, light
  T: '#4a3a2e', // trunk
  N: '#8a6a4c', // basket
  n: '#6b4f3a', // basket, shade
};

function Pixels({ rows, scale = 3, className }: { rows: readonly string[]; scale?: number; className?: string }) {
  const width = rows[0].length;
  return (
    <svg className={className} viewBox={`0 0 ${width} ${rows.length}`} width={width * scale} height={rows.length * scale} aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((pixel, x) => COLORS[pixel] && <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[pixel]} />))}
    </svg>
  );
}

// The boss sitting, happy, with its legs hanging over the seat.
const BOSS = ['.....A.....', '.....S.....', '..BBBBBBB..', '.BDADDDADB.', '.BADADADAB.', '.BDDDDDDDB.', '..BBBBBBB..', '...SSSSS...', '.SBBBABBBS.', '.S.BBBBB.S.', '..BBBBBBB..', '..SS...SS..'];
const BENCH = ['WWWWWWWWWWWWWWWWWWWWWWWWWW', 'wwwwwwwwwwwwwwwwwwwwwwwwww', '..K....................K..', '..K....................K..', 'WWWWWWWWWWWWWWWWWWWWWWWWWW', 'wwwwwwwwwwwwwwwwwwwwwwwwww', '..K....................K..', '..K....................K..', '.KK...................KK..'];
const PIGEON = ['....gg.', '...gGGP', 'gGGGGG.', '.gGGG..', '..S.S..'];
// Crew off duty: no hard hat, just the antenna.
const CREW_SITTING = ['...A....', '...S....', '..BBBB..', '.BDDDDB.', '.BADDAB.', '..BBBB..', '.SBABBS.', '..BBBB..', '.BBBBBB.', 'SS....SS'];
const CREW_EATING = ['....A...', '....S...', '..BBBB..', '.BDDDDB.', '.BADDAB.', '..BBBB..', '.SBABBSP', '..BBBB.P', '.BBBBBB.', 'SS....SS'];
// Standing with one arm up, holding the kite's string.
const CREW_KITE = ['...A....', '...S....', '..BBBB..', '.BDDDDB.', '.BADDABS', '..BBBBS.', '.SBABB..', '..BBBB..', '..B..B..', '.SS..SS.'];
const KITE = ['...A...', '..AaA..', '.AAaAA.', 'AaaaaaA', '.AAaAA.', '..AaA..', '...A...'];
const BASKET = ['..n..n..', '..n..n..', '.nnnnnn.', 'NNNNNNNN', 'NnNnNnNn', '.NNNNNN.'];
const CANOPY = ['.....llll.......', '...llLLLLll.....', '..lLLMMLLLLl....', '.lLLMMLLLLLLll..', '.lLLLLLLLMMLLl..', 'lLLMLLLLLMMLLLl.', 'lLLLLLLLLLLLLLl.', '.lLLLLMMLLLLLl..', '..llLLLLLLLll...'];
const TRUNK = ['....lllTlll.....', '.......T........', '.......T........', '.......T........', '......TT........', '......TT........', '......TT........', '.....TTTT.......'];
const BUSH = ['...llLl...', '.lLLMLLLl.', 'lLMLLLLMLl', 'lLLLLLLLLl'];

export function EndingScene() {
  return (
    <div className="ending" aria-hidden="true">
      <span className="ending-sky" />
      <span className="ending-star ending-star-1" />
      <span className="ending-star ending-star-2" />
      <span className="ending-star ending-star-3" />
      <span className="ending-sun" />
      <span className="ending-hills" />
      <span className="ending-lake" />
      <span className="ending-grass" />

      <span className="ending-tree">
        <Pixels rows={CANOPY} scale={5} className="ending-canopy" />
        <Pixels rows={TRUNK} scale={5} />
      </span>

      <span className="ending-bench">
        <Pixels rows={BENCH} />
        <span className="ending-boss"><Pixels rows={BOSS} /></span>
      </span>
      <span className="ending-pigeon ending-pigeon-1"><Pixels rows={PIGEON} /></span>
      <span className="ending-pigeon ending-pigeon-2"><Pixels rows={PIGEON} /></span>

      <span className="ending-picnic">
        <span className="ending-blanket" />
        <span className="ending-picnic-crew ending-picnic-crew-1"><Pixels rows={CREW_SITTING} /></span>
        <span className="ending-basket"><Pixels rows={BASKET} /></span>
        <span className="ending-picnic-crew ending-picnic-crew-2"><Pixels rows={CREW_EATING} /></span>
      </span>

      <span className="ending-flyer">
        <Pixels rows={CREW_KITE} />
        {/* The string and the kite swing together around the flyer's hand. */}
        <span className="ending-kite-rig">
          <svg className="ending-string" viewBox="0 0 110 130" width="110" height="130"><path d="M0 130 Q 50 100 100 18" /></svg>
          <span className="ending-kite"><Pixels rows={KITE} /><span className="ending-tail" /></span>
        </span>
      </span>

      <span className="ending-bush"><Pixels rows={BUSH} scale={4} /></span>
    </div>
  );
}
