/* Validate every level with an exhaustive fold solver.
   Run: node --experimental-default-type=module tools/validate-levels.mjs
*/
import {
  LEVELS, createInitialState, cloneState, reachableCells, foldPlan, key,
  isWalkable, parseKey,
} from '../js/levels.js';

function stateKey(state) {
  const terr = state.terrain.map((row) => row.join('')).join('|');
  const stars = [...state.stars].sort().join(';');
  return `${terr}#${state.player.x},${state.player.z}#${state.goal.x},${state.goal.z}#${stars}`;
}

function normalizeReachable(state) {
  const reach = reachableCells(state);
  if (!reach.size) return { state, reach, goalReached: false };
  let changed = false;
  const next = cloneState(state);
  for (const k of [...next.stars]) {
    if (reach.has(k)) {
      next.stars.delete(k);
      changed = true;
    }
  }
  const goalReached = reach.has(key(next.goal.x, next.goal.z));
  return { state: next, reach, goalReached, changed };
}

function solve(def, maxFolds = 4, requireStars = false) {
  const initial = createInitialState(def);
  initial.enemies = [];
  const first = normalizeReachable(initial);
  const start = first.state;
  const q = [{ state: start, path: [] }];
  const seen = new Set([stateKey(start)]);
  let simplest = null;

  while (q.length) {
    const { state, path } = q.shift();
    const norm = normalizeReachable(state);
    const s = norm.state;
    const sKey = stateKey(s);
    if (sKey !== stateKey(state)) {
      if (seen.has(sKey)) {
        // still continue below with s; only skip enqueueing duplicates
      } else {
        seen.add(sKey);
      }
    }
    if (norm.goalReached && (!requireStars || s.stars.size === 0)) {
      if (!simplest || path.length < simplest.path.length) simplest = { path, folds: path.length, stars: s.stars.size };
      if (!requireStars || s.stars.size === 0) return { ...simplest, state: s };
    }
    if (path.length >= maxFolds) continue;

    for (const posKey of norm.reach) {
      const pos = parseKey(posKey);
      for (const axis of ['x', 'z']) {
        const total = axis === 'x' ? s.W : s.H;
        for (let k = 1; k < total; k += 1) {
          for (const side of [-1, 1]) {
            const base = cloneState(s);
            base.player = pos;
            const res = foldPlan(base, axis, k, side);
            if (!res.ok) continue;
            const next = normalizeReachable(res.state).state;
            const nk = stateKey(next);
            if (seen.has(nk)) continue;
            seen.add(nk);
            q.push({
              state: next,
              path: [...path, { axis, k, side, from: pos, to: next.player }],
            });
          }
        }
      }
    }
  }
  return simplest;
}

let failures = 0;
for (const level of LEVELS) {
  const initial = createInitialState(level);
  const zeroReach = reachableCells(initial);
  const zeroGoal = zeroReach.has(key(initial.goal.x, initial.goal.z));
  const goalSolve = solve(level, 4, false);
  const starSolve = solve(level, 4, true);
  const starCount = initial.stars.size;
  const status = goalSolve && starSolve && !zeroGoal ? 'OK ' : 'FAIL';
  if (status === 'FAIL') failures += 1;
  console.log(`\n[${status}] L${level.id} ${level.name} — ${initial.W}x${initial.H}, par ${level.par}, stars ${starCount}`);
  console.log(`  goal without folding: ${zeroGoal}`);
  console.log(`  goal solution: ${goalSolve ? `${goalSolve.folds} fold(s)` : 'NONE'}`);
  if (goalSolve) console.log(`    ${goalSolve.path.map((p) => `${p.axis}${p.k}${p.side < 0 ? '-' : '+'}@(${p.from.x},${p.from.z})`).join(' -> ')}`);
  console.log(`  all stars solution: ${starSolve ? `${starSolve.folds} fold(s)` : 'NONE'}`);
  if (starSolve) console.log(`    ${starSolve.path.map((p) => `${p.axis}${p.k}${p.side < 0 ? '-' : '+'}@(${p.from.x},${p.from.z})`).join(' -> ')}`);
  // harshest: is par achievable?
  const starPar = starSolve && starSolve.folds <= level.par;
  const goalPar = goalSolve && goalSolve.folds <= level.par;
  console.log(`  par ${level.par}: goal ${goalPar ? 'yes' : 'NO'}, all-stars ${starPar ? 'yes' : 'NO'}`);
  if (!goalPar || !starPar) failures += 1;
}

console.log(`\n${failures ? `${failures} validation issue(s)` : 'All levels valid.'}`);
process.exitCode = failures ? 1 : 0;
