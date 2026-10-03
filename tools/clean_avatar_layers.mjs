// clean_avatar_layers.mjs — 清掉衣服／頭髮／配件圖層去背留下的雜訊（淡淡的方框線、零星小點）
// 規則：(1) 半透明像素（alpha<64）若 2px 內沒有實心像素就清掉；(2) 實心小碎塊（<24px）清掉；
// (3) 上衣（大塊形狀）另外做 opening：先侵蝕 4px 再膨脹回來，細細的方框線會消失，衣服本體留下
// 用法：node tools/clean_avatar_layers.mjs（需要 ImageMagick；重跑無害）
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../icons/avatar/", import.meta.url));
const W = 512, H = 512;

for (const name of readdirSync(DIR).filter((f) => f.endsWith(".png") && !f.startsWith("base_"))) {
  const file = DIR + name;
  const px = execFileSync("convert", [file, "-depth", "8", "rgba:-"], { maxBuffer: 1 << 24 });
  const A = (i) => px[i * 4 + 3];
  // 實心小碎塊
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = A(i) >= 128 ? 1 : 0;
  const seen = new Uint8Array(W * H);
  let removed = 0;
  for (let s = 0; s < W * H; s++) {
    if (!solid[s] || seen[s]) continue;
    const comp = [], st = [s];
    seen[s] = 1;
    while (st.length) {
      const i = st.pop();
      comp.push(i);
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (solid[j] && !seen[j]) { seen[j] = 1; st.push(j); }
        }
    }
    if (comp.length < 24) for (const i of comp) { solid[i] = 0; px[i * 4 + 3] = 0; removed++; }
  }
  // 離實心像素太遠的半透明像素
  for (let i = 0; i < W * H; i++) {
    const a = A(i);
    if (a === 0 || a >= 64) continue;
    const x = i % W, y = (i / W) | 0;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++)
      for (let dx = -2; dx <= 2 && !near; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && solid[ny * W + nx]) near = true;
      }
    if (!near) { px[i * 4 + 3] = 0; removed++; }
  }
  if (name.startsWith("top_")) {
    const grow = (m, r, val) => {
      let cur = m;
      for (let k = 0; k < r; k++) {
        const next = new Uint8Array(cur);
        for (let i = 0; i < W * H; i++) {
          if (cur[i] === val) continue;
          const x = i % W, y = (i / W) | 0;
          if ((x > 0 && cur[i - 1] === val) || (x < W - 1 && cur[i + 1] === val) || (y > 0 && cur[i - W] === val) || (y < H - 1 && cur[i + W] === val)) next[i] = val;
        }
        cur = next;
      }
      return cur;
    };
    const opened = grow(grow(solid, 4, 0), 4 + 3, 1); // 侵蝕 4、膨脹 7（多留 3px 給邊緣的反鋸齒）
    for (let i = 0; i < W * H; i++) if (!opened[i] && A(i)) { px[i * 4 + 3] = 0; removed++; }
  }
  if (removed) {
    execFileSync("convert", ["-size", `${W}x${H}`, "-depth", "8", "rgba:-", file], { input: px });
    console.log(`${name}: 清掉 ${removed} px`);
  }
}
