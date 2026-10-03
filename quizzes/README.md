# 學院題庫格式（format 1）

每個學科一個 JSON 檔，檔名＝`<id>.json`，並把檔名加進 `quizzes/index.json` 的 `subjects`。
學院頁會依 `index.json` 的順序顯示學科卡片。格式由 `js/quiz.js` 的 `validateSubject` 檢查，
格式錯誤的題庫在瀏覽器會被略過並在主控台報錯；`node tests/quiz.test.mjs` 會驗證所有題庫。

```jsonc
{
  "format": 1,                 // 格式版本，固定 1
  "id": "science",             // 小寫英數與 -；也是貓咪屬性的 key（petData.stats[id]）
  "name": "生活自然",
  "icon": "🔬",
  "color": "#8b5cf6",          // 主色 #rrggbb
  "bgLight": "#f5f3ff",        // 淺底色 #rrggbb
  "statName": "科學",          // 測驗後成長的能力名稱
  "desc": "學科卡片上的說明",
  "roundSize": 3,              // 每次測驗抽幾題（≤ 該程度題數）
  "questions": [
    {
      "id": "science-g5-01",    // 題庫內唯一，建議 <學科>-g<年級>-<編號>
      "grade": 5,               // 程度（年級），見下表
      "type": "choice",         // 題型，見下表
      "prompt": "題目文字",
      "options": ["A", "B", "C", "D"],
      "answer": 0,              // 正解在 options 的索引（從 0 開始）
      "tip": "作答後顯示的小提示（可省略）",
      "explain": "作答後顯示的解析"
    }
  ]
}
```

## 程度（年級）

每題都要標 `grade`，學院頁右上／上方的「📶 測驗程度」可切換，抽題只從選定程度的題目抽。

| grade | 顯示 | 對應 |
|---|---|---|
| 4 | 小四 | 國小四年級 |
| 5 | 小五 | 國小五年級（預設） |
| 6 | 小六 | 國小六年級 |
| 7 | 國中 | 國中（七年級以上） |

- **每個程度至少要有 `roundSize` 題**，否則該程度的按鈕會變灰（`node tests/quiz.test.mjs` 會擋）。
- 程度會影響獎勵：金幣與能力值乘上倍率 小四 ×0.85 / 小五 ×1 / 小六 ×1.15 / 國中 ×1.3，
  體力消耗也隨之提高（`js/quiz.js` 的 `GRADE_REWARD`）。
- 題目請按實際課程進度寫（108 課綱該年級會學到的內容），不要用超綱題。
- 切換程度存在 `localStorage` 的 `meowdoku.quizGrade`。

## 題型

| type | 專屬欄位 | 判定 |
|---|---|---|
| `choice` | `options`：2～4 個不重複字串（畫面標示 A～D）；`answer`：正解索引 | 選到 `answer` 即正確 |

新增題型：在 `js/quiz.js` 的 `QUESTION_TYPES` 加 `validate`／`isCorrect`，
再在 `js/academy.js` 的 `renderQuizQuestion` 加該題型的作答畫面。

新增學科：除了題庫檔，`js/academy.js` 的能力象限會自動列出所有學科；
合格／滿分的金幣、屬性與掉落物在 `calculateQuizResult` 統一計算。
