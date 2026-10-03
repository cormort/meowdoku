// gen_avatar_lite.js — 用 Nano Banana 2 Lite（AI Studio）重繪主角圖層
// 用法：~/.local/bin/ego-browser nodejs < tools/gen_avatar_lite.js
// 每個項目都重新載入 new_chat 再送出（比較穩），輸出 /tmp/avatar_gen/<key>.png
const fs = await import("node:fs");
const LOG = "/tmp/avatar_gen/log_lite.txt";
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`);

const STYLE =
  " All items are drawn PURE WHITE / very light silver-gray with soft gray shading and a clean thin dark gray outline — no other colours at all (the game recolours them later). Cute Japanese mobile-game item art, soft cel shading, clean lineart, high resolution, every item centred in its own cell at the same scale as the reference. The rest of the image is PURE SOLID FLAT WHITE: no shadow, no contact shadow, no ground, no gradient, no vignette, no text, no labels, no numbers, no watermark, no characters, nothing else.";

const ITEMS = [
  {
    key: "base_lite",
    ref: "/tmp/avatar_gen/base.png",
    prompt:
      "Redraw the attached chibi character in the SAME cute anime style, keeping the exact same proportions, silhouette, pose, centring and framing: a dress-up doll base character. A single full-body chibi child, front view, standing straight, arms relaxed at the sides, big head, bald (no hair, no hat), bare smooth mannequin skin body with NO clothes and NO accessories, big round dark eyes with a small white highlight, tiny smile, soft pink blush cheeks. Plain clean lineart with soft shading. The background is PURE SOLID FLAT WHITE: no shadow under the feet, no floor, no gradient, no text, no extra objects. Only one single character in the image.",
  },
  {
    key: "hair",
    ref: "/tmp/avatar_ref/ref_hair.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid in which the SAME SIX hairstyles stay in the SAME cells and the same order as the reference (top-left, top-centre, top-right, middle-left, middle-centre, middle-right; bottom row empty). Hairstyles: (1) short tidy hair, (2) shoulder-length bob with side locks, (3) twin tails, (4) high ponytail, (5) curly voluminous hair, (6) round bowl cut with a flat fringe. CRITICAL: hair only — no head, no face, no ears, no body, no skin, no person, nothing inside the hair, just the hair shape.",
  },
  {
    key: "tops",
    ref: "/tmp/avatar_ref/ref_tops.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME SIX tops in the SAME cells and order as the reference (bottom row empty). Tops: (1) plain short-sleeve t-shirt, (2) hooded sweatshirt with a hood behind the neck and a front pocket, (3) button-up shirt with a collar and buttons, (4) sailor school uniform top with a square sailor collar, (5) chunky knit sweater with long sleeves, (6) simple sleeveless vest. CRITICAL: empty garment only — no body, no person, no skin, no hands, no head, no mannequin, no person wearing it; just the clothing shape with a hollow inside.",
  },
  {
    key: "bottoms",
    ref: "/tmp/avatar_ref/ref_bottoms.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE bottoms in the SAME cells and order as the reference (middle-right and the whole bottom row empty). Bottoms: (1) straight-leg jeans, (2) short shorts, (3) pleated mini skirt, (4) long pleated skirt, (5) track pants. CRITICAL: empty garment only — no body, no person, no legs, no feet, no skin; just the clothing shape.",
  },
  {
    key: "shoes",
    ref: "/tmp/avatar_ref/ref_shoes.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE pairs of shoes in the SAME cells and order as the reference (middle-right and the whole bottom row empty). Shoes: (1) low-top sneakers, (2) ankle boots, (3) loafers, (4) strappy sandals, (5) rain boots. Draw each pair side by side as one item, like the reference. CRITICAL: empty shoes only — no feet, no legs, no body, no person.",
  },
  {
    key: "hats",
    ref: "/tmp/avatar_ref/ref_hats.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE hats in the SAME cells and order as the reference (middle-right and the whole bottom row empty). Hats: (1) baseball cap, (2) knitted beanie, (3) wide-brim straw hat, (4) beret, (5) big hair bow. CRITICAL: hats only — no head, no face, no hair, no body, no person.",
  },
  {
    key: "accessories",
    ref: "/tmp/avatar_ref/ref_accessories.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE accessories in the SAME cells and order as the reference (middle-right and the whole bottom row empty). Accessories: (1) round eyeglasses, (2) winter scarf, (3) backpack, (4) over-ear headphones, (5) small name badge. CRITICAL: accessories only — no body, no person, no head, no torso, no hands.",
  },
];

const task = await taskSpace("as debug");
const page = task.page("p1");
const wait = (ms) => page.waitForTimeout(ms);

async function pickLite() {
  const cur = await page.evaluate(() => document.querySelector("button.model-selector-card")?.textContent || "");
  if (/flash-lite-image|Nano Banana 2 Lite/.test(cur)) return cur.slice(0, 30);
  await page.evaluate(() => { document.querySelector("button.model-selector-card")?.click(); });
  await wait(2500);
  await page.evaluate(() => {
    const c = document.querySelector("ms-model-carousel");
    [...(c?.querySelectorAll("button, li, [role=option]") || [])].find((n) => /gemini-3\.1-flash-lite-image|Nano Banana 2 Lite/i.test(n.textContent))?.click();
  });
  await wait(2500);
  return (await page.evaluate(() => document.querySelector("button.model-selector-card")?.textContent || "")).slice(0, 30);
}

for (const it of ITEMS) {
  const out = `/tmp/avatar_gen/${it.key}.png`;
  if (fs.existsSync(out) && fs.statSync(out).size > 40000) {
    log(`跳過 ${it.key}`);
    continue;
  }
  try {
    await page.goto("https://aistudio.google.com/prompts/new_chat");
    await page.waitForLoadState();
    await wait(6500);
    log(`${it.key} 模型 ${await pickLite()}`);
    await page.setInputFiles("input[type=file]", [it.ref]);
    await wait(2800);
    await page.fill("loc=css:textarea", it.prompt + STYLE);
    await wait(1500);
    await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /^Run/.test(b.textContent.trim()))?.click(); });
    let done = false;
    for (let i = 0; i < 45; i++) {
      await wait(3000);
      const s = await page.evaluate(() => ({
        running: [...document.querySelectorAll("button")].some((b) => /^Stop/.test(b.textContent.trim())) || /Running\.\.\./.test(document.body.textContent),
        blobs: [...document.querySelectorAll("img")].filter((i) => i.src.startsWith("blob:") && i.naturalWidth > 400).length,
      }));
      if (!s.running && s.blobs > 0) {
        done = true;
        log(`${it.key} 完成 約${(i + 1) * 3}s`);
        break;
      }
    }
    if (!done) {
      log(`${it.key} ❌ 逾時`);
      continue;
    }
    await wait(5000);
    const srcs = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => i.src.startsWith("blob:") && i.naturalWidth > 400)
        .map((i) => ({ src: i.src, w: i.naturalWidth }))
        .sort((a, b) => b.w - a.w),
    );
    if (!srcs[0]) {
      log(`${it.key} ❌ 找不到圖`);
      continue;
    }
    await page.fetch(srcs[0].src, { saveAs: out, timeout: 120000 });
    log(`${it.key} 存檔 ${fs.statSync(out).size} bytes ${srcs[0].w}px`);
  } catch (e) {
    log(`${it.key} ❌ 例外 ${String(e).slice(0, 90)}`);
  }
}
log("全部結束");
