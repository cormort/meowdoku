// fill_avatar_bases.mjs — 把 base_g4…g9 身體線稿內部補上實心膚色
// （AI 去背時把皮膚一起去掉了，只剩線稿與連身衣；不補的話膚色濾鏡沒作用，背後圖層也會透出來）
// 作法：從畫布邊緣往內 flood fill 找出「外面」，其餘透明處就是身體內部，墊一層膚色在線稿下面。
// 另外把白色連身衣（AI 畫身體時的參考底稿）換成膚色：上衣、褲裙一定會穿，連身衣只會從衣服縫隙露出白塊，
// 換成膚色後縫隙看起來就只是脖子／肩膀。
// 用法：node tools/fill_avatar_bases.mjs（需要 ImageMagick；重跑無害）
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../icons/avatar/", import.meta.url));
const W = 512, H = 512;
const SKIN = [255, 225, 201]; // AVATAR_PARTS.skin「白皙」

function readRGBA(file) {
  return execFileSync("convert", [file, "-depth", "8", "rgba:-"], { maxBuffer: 1 << 24 });
}
function writeRGBA(file, buf) {
  execFileSync("convert", ["-size", `${W}x${H}`, "-depth", "8", "rgba:-", file], { input: buf });
}
function dilate(mask, r) {
  let cur = mask;
  for (let k = 0; k < r; k++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (cur[y * W + x]) continue;
        if ((x > 0 && cur[y * W + x - 1]) || (x < W - 1 && cur[y * W + x + 1]) || (y > 0 && cur[(y - 1) * W + x]) || (y < H - 1 && cur[(y + 1) * W + x])) next[y * W + x] = 1;
      }
    cur = next;
  }
  return cur;
}

for (const g of [4, 5, 6, 7, 8, 9]) {
  const file = `${DIR}base_g${g}.png`;
  const px = readRGBA(file);
  // 牆＝線稿；加粗 1px 避免線稿斷點讓 flood fill 漏進身體
  let wall = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) wall[i] = px[i * 4 + 3] >= 40 ? 1 : 0;
  wall = dilate(wall, 1);
  const outside = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || wall[i]) continue;
    outside[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  // 外面往內收 1px（抵銷上面加粗的牆），其餘都是身體
  const out2 = dilate(outside, 1);
  let filled = 0;
  for (let i = 0; i < W * H; i++) {
    if (out2[i]) continue;
    const a = px[i * 4 + 3] / 255;
    if (a >= 0.999) continue;
    // 原圖疊在膚色上面
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.round(px[i * 4 + c] * a + SKIN[c] * (1 - a));
    px[i * 4 + 3] = 255;
    filled++;
  }
  // 連身衣＝最大的一塊白色；補起內部的洞（皺褶線），往外擴 2px 蓋掉它的邊線，但不碰身體外輪廓
  const white = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) white[i] = px[i * 4 + 3] > 200 && px[i * 4] > 225 && px[i * 4 + 1] > 225 && px[i * 4 + 2] > 225 ? 1 : 0;
  const label = new Int32Array(W * H);
  let best = 0, bestN = 0, n = 0;
  for (let s0 = 0; s0 < W * H; s0++) {
    if (!white[s0] || label[s0]) continue;
    n++;
    let cnt = 0;
    const st = [s0];
    label[s0] = n;
    while (st.length) {
      const i = st.pop();
      cnt++;
      const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
        if (j >= 0 && white[j] && !label[j]) { label[j] = n; st.push(j); }
    }
    if (cnt > bestN) { bestN = cnt; best = n; }
  }
  let suit = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) suit[i] = label[i] === best && best ? 1 : 0;
  // 補洞：從畫布邊緣 flood 不屬於連身衣的區域，剩下的就是連身衣（含內部線條）
  const notSuit = new Uint8Array(W * H);
  const st2 = [];
  for (let x = 0; x < W; x++) st2.push(x, (H - 1) * W + x);
  while (st2.length) {
    const i = st2.pop();
    if (notSuit[i] || suit[i]) continue;
    notSuit[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) st2.push(i - 1);
    if (x < W - 1) st2.push(i + 1);
    if (y > 0) st2.push(i - W);
    if (y < H - 1) st2.push(i + W);
  }
  for (let i = 0; i < W * H; i++) if (!notSuit[i]) suit[i] = 1;
  suit = dilate(suit, 2);
  const nearOut = dilate(outside, 3);
  let skinned = 0;
  for (let i = 0; i < W * H; i++) {
    if (!suit[i] || nearOut[i]) continue;
    px[i * 4] = SKIN[0]; px[i * 4 + 1] = SKIN[1]; px[i * 4 + 2] = SKIN[2]; px[i * 4 + 3] = 255;
    skinned++;
  }
  writeRGBA(file, px);
  console.log(`base_g${g}: 補了 ${filled} px，連身衣換膚色 ${skinned} px`);
}
