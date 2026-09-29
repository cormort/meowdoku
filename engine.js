// engine.js - 貓咪邏輯謎題完整核心（零依賴）
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0, s = String(text); i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const indexOf = (n, r, c) => r * n + c;
export const rowColOf = (n, i) => [Math.floor(i / n), i % n];
export function orthoNeighbors(n, i) {
  const [r, c] = rowColOf(n, i),
    o = [];
  if (r) o.push(i - n);
  if (r < n - 1) o.push(i + n);
  if (c) o.push(i - 1);
  if (c < n - 1) o.push(i + 1);
  return o;
}
const _orthoTable = new Map();
function orthoTable(n) {
  if (!_orthoTable.has(n))
    _orthoTable.set(
      n,
      Array.from({ length: n * n }, (_, i) => orthoNeighbors(n, i)),
    );
  return _orthoTable.get(n);
}
export function aroundNeighbors(n, i) {
  const [r, c] = rowColOf(n, i),
    o = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) o.push(nr * n + nc);
    }
  return o;
}
export function generateSolution(n, rng) {
  const used = new Array(n).fill(false),
    perm = new Array(n).fill(-1),
    order = shuffle([...Array(n).keys()], rng);
  function place(r) {
    if (r === n) return true;
    const cs = shuffle(
      order.filter((c) => !used[c] && (!r || Math.abs(c - perm[r - 1]) >= 2)),
      rng,
    );
    for (const c of cs) {
      perm[r] = c;
      used[c] = true;
      if (place(r + 1)) return true;
      used[c] = false;
      perm[r] = -1;
    }
    return false;
  }
  return place(0) ? perm.slice() : null;
}
export function growRegions(n, solution, rng, chunkiness = 0.5) {
  const total = n * n,
    owner = new Int16Array(total).fill(-1),
    size = new Int32Array(n),
    cats = solution.map((c, r) => indexOf(n, r, c));
  cats.forEach((x, k) => {
    owner[x] = k;
    size[k] = 1;
  });
  let frontier = [];
  const push = (cell, reg) => {
    for (const nb of orthoNeighbors(n, cell))
      if (owner[nb] < 0) frontier.push({ cell: nb, region: reg });
  };
  cats.forEach((x, k) => push(x, k));
  let guard = total * 40;
  const maxSize = n + 1;
  while (frontier.length && guard-- > 0) {
    let pi;
    if (rng() < chunkiness) {
      let best = -1,
        s = Math.min(frontier.length, 12);
      for (let k = 0; k < s; k++) {
        const cand = frontier[Math.floor(rng() * frontier.length)],
          score = orthoNeighbors(n, cand.cell).filter((x) => owner[x] === cand.region).length;
        if (score > best) {
          best = score;
          pi = frontier.indexOf(cand);
        }
      }
    }
    if (pi === undefined) pi = Math.floor(rng() * frontier.length);
    const { cell, region } = frontier.splice(pi, 1)[0];
    if (owner[cell] >= 0 || size[region] >= maxSize) continue;
    owner[cell] = region;
    size[region]++;
    push(cell, region);
  }
  const rebuild = () => {
    frontier = [];
    for (let i = 0; i < total; i++)
      if (owner[i] >= 0)
        for (const nb of orthoNeighbors(n, i))
          if (owner[nb] < 0) frontier.push({ cell: nb, region: owner[i] });
  };
  guard = total * 60;
  while (guard-- > 0) {
    if (!frontier.length) {
      if (!owner.includes(-1)) break;
      rebuild();
      if (!frontier.length) break;
    }
    const { cell, region } = frontier.splice(Math.floor(rng() * frontier.length), 1)[0];
    if (owner[cell] >= 0) continue;
    owner[cell] = region;
    size[region]++;
    push(cell, region);
  }
  return owner.includes(-1) ? null : { owner: Array.from(owner), size: Array.from(size) };
}
export function regionIsConnected(n, owner, reg) {
  const cells = owner.map((v, i) => (v === reg ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]),
    q = [cells[0]];
  while (q.length) {
    const cur = q.shift();
    for (const nb of orthoNeighbors(n, cur))
      if (owner[nb] === reg && !seen.has(nb)) {
        seen.add(nb);
        q.push(nb);
      }
  }
  return seen.size === cells.length;
}
export function buildMasks(n, owner) {
  const out = [];
  for (let i = 0; i < n * n; i++) {
    const set = new Set([i]),
      [r, c] = rowColOf(n, i);
    for (let x = 0; x < n; x++) {
      set.add(indexOf(n, r, x));
      set.add(indexOf(n, x, c));
    }
    for (let j = 0; j < n * n; j++) if (owner[j] === owner[i]) set.add(j);
    for (const nb of aroundNeighbors(n, i)) set.add(nb);
    out.push(set);
  }
  return out;
}
export function countSolutions(n, owner, limit = 2, conflicts = null) {
  const mask = conflicts || buildMasks(n, owner),
    rm = new Map();
  for (let i = 0; i < n * n; i++) {
    if (!rm.has(owner[i])) rm.set(owner[i], []);
    rm.get(owner[i]).push(i);
  }
  const regions = [...rm],
    allowed = new Uint8Array(n * n).fill(1),
    row = new Array(n).fill(-1),
    col = new Array(n).fill(-1),
    rc = new Map();
  let solutions = 0;
  const place = (cell) => {
    for (const j of mask[cell]) allowed[j] = 0;
    allowed[cell] = 1;
    const r = Math.floor(cell / n),
      c = cell % n;
    row[r] = c;
    col[c] = r;
    rc.set(owner[cell], cell);
  };
  const snap = () => ({
    a: Uint8Array.from(allowed),
    r: row.slice(),
    c: col.slice(),
    m: new Map(rc),
  });
  const restore = (s) => {
    allowed.set(s.a);
    for (let i = 0; i < n; i++) {
      row[i] = s.r[i];
      col[i] = s.c[i];
    }
    rc.clear();
    for (const x of s.m) rc.set(...x);
  };
  function search(placed) {
    if (solutions >= limit) return;
    if (placed === n) {
      solutions++;
      return;
    }
    const root = snap();
    let progress = true;
    while (progress) {
      progress = false;
      for (let r = 0; r < n; r++) {
        if (row[r] >= 0) continue;
        const cs = [];
        for (let c = 0; c < n; c++) {
          const x = r * n + c;
          if (allowed[x]) cs.push(x);
        }
        if (!cs.length) {
          restore(root);
          return;
        }
        if (cs.length === 1) {
          place(cs[0]);
          placed++;
          progress = true;
        }
      }
      for (let c = 0; c < n; c++) {
        if (col[c] >= 0) continue;
        const cs = [];
        for (let r = 0; r < n; r++) {
          const x = r * n + c;
          if (allowed[x]) cs.push(x);
        }
        if (!cs.length) {
          restore(root);
          return;
        }
        if (cs.length === 1) {
          place(cs[0]);
          placed++;
          progress = true;
        }
      }
      for (const [id, cells] of regions) {
        if (rc.has(id)) continue;
        const cs = cells.filter((i) => allowed[i]);
        if (!cs.length) {
          restore(root);
          return;
        }
        if (cs.length === 1) {
          place(cs[0]);
          placed++;
          progress = true;
        }
      }
      if (placed === n) {
        solutions++;
        restore(root);
        return;
      }
    }
    let best = null;
    for (const [id, cells] of regions) {
      if (rc.has(id)) continue;
      const cs = cells.filter((i) => allowed[i]);
      if (!cs.length) {
        restore(root);
        return;
      }
      if (!best || cs.length < best.length) best = cs;
    }
    if (!best) {
      restore(root);
      return;
    }
    for (const cell of best) {
      if (!allowed[cell]) continue;
      const local = snap();
      place(cell);
      search(placed + 1);
      restore(local);
      if (solutions >= limit) break;
    }
    restore(root);
  }
  search(0);
  return solutions;
}
export function logicSolve(n, owner, { collect = false } = {}) {
  const mask = buildMasks(n, owner),
    allowed = new Uint8Array(n * n).fill(1),
    cats = [],
    techniques = [],
    map = new Map();
  for (let i = 0; i < n * n; i++) {
    if (!map.has(owner[i])) map.set(owner[i], []);
    map.get(owner[i]).push(i);
  }
  const regions = [...map.values()],
    place = (cell, why) => {
      for (const j of mask[cell]) allowed[j] = 0;
      allowed[cell] = 1;
      cats.push(cell);
      if (collect) techniques.push({ cell, why });
    };
  let progress = true,
    rounds = 0,
    contradiction = false;
  while (progress && cats.length < n && !contradiction) {
    progress = false;
    rounds++;
    for (const cells of regions) {
      const cs = cells.filter((i) => allowed[i]);
      if (!cs.length) {
        contradiction = true;
        break;
      }
      if (cs.length === 1 && !cats.includes(cs[0])) {
        place(cs[0], "region");
        progress = true;
      }
    }
    if (contradiction) break;
    for (let r = 0; r < n; r++) {
      const cs = [];
      for (let c = 0; c < n; c++) if (allowed[indexOf(n, r, c)]) cs.push(indexOf(n, r, c));
      if (!cs.length) {
        contradiction = true;
        break;
      }
      if (cs.length === 1 && !cats.includes(cs[0])) {
        place(cs[0], "row");
        progress = true;
      }
    }
    if (contradiction) break;
    for (let c = 0; c < n; c++) {
      const cs = [];
      for (let r = 0; r < n; r++) if (allowed[indexOf(n, r, c)]) cs.push(indexOf(n, r, c));
      if (!cs.length) {
        contradiction = true;
        break;
      }
      if (cs.length === 1 && !cats.includes(cs[0])) {
        place(cs[0], "col");
        progress = true;
      }
    }
    if (contradiction) break;
    for (const cells of regions) {
      const cs = cells.filter((i) => allowed[i]);
      if (cs.length < 2) continue;
      const rows = new Set(cs.map((i) => Math.floor(i / n))),
        cols = new Set(cs.map((i) => i % n));
      if (rows.size === 1) {
        const r = [...rows][0];
        for (let c = 0; c < n; c++) {
          const x = indexOf(n, r, c);
          if (allowed[x] && !cells.includes(x)) {
            allowed[x] = 0;
            progress = true;
          }
        }
      }
      if (cols.size === 1) {
        const c = [...cols][0];
        for (let r = 0; r < n; r++) {
          const x = indexOf(n, r, c);
          if (allowed[x] && !cells.includes(x)) {
            allowed[x] = 0;
            progress = true;
          }
        }
      }
    }
  }
  return {
    solved: !contradiction && cats.length === n,
    cats,
    rounds,
    techniques: collect ? techniques : undefined,
  };
}
const _placementCache = new Map();
export function enumeratePlacements(n, limit = 200000) {
  if (limit === 200000 && _placementCache.has(n)) return _placementCache.get(n);
  const out = [],
    perm = new Array(n).fill(-1),
    used = new Array(n).fill(false);
  (function rec(r) {
    if (out.length >= limit) return;
    if (r === n) {
      out.push(perm.slice());
      return;
    }
    for (let c = 0; c < n; c++) {
      if (used[c] || (r && Math.abs(c - perm[r - 1]) < 2)) continue;
      used[c] = true;
      perm[r] = c;
      rec(r + 1);
      used[c] = false;
      perm[r] = -1;
      if (out.length >= limit) return;
    }
  })(0);
  if (limit === 200000) _placementCache.set(n, out);
  return out;
}
const _placementIndex = new Map();
function placementIndex(n) {
  if (!_placementIndex.has(n)) {
    const cats = enumeratePlacements(n).map((p) => p.map((c, r) => r * n + c)),
      lists = Array.from({ length: n * n }, () => []);
    cats.forEach((cs, pi) => cs.forEach((x) => lists[x].push(pi)));
    _placementIndex.set(n, { placementCats: cats, cellLists: lists });
  }
  return _placementIndex.get(n);
}
function aliveChecker(n, owner, placements, cellLists, solutionIdx) {
  const seen = new Int32Array(n);
  let stamp = 0;
  const isAlive = (pi) => {
    if (pi === solutionIdx) return false;
    stamp++;
    for (const cell of placements[pi]) {
      const r = owner[cell];
      if (seen[r] === stamp) return false;
      seen[r] = stamp;
    }
    return true;
  };
  const aliveThrough = (cell) => {
    let k = 0;
    for (const pi of cellLists[cell]) if (isAlive(pi)) k++;
    return k;
  };
  return { isAlive, aliveThrough };
}
function buildPartitionSA(n, solution, rng, { chunkiness = 0.5, steps = 4000, steps2 = 400 } = {}) {
  const grown = growRegions(n, solution, rng, chunkiness);
  if (!grown) return null;
  const { owner, size } = grown,
    { placementCats, cellLists } = placementIndex(n),
    catCells = solution.map((c, r) => r * n + c),
    fixed = new Set(catCells),
    solutionIdx = placementCats.findIndex((cs) => cs.every((x, r) => x === catCells[r])),
    { isAlive } = aliveChecker(n, owner, placementCats, cellLists, solutionIdx),
    nbs = orthoTable(n); // 只有經過被移動格子的擺法會改變存活狀態，故增量更新（alive 保持遞增順序，亂數序列與全掃描一致）
  const P = placementCats.length,
    flag = new Uint8Array(P);
  let alive = [];
  for (let pi = 0; pi < P; pi++)
    if (isAlive(pi)) {
      flag[pi] = 1;
      alive.push(pi);
    }
  for (let step = 0; step < steps && alive.length; step++) {
    const target = placementCats[alive[Math.floor(rng() * alive.length)]],
      cell = target[Math.floor(rng() * n)];
    if (fixed.has(cell)) continue;
    const from = owner[cell],
      neighbors = nbs[cell].filter((x) => owner[x] !== from);
    if (!neighbors.length) continue;
    const to = owner[neighbors[Math.floor(rng() * neighbors.length)]];
    owner[cell] = to;
    if (!regionIsConnected(n, owner, from)) {
      owner[cell] = from;
      continue;
    }
    const changed = [];
    let count = alive.length;
    for (const pi of cellLists[cell]) {
      const a = isAlive(pi) ? 1 : 0;
      if (a !== flag[pi]) {
        changed.push(pi);
        count += a ? 1 : -1;
      }
    }
    if (count <= alive.length || rng() < 0.01) {
      size[from]--;
      size[to]++;
      if (changed.length) {
        for (const pi of changed) flag[pi] ^= 1;
        alive = [];
        for (let pi = 0; pi < P; pi++) if (flag[pi]) alive.push(pi);
      }
    } else owner[cell] = from;
  }
  if (alive.length) return null;
  let energy = n - logicSolve(n, owner).cats.length;
  for (let step = 0; step < steps2 && energy; step++) {
    const cell = Math.floor(rng() * n * n);
    if (fixed.has(cell)) continue;
    const from = owner[cell],
      neighbors = nbs[cell].filter((x) => owner[x] !== from);
    if (!neighbors.length) continue;
    const to = owner[neighbors[Math.floor(rng() * neighbors.length)]];
    owner[cell] = to;
    let revived = false;
    for (const pi of cellLists[cell])
      if (isAlive(pi)) {
        revived = true;
        break;
      }
    if (revived || !regionIsConnected(n, owner, from)) {
      owner[cell] = from;
      continue;
    }
    const e = n - logicSolve(n, owner).cats.length;
    if (e <= energy || rng() < 0.02) {
      size[from]--;
      size[to]++;
      energy = e;
    } else owner[cell] = from;
  }
  return energy ? null : owner;
}
export function generatePuzzle(
  n,
  { rng = makeRng(Date.now() >>> 0), chunkiness = 0.5, maxTries = 60 } = {},
) {
  const started = Date.now();
  let tries = 0;
  while (tries++ < maxTries) {
    const solution = generateSolution(n, rng);
    if (!solution) continue;
    const owner = buildPartitionSA(n, solution, rng, { chunkiness });
    if (!owner) continue;
    if (countSolutions(n, owner, 2) !== 1) continue;
    const logic = logicSolve(n, owner);
    if (!logic.solved) continue;
    const sizes = new Map();
    owner.forEach((v) => sizes.set(v, (sizes.get(v) || 0) + 1));
    if ([...sizes.values()].filter((v) => v === 1).length > 1 && tries < maxTries) continue;
    if (Math.max(...sizes.values()) > Math.ceil(n * 2.2) && tries < maxTries) continue;
    return {
      n,
      owner,
      solution,
      chunkiness,
      stats: {
        tries,
        ms: Date.now() - started,
        logicRounds: logic.rounds,
        regionMin: Math.min(...sizes.values()),
        regionMax: Math.max(...sizes.values()),
        alternatives: othersCount(n),
      },
    };
  }
  return null;
}
function othersCount(n) {
  return { 4: 0, 5: 2, 6: 14, 7: 90, 8: 646, 9: 5242, 10: 47622 }[n] ?? null;
}
export function findConflicts(n, owner, cats) {
  const bad = new Set();
  for (const cell of cats) {
    for (const nb of aroundNeighbors(n, cell))
      if (cats.includes(nb)) {
        bad.add(cell);
        bad.add(nb);
      }
    const [r, c] = rowColOf(n, cell);
    if (cats.filter((x) => Math.floor(x / n) === r).length > 1) bad.add(cell);
    if (cats.filter((x) => x % n === c).length > 1) bad.add(cell);
    if (cats.filter((x) => owner[x] === owner[cell]).length > 1) bad.add(cell);
  }
  return bad;
}
export function isSolved(n, owner, cats) {
  if (cats.length !== n) return false;
  return (
    new Set(cats.map((i) => Math.floor(i / n))).size === n &&
    new Set(cats.map((i) => i % n)).size === n &&
    new Set(cats.map((i) => owner[i])).size === n &&
    !findConflicts(n, owner, cats).size
  );
}
