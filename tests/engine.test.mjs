// tests/engine.test.mjs — 核心驗證：解的合法性、色塊連通、唯一解、純邏輯可解
// 用法：node tests/engine.test.mjs [每種尺寸的盤數]
import {
  makeRng, generateSolution, growRegions, regionIsConnected, buildMasks,
  countSolutions, logicSolve, generatePuzzle, isSolved, findConflicts, orthoNeighbors,
} from '../engine.js';

let failures = 0;
function check(cond, label, detail = '') {
  if (!cond) { failures++; console.log(`  ❌ ${label} ${detail}`); }
}

// ---------- 1) 暴力解數（與精確解題器交叉比對） ----------
function bruteForceCount(n, owner, limit = 3) {
  const mask = buildMasks(n, owner);
  const cats = [];
  const regionOf = new Map();
  for (let i = 0; i < n * n; i++) {
    if (!regionOf.has(owner[i])) regionOf.set(owner[i], []);
    regionOf.get(owner[i]).push(i);
  }
  const regions = [...regionOf.values()];
  let count = 0;
  function rec(regionIdx, usedCells) {
    if (count >= limit) return;
    if (regionIdx === regions.length) { count++; return; }
    for (const cell of regions[regionIdx]) {
      let ok = true;
      for (const u of usedCells) if (mask[cell].has(u)) { ok = false; break; }
      if (ok) { usedCells.push(cell); rec(regionIdx + 1, usedCells); usedCells.pop(); }
    }
  }
  rec(0, []);
  return count;
}

console.log('=== 1) 解題器正確性（與暴力解交叉比對，n=5、6） ===');
for (const n of [5, 6]) {
  let pairs = 0, mismatch = 0;
  for (let t = 0; t < 40; t++) {
    const rng = makeRng(1000 + t);
    const solution = generateSolution(n, rng);
    const grown = growRegions(n, solution, rng, 0.5);
    const fast = countSolutions(n, grown.owner, 3);
    const slow = bruteForceCount(n, grown.owner, 3);
    pairs++;
    if (fast !== slow) { mismatch++; console.log(`  ❌ n=${n} 快=${fast} 慢=${slow}`); }
  }
  check(mismatch === 0, `精確解題器與暴力解一致 (n=${n})`, `比對 ${pairs} 盤，不一致 ${mismatch}`);
  console.log(`  n=${n}: 比對 ${pairs} 盤，${mismatch === 0 ? '全部一致 ✅' : `${mismatch} 盤不一致`}`);
}

// ---------- 2) 解的合法性 ----------
console.log('=== 2) 合法解（排列且相鄰列差距 ≥2） ===');
for (const n of [5, 7, 9, 10]) {
  let bad = 0;
  for (let t = 0; t < 50; t++) {
    const perm = generateSolution(n, makeRng(n * 100 + t));
    if (!perm) { bad++; continue; }
    const sorted = [...perm].sort((a, b) => a - b);
    if (sorted.some((v, i) => v !== i)) bad++;
    for (let r = 0; r + 1 < n; r++) if (Math.abs(perm[r] - perm[r + 1]) < 2) bad++;
  }
  check(bad === 0, `n=${n} 產生的解都合法`, `不合法 ${bad}/50`);
  console.log(`  n=${n}: ${bad === 0 ? '50/50 合法 ✅' : `${bad} 個不合法`}`);
}

// ---------- 3) 色塊切分 ----------
console.log('=== 3) 色塊切分（覆蓋完整、連通、每塊 1 貓） ===');
for (const n of [5, 7, 9]) {
  let broken = 0;
  for (let t = 0; t < 50; t++) {
    const rng = makeRng(5000 + n * 100 + t);
    const solution = generateSolution(n, rng);
    const grown = growRegions(n, solution, rng, 0.4);
    if (!grown || grown.owner.some((v) => v < 0)) { broken++; continue; }
    const counts = new Map();
    grown.owner.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
    if (counts.size !== n) { broken++; continue; }
    for (const region of counts.keys()) if (!regionIsConnected(n, grown.owner, region)) { broken++; break; }
    const catsPerRegion = new Map();
    solution.forEach((c, r) => catsPerRegion.set(grown.owner[r * n + c], (catsPerRegion.get(grown.owner[r * n + c]) || 0) + 1));
    if ([...catsPerRegion.values()].some((v) => v !== 1)) broken++;
    // 每隻貓的 8 鄰域不得有另一隻貓
    for (let r = 0; r + 1 < n; r++) if (Math.abs(solution[r] - solution[r + 1]) < 2) broken++;
  }
  check(broken === 0, `n=${n} 色塊切分正常`, `異常 ${broken}/50`);
  console.log(`  n=${n}: ${broken === 0 ? '50/50 正常 ✅' : `${broken} 個異常`}`);
}

// ---------- 4) 題目生成：唯一解 + 純邏輯可解 + 效能 ----------
console.log('=== 4) 題目生成品質（唯一解／不用猜／耗時） ===');
const rounds = Number(process.argv[2] || 60);
for (const [n, chunkiness, label] of [[5, 0.75, '5×5 簡單'], [7, 0.55, '7×7 普通'], [9, 0.35, '9×9 困難']]) {
  const times = [];
  let ok = 0, multi = 0, guess = 0, unreachable = 0, notUniqueButLogic = 0;
  for (let t = 0; t < rounds; t++) {
    const puzzle = generatePuzzle(n, { rng: makeRng(hashFor(n, t)), chunkiness, maxTries: 400 });
    if (!puzzle) { unreachable++; continue; }
    times.push(puzzle.stats.ms);
    const sols = countSolutions(n, puzzle.owner, 2);
    if (sols === 1) ok++; else if (sols > 1) multi++;
    const logic = logicSolve(n, puzzle.owner);
    if (!logic.solved) guess++;
    // 生成的解本身必須是合法完整解
    check(isSolved(n, puzzle.owner, puzzle.solution.map((c, r) => r * n + c)), `n=${n} 產生的解合法`);
  }
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0) : '-';
  const max = times.length ? Math.max(...times) : '-';
  console.log(`  ${label}: 成功 ${ok}/${rounds}｜多解 ${multi}｜需猜測 ${guess}｜放棄 ${unreachable}｜平均 ${avg}ms，最慢 ${max}ms`);
  check(multi === 0 && guess === 0, `${label} 全部唯一解且不用猜`);
}

function hashFor(n, t) { return (n * 7919 + t * 104729 + 12345) >>> 0; }

// ---------- 5) 玩家盤面判定 ----------
console.log('=== 5) 完成判定與衝突偵測 ===');
{
  const rng = makeRng(42);
  const puzzle = generatePuzzle(7, { rng, chunkiness: 0.5 });
  const cats = puzzle.solution.map((c, r) => r * n0(puzzle) + c);
  function n0(p) { return p.n; }
  check(isSolved(7, puzzle.owner, cats), '正確答案判定為完成');
  const wrong = cats.slice(); wrong[0] = wrong[0] + 1 < 49 ? wrong[0] + 1 : wrong[0] - 1;
  check(!isSolved(7, puzzle.owner, wrong), '錯誤盤面不算完成');
  const conflictCats = [0, 1];
  check(findConflicts(7, puzzle.owner, conflictCats).size > 0, '相鄰衝突會被偵測');
  console.log('  完成判定與衝突偵測 ✅');
}

console.log(failures === 0 ? '\n全部通過 ✅' : `\n有 ${failures} 項失敗 ❌`);
process.exit(failures === 0 ? 0 : 1);
