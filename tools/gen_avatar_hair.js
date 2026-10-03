// gen_avatar_hair.js — 用網頁版 Gemini（Nano Banana）重畫髮型：直接畫在四年級身體的光頭上
// 先跑 python3 tools/avatar_hair.py ref 產生參考圖 /tmp/avatar_ref/hair_head.png
// （base_g4 的頭＋淡藍上衣、純綠底）；每種髮型送一次，輸出 /tmp/avatar_gen/hair/<id>.png，
// 再跑 python3 tools/avatar_hair.py process 摳圖、對齊、產生後髮。
// 用法：~/.local/bin/ego-browser nodejs < tools/gen_avatar_hair.js
// 已經有輸出的髮型會跳過；不滿意哪一張就刪掉那張再跑一次。
const fs = await import("node:fs");
fs.mkdirSync("/tmp/avatar_gen/hair", { recursive: true });
const LOG = "/tmp/avatar_gen/log_hair.txt";
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`);
const REF = "/tmp/avatar_ref/hair_head.png";

// 髮型清單：key 要跟 js/avatar.js 的 AVATAR_PARTS.hair 一致（新增髮型時兩邊都要加）
const STYLES = [
  { key: "short", look: "short tidy boyish hair with soft layered bangs that stop above the eyebrows; the ears stay visible" },
  { key: "bob", look: "a chin-length bob with straight blunt bangs at eyebrow level; the sides fall straight down past the cheeks and curve inward just under the chin" },
  { key: "twin", look: "twin tails tied high on both sides of the head with small round hair ties, light side bangs; each tail hangs down beside the head to shoulder level" },
  { key: "pony", look: "a high ponytail tied at the back of the head with a small hair tie, side-swept bangs; the tail is clearly visible sweeping out from behind the head to one side" },
  { key: "curly", look: "fluffy, voluminous curly hair reaching the jaw, with soft curly bangs; big round curls on both sides of the face" },
  { key: "bowl", look: "a round mushroom bowl cut with perfectly straight bangs at eyebrow level; the round sides cover the tops of the ears" },
];
const ITEMS = STYLES.map((s) => ({
  key: s.key,
  prompt: `Edit the attached image: give this bald chibi child a new hairstyle — ${s.look}.`,
}));

// 每張都加上的規則：只加頭髮、其他一律不動，頭髮白／灰（遊戲裡再上色），綠底保持純綠
const RULES =
  " Keep EVERYTHING else exactly the same as the attached image: the same face, eyes, expression, ears, neck, light-blue T-shirt, pose, size, position and framing, and the same perfectly flat pure green background. Only add the hair." +
  " The hair is drawn PURE WHITE / very light silver-gray with soft gray cel shading and a clean thin dark-gray outline — no other colours in the hair at all (the game recolours it later)." +
  " The hair must fully cover the top and back of the scalp (no bald skin showing through the hair), sit naturally on this exact head, and must NOT cover the eyes; no loose strands lying across the eyes or cheeks." +
  " Cute Japanese mobile-game art, the same lineart style as the character. No hat, no hair accessories other than the hair ties mentioned, no text, no watermark, no extra objects, no shadow on the background.";

const task = await taskSpace("gemini hair");
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
  const out = `/tmp/avatar_gen/hair/${it.key}.png`;
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
        await page.setInputFiles("input[type=file]", [REF]);
        await wait(4000);
        attached = await page.evaluate(() => !!document.querySelector('img[src^="blob:"], img[src^="data:image"]'));
      }
    } catch (e) {
      log(`${it.key} 附件失敗 ${String(e).slice(0, 60)}`);
    }
    log(`${it.key} 附件=${attached}`);
    if (!attached) {
      log(`${it.key} ❌ 沒附上參考圖，跳過（沒有參考圖就對不準）`);
      continue;
    }
    // 參考圖本身也是 1024px 的 blob 圖，先記下送出前已在頁面上的圖，之後只認新出現的
    const before = await page.evaluate(() => [...document.images].map((i) => i.src));
    await typePrompt(it.prompt + RULES);
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
      const imgs = await page.evaluate(
        (seen) =>
          [...document.querySelectorAll("img")]
            .filter((i) => (i.src.startsWith("blob:") || i.src.startsWith("data:image")) && i.naturalWidth >= 512 && !seen.includes(i.src))
            .map((i) => ({ src: i.src, w: i.naturalWidth, h: i.naturalHeight })),
        before,
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
    const b64 = await page.evaluate(async (seen) => {
      const img = [...document.querySelectorAll("img")].filter((i) => (i.src.startsWith("blob:") || i.src.startsWith("data:image")) && i.naturalWidth >= 512 && !seen.includes(i.src)).pop();
      if (!img) return null;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    }, before);
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
