// gen_avatar_gemini.js — 用網頁版 Gemini（gemini.google.com）續產圖層
// AI Studio 免費額度用完時的替代路線；輸出 /tmp/avatar_gen/<key>.png
// 用法：~/.local/bin/ego-browser nodejs < tools/gen_avatar_gemini.js
const fs = await import("node:fs");
const LOG = "/tmp/avatar_gen/log_gemini.txt";
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`);

const STYLE =
  " Style: cute Japanese mobile-game item art, clean lineart, soft cel shading, every item centred in its own cell at the same scale as the reference. All items are PURE WHITE / very light silver-gray with soft gray shading and a thin dark-gray outline — no other colours. The rest of the image is PURE SOLID FLAT WHITE: no shadow, no ground, no gradient, no text, no labels, no numbers, no watermark, no characters.";

const ITEMS = [
  {
    key: "bottoms",
    ref: "/tmp/avatar_ref/ref_bottoms.png",
    prompt:
      "Draw a 3x3 grid of FIVE lower-body clothing items for a cute dress-up paper doll, in the same cells and the same order as the attached reference sheet (middle-right cell and the whole bottom row stay empty). Items: (1) straight-leg jeans, (2) short shorts, (3) a pleated mini skirt, (4) a long pleated skirt, (5) track pants. Each item is an EMPTY garment — no body, no person, no legs, no feet, no skin, just the clothing shape.",
  },
  {
    key: "hats",
    ref: "/tmp/avatar_ref/ref_hats.png",
    prompt:
      "Draw a 3x3 grid of FIVE hats for a cute dress-up paper doll, in the same cells and the same order as the attached reference sheet (middle-right cell and the whole bottom row stay empty). Items: (1) baseball cap, (2) knitted beanie, (3) wide-brim straw hat, (4) beret, (5) big hair bow. Each item is an EMPTY hat — no head, no face, no hair, no body, no person.",
  },
  {
    key: "accessories",
    ref: "/tmp/avatar_ref/ref_accessories.png",
    prompt:
      "Draw a 3x3 grid of FIVE accessories for a cute dress-up paper doll, in the same cells and the same order as the attached reference sheet (middle-right cell and the whole bottom row stay empty). Items: (1) round eyeglasses, (2) winter scarf, (3) backpack, (4) over-ear headphones, (5) small name badge. Each item is an EMPTY accessory — no body, no person, no head, no torso, no hands.",
  },
];

const task = await taskSpace("gemini images");
const page = task.page("p1");
const wait = (ms) => page.waitForTimeout(ms);

async function newChat() {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "新對話" || /New chat/i.test(x.getAttribute("aria-label") || ""));
    b?.click();
  });
  await wait(3500);
}

async function typePrompt(text) {
  await page.evaluate((t) => {
    const el = document.querySelector('div[contenteditable="true"]');
    el.focus();
    document.execCommand("insertText", false, t);
  }, text);
  await wait(1200);
}

for (const it of ITEMS) {
  const out = `/tmp/avatar_gen/${it.key}.png`;
  if (fs.existsSync(out) && fs.statSync(out).size > 40000) {
    log(`跳過 ${it.key}`);
    continue;
  }
  try {
    await page.goto("https://gemini.google.com/app");
    await page.waitForLoadState();
    await wait(7000);
    await newChat();
    // 附上參考圖
    let attached = false;
    try {
      const inputs = await page.evaluate(() => document.querySelectorAll('input[type=file]').length);
      if (inputs > 0) {
        await page.setInputFiles("input[type=file]", [it.ref]);
        await wait(4000);
        attached = await page.evaluate(() => !!document.querySelector('img[src^="blob:"], img[src^="data:image"]'));
      }
    } catch (e) {
      log(`${it.key} 附件失敗 ${String(e).slice(0, 60)}`);
    }
    log(`${it.key} 附件=${attached}`);
    await typePrompt(it.prompt + (attached ? " Follow the attached reference sheet for the layout and scale." : "") + STYLE);
    await page.evaluate(() => {
      const el = document.querySelector('div[contenteditable="true"]');
      el.focus();
    });
    await page.keyboard?.press?.("Enter");
    await page.evaluate(() => {
      const el = document.querySelector('div[contenteditable="true"]');
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    });
    log(`${it.key} 已送出`);
    let got = null;
    for (let i = 0; i < 60; i++) {
      await wait(4000);
      const imgs = await page.evaluate(() =>
        [...document.querySelectorAll("img")]
          .filter((i) => (i.src.startsWith("blob:") || i.src.startsWith("data:image")) && i.naturalWidth >= 512)
          .map((i) => ({ src: i.src, w: i.naturalWidth, h: i.naturalHeight })),
      );
      if (imgs.length) {
        log(`${it.key} 出圖 ${imgs[0].w}x${imgs[0].h}（${(i + 1) * 4}s）`);
        got = imgs[0];
        break;
      }
      if (i % 4 === 3) log(`${it.key} 等待 ${(i + 1) * 4}s`);
    }
    if (!got) {
      log(`${it.key} ❌ 沒出圖`);
      continue;
    }
    await wait(12000);
    const b64 = await page.evaluate(async () => {
      const img = [...document.querySelectorAll("img")].filter((i) => (i.src.startsWith("blob:") || i.src.startsWith("data:image")) && i.naturalWidth >= 512).pop();
      if (!img) return null;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    });
    if (!b64) {
      log(`${it.key} ❌ 取圖失敗`);
      continue;
    }
    fs.writeFileSync(out, Buffer.from(b64, "base64"));
    log(`${it.key} 存檔 ${fs.statSync(out).size} bytes`);
  } catch (e) {
    log(`${it.key} ❌ 例外 ${String(e).slice(0, 100)}`);
  }
}
log("全部結束");
