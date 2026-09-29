import { audio } from './audio.js';

// 貓屋系統 (Cat House System)
// 包含 10 種全身體態貓咪、表情動畫融合、撫摸互動、逗貓棒遊戲、貓砂盆清潔與 Web Audio 呼嚕聲音效。

export const CAT_BREEDS = {
  orange_tabby: {
    id: 'orange_tabby',
    pitch: 0.92,   // 叫聲音高倍率
    name: '橘虎斑',
    nick: '胖橘',
    trait: '貪吃愛撒嬌・熱情親人',
    frames: { idle: 2, blink: 31, happy: 24, pet: 71, surprised: 77, sleepy: 55, play: 18 },
    body: {
      main: '#ea9443', stroke: '#b8621b', stripe: '#be651d',
      chest: '#fff5ea', paws: '#fff5ea', collar: '#e63946', bell: '#ffd166',
      type: 'tabby'
    }
  },
  white: {
    id: 'white',
    pitch: 1.18,   // 叫聲音高倍率
    name: '純白貓',
    nick: '雪球',
    trait: '仙氣優雅・溫柔黏人',
    frames: { idle: 0, blink: 56, happy: 63, pet: 33, surprised: 29, sleepy: 53, play: 9 },
    body: {
      main: '#fcfbfa', stroke: '#d4cbbe',
      chest: '#ffffff', paws: '#ffffff', collar: '#457b9d', bell: '#ffd166',
      type: 'solid'
    }
  },
  black: {
    id: 'black',
    pitch: 0.8,   // 叫聲音高倍率
    name: '黑貓',
    nick: '黑寶',
    trait: '神秘敏銳・深情呼嚕機',
    frames: { idle: 1, blink: 20, happy: 47, pet: 68, surprised: 36, sleepy: 12, play: 52 },
    body: {
      main: '#23201f', stroke: '#141211',
      chest: '#2e2a28', paws: '#23201f', collar: '#2a9d8f', bell: '#ffd166',
      type: 'solid'
    }
  },
  orange_white: {
    id: 'orange_white',
    pitch: 1.05,   // 叫聲音高倍率
    name: '橘白雙色',
    nick: '起司',
    trait: '活潑開朗・踏踏專家',
    frames: { idle: 8, blink: 60, happy: 11, pet: 66, surprised: 39, sleepy: 35, play: 50 },
    body: {
      main: '#ea9443', stroke: '#b8621b',
      chest: '#ffffff', paws: '#ffffff', collar: '#e76f51', bell: '#ffd166',
      type: 'bicolor'
    }
  },
  tuxedo: {
    id: 'tuxedo',
    pitch: 0.88,   // 叫聲音高倍率
    name: '賓士貓',
    nick: '紳士',
    trait: '精力充沛・調皮搞怪',
    frames: { idle: 7, blink: 22, happy: 42, pet: 72, surprised: 57, sleepy: 72, play: 42 },
    body: {
      main: '#22201f', stroke: '#141211',
      chest: '#ffffff', paws: '#ffffff', collar: '#e63946', bell: '#ffd166',
      type: 'tuxedo'
    }
  },
  calico: {
    id: 'calico',
    pitch: 1.12,   // 叫聲音高倍率
    name: '幸運三花',
    nick: '花花',
    trait: '獨立聰明・招財開運',
    frames: { idle: 4, blink: 28, happy: 49, pet: 69, surprised: 4, sleepy: 73, play: 28 },
    body: {
      main: '#fff9f2', stroke: '#c09b70',
      spots: ['#e08534', '#2b2725'],
      chest: '#ffffff', paws: '#ffffff', collar: '#e76f51', bell: '#ffd166',
      type: 'calico'
    }
  },
  siamese: {
    id: 'siamese',
    pitch: 1.35,   // 叫聲音高倍率
    name: '暹羅貓',
    nick: '奶茶',
    trait: '聲音甜美・愛講話話嘮',
    frames: { idle: 5, blink: 61, happy: 17, pet: 38, surprised: 78, sleepy: 38, play: 61 },
    body: {
      main: '#ebdccd', stroke: '#9b8473', point: '#4e3a2f',
      chest: '#f6eee4', paws: '#4e3a2f', collar: '#2a9d8f', bell: '#ffd166',
      type: 'siamese'
    }
  },
  grey_tabby: {
    id: 'grey_tabby',
    pitch: 1.0,   // 叫聲音高倍率
    name: '美短灰虎斑',
    nick: '小銀',
    trait: '身手敏捷・好奇心強',
    frames: { idle: 6, blink: 3, happy: 48, pet: 80, surprised: 44, sleepy: 54, play: 19 },
    body: {
      main: '#98a1a6', stroke: '#596166', stripe: '#454c51',
      chest: '#edf0f2', paws: '#edf0f2', collar: '#f4a261', bell: '#ffd166',
      type: 'tabby'
    }
  },
  grey_solid: {
    id: 'grey_solid',
    pitch: 0.75,   // 叫聲音高倍率
    name: '英短藍貓',
    nick: '藍寶',
    trait: '沉穩紳士・軟糯慵懶',
    frames: { idle: 37, blink: 25, happy: 15, pet: 70, surprised: 59, sleepy: 70, play: 40 },
    body: {
      main: '#788188', stroke: '#4b5258',
      chest: '#858f96', paws: '#788188', collar: '#e76f51', bell: '#ffd166',
      type: 'solid'
    }
  },
  brown_tabby: {
    id: 'brown_tabby',
    pitch: 0.85,   // 叫聲音高倍率
    name: '經典狸花貓',
    nick: '阿狸',
    trait: '體質強健・元氣滿滿',
    frames: { idle: 14, blink: 43, happy: 45, pet: 74, surprised: 34, sleepy: 21, play: 58 },
    body: {
      main: '#9c8166', stroke: '#594633', stripe: '#453524',
      chest: '#f2e8d8', paws: '#f2e8d8', collar: '#2a9d8f', bell: '#ffd166',
      type: 'tabby'
    }
  }
};

