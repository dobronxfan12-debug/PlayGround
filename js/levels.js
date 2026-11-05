/* THE LAST FOLD — level data and paper-folding rules */

export const VOID = 0;
export const FLOOR = 1;
export const WALL = 2;

export const WORLDS = [
  {
    id: 'forest',
    name: 'Paper Forest',
    chapter: 'I',
    tagline: 'Every journey begins with a single crease.',
    blurb: 'A quiet wood of folded pines and warm sunlight.',
    palette: {
      skyTop: '#dfe7d0',
      skyBottom: '#f6eedb',
      haze: '#e7ead7',
      accent: '#5f7d4f',
      accentDeep: '#34482f',
      accentSoft: '#a9bd8f',
      paper: '#f6eedb',
      paperDeep: '#ddcfb2',
      tile: '#c9d6a8',
      tileAlt: '#bfcc9a',
      wall: '#8d9d70',
      glow: '#ecc45f',
      ink: '#2d3428',
      base: '#5c6b4b',
      baseEdge: '#44523a',
      star: '#f2c35b',
      cloud: '#f9f3e5',
    },
  },
  {
    id: 'frozen',
    name: 'Frozen Origami',
    chapter: 'II',
    tagline: 'Cold paper remembers the shape of the wind.',
    blurb: 'Frost-creased ledges above a silent white valley.',
    palette: {
      skyTop: '#d9e8f0',
      skyBottom: '#f2f0e8',
      haze: '#e3eef2',
      accent: '#5e8fa8',
      accentDeep: '#2d4a5c',
      accentSoft: '#b6d2de',
      paper: '#f2f2ea',
      paperDeep: '#d4dde2',
      tile: '#c6dde6',
      tileAlt: '#b8d2dd',
      wall: '#8fb3c2',
      glow: '#8fd7e8',
      ink: '#263b47',
      base: '#587386',
      baseEdge: '#40586a',
      star: '#f2c35b',
      cloud: '#f8f7f0',
    },
  },
  {
    id: 'city',
    name: 'The Forgotten City',
    chapter: 'III',
    tagline: 'The rooftops still remember every footstep.',
    blurb: 'Sun-baked paper tenements and patient shadows.',
    palette: {
      skyTop: '#eedcc4',
      skyBottom: '#f7ead2',
      haze: '#efe0c9',
      accent: '#b4673f',
      accentDeep: '#5d392b',
      accentSoft: '#d5a07a',
      paper: '#f7ead3',
      paperDeep: '#dfc8a6',
      tile: '#e4c8a3',
      tileAlt: '#d9b98f',
      wall: '#b67f57',
      glow: '#e8b96b',
      ink: '#3b2b22',
      base: '#7c5742',
      baseEdge: '#5c3c2e',
      star: '#f2c35b',
      cloud: '#fbf0dc',
    },
  },
  {
    id: 'floating',
    name: 'Floating Islands',
    chapter: 'IV',
    tagline: 'Fold the sky until the horizon meets you.',
    blurb: 'Paper islands adrift on a sea of soft cloud.',
    palette: {
      skyTop: '#cfe7e0',
      skyBottom: '#eef3e4',
      haze: '#d9ece6',
      accent: '#3f8f7d',
      accentDeep: '#225a52',
      accentSoft: '#9bcbbd',
      paper: '#eef3e4',
      paperDeep: '#cfe0d4',
      tile: '#b7dccf',
      tileAlt: '#a9d2c4',
      wall: '#79ae9f',
      glow: '#f1cf74',
      ink: '#243c38',
      base: '#4d7c73',
      baseEdge: '#38635b',
      star: '#f2c35b',
      cloud: '#f8fbf2',
    },
  },
  {
    id: 'cosmic',
    name: 'The Cosmic Paper World',
    chapter: 'V',
    tagline: 'At the end of everything, one last fold.',
    blurb: 'A quiet constellation of ink and gold.',
    palette: {
      skyTop: '#211b38',
      skyBottom: '#4a3c62',
      haze: '#2b2344',
      accent: '#b48be0',
      accentDeep: '#55407a',
      accentSoft: '#b9a5d8',
      paper: '#eee6f4',
      paperDeep: '#c6b9d8',
      tile: '#bcaed4',
      tileAlt: '#aa9bc6',
      wall: '#806ba3',
      glow: '#f4d67b',
      ink: '#221b32',
      base: '#3c3159',
      baseEdge: '#2a2340',
      star: '#f6ce6b',
      cloud: '#e9e1f3',
    },
    dark: true,
  },
];

