# 問答題庫格式（format 1）

每個題庫一個 JSON 檔，放在 `quizzes/`，並把檔名加進 `quizzes/index.json` 的 `packs`。
首頁會自動出現該題庫的入口卡片。格式由 `js/quiz-format.js` 的 `validatePack` 檢查，
`node tests/quiz.test.mjs` 會驗證所有題庫。

```jsonc
{
  "format": 1,                 // 格式版本，固定 1
  "id": "cat-trivia",          // 小寫英數與 -，網址用 #/quiz/<id>
  "title": "貓咪冷知識",
  "icon": "📚",
  "description": "首頁卡片上的一句話說明",
  "roundSize": 5,              // 每輪抽幾題（≤ 題數）
  "passScore": 3,              // 答對幾題算過關、可拿獎勵（≤ roundSize）
  "questions": [
    {
      "id": "sleep-hours",     // 題庫內唯一
      "type": "choice",        // 題型，見下表
      "prompt": "成貓一天大約會睡多久？",
      "options": ["4～6 小時", "8～10 小時", "12～16 小時", "20 小時以上"],
      "answer": 2,             // 正解在 options 的索引（從 0 開始）
      "explain": "答題後顯示的解說"
    }
  ]
}
```

## 題型

| type | 專屬欄位 | 判定 |
|---|---|---|
| `choice` | `options`：2 個以上不重複字串；`answer`：正解索引 | 選到 `answer` 即正確 |

新增題型：在 `js/quiz-format.js` 的 `QUESTION_TYPES` 加 `validate`／`isCorrect`，
再在 `js/quiz.js` 的 `RENDERERS` 加畫面（按鈕帶 `data-response`，值為 JSON）。
