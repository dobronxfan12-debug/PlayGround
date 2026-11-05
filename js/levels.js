// ---------------------------------------------------------------------------
// Levels — ten hand-folded puzzles across five paper worlds.
//
// Cells are integer squares: cell [i,j] covers world x∈[i,i+1], z∈[j,j+1].
// A crease on axis "x" is the line x = coord (running along Z).
// A crease on axis "z" is the line z = coord (running along X).
// ---------------------------------------------------------------------------

function rectCells (x0, x1, z0, z1, holes = []) {
  const cells = [];
  for (let i = x0; i <= x1; i++) {
    for (let j = z0; j <= z1; j++) {
      let hole = false;
      for (const [a, b, c, d] of holes) {
        if (i >= a && i <= b && j >= c && j <= d) { hole = true; break; }
      }
      if (!hole) cells.push([i, j]);
    }
  }
  return cells;
}

function sheet (x0, x1, z0, z1, { y = 0, holes = [], foldable = true } = {}) {
  return {
    cells: rectCells(x0, x1, z0, z1, holes),
    bounds: { minX: x0, maxX: x1 + 1, minZ: z0, maxZ: z1 + 1 },
    y,
    foldable,
  };
}

function platform (x, z, w, d, top, thickness = 0.32) {
  return { x, z, w, d, top, thickness };
}

// ---------------------------------------------------------------------------

