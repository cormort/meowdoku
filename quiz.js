// quiz.js - 貓咪學院學科題庫與隨堂測驗系統
// 涵蓋六大學科：國文、數學、英文、科學、藝術、生活體育

export const QUIZ_SUBJECTS = {
  literacy: {
    id: "literacy",
    name: "國文語文",
    icon: "📖",
    color: "#e06d53",
    bgLight: "#fff0ec",
    statName: "文采",
    desc: "成語、字音字形與古典趣味，提升貓咪智慧與文學對白",
  },
  math: {
    id: "math",
    name: "算術邏輯",
    icon: "📐",
    color: "#3b82f6",
    bgLight: "#eff6ff",
    statName: "邏輯",
    desc: "生活心算、幾何圖形與邏輯思考，提升數獨效率與折扣能力",
  },
  language: {
    id: "language",
    name: "生活英語",
    icon: "🌍",
    color: "#10b981",
    bgLight: "#ecfdf5",
    statName: "外語",
    desc: "生活常用單字、動物英語與日常會話，解鎖國際貓咪交友",
  },
  science: {
    id: "science",
    name: "生活自然",
    icon: "🔬",
    color: "#8b5cf6",
    bgLight: "#f5f3ff",
    statName: "科學",
    desc: "動植物生態、天氣宇宙與貓咪冷知識，降低生病率與敏銳度",
  },
  art: {
    id: "art",
    name: "美學藝術",
    icon: "🎨",
    color: "#ec4899",
    bgLight: "#fdf2f8",
    statName: "美感",
    desc: "名畫色彩、音樂節奏與審美常識，解鎖高級拍照濾鏡與穿搭加成",
  },
  stamina: {
    id: "stamina",
    name: "體育生活",
    icon: "🏃",
    color: "#f59e0b",
    bgLight: "#fffbeb",
    statName: "體能",
    desc: "運動常識、反應速度與健康作息，擴充體力上限並減少疲勞",
  },
};