export const BREED_LIST = Object.keys(CAT_BREEDS);

export function getBreed(key) {
  return CAT_BREEDS[key] || CAT_BREEDS.orange_tabby;
}

export function facePos(k) {
  return `${(k % 9) * 12.5}% ${Math.floor(k / 9) * 12.5}%`;
}

const AFFECTION_KEY = 'meowdoku.catAffection';
export const getAffection = () => Number(localStorage.getItem(AFFECTION_KEY) || 30);
// 貓屋沒開過也要能累積（通關加分走這裡）
export function addAffection(amount = 1) {
  const v = Math.min(100, Math.round(getAffection() + amount));
  localStorage.setItem(AFFECTION_KEY, String(v));
  return v;
}


// 產生全身 SVG 身體結構
export function renderCatSvgBody(breed, isExcited = false, isPouncing = false) {
  const b = breed.body;
  const tailClass = isExcited ? 'tail-fast' : 'tail-normal';
  const pounceClass = isPouncing ? 'paws-pounce' : '';
  
  // 依品種自訂花紋
  let patterns = '';
  if (b.type === 'tabby') {
    patterns = `
      <!-- 左右兩側斑紋 -->
      <path d="M 64 88 Q 78 90 84 84" stroke="${b.stripe}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M 136 88 Q 122 90 116 84" stroke="${b.stripe}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M 60 106 Q 76 108 82 102" stroke="${b.stripe}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M 140 106 Q 124 108 118 102" stroke="${b.stripe}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <!-- 尾巴條紋 -->
      <path d="M 28 85 Q 34 82 40 86" stroke="${b.stripe}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M 20 62 Q 26 59 32 64" stroke="${b.stripe}" stroke-width="3" stroke-linecap="round" fill="none"/>
    `;
  } else if (b.type === 'calico') {
    patterns = `
      <!-- 三花斑塊 -->
      <path d="M 120 75 Q 148 85 145 110 Q 130 115 125 95 Z" fill="${b.spots[0]}"/>
      <path d="M 55 85 Q 70 80 75 95 Q 65 115 52 105 Z" fill="${b.spots[1]}"/>
      <path d="M 25 55 Q 35 45 35 65 Z" fill="${b.spots[0]}"/>
    `;
  } else if (b.type === 'siamese') {
    patterns = `
      <!-- 暹羅背部過渡柔和陰影 -->
      <ellipse cx="100" cy="115" rx="35" ry="20" fill="rgba(78,58,47,0.14)"/>
    `;
  }

  // 尾巴顏色
  const tailFill = b.type === 'siamese' ? b.point : b.main;
  const tailStroke = b.type === 'siamese' ? '#38281d' : b.stroke;
  // 前爪顏色
  const pawFill = b.paws;
  const pawStroke = b.type === 'siamese' ? '#38281d' : b.stroke;

  return `
    <svg width="220" height="165" viewBox="0 0 200 155" class="cat-body-svg ${pounceClass}">
      <!-- 搖曳尾巴 -->
      <g class="tail-joint ${tailClass}">
        <path d="M 42 108 Q 12 88 20 48 Q 25 32 38 40 Q 22 54 28 85 Q 32 104 46 114 Z"
              fill="${tailFill}" stroke="${tailStroke}" stroke-width="3.5" stroke-linecap="round"/>
      </g>
      <!-- 身體軀幹 (圓潤坐姿) -->
      <ellipse cx="100" cy="104" rx="55" ry="46" fill="${b.main}" stroke="${b.stroke}" stroke-width="3.5"/>
      <!-- 花紋層 -->
      ${patterns}
      <!-- 胸腹部毛髮 -->
      <ellipse cx="100" cy="98" rx="26" ry="33" fill="${b.chest}"/>
      <!-- 左右前爪 (可踏踏或撲抓) -->
      <g class="paw-group">
        <g class="paw-left">
          <ellipse cx="79" cy="137" rx="14" ry="11" fill="${pawFill}" stroke="${pawStroke}" stroke-width="3"/>
          <path d="M 75 134 L 75 143 M 83 134 L 83 143" stroke="${pawStroke}" stroke-width="2" stroke-linecap="round"/>
        </g>
        <g class="paw-right">
          <ellipse cx="121" cy="137" rx="14" ry="11" fill="${pawFill}" stroke="${pawStroke}" stroke-width="3"/>
          <path d="M 117 134 L 117 143 M 125 134 L 125 143" stroke="${pawStroke}" stroke-width="2" stroke-linecap="round"/>
        </g>
      </g>
      <!-- 鈴鐺項圈 -->
      <g class="cat-collar">
        <rect x="74" y="58" width="52" height="8" rx="4" fill="${b.collar}"/>
        <circle cx="100" cy="67" r="7" fill="${b.bell}" stroke="#c99700" stroke-width="2"/>
        <circle cx="100" cy="69" r="1.5" fill="#a47b00"/>
      </g>
    </svg>
  `;
}

