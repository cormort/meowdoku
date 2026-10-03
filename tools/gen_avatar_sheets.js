// gen_avatar_sheets.js — 用 Nano Banana Pro 重繪主角圖層（AI Studio Playground）
// 用法：~/.local/bin/ego-browser nodejs < tools/gen_avatar_sheets.js
// 每張圖板一格一物，全部畫成白色／灰階（遊戲裡再上色），白底、無文字。
const fs = await import("node:fs");
const LOG = "/tmp/avatar_gen/log.txt";
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`);

const SUFFIX =
  " All items are drawn pure white / very light silver-gray with soft gray shading and a clean thin dark outline — use NO other colours at all (the game recolours them later). Cute Japanese mobile-game item art, soft cel shading, high resolution, each item centred in its own cell at the same size as the reference. The background is PURE SOLID FLAT WHITE #FFFFFF everywhere else: no shadow, no contact shadow, no ground, no gradient, no vignette, no text, no labels, no numbers, no watermark, no extra objects, no characters.";

const ITEMS = [
  {
    key: "hair",
    ref: "/tmp/avatar_ref/ref_hair.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid in which the SAME SIX hairstyles stay in the SAME cells and the same order as the reference (top-left, top-centre, top-right, middle-left, middle-centre, middle-right; bottom row empty). Hairstyles: (1) short tidy hair, (2) shoulder-length bob with side locks, (3) twin tails, (4) high ponytail, (5) curly voluminous hair, (6) round bowl cut with a flat fringe. CRITICAL: hair only — no head, no face, no ears, no body, no skin, no person, just the hair shape.",
  },
  {
    key: "tops",
    ref: "/tmp/avatar_ref/ref_tops.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME SIX tops in the SAME cells and order as the reference (bottom row empty). Tops: (1) plain short-sleeve t-shirt, (2) hooded sweatshirt with a hood behind the neck and a front pocket, (3) button-up shirt with a collar and buttons, (4) sailor school uniform top with a square sailor collar, (5) chunky knit sweater with long sleeves, (6) simple sleeveless vest. CRITICAL: empty garment only — no body, no person, no skin, no hands, no head, no mannequin; just the clothes shape.",
  },
  {
    key: "bottoms",
    ref: "/tmp/avatar_ref/ref_bottoms.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE bottoms in the SAME cells and order as the reference (middle-right and bottom row empty). Bottoms: (1) straight-leg jeans, (2) short shorts, (3)pleated mini skirt, (4) long pleated skirt, (5) track pants. CRITICAL: empty garment only — no body, no person, no legs, no skin; just the clothes shape.",
  },
  {
    key: "shoes",
    ref: "/tmp/avatar_ref/ref_shoes.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE pairs of shoes in the SAME cells and order as the reference (middle-right and bottom row empty). Shoes: (1) low-top sneakers, (2) ankle boots, (3) loafers, (4) strappy sandals, (5) rain boots. Draw each pair side by side as one item, like the reference. CRITICAL: empty shoes only — no feet, no legs, no body, no person.",
  },
  {
    key: "hats",
    ref: "/tmp/avatar_ref/ref_hats.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE hats in the SAME cells and order as the reference (middle-right and bottom row empty). Hats: (1) baseball cap, (2) knitted beanie, (3) wide-brim straw hat, (4) beret, (5) big hair bow. CRITICAL: hats only — no head, no face, no hair, no body, no person.",
  },
  {
    key: "accessories",
    ref: "/tmp/avatar_ref/ref_accessories.png",
    prompt:
      "Redraw the attached reference sheet as a clean anime game asset: a 3x3 grid with the SAME FIVE accessories in the SAME cells and order as the reference (middle-right and bottom row empty). Accessories: (1) round eyeglasses, (2) winter scarf, (3) backpack, (4) over-ear headphones, (5) small name badge. CRITICAL: accessories only — no body, no person, no head, no torso.",
  },
];

const task = await taskSpace("nano banana avatar");
const page = task.page("p1");
const wait = (ms) => page.waitForTimeout(ms);

async function ensurePage() {
  const ok = await page.evaluate(() => !!document.querySelector("textarea") && !/^about/.test(location.href));
  if (ok) return;
  await page.goto("https://aistudio.google.com/prompts/new_chat");
  await page.waitForLoadState();
  await wait(7000);
}

async function newChat() {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /New chat/i.test(x.getAttribute("aria-label") || ""));
    b?.click();
  });
  await wait(2600);
}

async function idle() {
  for (let i = 0; i < 90; i++) {
    const st = await page.evaluate(() => ({
      running: [...document.querySelectorAll("button")].some((b) => /^Stop/.test(b.textContent.trim())) || /Running\.\.\./.test(document.body.textContent),
      run: [...document.querySelectorAll("button")].some((b) => /^Run/.test(b.textContent.trim())),
    }));
    if (!st.running && st.run) return true;
    await wait(2000);
  }
  return false;
}

async function main() {
  await ensurePage();
  log("start，模型 " + (await page.evaluate(() => document.querySelector("button.model-selector-card")?.textContent.replace(/\s+/g, " ").slice(0, 40) || "?")));
  for (const it of ITEMS) {
    const out = `/tmp/avatar_gen/${it.key}.png`;
    if (fs.existsSync(out) && fs.statSync(out).size > 20000) {
      log(`跳過 ${it.key}（已完成）`);
      continue;
    }
    await idle();
    await newChat();
    // 清空輸入與附件
    await page.evaluate(() => {
      const rm = [...document.querySelectorAll("button")].find((b) => /Remove media/i.test(b.getAttribute("aria-label") || ""));
      rm?.click();
      const ta = document.querySelector("textarea");
      if (ta) {
        ta.value = "";
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await wait(1200);
    // 關掉 grounding
    await page.evaluate(() => {
      const rm = [...document.querySelectorAll("button")].find((b) => /Remove Grounding/i.test(b.getAttribute("aria-label") || ""));
      rm?.click();
    });
    await wait(600);
    await page.setInputFiles("input[type=file]", [it.ref]);
    await wait(2800);
    await page.fill("loc=css:textarea", it.prompt + SUFFIX);
    await wait(1500);
    const before = await page.evaluate(() => [...document.querySelectorAll("img")].filter((i) => i.src.startsWith("blob:")).length);
    await page.evaluate(() => {
      [...document.querySelectorAll("button")].find((b) => /^Run/.test(b.textContent.trim()))?.click();
    });
    log(`${it.key} 已送出`);
    let done = false;
    for (let i = 0; i < 60; i++) {
      await wait(3000);
      const st = await page.evaluate(
        (b) => ({
          running: [...document.querySelectorAll("button")].some((x) => /^Stop/.test(x.textContent.trim())) || /Running\.\.\./.test(document.body.textContent),
          n: [...document.querySelectorAll("img")].filter((x) => x.src.startsWith("blob:") && x.naturalWidth > 512).length,
        }),
        before,
      );
      if (!st.running && st.n > 0) {
        done = true;
        log(`${it.key} 生成完成（約 ${(i + 1) * 3}s）`);
        break;
      }
    }
    if (!done) {
      log(`${it.key} ❌ 逾時`);
      continue;
    }
    await wait(6000);
    const srcs = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => i.src.startsWith("blob:") && i.naturalWidth > 512)
        .map((i) => ({ src: i.src, w: i.naturalWidth }))
        .sort((a, b) => b.w - a.w),
    );
    const pick = srcs[0];
    if (!pick) {
      log(`${it.key} ❌ 找不到圖`);
      continue;
    }
    await page.fetch(pick.src, { saveAs: out, timeout: 120000 });
    log(`${it.key} 存檔 ${fs.statSync(out).size} bytes ${pick.w}px`);
  }
  log("全部結束");
}

await main();