export const QUIZ_QUESTIONS = {
  literacy: [
    {
      q: "下列哪一個成語用來形容「貓咪走動時安靜無聲」最貼切？",
      options: ["輕手輕腳", "步步為營", "躡手躡腳", "虎視眈眈"],
      answer: 2,
      tip: "貓咪腳底有肉墊，走路時爪子會收縮起來。",
      explain: "「躡手躡腳」形容放輕腳步走動的樣子；貓咪走路肉墊吸音，完美詮釋躡手躡腳！",
    },
    {
      q: "成語「照貓畫虎」的意思是？",
      options: ["畫貓像老虎一樣威風", "比喻照樣模仿，缺乏獨創性", "貓跟老虎是親戚", "讚美繪畫技巧高超"],
      answer: 1,
      tip: "貓與老虎同屬貓科動物，但體型與神態不同。",
      explain: "「照貓畫虎」比喻照樣摹仿，只有外表相似而缺乏真正精髓。",
    },
    {
      q: "「春眠不覺曉，處處聞啼鳥」下一句是？",
      options: ["夜來風雨聲，花落知多少", "忽聞岸上踏歌聲", "床前明月光", "白日依山盡"],
      answer: 0,
      tip: "這是唐代詩人孟浩然的《春曉》名句。",
      explain: "完整詩句為：春眠不覺曉，處處聞啼鳥。夜來風雨聲，花落知多少。",
    },
    {
      q: "下列哪個字讀音與「魚」相同？",
      options: ["漁", "予", "羽", "雨"],
      answer: 0,
      tip: "捕魚的人稱為「漁夫」。",
      explain: "「漁」讀作 ㄩˊ (yú)，與「魚」同音同調。",
    },
    {
      q: "歇後語「貓哭耗子」的下一句是？",
      options: ["多此一舉", "假慈悲", "自討苦吃", "真好心"],
      answer: 1,
      tip: "老鼠是貓的天敵獵物，貓咪怎麼會為老鼠哭泣呢？",
      explain: "「貓哭耗子——假慈悲」，比喻心懷惡意卻假裝同情好意。",
    },
    {
      q: "成語「杯弓蛇影」比喻的是什麼心態？",
      options: ["喝酒很快樂", "捕蛇很危險", "疑神疑鬼、自己嚇自己", "視力非常好"],
      answer: 2,
      tip: "客人把掛在牆上的弓映在酒杯裡的倒影誤認成蛇。",
      explain: "「杯弓蛇影」比喻因無中生有的疑慮而自生驚恐。",
    },
  ],
  math: [
    {
      q: "小貓咪一天吃 3 罐小魚乾，一星期 7 天共會吃掉多少罐？",
      options: ["18 罐", "21 罐", "24 罐", "28 罐"],
      answer: 1,
      tip: "3 乘以 7 等於多少呢？",
      explain: "3 × 7 = 21 罐！貓咪吃飽飽最幸福喵！",
    },
    {
      q: "一條小魚乾原價 100 元，商店打「八折」販售，折後價格是多少元？",
      options: ["20 元", "70 元", "80 元", "85 元"],
      answer: 2,
      tip: "八折就是原價乘以 0.8 或 80%。",
      explain: "100 × 0.8 = 80 元，節省了 20 元買零食！",
    },
    {
      q: "在 5×5 的方形中，總共有多少個小格子？",
      options: ["15 格", "20 格", "25 格", "30 格"],
      answer: 2,
      tip: "行數乘以列數：5 × 5。",
      explain: "5 × 5 = 25 格，這正是 Meowdoku 入門難度的棋盤總格數！",
    },
    {
      q: "下列哪一個數是「質數」（只能被 1 和自己整除的大於 1 整數）？",
      options: ["9", "13", "15", "21"],
      answer: 1,
      tip: "9=3×3, 15=3×5, 21=3×7，那 13 呢？",
      explain: "13 的因數只有 1 和 13，因此 13 是質數！",
    },
    {
      q: "時鐘上的時針從中午 12 點轉到下午 3 點，轉過了幾度夾角？",
      options: ["45 度", "60 度", "90 度", "120 度"],
      answer: 2,
      tip: "整個圓是 360 度，12 個小時每小時走 30 度。",
      explain: "3 個小時 × 30 度 = 90 度（形成一個標準的直角）。",
    },
    {
      q: "貓砂盆長 40 公分、寬 30 公分，它的底面積是多少平方公分？",
      options: ["120 平方公分", "700 平方公分", "1200 平方公分", "1400 平方公分"],
      answer: 2,
      tip: "長方形面積 = 長 × 寬。",
      explain: "40 × 30 = 1200 平方公分，足夠貓咪舒適地轉身鏟砂！",
    },
  ],
  language: [
    {
      q: "英文中表示「貓咪發出的咕嚕咕嚕聲」的單字是？",
      options: ["Bark", "Purr", "Meow", "Roar"],
      answer: 1,
      tip: "Bark 是狗叫，Roar 是獅子吼，那安心時喉嚨發出的振動呢？",
      explain: "貓咪舒服時喉部共鳴的咕嚕聲叫 'Purr'；'Meow' 則是喵喵叫！",
    },
    {
      q: "「A black cat brings good luck in Britain.」中的 'luck' 是什麼意思？",
      options: ["壞事", "運氣 / 幸運", "黑色", "食物"],
      answer: 1,
      tip: "Good luck 常用來祝福別人好運。",
      explain: "'Luck' 意思是運氣、幸運。在英國傳統中，黑貓被認為能帶來幸運！",
    },
    {
      q: "單字 'Kitten' 是指什麼？",
      options: ["老貓", "幼貓 / 小貓", "貓爪", "貓玩具"],
      answer: 1,
      tip: "剛出生或幾個月大的可愛小毛球。",
      explain: "'Kitten' 指幼貓；成貓是 'Cat'，小狗則是 'Puppy'。",
    },
    {
      q: "如何用英語說「我愛我的貓」？",
      options: ["I eat my cat.", "I love my cat.", "I look my cat.", "I catch my cat."],
      answer: 1,
      tip: "Love 代表愛。",
      explain: "'I love my cat.' 就是「我愛我的貓」！每天都要跟貓咪告白喵！",
    },
    {
      q: "貓咪尾巴的英文單字是？",
      options: ["Paw", "Ear", "Tail", "Whisker"],
      answer: 2,
      tip: "Paw 是爪子，Ear 是耳朵，Whisker 是鬍鬚。",
      explain: "Tail 是尾巴！貓咪搖尾巴或豎起尾巴都是在表達情緒。",
    },
    {
      q: "在英文日常用語中，「raining cats and dogs」意思是？",
      options: ["天上掉下貓狗", "下傾盆大雨", "貓狗在大吵大鬧", "天氣非常晴朗"],
      answer: 1,
      tip: "這是一個著名的英文俚語，形容雨勢非常大。",
      explain: "'It is raining cats and dogs.' 意思是雨下得非常大（暴雨傾盆）！",
    },
  ],
  science: [
    {
      q: "貓咪嘴邊長長的「鬍鬚」（觸鬚）主要功能是？",
      options: ["裝飾好看", "測量通道寬度與感知氣流空間", "當作咀嚼輔助", "幫助散熱"],
      answer: 1,
      tip: "貓咪的鬍鬚根部有非常靈敏的神經末梢。",
      explain: "貓咪鬍鬚就像精密雷達，能測量洞口寬度是否容得下身軀，也能感知氣流變化！",
    },
    {
      q: "貓咪在從高處落下時，總是能靈活翻身腳著地，這個反射稱為？",
      options: ["貓咪降落傘效應", "翻正反射 (Righting reflex)", "光合作用", "膝跳反射"],
      answer: 1,
      tip: "貓咪內耳的前庭系統與柔軟脊椎協同運作。",
      explain: "「翻正反射」讓貓咪在空中感知重力方向並旋轉身體，平穩著陸保護脊椎與內臟。",
    },
    {
      q: "地球繞著太陽公轉一圈大約需要多長時間？",
      options: ["一天 (24小時)", "一個月 (30天)", "一年 (約365天)", "十年"],
      answer: 2,
      tip: "春夏秋冬四季變換一次剛好是一輪。",
      explain: "地球公轉一圈約 365.25 天，形成一年的四季交替；自轉一圈則是一天 24 小時。",
    },
    {
      q: "水在常壓下加熱到幾攝氏度會開始沸騰？",
      options: ["50 ℃", "80 ℃", "100 ℃", "200 ℃"],
      answer: 2,
      tip: "開水滾燙時冒煙的沸點溫度。",
      explain: "標準一大氣壓下，純水的沸點是 100 ℃，冰點則是 0 ℃。",
    },
    {
      q: "下列哪一種食物對貓咪來說是「有毒危險」絕對不能吃的？",
      options: ["煮熟的無鹽雞胸肉", "煮熟的鮭魚肉", "洋蔥、大蒜與巧克力", "專用貓草"],
      answer: 2,
      tip: "洋蔥含破壞貓咪紅血球的硫化物，巧克力含可可鹼。",
      explain: "洋蔥、蔥蒜類會引發溶血性貧血，巧克力可可鹼對貓狗皆是致命劇毒，嚴禁餵食！",
    },
    {
      q: "植物透過吸收陽光、水分與二氧化碳製造養分並釋放氧氣的過程是？",
      options: ["蒸散作用", "呼吸作用", "光合作用", "發酵作用"],
      answer: 2,
      tip: "綠色植物的葉綠體在陽光下的魔術。",
      explain: "「光合作用」是綠色植物製造葡萄糖並釋放氧氣維持地球生態的重要生理作用。",
    },
  ],
  art: [
    {
      q: "著名油畫《蒙娜麗莎》與《最後的晚餐》是哪位文藝復興大師的作品？",
      options: ["梵谷 (Van Gogh)", "達文西 (Leonardo da Vinci)", "畢卡索 (Picasso)", "莫內 (Monet)"],
      answer: 1,
      tip: "他是義大利文藝復興三傑之一，同時是科學家與發明家。",
      explain: "達文西以精湛的暈塗法與人體解剖透視創作了神秘微笑的《蒙娜麗莎》！",
    },
    {
      q: "在色彩學中，下列哪三種顏色被稱為「三原色」？",
      options: ["紅、黃、藍", "紅、綠、藍", "黑、白、灰", "橙、綠、紫"],
      answer: 0,
      tip: "繪畫顏料無法由其他顏色混合調出的基礎三色。",
      explain: "顏料三原色是紅、黃、藍（印刷為品紅、黃、青）；三原色混合能調配出各種色彩！",
    },
    {
      q: "名畫《星夜》（Starry Night）中充滿旋轉星雲與深藍夜空，作者是？",
      options: ["莫內", "梵谷", "達利", "米開朗基羅"],
      answer: 1,
      tip: "荷蘭後印象派畫家，代表作還有《向日葵》。",
      explain: "文森·梵谷創作的《星夜》以強烈筆觸與旋轉色彩表現出澎湃的心靈世界。",
    },
    {
      q: "音樂簡譜中，音符「Do、Re、Mi、Fa、Sol、La、Ti」中，「Sol」對應的數字是？",
      options: ["3", "4", "5", "6"],
      answer: 2,
      tip: "1=Do, 2=Re, 3=Mi, 4=Fa...",
      explain: "簡譜對應關係為：1(Do) 2(Re) 3(Mi) 4(Fa) 5(Sol) 6(La) 7(Ti)。",
    },
    {
      q: "畫作中，用深淺明暗來表現物體立體感與陰影的手法稱為？",
      options: ["留白", "明暗對比 (素描光影)", "點描法", "抽象拼貼"],
      answer: 1,
      tip: "光線照在物體上會產生亮部、灰面與投影。",
      explain: "明暗光影層次能使平面的二維畫布展現出逼真的三維立體與厚度感！",
    },
  ],
  stamina: [
    {
      q: "健康的貓咪每天大約需要睡多少個小時？",
      options: ["3～5 小時", "6～8 小時", "12～16 小時", "22～24 小時"],
      answer: 2,
      tip: "貓咪是著名的「睡覺大王」，保持狩獵體能。",
      explain: "成年貓咪每天平均睡眠 12~16 小時，幼貓和老貓甚至可達 18 小時以上！",
    },
    {
      q: "運動後大量流汗時，補充水分同時最需要注意補充什麼微量成分？",
      options: ["糖果", "電解質 (鈉、鉀等礦物質)", "純油脂", "咖啡因"],
      answer: 1,
      tip: "汗水中除了水分還含有鹽分。",
      explain: "運動出汗帶走水分與電解質，適度補充含電解質飲品能預防脫水與抽筋！",
    },
    {
      q: "每天運動維持身體健康，世界衛生組織建議青少年每天至少進行多久的中高強度運動？",
      options: ["10 分鐘", "60 分鐘 (1小時)", "180 分鐘 (3小時)", "只要動一下下"],
      answer: 1,
      tip: "約一節課多一點的運動量。",
      explain: "每天累積至少 60 分鐘中等至高強度體能活動，有益骨骼肌肉與心肺健康！",
    },
    {
      q: "貓咪經常伸懶腰、拱起背部並拉伸前後腳，主要目的是？",
      options: ["向人類討零食", "放鬆肌肉、促進血液循環並準備行動", "身體不舒服", "表示害怕"],
      answer: 1,
      tip: "就像人類運動前的伸展熱身一樣。",
      explain: "伸懶腰能重啟貓咪肌肉柔軟度、激活血壓與神經，為奔跑跳躍做好準備！",
    },
  ],
};

