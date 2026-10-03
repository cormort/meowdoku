// measure_avatar.mjs — 從 base_g4…g9 的 alpha 量出各年級身體的對位錨點，貼進 js/avatar.js 的 STAGE_METRICS
// 用法：node tools/measure_avatar.mjs（需要 ImageMagick）
// 注意：量領口／胯下／臀寬要靠白色連身衣，而 fill_avatar_bases.mjs 會把連身衣換成膚色，
// 所以重量時要用換膚色前的身體（git 歷史版本）；目前的量測值已寫進 STAGE_METRICS。
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../icons/avatar/", import.meta.url));
const W = 512, H = 512;

function measure(file) {
  const px = execFileSync("convert", [file, "-depth", "8", "rgba:-"], { maxBuffer: 1 << 24 });
  const op = (x, y) => px[(y * W + x) * 4 + 3] > 128;
  const white = (x, y) => {
    const i = (y * W + x) * 4;
    return px[i + 3] > 128 && px[i] > 225 && px[i + 1] > 225 && px[i + 2] > 225;
  };
  const span = (y, f = op) => {
    let l = -1, r = -1;
    for (let x = 0; x < W; x++) if (f(x, y)) { if (l < 0) l = x; r = x; }
    return l < 0 ? null : [l, r];
  };
  // 從中線往兩側找連續的白色（容許 3px 內的縫線），不會把手臂上的亮部算進來
  const run = (y) => {
    if (!white(256, y)) return null;
    let l = 256, r = 256, gap = 0;
    for (let x = 255; x >= 0 && gap <= 3; x--) { if (white(x, y)) { l = x; gap = 0; } else gap++; }
    gap = 0;
    for (let x = 257; x < W && gap <= 3; x++) { if (white(x, y)) { r = x; gap = 0; } else gap++; }
    return [l, r];
  };
  const fill = (y, f = op) => { let n = 0; for (let x = 0; x < W; x++) if (f(x, y)) n++; return n; };
  // 連身衣（白色）的上下緣＝領口與胯下；白色像素太少的列不算
  const wrows = [];
  for (let y = 0; y < H; y++) if (fill(y, white) > 12) wrows.push(y);
  const collar = wrows[0], crotch = wrows[wrows.length - 1];
  let headTop = 0; while (!span(headTop)) headTop++;
  let feet = H - 1; while (!span(feet)) feet--;
  // 脖子＝頭頂到領口之間最窄的一列
  let neck = collar, nw = 1e9;
  for (let y = headTop + 30; y < collar; y++) { const s = span(y); if (s && s[1] - s[0] < nw) { nw = s[1] - s[0]; neck = y; } }
  let hl = W, hr = 0;
  for (let y = headTop; y < neck; y++) { const s = span(y); if (s) { hl = Math.min(hl, s[0]); hr = Math.max(hr, s[1]); } }
  // 軀幹寬（含手臂）：領口到胯下之間最外側的範圍（上衣要蓋住的寬度）
  const sh = [W, 0];
  for (let y = collar; y < crotch - 15; y++) { const s = span(y); if (s) { sh[0] = Math.min(sh[0], s[0]); sh[1] = Math.max(sh[1], s[1]); } }
  // 腰臀寬：連身衣下半最寬處
  let hipW = 0, hipC = 256;
  for (let y = Math.round((collar + crotch) / 2); y <= crotch; y++) { const s = run(y); if (s && s[1] - s[0] > hipW) { hipW = s[1] - s[0]; hipC = (s[0] + s[1]) / 2; } }
  // 腳踝：腳底往上 70px 內，兩腿實心像素最少的那列
  let ankle = feet, aw = 1e9;
  for (let y = feet - 70; y < feet - 6; y++) { const n = fill(y); if (n < aw) { aw = n; ankle = y; } }
  const ft = span(feet - 8);
  const r = (v) => Math.round(v);
  return {
    headTop, neck, headL: hl, headR: hr,
    collar, crotch, armL: sh[0], armR: sh[1], hipL: r(hipC - hipW / 2), hipR: r(hipC + hipW / 2),
    ankle, feet, feetL: ft[0], feetR: ft[1],
  };
}

for (const g of [4, 5, 6, 7, 8, 9]) {
  const m = measure(`${DIR}base_g${g}.png`);
  console.log(`  g${g}: { ${Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(", ")} },`);
}