/*
  ASCII legend:
  .  empty paper (not walkable)
  #  walkable paper
  X  folded paper wall (blocks movement)
  P  player start
  G  goal / exit
  S  hidden golden star (walkable)
  Levels are 7x7 or 8x8.
*/

export const LEVELS = [
  {
    id: 1,
    world: 0,
    name: 'First Crease',
    par: 1,
    grid: [
      '.......',
      '.......',
      '....#S.',
      '##P..#G',
      '.......',
      '.......',
      '.......',
    ],
    hint: 'Swipe from the fox across the gap to fold the left page over. You will ride the paper.',
    intro: 'Tap paper to walk. Swipe across it to fold the world.',
    tutorial: true,
  },
  {
    id: 2,
    world: 0,
    name: 'Upward',
    par: 1,
    grid: [
      '.......',
      '..#SG#.',
      '...#.#.',
      '.......',
      '...#P#.',
      '...#.#.',
      '.......',
    ],
    hint: 'Creases can run sideways too. Swipe upward from the fox to fold the lower page over.',
    intro: 'A fold travels in the direction of your swipe. The page behind you comes along.',
  },
  {
    id: 3,
    world: 1,
    name: 'Bridging the Gap',
    par: 1,
    grid: [
      '.......',
      '.......',
      '###..S.',
      '###P..G',
      '###....',
      '.......',
      '.......',
    ],
    hint: 'You do not have to ride every fold. Fold the left page over while standing still to build a bridge.',
    intro: 'Frozen paper becomes a bridge. Stand still and let the page do the work.',
  },
  {
    id: 4,
    world: 1,
    name: 'Icebound',
    par: 1,
    grid: [
      '.......',
      '..##S..',
      '..#G#..',
      '..#.#..',
      '.......',
      '..#P#..',
      '..X##..',
    ],
    hint: 'Fold the lower page up. The iced wall will tumble aside and the star waits at the top.',
    intro: 'Walls ride the paper too. Fold carefully and the way opens.',
  },
  {
    id: 5,
    world: 2,
    name: 'Rooftop Relay',
    par: 1,
    grid: [
      '.......',
      '..#####',
      '..#....',
      '..#..G.',
      '..#####',
      '...S...',
      '##P....',
    ],
    hint: 'Fold the lower page right. Its rooftops will line up with the rest of the city.',
    intro: 'Some journeys need more than one step. Take the rooftops one page at a time.',
  },
  {
    id: 6,
    world: 2,
    name: 'Ink Patrol',
    par: 1,
    grid: [
      '.......',
      '...##G#',
      '...#X.#',
      '...#..#',
      '...#S.#',
      '...#..#',
      '##P....',
    ],
    enemies: [
      { route: [[6, 2], [6, 3], [6, 4], [6, 5]], speed: 1.25 },
    ],
    hint: 'The ink shade hates being folded. Cross by the left rooftops, or trap it on the folded page.',
    intro: 'An ink shade is loose. It cannot follow you through a fold — time your steps.',
  },
  {
    id: 7,
    world: 3,
    name: 'Skyward',
    par: 2,
    grid: [
      '.......',
      '#P.....',
      '.......',
      '#####..',
      '...#..G',
      '...#S..',
      '...####',
    ],
    hint: 'Fold the right page left, then fold the sky down. The golden star is hiding below the ledge.',
    intro: 'The islands drift. Fold the world until the falling sky becomes a path.',
  },
  {
    id: 8,
    world: 3,
    name: 'Cloudfold',
    par: 2,
    grid: [
      '........',
      '#P......',
      '........',
      '#####...',
      '...#...G',
      '...#.S..',
      '...#####',
      '........',
    ],
    hint: 'Ride the paper twice: fold the wide left page over, then fold the whole sky down.',
    intro: 'A double fold through the clouds. Trust the paper to carry you.',
  },
  {
    id: 9,
    world: 4,
    name: 'The Moving Door',
    par: 2,
    grid: [
      '........',
      '......P#',
      '........',
      '...#####',
      'G...#...',
      '..S.#...',
      '#####...',
      '........',
    ],
    enemies: [
      { route: [[5, 3], [6, 3], [7, 3]], speed: 1.45 },
    ],
    hint: 'The exit itself can be folded. Bring the door to you, then bring yourself to the door.',
    intro: 'The Last Fold bends even the exit. Watch where the paper carries it.',
  },
  {
    id: 10,
    world: 4,
    name: 'The Last Fold',
    par: 2,
    grid: [
      '........',
      '#P......',
      '........',
      '#####...',
      '...#X..G',
      '...#.S..',
      '...#####',
      '.....S..',
    ],
    enemies: [
      { route: [[6, 5], [6, 6], [5, 6], [4, 6]], speed: 1.35 },
    ],
    hint: 'Two stars, two folds. The world is almost yours — gather both lights before the final crease.',
    intro: 'This is the last page. Fold it well.',
  },
];