// 隨機抽取題庫產生隨堂測驗 (預設 3 題)
export function generateQuizSession(subjectId = "literacy", count = 3) {
  const bank = QUIZ_QUESTIONS[subjectId] || QUIZ_QUESTIONS.literacy;
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return {
    subject: QUIZ_SUBJECTS[subjectId] || QUIZ_SUBJECTS.literacy,
    questions: shuffled.slice(0, Math.min(count, shuffled.length)),
    startTime: Date.now(),
  };
}

// 測驗結算與獎勵計算
export function calculateQuizResult(subjectId, correctCount, totalCount) {
  const pass = correctCount >= Math.ceil(totalCount * 0.6);
  const perfect = correctCount === totalCount;

  // 基礎金幣獎勵 (滿分 150，合格 90，未達標 30)
  const baseCoins = perfect ? 150 : pass ? 90 : 30;
  // 學科屬性值增長 (+6~+15)
  const statGain = perfect ? 12 : pass ? 7 : 2;
  // 經驗值
  const xpGain = correctCount * 30;
  // 消耗體力與飽食度
  const staminaCost = 15;
  const hungerCost = 10;
  const fatigueGain = 12;

  // 隨機掉落獎勵
  let dropItem = null;
  const rand = Math.random();
  if (perfect && rand < 0.4) {
    dropItem = { type: "ticket_scrap", name: "🎫 扭蛋券殘頁", qty: 1 };
  } else if (pass && rand < 0.3) {
    dropItem = { type: "premium_snack", name: "🥫 特級營養罐", qty: 1 };
  } else if (rand < 0.2) {
    dropItem = { type: "fish_cookie", name: "🐟 小魚餅乾", qty: 2 };
  }

  return {
    subjectId,
    correctCount,
    totalCount,
    pass,
    perfect,
    score: Math.round((correctCount / totalCount) * 100),
    coins: baseCoins,
    statGain,
    xpGain,
    staminaCost,
    hungerCost,
    fatigueGain,
    dropItem,
  };
}
