// gen_avatar_bases.js — 產生「隨年級長大」的六個身體（四年級～九年級）
// 用網頁版 Gemini（gemini.google.com）；輸出 /tmp/avatar_gen/base_g{4..9}.png
// 用法：~/.local/bin/ego-browser nodejs < tools/gen_avatar_bases.js
const fs = await import("node:fs");
const LOG = "/tmp/avatar_gen/log_bases.txt";
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`);

const STYLE =
  " Cute Japanese mobile-game character art, clean thin lineart, soft cel shading, front view, standing straight, facing the viewer, arms relaxed at the sides, legs slightly apart, whole body visible from head to feet, centred. Plain white background: no shadow under the feet, no floor, no gradient, no text, no watermark, nothing else in the image. Only one single character.";

const BASES = [
  { key: "base_g4", age: "a 10-year-old primary-school child, cute and small, about 4 heads tall, big round head, short arms and legs, round cheeks" },
  { key: "base_g5", age: "an 11-year-old primary-school child, cute, about 4.3 heads tall, slightly longer legs than a 10-year-old, round cheeks" },
  { key: "base_g6", age: "a 12-year-old primary-school child, cute, about 4.6 heads tall, slimmer arms and legs, round cheeks" },
  { key: "base_g7", age: "a 13-year-old junior-high student, about 5 heads tall, slimmer body, longer legs, less round face" },
  { key: "base_g8", age: "a 14-year-old junior-high student, about 5.3 heads tall, tall and slim, longer legs" },
  { key: "base_g9", age: "a 15-year-old junior-high student, about 5.6 heads tall, the tallest and slimmest of the set, long legs" },
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

for (const it of BASES) {
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
    const prompt =
      `Draw a single full-body dress-up doll base character: ${it.age}. The character wears a plain white full-body bodysuit (a plain white leotard with no pattern, covering the torso and upper legs) so clothes can be drawn on top later — no other clothing, no shoes, no hat, no accessories. Bald head (no hair) with a simple cute anime face: big dark eyes with a small white highlight, a tiny smile, soft pink blush. Skin is a soft peach colour. Keep this exact character design.` +
      STYLE;
    await page.evaluate((t) => {
      const el = document.querySelector('div[contenteditable="true"]');
      el.focus();
      document.execCommand("insertText", false, t);
    }, prompt);
    await wait(1200);
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
        got = imgs[0];
        log(`${it.key} 出圖 ${got.w}x${got.h}（${(i + 1) * 4}s）`);
        break;
      }
      if (i % 5 === 4) log(`${it.key} 等待 ${(i + 1) * 4}s`);
    }
    if (!got) {
      log(`${it.key} ❌ 沒出圖`);
      continue;
    }
    await wait(10000);
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
    log(`${it.key} ❌ 例外 ${String(e).slice(0, 90)}`);
  }
}
log("全部結束");