export function getLevel(id) {
  return LEVELS.find((level) => level.id === id) || null;
}

export function worldForLevel(level) {
  return WORLDS[level.world] || WORLDS[0];
}

export function key(x, z) {
  return `${x},${z}`;
}

export function parseKey(value) {
  const [x, z] = value.split(',').map(Number);
  return { x, z };
}

export function parseGrid(def) {
  const H = def.grid.length;
  const W = def.grid[0].length;
  const terrain = [];
  let player = null;
  let goal = null;
  const stars = new Set();

  for (let z = 0; z < H; z += 1) {
    const row = def.grid[z];
    if (row.length !== W) throw new Error(`Level ${def.id}: row ${z} is ${row.length} wide, expected ${W}`);
    const line = [];
    for (let x = 0; x < W; x += 1) {
      const ch = row[x];
      if (ch === '.') line.push(VOID);
      else if (ch === 'X') line.push(WALL);
      else {
        line.push(FLOOR);
        if (ch === 'P') player = { x, z };
        else if (ch === 'G') goal = { x, z };
        else if (ch === 'S') stars.add(key(x, z));
      }
    }
    terrain.push(line);
  }
  if (!player) throw new Error(`Level ${def.id}: no player start`);
  if (!goal) throw new Error(`Level ${def.id}: no goal`);

  const enemies = (def.enemies || []).map((enemy) => {
    const route = enemy.route
      .map(([x, z]) => ({ x, z }))
      .filter((cell) => cell.x >= 0 && cell.x < W && cell.z >= 0 && cell.z < H && terrain[cell.z][cell.x] === FLOOR);
    return {
      route,
      idx: 0,
      dir: 1,
      speed: enemy.speed || 1.2,
      timer: 0,
    };
  }).filter((enemy) => enemy.route.length >= 2);

  return { W, H, terrain, player, goal, stars, enemies };
}

export function createInitialState(def) {
  const parsed = parseGrid(def);
  return {
    def,
    W: parsed.W,
    H: parsed.H,
    terrain: parsed.terrain,
    player: { ...parsed.player },
    goal: { ...parsed.goal },
    stars: new Set(parsed.stars),
    enemies: parsed.enemies,
    folds: 0,
    moves: 0,
    start: { ...parsed.player },
  };
}

export function cloneState(state) {
  return {
    def: state.def,
    W: state.W,
    H: state.H,
    terrain: state.terrain.map((row) => row.slice()),
    player: { ...state.player },
    goal: { ...state.goal },
    stars: new Set(state.stars),
    enemies: state.enemies.map((enemy) => ({
      route: enemy.route.map((cell) => ({ ...cell })),
      idx: enemy.idx,
      dir: enemy.dir,
      speed: enemy.speed,
      timer: enemy.timer || 0,
    })),
    folds: state.folds,
    moves: state.moves,
    start: { ...state.start },
  };
}

export function inBounds(state, x, z) {
  return x >= 0 && z >= 0 && x < state.W && z < state.H;
}

export function isWalkable(state, x, z) {
  return inBounds(state, x, z) && state.terrain[z][x] === FLOOR;
}

export function isSolid(state, x, z) {
  return inBounds(state, x, z) && state.terrain[z][x] !== VOID;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function reachableCells(state, from = state.player) {
  const seen = new Set();
  if (!isWalkable(state, from.x, from.z)) return seen;
  const queue = [from];
  seen.add(key(from.x, from.z));
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    for (const [dx, dz] of DIRS) {
      const nx = cell.x + dx;
      const nz = cell.z + dz;
      const k = key(nx, nz);
      if (!seen.has(k) && isWalkable(state, nx, nz)) {
        seen.add(k);
        queue.push({ x: nx, z: nz });
      }
    }
  }
  return seen;
}

