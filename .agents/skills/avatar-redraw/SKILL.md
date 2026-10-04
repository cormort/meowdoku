---
name: avatar-redraw
description: 完整的 2D Q 版紙娃娃（Chibi Avatar）髮型、帽子、配件、鞋飾的原位（In-situ）重繪、顏色摳圖、五官防穿透遮罩、前後分層分離與自動對位工作流。結合 Gemini 網頁版（Nano Banana）與 ego-browser 自動化，支援 mix-blend-mode 上色與多階段年級娃娃相容。當使用者要重繪髮型、添加紙娃娃配件、服裝或排除穿透破洞時調用。
---

# Avatar Redraw & Layer Separation Pipeline (紙娃娃原位重繪與圖層分離工作流)

本指南記錄了為 2D 日系 Q 版紙娃娃（Chibi Doll / Avatar）自動化生成**完美對位、無生硬切痕、無頭骨穿透孔洞、支援任意色彩著色（`mix-blend-mode: multiply`）**之髮型、配件、帽子與鞋飾的端到端工程管線。

---

## 1. 核心哲學：原位重繪（In-situ Redraw Paradigm）

### ❌ 過去的錯誤做法（物件圖板法）
讓 AI 在空白畫布上畫單獨的「假髮」、「帽子」或「鞋子」，再以程式推測縮放與貼上位置：
- **致命缺點**：AI 容易畫成 3/4 俯視角（如鞋子歪斜、腳趾露在外面）；假髮與娃娃頭型完全脫節，戴上後像安全帽浮在頭上；邊緣生硬。

### ✅ 原位重繪法則（In-situ Redraw）
**直接把基準娃娃（`base_g4.png`）作為畫布讓 AI 在上面重繪**。
- 娃娃本來就在正中央、站姿正面，AI 在上面添加髮型或鞋子時，天生就契合娃娃的骨架與五官比例。
- 生成後，利用**色彩學（Color Contract）**自動將新畫的部分摳出，位置天生對齊基準座標（scale 1.00，平移 0px）。

---

## 2. 參考圖色彩契約（Color Contract）

為了讓演算法能 100% 自動精準摳出新畫項目，設計了以下防混淆色彩規範：

| 元素 | RGB 數值 | 角色作用 | 扣除邏輯 |
|---|---|---|---|
| **純綠背景** | `(0, 177, 64)` | 高彩度綠底 | 演算法判定 `green` 立即剔除 |
| **淡藍上衣** | `(156, 195, 230)` | 保護軀幹 | 具彩度（`sat > 30`），不會被當成新圖層 |
| **深藍短褲** | `(74, 111, 165)` | 保護下身 | 具彩度，防止 AI 自行補畫腿部 |
| **棕色妹妹頭** | `(138, 90, 52)` | 帽子／外戴配件專用 | 讓帽子、耳機、眼鏡戴在頭髮外側，棕髮具彩度不被摳除 |
| **新畫項目** | **純白／淺銀灰** | AI 生成目標 | 彩度極低（`sat < 30`）且無綠色殘留，演算法判定為新圖層 |

> **前端著色機制**：所有配件與髮型輸出為單色灰階帶透明度 PNG。遊戲前端透過 CSS `mix-blend-mode: multiply` 或 Canvas 著色，底層陰影與高光完美保留，可即時染成黑、棕、金、粉、藍、薄荷等任意顏色。

---

## 3. 避免瑕疵的三大關鍵修正（Lessons Learned）

### 關鍵 1：頭骨輪廓線鏤空穿鑿（Perforation Bug）
- **現象**：頭髮內部沿著原本光頭的邊緣出現一圈透明小孔或虛線切痕，著色後底下的光頭皮膚從孔洞露出來。
- **成因**：參考圖中光頭娃娃的邊緣線是深褐色（`sat < 30` 屬中性色）。若全圖比對 `same = np.abs(gen - ref) < 40`，頭髮覆蓋在頭骨輪廓處會因顏色接近而被判定為「未更動的背景」直接挖空！
- **解法**：**嚴格限制 `same & ref_neutral` 僅扣除五官特徵區（眉毛、眼睛、嘴巴）**，頭殼、太陽穴與頭頂範圍絕不扣除，頭髮保持 100% 紮實：
  ```python
  # 僅在五官區扣除原圖未更動的像素（眼睛、眉毛、嘴巴）
  y_idx, x_idx = np.indices(neutral.shape)
  is_face_feature = (y_idx >= 280) & (y_idx <= 520) & (x_idx >= 370) & (x_idx <= 650)
  hair = neutral & ~(same & ref_neutral & is_face_feature)
  ```