export const LEVELS = [
  // ======================================================================== 1
  {
    id: 1,
    name: 'First Fold',
    chapter: 'Paper Forest',
    theme: 'forest',
    player: [-3.2, -0.2],
    sheets: [sheet(-5, 3, -3, 2)],
    platforms: [platform(3.95, 0, 2.2, 3.2, 2.9)],
    exit: { x: 4.5, y: 2.93, z: 0 },
    stars: [{ x: 3.35, y: 3.58, z: 0.75 }],
    hints: [{ sheet: 0, axis: 'x', coord: 0, side: 1, angle: 45, text: 'Fold the far half up to 45°.' }],
    decorSeed: 11,
    platformDecor: [
      { type: 'tree', x: 4.7, z: -1.15, top: 2.9, scale: 0.72 },
      { type: 'grass', x: 3.15, z: 1.15, top: 2.9, scale: 0.8 },
    ],
    quote: 'The first crease is always the bravest.',
    tutorial: true,
  },
  // ======================================================================== 2
  {
    id: 2,
    name: 'Paper Bridge',
    chapter: 'Paper Forest',
    theme: 'forest',
    player: [-3.4, 0],
    sheets: [
      sheet(-5, -1, -2, 1),
      sheet(2, 3, -1, 0, { y: 0 }),
    ],
    platforms: [],
    exit: { sheet: 1, x: 3.1, z: 0 },
    stars: [{ sheet: 1, x: 2.9, z: 0.2, bottom: true }],
    hints: [{ sheet: 1, axis: 'x', coord: 2, side: 1, angle: 180, text: 'Fold the far island back across the gap.' }],
    supports: [
      { x: 2, z: -1.05, top: 0, bottom: -4.2, w: 0.18 },
      { x: 2, z: 1.05, top: 0, bottom: -3.4, w: 0.14 },
      { x: -4.5, z: -1.6, top: 0, bottom: -3.7, w: 0.38 },
      { x: -0.6, z: 1.55, top: 0, bottom: -3.1, w: 0.32 },
    ],
    decorSeed: 22,
    quote: 'Two edges met. The gap forgot it was a gap.',
  },
  // ======================================================================== 3
  {
    id: 3,
    name: 'The Long Way',
    chapter: 'Paper Forest',
    theme: 'forest',
    player: [-4.7, -0.2],
    sheets: [
      sheet(-6, -1, -3, 2),
      sheet(4, 5, -1, 0, { y: 1.42 }),
    ],
    platforms: [platform(0.81, 0, 2.78, 3.8, 1.5)],
    exit: { sheet: 1, x: 5.12, z: 0 },
    stars: [{ x: 1.15, y: 2.12, z: 0.75 }],
    hints: [
      { sheet: 0, axis: 'x', coord: -2, side: 1, angle: 45, text: 'Fold a ramp up to the middle platform.' },
      { sheet: 1, axis: 'x', coord: 4, side: 1, angle: 180, text: 'Fold the high island into a bridge.' },
    ],
    supports: [
      { x: 0.5, z: -1.5, top: 1.5, bottom: -4.6, w: 0.45 },
      { x: 1.6, z: 1.5, top: 1.5, bottom: -3.6, w: 0.32 },
    ],
    platformDecor: [
      { type: 'mushroom', x: 1.7, z: -1.3, top: 1.5, scale: 0.85 },
      { type: 'grass', x: 0.2, z: 1.2, top: 1.5, scale: 0.9 },
    ],
    decorSeed: 33,
    quote: 'The long way is only long until it is folded.',
  },
  // ======================================================================== 4
  {
    id: 4,
    name: 'Cold Crease',
    chapter: 'Frozen Origami',
    theme: 'frost',
    player: [-4.5, -0.2],
    sheets: [
      sheet(-6, -1, -2, 1),
      sheet(0, 1, -1, 0, { y: 1.57 }),
    ],
    platforms: [
      platform(0.51, 0, 2.18, 3.0, 1.5),
      platform(2.95, 0, 2.5, 2.4, 2.35),
    ],
    exit: { x: 3.9, y: 2.38, z: 0 },
    stars: [{ x: 3.2, y: 3.05, z: 0.6 }],
    hints: [
      { sheet: 0, axis: 'x', coord: -2, side: 1, angle: 45, text: 'Fold the first ramp to reach the terrace.' },
      { sheet: 1, axis: 'x', coord: 1, side: 1, angle: 45, text: 'Fold the second ramp to the high ledge.' },
    ],
    enemy: [{ x: 2.7, z: -0.6, y: 2.35, range: [2.0, 3.7], speed: 0.9, axis: 'x' }],
    supports: [
      { x: 0.55, z: -1.3, top: 1.5, bottom: -4.0, w: 0.4 },
      { x: 3.2, z: 1.0, top: 2.35, bottom: -2.6, w: 0.26 },
    ],
    platformDecor: [
      { type: 'ice', x: 1.7, z: -1.1, top: 1.5, scale: 0.85 },
      { type: 'pine', x: 3.9, z: -1.0, top: 2.35, scale: 0.55 },
    ],
    decorSeed: 44,
    quote: 'Cold paper remembers every crease.',
  },
  // ======================================================================== 5
  {
    id: 5,
    name: 'Two Winters',
    chapter: 'Frozen Origami',
    theme: 'frost',
    player: [-2.3, 0],
    platforms: [
      platform(-1.5, 0, 3.0, 3.2, 0.2),
      platform(2, 0, 2.0, 3.0, 0.2),
      platform(5, 0, 2.0, 2.6, 0.2),
    ],
    sheets: [
      sheet(1, 1, -1, 1, { y: 0.27 }),
      sheet(4, 4, -1, 1, { y: 0.27 }),
    ],
    exit: { sheet: 1, x: 4.7, z: 0 },
    stars: [{ x: 3.5, y: 1.35, z: 0 }],
    hints: [
      { sheet: 0, axis: 'x', coord: 1, side: 1, angle: 180, text: 'Fold the first winter sheet over the gap.' },
      { sheet: 1, axis: 'x', coord: 4, side: 1, angle: 180, text: 'Bridge the second gap to reach the exit.' },
    ],
    enemy: [{ x: 2.4, z: 0, y: 0.2, range: [2.0, 2.9], speed: 0.8, axis: 'z' }],
    supports: [
      { x: -2.4, z: -1.2, top: 0.2, bottom: -4.5, w: 0.35 },
      { x: 2.6, z: 1.2, top: 0.2, bottom: -4.0, w: 0.3 },
      { x: 5.4, z: -1.0, top: 0.2, bottom: -3.4, w: 0.28 },
    ],
    platformDecor: [
      { type: 'pine', x: -2.7, z: -1.0, top: 0.2, scale: 0.62 },
      { type: 'ice', x: 2.7, z: -1.0, top: 0.2, scale: 0.7 },
      { type: 'pine', x: 5.5, z: 0.9, top: 0.2, scale: 0.5 },
    ],
    decorSeed: 55,
    quote: 'Winter folds twice: once for cold, once for courage.',
  },
  // ======================================================================== 6
  {
    id: 6,
    name: 'Broken Arch',
    chapter: 'The Forgotten City',
    theme: 'city',
    player: [-4.2, -0.1],
    sheets: [
      sheet(-5, -1, -2, 1),
      sheet(4, 5, -1, 0, { y: 1.42 }),
    ],
    platforms: [platform(0.71, 0, 2.7, 3.3, 1.5)],
    exit: { sheet: 1, x: 5.15, z: 0 },
    stars: [{ x: 0.95, y: 2.15, z: -0.8 }],
    hints: [
      { sheet: 0, axis: 'x', coord: -2, side: 1, angle: 45, text: 'Raise a ramp to the broken arch.' },
      { sheet: 1, axis: 'x', coord: 4, side: 1, angle: 180, text: 'Fold the high arch into a bridge.' },
    ],
    enemy: [{ x: 0.6, z: 0.9, y: 1.5, range: [-0.2, 1.5], speed: 1.0, axis: 'x' }],
    supports: [
      { x: 0.7, z: -1.4, top: 1.5, bottom: -4.5, w: 0.42 },
      { x: 1.6, z: 1.4, top: 1.5, bottom: -3.5, w: 0.3 },
    ],
    platformDecor: [
      { type: 'column', x: 1.6, z: -1.15, top: 1.5, scale: 0.75 },
      { type: 'lantern', x: 0.0, z: 1.15, top: 1.5, scale: 0.8 },
    ],
    decorSeed: 66,
    quote: 'Every ruin was once a fold that held.',
  },
  // ======================================================================== 7
  {
    id: 7,
    name: 'The Bell Tower',
    chapter: 'The Forgotten City',
    theme: 'city',
    player: [-2.2, 0],
    platforms: [
      platform(-1.5, 0, 3.0, 3.1, 0.2),
      platform(2, 0, 2.0, 2.8, 0.2),
      platform(5, 0, 2.0, 2.2, 0.2),
    ],
    sheets: [
      sheet(1, 1, -1, 1, { y: 0.27 }),
      sheet(4, 4, -1, 1, { y: 0.27 }),
    ],
    exit: { sheet: 1, x: 4.7, z: 0 },
    stars: [{ x: 3.5, y: 1.45, z: 0.2 }],
    hints: [
      { sheet: 0, axis: 'x', coord: 1, side: 1, angle: 180, text: 'Fold the first tower platform across.' },
      { sheet: 1, axis: 'x', coord: 4, side: 1, angle: 180, text: 'Fold the second across the last gap.' },
    ],
    enemy: [{ x: 2.4, z: 0.2, y: 0.2, range: [2.0, 2.8], speed: 0.85, axis: 'z' }],
    supports: [
      { x: -2.4, z: -1.2, top: 0.2, bottom: -4.5, w: 0.34 },
      { x: 2.6, z: 1.1, top: 0.2, bottom: -4.0, w: 0.3 },
      { x: 5.4, z: -0.9, top: 0.2, bottom: -3.2, w: 0.26 },
    ],
    platformDecor: [
      { type: 'column', x: -2.8, z: -1.0, top: 0.2, scale: 0.7 },
      { type: 'lantern', x: 2.8, z: -0.95, top: 0.2, scale: 0.7 },
      { type: 'column', x: 5.5, z: 0.8, top: 0.2, scale: 0.55 },
    ],
    decorSeed: 77,
    quote: 'The bells are gone, but the folds still ring.',
  },
  // ======================================================================== 8
  {
    id: 8,
    name: 'Cloud Stitch',
    chapter: 'Floating Islands',
    theme: 'sky',
    player: [-4.8, -0.4],
    sheets: [
      sheet(-6, -1, -2, 2),
      sheet(4, 6, -1, 1, { y: 1.42 }),
    ],
    platforms: [platform(0.21, 0, 1.68, 3.4, 1.5)],
    exit: { sheet: 1, x: 6.1, z: 0 },
    stars: [
      { x: 0.75, y: 2.2, z: 1.0 },
      { sheet: 1, x: 5.6, z: -0.5, bottom: true },
    ],
    hints: [
      { sheet: 0, axis: 'x', coord: -2, side: 1, angle: 45, text: 'Ramp up to the little cloud terrace.' },
      { sheet: 1, axis: 'x', coord: 4, side: 1, angle: 180, text: 'Stitch the far cloud back to you.' },
    ],
    supports: [
      { x: 0.2, z: -1.4, top: 1.5, bottom: -3.6, w: 0.35 },
      { x: 1.0, z: 1.4, top: 1.5, bottom: -2.8, w: 0.24 },
      { x: 4, z: -1.0, top: 1.42, bottom: -2.4, w: 0.18 },
    ],
    platformDecor: [
      { type: 'cloudtree', x: 0.1, z: -1.2, top: 1.5, scale: 0.8 },
      { type: 'grass', x: 0.8, z: 1.15, top: 1.5, scale: 0.9 },
    ],
    decorSeed: 88,
    quote: 'Clouds are only paper that forgot to land.',
  },
  // ======================================================================== 9
  {
    id: 9,
    name: 'The High Road',
    chapter: 'Floating Islands',
    theme: 'sky',
    player: [-4.5, 0],
    sheets: [
      sheet(-5, -1, -2, 1),
      sheet(0, 1, -1, 0, { y: 1.57 }),
      sheet(2, 3, -1, 0, { y: 2.42 }),
    ],
    platforms: [
      platform(0.51, 0, 2.18, 3.0, 1.5),
      platform(2.6, 0, 1.8, 2.4, 2.35),
      platform(4.7, 0, 2.0, 2.0, 3.2),
    ],
    exit: { x: 5.25, y: 3.23, z: 0 },
    stars: [
      { x: 2.6, y: 3.1, z: -0.6 },
      { x: 3.9, y: 4.0, z: 0.5 },
    ],
    hints: [
      { sheet: 0, axis: 'x', coord: -2, side: 1, angle: 45, text: 'Fold the first stair of paper.' },
      { sheet: 1, axis: 'x', coord: 1, side: 1, angle: 45, text: 'Climb and fold the second stair.' },
      { sheet: 2, axis: 'x', coord: 3, side: 1, angle: 45, text: 'Climb and fold the last stair.' },
    ],
    supports: [
      { x: 0.5, z: -1.3, top: 1.5, bottom: -4.0, w: 0.38 },
      { x: 2.7, z: 1.0, top: 2.35, bottom: -2.8, w: 0.28 },
      { x: 4.7, z: -0.9, top: 3.2, bottom: -1.8, w: 0.24 },
    ],
    platformDecor: [
      { type: 'cloudtree', x: 1.2, z: -1.2, top: 1.5, scale: 0.75 },
      { type: 'grass', x: 1.2, z: 1.15, top: 1.5, scale: 0.85 },
      { type: 'cloudtree', x: 3.4, z: 1.0, top: 2.35, scale: 0.62 },
      { type: 'crystal', x: 5.1, z: -0.8, top: 3.2, scale: 0.6 },
    ],
    decorSeed: 99,
    quote: 'Some roads are built one crease at a time.',
  },
  // ======================================================================== 10
  {
    id: 10,
    name: 'The Last Fold',
    chapter: 'The Cosmic Paper World',
    theme: 'cosmic',
    player: [-3.2, 0],
    sheets: [
      sheet(-4, -1, -2, 2),
      sheet(3, 3, -1, 1, { y: 1.42 }),
      sheet(3, 4, -1, 0, { y: 1.57 }),
    ],
    platforms: [
      platform(0.71, 0, 2.7, 3.2, 1.5),
      platform(4, 0, 2.1, 2.6, 1.5),
      platform(5.6, 0, 1.8, 2.2, 2.35),
    ],
    exit: { x: 6.1, y: 2.38, z: 0 },
    stars: [
      { x: 1.2, y: 2.2, z: 0.8 },
      { sheet: 1, x: 3.7, z: -0.5, bottom: true },
    ],
    hints: [
      { sheet: 0, axis: 'x', coord: -2, side: 1, angle: 45, text: 'Fold the first ramp toward the first platform.' },
      { sheet: 1, axis: 'x', coord: 3, side: 1, angle: 180, text: 'Fold the floating sheet into a bridge.' },
      { sheet: 2, axis: 'x', coord: 4, side: 1, angle: 45, text: 'Fold the last stair to the final fold.' },
    ],
    enemy: [{ x: 5.2, z: 0.6, y: 2.35, range: [4.9, 6.2], speed: 1.05, axis: 'x' }],
    supports: [
      { x: 0.7, z: -1.4, top: 1.5, bottom: -4.4, w: 0.4 },
      { x: 1.6, z: 1.4, top: 1.5, bottom: -3.3, w: 0.28 },
      { x: 4.0, z: -1.1, top: 1.5, bottom: -2.9, w: 0.28 },
      { x: 5.7, z: 0.9, top: 2.35, bottom: -1.9, w: 0.22 },
    ],
    platformDecor: [
      { type: 'crystal', x: 1.7, z: -1.25, top: 1.5, scale: 0.8 },
      { type: 'starplant', x: 0.0, z: 1.15, top: 1.5, scale: 0.8 },
      { type: 'crystal', x: 4.7, z: -1.0, top: 1.5, scale: 0.6 },
      { type: 'starplant', x: 5.6, z: -0.8, top: 2.35, scale: 0.72 },
    ],
    decorSeed: 110,
    quote: 'When the world is folded, only the crease remains.',
  },
];

// ---------------------------------------------------------------------------
// Crease helpers shared with the game
// ---------------------------------------------------------------------------
export function cellsOnSide (cells, axis, coord, sign) {
  return cells.filter(([i, j]) => {
    if (axis === 'x') return sign > 0 ? i >= coord : i < coord;
    return sign > 0 ? j >= coord : j < coord;
  });
}

export function sheetExtent (sheet, axis) {
  return axis === 'x'
    ? [sheet.bounds.minX, sheet.bounds.maxX]
    : [sheet.bounds.minZ, sheet.bounds.maxZ];
}

export function cellKey (i, j) {
  return `${i},${j}`;
}