export function findPath(state, from, to) {
  if (!isWalkable(state, to.x, to.z)) return null;
  if (from.x === to.x && from.z === to.z) return [];
  const startKey = key(from.x, from.z);
  const targetKey = key(to.x, to.z);
  const parents = new Map([[startKey, null]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    for (const [dx, dz] of DIRS) {
      const nx = cell.x + dx;
      const nz = cell.z + dz;
      const nk = key(nx, nz);
      if (parents.has(nk) || !isWalkable(state, nx, nz)) continue;
      parents.set(nk, cell);
      if (nk === targetKey) {
        const path = [];
        let cursor = { x: nx, z: nz };
        while (cursor) {
          path.push(cursor);
          const k = key(cursor.x, cursor.z);
          cursor = parents.get(k);
        }
        path.reverse();
        path.shift();
        return path;
      }
      queue.push({ x: nx, z: nz });
    }
  }
  return null;
}

export function collectStar(state, x, z) {
  const k = key(x, z);
  if (!state.stars.has(k)) return false;
  state.stars.delete(k);
  return true;
}

export function enemyCell(enemy) {
  return enemy.route[enemy.idx] || null;
}

export function foldSides(state, axis, k) {
  if (axis === 'x') {
    const left = [];
    for (let x = 0; x < k; x += 1) for (let z = 0; z < state.H; z += 1) left.push({ x, z });
    const right = [];
    for (let x = k; x < state.W; x += 1) for (let z = 0; z < state.H; z += 1) right.push({ x, z });
    return { left, right };
  }
  const top = [];
  for (let z = 0; z < k; z += 1) for (let x = 0; x < state.W; x += 1) top.push({ x, z });
  const bottom = [];
  for (let z = k; z < state.H; z += 1) for (let x = 0; x < state.W; x += 1) bottom.push({ x, z });
  return { top, bottom };
}

export function mirrorCell(cell, axis, k) {
  return axis === 'x'
    ? { x: 2 * k - 1 - cell.x, z: cell.z }
    : { x: cell.x, z: 2 * k - 1 - cell.z };
}

export function isOnFlap(cell, axis, k, side) {
  return axis === 'x' ? (side < 0 ? cell.x < k : cell.x >= k) : (side < 0 ? cell.z < k : cell.z >= k);
}

export function foldFlapLength(state, axis, k) {
  return axis === 'x' ? { folded: k, other: state.W - k, total: state.W } : { folded: k, other: state.H - k, total: state.H };
}

export function foldPlan(state, axis, k, side) {
  if (axis !== 'x' && axis !== 'z') return { ok: false, reason: 'bad-axis' };
  if (!Number.isInteger(k)) return { ok: false, reason: 'bad-crease' };
  const total = axis === 'x' ? state.W : state.H;
  if (k < 1 || k >= total) return { ok: false, reason: 'bad-crease' };
  const foldedLen = side < 0 ? k : total - k;
  const otherLen = total - foldedLen;
  if (foldedLen < 1) return { ok: false, reason: 'empty' };
  if (foldedLen > otherLen) return { ok: false, reason: 'too-wide' };

  const sides = foldSides(state, axis, k);
  const sources = side < 0 ? (axis === 'x' ? sides.left : sides.top) : (axis === 'x' ? sides.right : sides.bottom);
  let sourceTerrain = 0;
  for (const cell of sources) if (state.terrain[cell.z][cell.x] !== VOID) sourceTerrain += 1;
  if (sourceTerrain === 0) return { ok: false, reason: 'empty' };

  const next = cloneState(state);
  const grid = next.terrain;

  // clear the folded half; it is about to become the top layer
  for (const cell of sources) grid[cell.z][cell.x] = VOID;

  const mergeTerrain = (src, dst) => {
    if (src === VOID) return grid[dst.z][dst.x];
    if (grid[dst.z][dst.x] === WALL || src === WALL) return WALL;
    return FLOOR;
  };

  for (const cell of sources) {
    const dst = mirrorCell(cell, axis, k);
    if (!inBounds(next, dst.x, dst.z)) return { ok: false, reason: 'overhang' };
    grid[dst.z][dst.x] = mergeTerrain(state.terrain[cell.z][cell.x], dst);
  }

  const movePoint = (point) => (isOnFlap(point, axis, k, side) ? mirrorCell(point, axis, k) : { ...point });
  next.player = movePoint(next.player);
  next.goal = movePoint(next.goal);

  const movedStars = new Set();
  for (const starKey of next.stars) {
    const { x, z } = parseKey(starKey);
    const dst = isOnFlap({ x, z }, axis, k, side) ? mirrorCell({ x, z }, axis, k) : { x, z };
    if (inBounds(next, dst.x, dst.z)) movedStars.add(key(dst.x, dst.z));
  }
  next.stars = movedStars;

  // enemies are physical paper objects too; mirror their patrol route
  const nextEnemies = [];
  for (const enemy of next.enemies) {
    const current = enemyCell(enemy);
    const route = [];
    const seen = new Set();
    for (const cell of enemy.route) {
      const dst = isOnFlap(cell, axis, k, side) ? mirrorCell(cell, axis, k) : { ...cell };
      if (!inBounds(next, dst.x, dst.z) || next.terrain[dst.z][dst.x] !== FLOOR) continue;
      const kk = key(dst.x, dst.z);
      if (seen.has(kk)) continue;
      seen.add(kk);
      route.push(dst);
    }
    if (route.length < 2) continue;
    let idx = 0;
    if (current) {
      const mc = isOnFlap(current, axis, k, side) ? mirrorCell(current, axis, k) : current;
      const found = route.findIndex((cell) => cell.x === mc.x && cell.z === mc.z);
      if (found >= 0) idx = found;
    }
    nextEnemies.push({ ...enemy, route, idx, timer: 0 });
  }
  next.enemies = nextEnemies;

  if (!isWalkable(next, next.player.x, next.player.z)) {
    return { ok: false, reason: 'player-drops' };
  }
  if (!isWalkable(next, next.goal.x, next.goal.z)) {
    return { ok: false, reason: 'goal-drops' };
  }

  // the folded page lands as a new layer; a star beneath the player is picked up
  const playerKey = key(next.player.x, next.player.z);
  const collectedStar = next.stars.has(playerKey) ? playerKey : null;
  collectStar(next, next.player.x, next.player.z);

  next.folds = state.folds + 1;
  next.moves = state.moves;

  return {
    ok: true,
    state: next,
    sources,
    dst: mirrorCell(sources[0] || { x: 0, z: 0 }, axis, k),
    foldedLen,
    otherLen,
    collectedStar,
  };
}

export function starTotalForEntry(entry) {
  if (!entry || !entry.complete) return 0;
  return 1 + (entry.golden ? 1 : 0) + (entry.grace ? 1 : 0);
}

export function levelEntryStars(save, id) {
  return starTotalForEntry(save.levels[String(id)]);
}

export function totalStars(save) {
  let total = 0;
  for (const level of LEVELS) total += levelEntryStars(save, level.id);
  return total;
}

export function isLevelUnlocked(save, id) {
  const index = LEVELS.findIndex((level) => level.id === id);
  if (index <= 0) return true;
  if (index < 0) return false;
  const previous = LEVELS[index - 1];
  return Boolean(save.levels[String(previous.id)]?.complete);
}

export function nextLevelId(id) {
  const index = LEVELS.findIndex((level) => level.id === id);
  return index >= 0 && index + 1 < LEVELS.length ? LEVELS[index + 1].id : null;
}

export function createDefaultSave() {
  return {
    version: 1,
    levels: {},
    skin: 'ember',
    sound: true,
    quality: 'auto',
    reducedMotion: false,
    seenWorlds: [],
    totalRuns: 0,
  };
}

export function normalizeSave(raw) {
  const base = createDefaultSave();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    levels: raw.levels && typeof raw.levels === 'object' ? raw.levels : {},
    seenWorlds: Array.isArray(raw.seenWorlds) ? raw.seenWorlds : [],
    skin: typeof raw.skin === 'string' ? raw.skin : base.skin,
    sound: raw.sound !== false,
    quality: ['auto', 'high', 'lite'].includes(raw.quality) ? raw.quality : 'auto',
    reducedMotion: Boolean(raw.reducedMotion),
  };
}