// ==================== 貓屋互動控制器 ====================
export class CatHouseController {
  constructor(options = {}) {
    this.container = null;
    this.activeBreedId = localStorage.getItem('meowdoku.activeBreed') in CAT_BREEDS ? localStorage.getItem('meowdoku.activeBreed') : 'orange_tabby';
    this.currentExpression = 'idle';
    this.tool = 'hand'; // 'hand' | 'wand' | 'litter' | 'treat'
    this.litterClumps = 3; // 貓砂團數
    this.isPetting = false;
    this.blinkTimer = null;
    this.onSelectBreed = options.onSelectBreed || null;

    // 隨機自語反應庫
    this.quotes = {
      idle: ['喵嗚～今天天氣真好', '伸個懶腰～', '看著你呢喵', '呼嚕呼嚕…'],
      pet: ['舒服瞇瞇眼～', '最喜歡被摸摸下巴了！', '好感度上升中❤️', '呼嚕呼嚕呼嚕～', '尾巴翹高高！'],
      wand: ['抓住它了！', '看我的無影貓爪！🐾', '快動快動！好想抓！', '飛撲～！'],
      litter: ['好乾淨的貓砂！', '好舒服～喵喵贊成！', '辛苦鏟屎官啦✨', '五星級廁所！'],
      treat: ['好好吃的小魚乾！🐟', '美味無比～幸福喵生！', '還要吃還要吃！❤️']
    };
  }

