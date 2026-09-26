// gen-worker.js — 在背景執行緒生成題目，主畫面不卡
import { generatePuzzle, makeRng } from './engine.js';

self.onmessage = (e) => {
  const { id, n, seed, chunkiness } = e.data;
  const rng = makeRng(seed);
  self.postMessage({ id, puzzle: generatePuzzle(n, { rng, chunkiness, maxTries: 60 }) });
};