export const SKINS = [
  {
    id: 'ember',
    name: 'Ember Fox',
    kind: 'fox',
    unlock: 0,
    body: '#f2e3c6',
    accent: '#c76a3f',
    accent2: '#e6a15e',
    dark: '#3b2a22',
    eyes: '#2b211b',
    description: 'A little fox folded from warm autumn paper.',
  },
  {
    id: 'snow',
    name: 'Snow Hare',
    kind: 'hare',
    unlock: 6,
    body: '#f6f4ec',
    accent: '#8cb9d0',
    accent2: '#c9e1ea',
    dark: '#435b68',
    eyes: '#2c3d46',
    description: 'A hare with ears like two crisp white creases.',
  },
  {
    id: 'crane',
    name: 'Ink Crane',
    kind: 'crane',
    unlock: 14,
    body: '#d9e4e8',
    accent: '#2f5060',
    accent2: '#7fa6b7',
    dark: '#203742',
    eyes: '#e7c85e',
    description: 'A crane inked in midnight blue and silver.',
  },
  {
    id: 'koi',
    name: 'Golden Koi',
    kind: 'koi',
    unlock: 24,
    body: '#f7dfae',
    accent: '#e08a3c',
    accent2: '#f6e6c4',
    dark: '#5a3326',
    eyes: '#30231b',
    description: 'A koi that swam up from the last golden page.',
  },
];

export function skinById(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}