  get affection() { return getAffection(); }

  // 關閉貓屋：停呼嚕與眨眼計時器
  close() {
    audio.stopPurr();
    clearTimeout(this.blinkTimer);
    clearTimeout(this.exprResetTimer);
  }

  get breed() {
    return getBreed(this.activeBreedId);
  }

  // 切換貓咪表情
  setExpression(exprName, durationMs = 0) {
    this.currentExpression = exprName;
    const faceEl = this.container?.querySelector('#catHeroFace');
    if (!faceEl) return;
    const frameIdx = this.breed.frames[exprName] ?? this.breed.frames.idle;
    faceEl.style.backgroundPosition = facePos(frameIdx);

    if (durationMs > 0) {
      clearTimeout(this.exprResetTimer);
      this.exprResetTimer = setTimeout(() => {
        this.setExpression('idle');
      }, durationMs);
    }
  }

  // 氣泡文字回饋
  showSpeech(text) {
    const bubble = this.container?.querySelector('#catSpeechBubble');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove('pop-in');
    void bubble.offsetWidth; // trigger reflow
    bubble.classList.add('pop-in');
  }

  // 粒子飄浮特效
  spawnParticle(x, y, text) {
    if (!this.container) return;
    const stage = this.container.querySelector('.room-stage');
    if (!stage) return;
    const p = document.createElement('div');
    p.className = 'float-particle';
    p.textContent = text;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    stage.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }

  // 增加好感度
  addAffection(amount = 1) {
    addAffection(amount);
    this.updateAffectionUI();
  }

  updateAffectionUI() {
    const bar = this.container?.querySelector('#affectionFill');
    const label = this.container?.querySelector('#affectionText');
    if (bar) bar.style.width = `${this.affection}%`;
    if (label) {
      const tier = this.affection >= 90 ? '💖 密不可分'
        : this.affection >= 60 ? '✨ 親暱撒嬌'
        : this.affection >= 30 ? '😊 溫馨熟悉' : '🐾 剛認識你';
      label.textContent = `${this.affection}% (${tier})`;
    }
  }

  // 初始化自動眨眼循環
  startBlinkLoop() {
    clearTimeout(this.blinkTimer);
    const scheduleNext = () => {
      const delay = 2500 + Math.random() * 3200;
      this.blinkTimer = setTimeout(() => {
        if (!this.container?.isConnected) return;   // 彈窗換頁後自動停
        if (this.currentExpression === 'idle') {
          this.setExpression('blink');
          setTimeout(() => {
            if (this.currentExpression === 'blink') this.setExpression('idle');
            scheduleNext();
          }, 180);
        } else {
          scheduleNext();
        }
      }, delay);
    };
    scheduleNext();
  }

