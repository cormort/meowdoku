// gen-worker.js — 在背景執行緒生成題目，主畫面不卡
import { generatePuzzle, makeRng } from './engine.js?v=4';

self.onmessage = (event) => {
  const { id, n, seed, chunkiness, minSteps = 0 } = event.data;
  const rng = makeRng(seed);
  self.postMessage({
    id,
    puzzle: generatePuzzle(n, { rng, chunkiness, minSteps, maxTries: minSteps ? 900 : 300 }),
  });
};