### 關鍵 2：生硬垂直切刀痕與方塊切角（Boxy Cheek Cutouts）
- **現象**：兩側鬢角在臉頰兩側呈現筆直的垂直尺規切痕或突兀的方塊邊緣。
- **成因**：舊版修圖腳本採用矩形邊緣裁切（`TRIM`）強制削掉臉頰上的像素。
- **解法**：
  1. 廢棄所有強制矩形 `TRIM` 邏輯。
  2. 在 Prompt 中強制要求柔順內扣弧度：
     `"The side locks naturally frame the cheeks with soft curved contours (no harsh boxy cuts, no flat blunt horizontal edges, no straight vertical ruler cuts). Adorable curved sideburns that softly hug the round face."`

### 關鍵 3：雙馬尾天空天花板（Sky Ceiling Bug）
- **現象**：後髮（`hairback`）逐列橫向填滿時，在雙馬尾上方架出一整面水平平頂。
- **成因**：左馬尾頂端 `l` 與右馬尾頂端 `r` 在頭頂上方的空白天空連成一條水平線，被填成整片灰色實心。
- **解法**：**橫向填滿必須限制在人體輪廓範圍（`bodyL` ~ `bodyR`）之內**：
  ```javascript
  for (let y = 0; y <= fillTo; y++) {
    if (bodyL[y] < 0) continue;
    const hl = bodyL[y], hr = bodyR[y];
    let l = -1, r = -1;
    for (let x = hl; x <= hr; x++) if (back[y * W + x]) { if (l < 0) l = x; r = x; }
    if (l >= 0) for (let x = l; x <= r; x++) back[y * W + x] = 1;
  }
  ```

---

## 4. 前後圖層分離標準（Layer Splitting）

在 2D 換裝遊戲中，身體與物件必須有正確的深度遮擋關係：

### 髮型拆分
- **前髮（`hair_<id>.png`）**：瀏海、鬢角與臉頰邊緣微修容側髮。疊在 `base` 身體前面。
- **後髮（`hairback_<id>.png`）**：後腦勺輪廓、馬尾背髮。在身體高度逐列填滿，疊在 `base` 身體後面，使臉與脖子自然蓋住中間，只有髮絲縫隙與兩側露出。

### 背包拆分
- **背帶（`acc_backpack_front.png`）**：脖子線（`y >= 200`）以下壓在身體或上衣上的像素，疊在上衣前面。
- **包體（`acc_backpack.png`）**：身體背後露出的包體本體，疊在身體與後髮最底層。

---

## 5. ego-browser 網頁自動化最佳實踐

使用 `ego-browser nodejs` 驅動 Gemini 網頁版批次繪圖時之核心要點：

1. **避免 Viewport 超時**：
   Gemini 的「上傳與工具」按鈕需使用 `scrollIntoView()` 搭配 `page.evaluate()` 點擊，勿直接依賴座標點擊。
2. **安全獲取 Tab 與 TaskSpace 復原**：
   ```javascript
   let task;
   try { task = await claimTaskSpace("gemini redraw"); }
   catch { task = await taskSpace("gemini redraw"); }

   const pages = await task.pages();
   let page = pages.find((p) => p.label === "p1");
   if (!page) {
     const tabs = await task.tabs();
     const geminiTab = tabs.find((t) => (t.url || "").includes("gemini"));
     page = geminiTab ? await task.adopt(geminiTab.page, { as: "p1" }) : await task.newPage("p1");
   }
   ```
3. **僅從 `model-response` 抓圖**：
   嚴格限定選取 `document.querySelectorAll("model-response img")`，防止誤抓使用者輸入框的圖片縮圖。
4. **Canvas 匯出繞過 CSP**：
   Gemini 頁面有嚴格的 CSP，禁止 `fetch(blobUrl)`。改用 HTML5 Canvas 繪製後以 `toDataURL("image/png")` 提取 Base64。

---

## 6. 常用指令與驗證流程

```bash
# 1. 產生參考圖（/tmp/avatar_ref/hair.png）
python3 tools/avatar_redraw.py ref hair

# 2. 自動化驅動瀏覽器生成 raw 圖（/tmp/avatar_gen/hair/<id>.png）
~/.local/bin/ego-browser nodejs < tools/gen_avatar_redraw.js

# 3. 演算法對位、無孔洞摳圖、前後分層並輸出多色合成預覽
python3 tools/avatar_redraw.py process hair --preview

# 4. 正式輸出至 icons/avatar/
python3 tools/avatar_redraw.py process hair

# 5. 全面圖層與年級伸展回歸測試
node tests/avatar.test.mjs
```