  // ==================== 模態窗主渲染 ====================
  mount(parentEl) {
    this.container = parentEl;
    this.container.innerHTML = `
      <div class="cathouse-modal">
        <!-- 貓咪房間舞台 (主互動區) -->
        <div class="room-stage" id="roomStage">
          <!-- 牆面窗景與陽光 -->
          <div class="room-window">
            <div class="sun-beam"></div>
            <div class="window-sill">🌱</div>
          </div>
          <!-- 氣泡對話框 -->
          <div class="cat-speech" id="catSpeechBubble">喵嗚～歡迎來到貓屋！摸摸我吧❤️</div>
          
          <!-- 逗貓棒實體 (在 wand 模式跟隨滑鼠) -->
          <div class="teaser-wand-visual" id="wandVisual">
            <div class="wand-stick"></div>
            <div class="wand-string"></div>
            <div class="wand-feather">🪶<span class="wand-bell">🔔</span></div>
          </div>

          <!-- 貓砂盆角落 -->
          <div class="litter-box-corner" id="litterCorner" title="點擊清潔貓砂盆">
            <div class="litter-box-title">🐱 貓砂盆</div>
            <div class="litter-tray" id="litterTray">
              <div class="litter-sand"></div>
              <div class="litter-clumps-wrap" id="clumpsWrap"></div>
            </div>
            <div class="litter-status" id="litterStatusLabel">乾淨度: 40%</div>
          </div>

          <!-- 地板與坐墊 -->
          <div class="room-floor"></div>
          <div class="room-mat"></div>

          <!-- 全身互動貓咪本體 -->
          <div class="cat-hero-entity" id="catHero">
            <!-- 貓頭部 -->
            <div class="cat-hero-head-wrap" id="catHeroHeadWrap">
              <div class="cat-hero-head" id="catHeroFace" style="background-position: ${facePos(this.breed.frames.idle)};"></div>
            </div>
            <!-- 貓身體 (SVG) -->
            <div class="cat-hero-body-wrap" id="catHeroBodyWrap">
              ${renderCatSvgBody(this.breed)}
            </div>
          </div>
        </div>

        <!-- 好感度條 -->
        <div class="affection-card">
          <div class="affection-header">
            <span>💖 貓咪好感度</span>
            <span id="affectionText" class="val">--</span>
          </div>
          <div class="affection-track">
            <div class="affection-fill" id="affectionFill" style="width:${this.affection}%"></div>
          </div>
        </div>

        <!-- 互動工具欄 -->
        <div class="cathouse-tools">
          <button class="tool-btn ${this.tool === 'hand' ? 'active' : ''}" data-tool="hand">
            <span class="tool-icon">🖐️</span>
            <span class="tool-name">手摸摸</span>
          </button>
          <button class="tool-btn ${this.tool === 'wand' ? 'active' : ''}" data-tool="wand">
            <span class="tool-icon">🪶</span>
            <span class="tool-name">逗貓棒</span>
          </button>
          <button class="tool-btn ${this.tool === 'litter' ? 'active' : ''}" data-tool="litter">
            <span class="tool-icon">🧹</span>
            <span class="tool-name">清貓砂</span>
          </button>
          <button class="tool-btn ${this.tool === 'treat' ? 'active' : ''}" data-tool="treat">
            <span class="tool-icon">🐟</span>
            <span class="tool-name">小魚乾</span>
          </button>
        </div>

        <!-- 品種選擇抽屜 (整合合併相同貓咪，展示全身形態) -->
        <div class="breeds-section">
          <div class="breeds-title-row">
            <span>🐾 選擇陪伴貓咪（全身動畫已合併）</span>
            <button class="companion-btn primary" id="setCompanionBtn">✔ 設為遊戲夥伴</button>
          </div>
          <div class="breeds-slider" id="breedsSlider">
            ${BREED_LIST.map((bId) => {
              const b = CAT_BREEDS[bId];
              const isSelected = bId === this.activeBreedId;
              return `
                <div class="breed-card ${isSelected ? 'selected' : ''}" data-breed="${bId}">
                  <div class="breed-avatar" style="background-position:${facePos(b.frames.idle)}"></div>
                  <div class="breed-info">
                    <div class="breed-name">${b.name}</div>
                    <div class="breed-nick">${b.nick}</div>
                  </div>
                  ${isSelected ? '<span class="selected-mark">★ 當前</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateAffectionUI();
    this.renderLitterClumps();
    this.startBlinkLoop();
  }

  // 渲染貓砂團
  renderLitterClumps() {
    const wrap = this.container?.querySelector('#clumpsWrap');
    const label = this.container?.querySelector('#litterStatusLabel');
    if (!wrap) return;
    wrap.innerHTML = '';
    const cleanRate = Math.max(0, Math.round((1 - this.litterClumps / 4) * 100));
    if (label) label.textContent = `乾淨度: ${cleanRate}%`;

    const positions = [
      { x: 22, y: 18 }, { x: 55, y: 28 }, { x: 38, y: 44 }, { x: 70, y: 15 }
    ];

    for (let i = 0; i < this.litterClumps; i++) {
      const pos = positions[i % positions.length];
      const clump = document.createElement('div');
      clump.className = 'sand-clump';
      clump.style.left = `${pos.x}%`;
      clump.style.top = `${pos.y}%`;
      clump.dataset.idx = String(i);
      clump.innerHTML = '💩';
      wrap.appendChild(clump);
    }
  }

  // 綁定所有互動事件
  bindEvents() {
    const stage = this.container.querySelector('#roomStage');
    const catHero = this.container.querySelector('#catHero');
    const wandVisual = this.container.querySelector('#wandVisual');

    // 工具切換
    this.container.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.tool = btn.dataset.tool;
        stage.dataset.tool = this.tool;
        audio.init();

        if (this.tool === 'wand') {
          wandVisual.style.display = 'block';
          this.setExpression('surprised');
          this.showSpeech('哇！好玩的逗貓棒！看爪！🐾');
          audio.playJingle();
        } else {
          wandVisual.style.display = 'none';
        }

        if (this.tool === 'litter') {
          this.showSpeech('準備清潔貓砂盆～點擊貓砂團鏟乾淨！🧹');
        } else if (this.tool === 'treat') {
          this.showSpeech('點擊貓咪餵牠最愛的小魚乾！🐟');
        } else if (this.tool === 'hand') {
          this.showSpeech('用手指或滑鼠輕撫貓咪，聽聽呼嚕聲～🖐️');
        }
      });
    });

    // 舞台移動 (逗貓棒跟隨 & 撫摸檢測)
    stage.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 逗貓棒視覺跟隨
      if (this.tool === 'wand') {
        wandVisual.style.transform = `translate(${x - 30}px, ${y - 40}px)`;
        // 貓咪頭部追蹤視線
        const catRect = catHero.getBoundingClientRect();
        const catCenterX = catRect.left - rect.left + catRect.width / 2;
        const deltaX = (x - catCenterX) / 18;
        const headWrap = this.container.querySelector('#catHeroHeadWrap');
        if (headWrap) {
          headWrap.style.transform = `translateX(${Math.max(-12, Math.min(12, deltaX))}px) rotate(${deltaX * 0.4}deg)`;
        }
      }

      // 如果正在撫摸
      if (this.isPetting && this.tool === 'hand') {
        if (Math.random() < 0.22) {
          const hearts = ['💖', '💕', '✨', '🐾', '🌸'];
          const icon = hearts[Math.floor(Math.random() * hearts.length)];
          this.spawnParticle(x - 10, y - 20, icon);
        }
      }
    });

    // 貓咪本體撫摸互動
    catHero.addEventListener('pointerdown', (e) => {
      audio.init();
      if (this.tool === 'hand') {
        this.isPetting = true;
        catHero.classList.add('petting');
        this.setExpression('pet');
        audio.startPurr();
        this.addAffection(2);
        const quotes = this.quotes.pet;
        this.showSpeech(quotes[Math.floor(Math.random() * quotes.length)]);
      } else if (this.tool === 'wand') {
        // 貓咪撲擊逗貓棒
        audio.playJingle();
        audio.playMeow(1.2 * this.breed.pitch);
        this.setExpression('play', 500);
        catHero.classList.add('pounce');
        this.addAffection(4);
        this.showSpeech('撲到了！好身手！⚡');
        setTimeout(() => catHero.classList.remove('pounce'), 420);
      } else if (this.tool === 'treat') {
        // 餵食小魚乾
        audio.playMeow(1.1 * this.breed.pitch);
        this.setExpression('happy', 1200);
        audio.playVictory();
        this.addAffection(15);
        this.showSpeech('太好吃惹！最喜歡主人了喵～🐟❤️');
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            const rx = catHero.offsetLeft + 40 + Math.random() * 80;
            const ry = catHero.offsetTop + 20 + Math.random() * 50;
            this.spawnParticle(rx, ry, '💖');
          }, i * 90);
        }
      }
    });

    const stopPetting = () => {
      if (this.isPetting) {
        this.isPetting = false;
        catHero.classList.remove('petting');
        audio.stopPurr();
        this.setExpression('happy', 1200);
      }
    };
    stage.addEventListener('pointerup', stopPetting);
    stage.addEventListener('pointerleave', stopPetting);

    // 貓砂盆清潔點擊
    const litterCorner = this.container.querySelector('#litterCorner');
    litterCorner?.addEventListener('click', (e) => {
      const clump = e.target.closest('.sand-clump');
      audio.init();
      if (clump) {
        audio.playSand();
        const rect = stage.getBoundingClientRect();
        this.spawnParticle(e.clientX - rect.left - 10, e.clientY - rect.top - 20, '✨');
        clump.remove();
        this.litterClumps = Math.max(0, this.litterClumps - 1);
        this.renderLitterClumps();
        this.addAffection(5);

        if (this.litterClumps === 0) {
          audio.playVictory();
          audio.playMeow(0.95 * this.breed.pitch);
          this.showSpeech('哇！貓砂盆乾乾淨淨了！貓咪超級開心🌟');
          this.setExpression('happy', 2000);
          // 隔一段時間後又會有小團
          setTimeout(() => {
            if (this.litterClumps === 0) {
              this.litterClumps = 2;
              this.renderLitterClumps();
            }
          }, 18000);
        } else {
          this.showSpeech('沙沙沙～鏟乾淨了！🧹');
        }
      } else {
        audio.playSand();
      }
    });

    // 選擇品種卡片點擊
    this.container.querySelector('#breedsSlider')?.addEventListener('click', (e) => {
      const card = e.target.closest('.breed-card');
      if (!card) return;
      const bId = card.dataset.breed;
      this.switchBreed(bId);
    });

    // 設為遊戲夥伴按鈕
    this.container.querySelector('#setCompanionBtn')?.addEventListener('click', () => {
      localStorage.setItem('meowdoku.activeBreed', this.activeBreedId);
      audio.playMeow(1.2 * this.breed.pitch);
      this.showSpeech(this.onSelectBreed?.(this.activeBreedId) ?? '');
    });
  }

  // 切換當前品種
  switchBreed(bId) {
    this.activeBreedId = bId;
    localStorage.setItem('meowdoku.activeBreed', bId);

    // 更新卡片選中狀態
    this.container.querySelectorAll('.breed-card').forEach((c) => {
      const isCur = c.dataset.breed === bId;
      c.classList.toggle('selected', isCur);
      const mark = c.querySelector('.selected-mark');
      if (mark) mark.remove();
      if (isCur) {
        c.insertAdjacentHTML('beforeend', '<span class="selected-mark">★ 當前</span>');
      }
    });

    const b = this.breed;

    // 重新渲染舞台上的全身貓
    const bodyWrap = this.container.querySelector('#catHeroBodyWrap');
    if (bodyWrap) bodyWrap.innerHTML = renderCatSvgBody(b);

    const face = this.container.querySelector('#catHeroFace');
    if (face) face.style.backgroundPosition = facePos(b.frames.idle);

    audio.playMeow(1.0 * this.breed.pitch);
    this.showSpeech(`嗨！我是${b.name}（${b.nick}），${b.trait}！`);
  }
}

