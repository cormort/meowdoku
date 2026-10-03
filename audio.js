// 貓咪邏輯謎題 音訊系統 (Web Audio BGM & SFX Engine)
// 純瀏覽器原生 Web Audio API 合成，零外部依賴、零延遲、離線可用。

class MeowAudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    
    // 呼嚕音效節點
    this.purrOsc = null;
    this.purrGain = null;
    this.purrLfo = null;
    this.isPurring = false;
    
    // 設定
    this.bgmEnabled = localStorage.getItem('meowdoku.bgm') !== '0'; // 預設開啟（首播需使用者手勢）
    this.sfxEnabled = localStorage.getItem('meowdoku.sfx') !== '0'; // 預設開啟

    // BGM 播放狀態
    this.isPlayingBgm = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.barIdx = 0;
    this.scene = 'room';
    this.ducking = false;

    // ===== 場景配樂：每個場景一首（和弦進行／速度／音色／節奏型都不同） =====
    // 每首曲子用 8 個和弦 + 4 條旋律動機循環，bar 由 scheduleNextBar 一小節一小節排程。
    // 音高以 Hz 直接寫，方便對應和弦；音符 = 頻率或 null（休止）。
    this.tracks = {
      // 小屋：原本的貓咪咖啡廳 Lofi（音樂盒音色、悠閒、無鼓）
      room: {
        name: '小屋',
        bpm: 78,
        voice: 'musicbox',
        bassVoice: 'warmbass',
        arpPat: 'xxxxxxxx',
        bassPat: 'x...x...',
        chords: [
          { root: 174.61, bass: 87.31, notes: [261.63, 329.63, 349.23, 440.0, 523.25] },
          { root: 196.0, bass: 98.0, notes: [246.94, 293.66, 329.63, 392.0, 493.88] },
          { root: 164.81, bass: 82.41, notes: [246.94, 293.66, 329.63, 392.0, 493.88] },
          { root: 220.0, bass: 110.0, notes: [261.63, 329.63, 392.0, 440.0, 523.25] },
          { root: 146.83, bass: 73.42, notes: [220.0, 261.63, 349.23, 440.0, 523.25] },
          { root: 196.0, bass: 98.0, notes: [246.94, 293.66, 349.23, 392.0, 440.0] },
          { root: 261.63, bass: 65.41, notes: [261.63, 329.63, 392.0, 493.88, 523.25] },
          { root: 220.0, bass: 110.0, notes: [277.18, 329.63, 370.0, 440.0, 554.37] },
        ],
        motifs: [
          [523.25, null, 659.25, 783.99, 659.25, null, 523.25, null],
          [587.33, 659.25, 587.33, null, 493.88, null, 392.0, null],
          [440.0, null, 523.25, 659.25, null, 783.99, 880.0, null],
          [659.25, null, 587.33, 523.25, 392.0, null, 523.25, null],
        ],
      },
      // 咖啡廳：爵士搖擺（電鋼琴、ii-V-I-VI、走路低音、輕刷鈸）
      cafe: {
        name: '貓咪咖啡廳',
        bpm: 96,
        voice: 'epiano',
        bassVoice: 'warmbass',
        swing: 0.18,
        arpPat: 'x.x.x.x.',
        bassPat: 'x.x.x.x.',
        drum: { hat: '.x.x.x.x', snare: '....x...' },
        chords: [
          { root: 146.83, bass: 73.42, notes: [293.66, 349.23, 440.0, 523.25, 587.33] },
          { root: 196.0, bass: 98.0, notes: [293.66, 349.23, 392.0, 493.88, 587.33] },
          { root: 130.81, bass: 65.41, notes: [261.63, 329.63, 392.0, 493.88, 587.33] },
          { root: 110.0, bass: 55.0, notes: [277.18, 329.63, 440.0, 523.25, 659.25] },
          { root: 146.83, bass: 73.42, notes: [293.66, 349.23, 440.0, 523.25, 587.33] },
          { root: 196.0, bass: 98.0, notes: [293.66, 349.23, 392.0, 493.88, 587.33] },
          { root: 164.81, bass: 82.41, notes: [261.63, 329.63, 392.0, 493.88, 587.33] },
          { root: 110.0, bass: 55.0, notes: [277.18, 349.23, 440.0, 523.25, 622.25] },
        ],
        motifs: [
          [523.25, null, 587.33, 659.25, null, 587.33, 523.25, null],
          [null, 440.0, 523.25, null, 587.33, 523.25, null, 392.0],
          [659.25, 587.33, null, 523.25, 440.0, null, 523.25, 587.33],
          [null, 587.33, null, 493.88, 523.25, null, 440.0, null],
        ],
      },
      // 公園散步：明亮 C 大調、跳躍的撥弦、腳踏式的低音（烏克麗麗感）
      park: {
        name: '公園散步',
        bpm: 112,
        voice: 'pluck',
        bassVoice: 'warmbass',
        arpPat: 'x.xx.x.x',
        bassPat: 'x...x..x',
        drum: { kick: 'x.......', hat: '.x.x.x.x' },
        chirp: true,
        chords: [
          { root: 261.63, bass: 65.41, notes: [261.63, 329.63, 392.0, 523.25, 659.25] },
          { root: 196.0, bass: 98.0, notes: [246.94, 293.66, 392.0, 493.88, 587.33] },
          { root: 220.0, bass: 110.0, notes: [261.63, 329.63, 440.0, 523.25, 659.25] },
          { root: 174.61, bass: 87.31, notes: [261.63, 349.23, 440.0, 523.25, 698.46] },
        ],
        motifs: [
          [523.25, 587.33, 659.25, null, 587.33, 523.25, 392.0, null],
          [659.25, null, 587.33, 523.25, null, 440.0, 523.25, null],
          [392.0, 440.0, 523.25, 587.33, 659.25, null, 587.33, null],
          [523.25, null, 440.0, null, 392.0, 440.0, 523.25, 587.33],
        ],
      },
      // 逛街購物：輕快流行、電風琴主奏、四四拍鼓組
      street: {
        name: '逛街購物',
        bpm: 126,
        voice: 'organ',
        bassVoice: 'warmbass',
        arpPat: '.x.x.x.x',
        bassPat: 'x.x.x.x.',
        drum: { kick: 'x...x...', snare: '....x...', hat: 'x.x.x.x.' },
        chords: [
          { root: 196.0, bass: 98.0, notes: [246.94, 293.66, 392.0, 493.88, 587.33] },
          { root: 164.81, bass: 82.41, notes: [246.94, 329.63, 392.0, 493.88, 659.25] },
          { root: 130.81, bass: 65.41, notes: [261.63, 329.63, 392.0, 523.25, 659.25] },
          { root: 146.83, bass: 73.42, notes: [293.66, 369.99, 440.0, 554.37, 587.33] },
        ],
        motifs: [
          [587.33, 587.33, null, 493.88, 392.0, null, 493.88, 587.33],
          [659.25, null, 587.33, null, 493.88, 440.0, 493.88, null],
          [392.0, 493.88, 587.33, null, 659.25, 587.33, null, 493.88],
          [523.25, null, 587.33, 659.25, null, 587.33, 493.88, 440.0],
        ],
      },
      // 看電影：懸疑小調、暗色和聲襯底、放映機滴答
      cinema: {
        name: '看電影',
        bpm: 68,
        vol: 1.5,
        voice: 'bell',
        bassVoice: 'pad',
        arpPat: 'x..x..x.',
        bassPat: 'x.......',
        drum: { click: 'x...x...' },
        padChord: true,
        chords: [
          { root: 220.0, bass: 55.0, notes: [220.0, 261.63, 329.63, 440.0, 523.25] },
          { root: 174.61, bass: 43.65, notes: [220.0, 261.63, 349.23, 440.0, 523.25] },
          { root: 146.83, bass: 36.71, notes: [220.0, 293.66, 349.23, 440.0, 587.33] },
          { root: 164.81, bass: 41.2, notes: [246.94, 329.63, 415.3, 493.88, 622.25] },
        ],
        motifs: [
          [523.25, null, null, 440.0, null, 415.3, null, null],
          [null, 523.25, null, 587.33, null, null, 523.25, null],
          [440.0, null, 349.23, null, null, 293.66, null, null],
          [null, 659.25, null, null, 587.33, null, 493.88, null],
        ],
      },
      // 海邊玩水：夏日 Bossa、鋼鼓音色、沙鈴與浪聲
      beach: {
        name: '海邊玩水',
        bpm: 104,
        voice: 'steel',
        bassVoice: 'warmbass',
        arpPat: 'x.x.xx.x',
        bassPat: 'x..x.x..',
        drum: { shaker: 'x.x.x.x.', kick: 'x.....x.' },
        wave: true,
        chords: [
          { root: 293.66, bass: 73.42, notes: [293.66, 369.99, 440.0, 554.37, 659.25] },
          { root: 246.94, bass: 61.74, notes: [293.66, 369.99, 493.88, 587.33, 739.99] },
          { root: 196.0, bass: 49.0, notes: [293.66, 392.0, 493.88, 587.33, 783.99] },
          { root: 220.0, bass: 55.0, notes: [277.18, 329.63, 440.0, 554.37, 659.25] },
        ],
        motifs: [
          [587.33, null, 659.25, 739.99, null, 659.25, null, 587.33],
          [null, 493.88, 587.33, null, 659.25, null, 739.99, null],
          [739.99, null, 659.25, null, 587.33, 493.88, null, 440.0],
          [659.25, 587.33, null, 493.88, null, 587.33, 659.25, null],
        ],
      },
      // 溫泉旅行：五聲音階箏樂、緩慢、水滴聲
      onsen: {
        name: '溫泉旅行',
        bpm: 60,
        vol: 1.7,
        voice: 'koto',
        bassVoice: 'pad',
        arpPat: 'x...x...',
        bassPat: 'x.......',
        drip: true,
        padChord: true,
        chords: [
          { root: 220.0, bass: 55.0, notes: [220.0, 261.63, 329.63, 440.0, 523.25] },
          { root: 164.81, bass: 41.2, notes: [220.0, 246.94, 329.63, 440.0, 493.88] },
          { root: 174.61, bass: 43.65, notes: [220.0, 261.63, 349.23, 440.0, 523.25] },
          { root: 196.0, bass: 49.0, notes: [220.0, 293.66, 392.0, 440.0, 587.33] },
        ],
        motifs: [
          [523.25, null, null, 440.0, null, null, 392.0, null],
          [null, 440.0, null, 523.25, null, 587.33, null, null],
          [392.0, null, 440.0, null, null, 523.25, null, 440.0],
          [null, null, 587.33, null, 523.25, null, 440.0, null],
        ],
      },
      // 數獨打工：專注但不吵的音樂盒節奏
      puzzle: {
        name: '數獨打工',
        bpm: 88,
        voice: 'musicbox',
        bassVoice: 'warmbass',
        arpPat: 'xxxxxxxx',
        bassPat: 'x...x...',
        drum: { hat: '..x...x.' },
        chords: [
          { root: 261.63, bass: 65.41, notes: [261.63, 329.63, 392.0, 523.25, 659.25] },
          { root: 220.0, bass: 55.0, notes: [261.63, 329.63, 440.0, 523.25, 659.25] },
          { root: 174.61, bass: 87.31, notes: [261.63, 349.23, 440.0, 523.25, 698.46] },
          { root: 196.0, bass: 98.0, notes: [246.94, 293.66, 392.0, 493.88, 587.33] },
        ],
        motifs: [
          [659.25, null, 523.25, null, 587.33, null, 523.25, null],
          [null, 523.25, null, 440.0, null, 523.25, 587.33, null],
          [698.46, null, 587.33, 523.25, null, null, 440.0, null],
          [null, 392.0, 440.0, null, 523.25, null, 493.88, null],
        ],
      },
    };
  }

  // 取得（或建立）AudioContext 與各增益節點
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 0.45 : 0.001, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.6 : 0.001, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ==================== 音樂 (BGM) 控制 ====================
  toggleBgm() {
    this.init();
    this.bgmEnabled = !this.bgmEnabled;
    localStorage.setItem('meowdoku.bgm', this.bgmEnabled ? '1' : '0');
    if (this.bgmGain && this.ctx) {
      const targetGain = this.bgmEnabled ? 0.45 : 0.001;
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.3);
    }
    if (this.bgmEnabled && !this.isPlayingBgm) {
      this.startBgm();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meowaudiochange', { detail: { bgm: this.bgmEnabled, sfx: this.sfxEnabled, scene: this.scene } }));
    }
    return this.bgmEnabled;
  }

  toggleSfx() {
    this.init();
    this.sfxEnabled = !this.sfxEnabled;
    localStorage.setItem('meowdoku.sfx', this.sfxEnabled ? '1' : '0');
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.6 : 0.001, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meowaudiochange', { detail: { bgm: this.bgmEnabled, sfx: this.sfxEnabled, scene: this.scene } }));
    }
    return this.sfxEnabled;
  }

  // 切換場景配樂（小屋／公園／咖啡廳／商店街／電影院／海邊／溫泉／數獨）
  // 收到「同一個場景」時不重來，避免切分頁時音樂被打斷重播。
  setScene(id, { force = false } = {}) {
    // 活動代號 → 曲目代號（逛街 shopping 用商店街的曲、看電影 movie 用電影院的曲）
    const alias = { shopping: 'street', movie: 'cinema', home: 'room' };
    const want = alias[id] || id;
    const next = this.tracks[want] ? want : 'room';
    if (this.scene === next && !force) return next;
    this.scene = next;
    this.barIdx = 0;
    if (!this.isPlayingBgm || !this.ctx) return next;
    // 舊樂句淡出，換曲後淡入（避免斷得很硬）
    const now = this.ctx.currentTime;
    clearTimeout(this.bgmTimer);
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
    this.bgmGain.gain.linearRampToValueAtTime(0.001, now + 0.22);
    this.ducking = true;
    setTimeout(() => {
      if (this.scene !== next) return; // 期間又換場
      const t2 = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(t2);
      this.bgmGain.gain.setValueAtTime(0.001, t2);
      this.bgmGain.gain.linearRampToValueAtTime(this.bgmEnabled ? 0.45 : 0.001, t2 + 0.5);
      this.ducking = false;
      this.scheduleNextBar();
    }, 300);
    return next;
  }

  startBgm() {
    this.init();
    if (!this.ctx || this.isPlayingBgm) return;
    this.isPlayingBgm = true;
    this.barIdx = 0;
    this.scheduleNextBar();
  }

  stopBgm() {
    this.isPlayingBgm = false;
    clearTimeout(this.bgmTimer);
  }

  // ---- 音色表：每種樂器一組振盪器設定與包絡 ----
  playVoice(ctx, out, voice, freq, time, duration, velocity = 0.5) {
    if (!ctx || !out || !freq) return;
    try {
      const layers = {
        musicbox: [
          { type: 'sine', mult: 1, gain: 1 },
          { type: 'triangle', mult: 2, gain: 0.42 },
        ],
        epiano: [
          { type: 'triangle', mult: 1, gain: 1 },
          { type: 'sine', mult: 2.01, gain: 0.3 },
          { type: 'sine', mult: 0.5, gain: 0.22 },
        ],
        pluck: [
          { type: 'sawtooth', mult: 1, gain: 0.8 },
          { type: 'triangle', mult: 2, gain: 0.35 },
        ],
        organ: [
          { type: 'square', mult: 1, gain: 0.7 },
          { type: 'square', mult: 1.005, gain: 0.5 },
          { type: 'square', mult: 2, gain: 0.22 },
        ],
        bell: [
          { type: 'sine', mult: 1, gain: 1 },
          { type: 'sine', mult: 2.76, gain: 0.34 },
          { type: 'sine', mult: 5.4, gain: 0.12 },
        ],
        steel: [
          { type: 'sine', mult: 1, gain: 1 },
          { type: 'sine', mult: 2, gain: 0.3 },
        ],
        koto: [
          { type: 'triangle', mult: 1, gain: 1 },
          { type: 'sawtooth', mult: 2, gain: 0.2 },
        ],
        pad: [
          { type: 'sawtooth', mult: 1, gain: 0.4 },
          { type: 'sawtooth', mult: 1.008, gain: 0.34 },
          { type: 'sine', mult: 0.5, gain: 0.4 },
        ],
        warmbass: [
          { type: 'triangle', mult: 1, gain: 1 },
          { type: 'sine', mult: 0.5, gain: 0.4 },
        ],
      };
      const spec = layers[voice] || layers.musicbox;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const isPad = voice === 'pad';
      const isPluck = voice === 'pluck';
      const isBass = voice === 'warmbass';
      const peak = velocity * (isBass ? 0.24 : isPad ? 0.1 : 0.16);
      const attack = isPad ? 0.35 : isBass ? 0.03 : isPluck ? 0.006 : 0.012;
      const release = isPad ? duration * 0.8 : duration;

      filter.frequency.setValueAtTime(isBass ? 300 : isPad ? 700 : isPluck ? 2600 : 1500, time);
      filter.frequency.exponentialRampToValueAtTime(isBass ? 180 : 420, time + release);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peak, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + release);

      spec.forEach(({ type, mult, gain: g }) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq * mult, time);
        // 箏：輕微下滑；鋼鼓：顆粒感
        if (voice === 'koto') osc.frequency.linearRampToValueAtTime(freq * mult * 0.988, time + duration * 0.6);
        const og = ctx.createGain();
        og.gain.setValueAtTime(g, time);
        osc.connect(og);
        og.connect(filter);
        osc.start(time);
        osc.stop(time + release + 0.08);
      });

      if (voice === 'steel' || voice === 'koto') {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.setValueAtTime(voice === 'steel' ? 5.4 : 4.2, time);
        lg.gain.setValueAtTime(freq * 0.006, time);
        lfo.connect(lg);
        lg.connect(filter.frequency);
        lfo.start(time);
        lfo.stop(time + release + 0.08);
      }

      filter.connect(gain);
      gain.connect(out);
    } catch {}
  }

  // ---- 打擊／環境音 ----
  playPerc(ctx, out, kind, time, velocity = 1) {
    if (!ctx || !out) return;
    try {
      const mk = (dur, build) => {
        const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
        const buf = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * build(i / size);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        return src;
      };
      if (kind === 'kick') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(46, time + 0.11);
        g.gain.setValueAtTime(0.34 * velocity, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
        osc.connect(g); g.connect(out);
        osc.start(time); osc.stop(time + 0.15);
      } else if (kind === 'hat' || kind === 'shaker' || kind === 'click') {
        const dur = kind === 'click' ? 0.02 : kind === 'shaker' ? 0.06 : 0.04;
        const src = mk(dur, (p) => Math.exp(-p * (kind === 'shaker' ? 3.2 : 6)));
        const hp = ctx.createBiquadFilter();
        hp.type = kind === 'click' ? 'bandpass' : 'highpass';
        hp.frequency.setValueAtTime(kind === 'click' ? 1400 : 6200, time);
        if (kind === 'click') hp.Q.setValueAtTime(3.4, time);
        const g = ctx.createGain();
        g.gain.setValueAtTime((kind === 'click' ? 0.075 : kind === 'shaker' ? 0.03 : 0.045) * velocity, time);
        src.connect(hp); hp.connect(g); g.connect(out);
        src.start(time);
      } else if (kind === 'snare') {
        const src = mk(0.1, (p) => Math.exp(-p * 4.5));
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(1400, time);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.05 * velocity, time);
        const tone = ctx.createOscillator();
        const tg = ctx.createGain();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(210, time);
        tg.gain.setValueAtTime(0.045 * velocity, time);
        tg.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
        src.connect(hp); hp.connect(g); g.connect(out);
        tone.connect(tg); tg.connect(out);
        src.start(time); tone.start(time); tone.stop(time + 0.11);
      } else if (kind === 'drip') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, time);
        osc.frequency.exponentialRampToValueAtTime(430, time + 0.16);
        g.gain.setValueAtTime(0.09 * velocity, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
        osc.connect(g); g.connect(out);
        osc.start(time); osc.stop(time + 0.22);
      } else if (kind === 'wave') {
        const src = mk(2.6, (p) => Math.sin(Math.PI * p) * 0.9);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(900, time);
        lp.frequency.linearRampToValueAtTime(420, time + 2.6);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.075 * velocity, time);
        g.gain.linearRampToValueAtTime(0.0001, time + 2.6);
        src.connect(lp); lp.connect(g); g.connect(out);
        src.start(time);
      } else if (kind === 'chirp') {
        [2400, 3100].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, time + i * 0.07);
          osc.frequency.linearRampToValueAtTime(f * 1.25, time + i * 0.07 + 0.05);
          g.gain.setValueAtTime(0.05 * velocity, time + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.0001, time + i * 0.07 + 0.08);
          osc.connect(g); g.connect(out);
          osc.start(time + i * 0.07); osc.stop(time + i * 0.07 + 0.09);
        });
      }
    } catch {}
  }

  // ---- 排程一小節（可在即時 ctx 或離線 OfflineAudioContext 上執行）----
  renderBar(ctx, out, track, barIdx, when) {
    const beat = 60 / track.bpm;
    const half = beat / 2;
    const swing = track.swing || 0;
    const chord = track.chords[barIdx % track.chords.length];
    const motif = track.motifs[barIdx % track.motifs.length];
    const voice = track.voice || 'musicbox';
    const bassVoice = track.bassVoice || 'warmbass';
    const t8 = (i) => when + i * half + (swing && i % 2 ? swing * beat : 0);
    const vol = track.vol || 1; // 每首曲子的整體音量修正（暗色／稀疏的曲子補一點）

    // 低音
    const bassPat = track.bassPat || 'x...x...';
    for (let i = 0; i < 8; i++) {
      if (bassPat[i] === 'x') this.playVoice(ctx, out, bassVoice, chord.bass, t8(i), beat * 1.7, 0.95 * vol);
    }
    // 和弦襯底（電影院／溫泉用暗色長音）
    if (track.padChord) {
      this.playVoice(ctx, out, 'pad', chord.root, when, beat * 4, 0.5 * vol);
    }
    // 琶音 + 旋律
    const arpPat = track.arpPat || 'xxxxxxxx';
    for (let i = 0; i < 8; i++) {
      if (arpPat[i] === 'x') {
        const note = chord.notes[i % chord.notes.length];
        this.playVoice(ctx, out, voice, note, t8(i), beat * 1.15, 0.42 * vol);
      }
      const m = motif[i];
      if (m) this.playVoice(ctx, out, voice, m, t8(i), beat * 1.5, 0.62 * vol);
    }
    // 鼓／環境音
    const d = track.drum || {};
    Object.entries(d).forEach(([kind, pat]) => {
      for (let i = 0; i < 8; i++) if (pat[i] === 'x' || pat[i] === 'X') this.playPerc(ctx, out, kind, t8(i), pat[i] === 'X' ? 1.2 : 1);
    });
    if (track.drip && barIdx % 2 === 1) this.playPerc(ctx, out, 'drip', when + beat * 2.5, 0.8);
    if (track.chirp && barIdx % 4 === 2) this.playPerc(ctx, out, 'chirp', when + beat * 1.5, 0.9);
    if (track.wave && barIdx % 4 === 3) this.playPerc(ctx, out, 'wave', when + beat * 2, 1);
  }

  // 即時播放：一小節一小節往下排
  scheduleNextBar() {
    if (!this.isPlayingBgm || !this.ctx) return;
    const track = this.tracks[this.scene] || this.tracks.room;
    this.renderBar(this.ctx, this.bgmGain, track, this.barIdx, this.ctx.currentTime + 0.06);
    this.barIdx = (this.barIdx + 1) % 64;
    const barMs = (60 / track.bpm) * 4 * 1000;
    this.bgmTimer = setTimeout(() => this.scheduleNextBar(), Math.max(60, barMs - 40));
  }

  // ==================== 離線匯出（試聽用） ====================
  // 用 OfflineAudioContext 把某個場景的曲子渲染成 WAV（base64），
  // 用來存成音檔試聽／驗收，不影響正在播放的音樂。
  async exportTrack(id, seconds = 24, sampleRate = 44100) {
    const track = this.tracks[id];
    if (!track) return null;
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) return null;
    const barSec = (60 / track.bpm) * 4;
    const off = new Offline(2, Math.ceil(sampleRate * seconds), sampleRate);
    const out = off.createGain();
    out.gain.setValueAtTime(0.85, 0);
    out.connect(off.destination);
    const bars = Math.ceil(seconds / barSec);
    for (let b = 0; b < bars; b++) this.renderBar(off, out, track, b, b * barSec);
    const buf = await off.startRendering();
    return { wav: this.bufferToWavBase64(buf), seconds, bpm: track.bpm, bars };
  }

  bufferToWavBase64(buffer) {
    const numCh = buffer.numberOfChannels;
    const len = buffer.length;
    const bytes = 44 + len * numCh * 2;
    const ab = new ArrayBuffer(bytes);
    const view = new DataView(ab);
    const wstr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    wstr(0, 'RIFF');
    view.setUint32(4, bytes - 8, true);
    wstr(8, 'WAVE');
    wstr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numCh * 2, true);
    view.setUint16(32, numCh * 2, true);
    view.setUint16(34, 16, true);
    wstr(36, 'data');
    view.setUint32(40, len * numCh * 2, true);
    const chans = [];
    for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
    let off = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < numCh; c++) {
        const s = Math.max(-1, Math.min(1, chans[c][i]));
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        off += 2;
      }
    }
    let bin = '';
    const u8 = new Uint8Array(ab);
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    return btoa(bin);
  }

  // ==================== 遊戲音效 (SFX) ====================

  // 1. 放貓咪 (清脆可愛的貓叫聲或貓咪撲爪音)
  playCatPlace() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 柔和上揚的喵鳴 (520Hz -> 760Hz)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  // 2. 標記/排除打叉 (輕巧鉛筆/按鍵聲)
  playMark() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // 3. 清除單格
  playClear() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  // 4. 放錯扣小魚乾警告 (低沉失誤音)
  playError() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.22);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(360, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  // 5. 提示音 (魔幻閃耀琶音)
  playHint() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.28);
      });
    } catch {}
  }

  // 6. 勝利通關 (歡快大合奏)
  playVictory() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 783.99, d: 0.12 },
        { f: 1046.5, d: 0.35 }, { f: 880.00, d: 0.15 }, { f: 1046.5, d: 0.6 }
      ];
      let offset = 0;
      notes.forEach((n) => {
        const t = now + offset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + n.d + 0.05);
        offset += n.d * 0.85;
      });
    } catch {}
  }

  // 8. 貓咪呼嚕聲 (28Hz 低頻三角波 + 2.6Hz 呼吸調幅)
  startPurr() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || this.isPurring) return;
    try {
      const now = this.ctx.currentTime;
      this.purrOsc = this.ctx.createOscillator();
      this.purrOsc.type = 'triangle';
      this.purrOsc.frequency.setValueAtTime(29, now);

      this.purrLfo = this.ctx.createOscillator();
      this.purrLfo.type = 'sine';
      this.purrLfo.frequency.setValueAtTime(2.6, now);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.08, now);

      this.purrGain = this.ctx.createGain();
      this.purrGain.gain.setValueAtTime(0.02, now);
      this.purrGain.gain.linearRampToValueAtTime(0.14, now + 0.3);

      this.purrLfo.connect(this.purrGain.gain);
      this.purrOsc.connect(this.purrGain);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, now);

      this.purrGain.connect(filter);
      filter.connect(this.sfxGain);

      this.purrOsc.start();
      this.purrLfo.start();
      this.isPurring = true;
    } catch {}
  }

  stopPurr() {
    if (!this.ctx || !this.isPurring) return;
    try {
      const now = this.ctx.currentTime;
      if (this.purrGain) {
        this.purrGain.gain.linearRampToValueAtTime(0.001, now + 0.25);
      }
      setTimeout(() => {
        try {
          if (this.purrOsc) { this.purrOsc.stop(); this.purrOsc.disconnect(); }
          if (this.purrLfo) { this.purrLfo.stop(); this.purrLfo.disconnect(); }
        } catch {}
        this.purrOsc = null;
        this.purrLfo = null;
        this.isPurring = false;
      }, 260);
    } catch {
      this.isPurring = false;
    }
  }

  // 9. 萌萌貓叫聲
  playMeow(pitch = 1.0) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      const base = 560 * pitch;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(base * 0.85, now + 0.38);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950 * pitch, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  // 10. 鈴鐺輕響 (逗貓棒 / 項圈)
  playJingle() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [2200, 2900, 3700].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.03);

        gain.gain.setValueAtTime(0.06, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.25);
      });
    } catch {}
  }

  // 11. 鏟砂沙沙聲
  playSand() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.17);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start();
    } catch {}
  }

  // 12. 歡呼音效
  playCheer() {
    this.playVictory();
  }

  // 13. 相機快門聲 (拍照留念)
  playShutter() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 反光鏡彈起
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.04);
      oscGain.gain.setValueAtTime(0.3, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.05);

      // 機械快門聲
      const bufSize = Math.floor(this.ctx.sampleRate * 0.09);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now + 0.025);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      noise.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(now + 0.025);
    } catch {}
  }

  // 14. 金幣叮噹聲
  playCoin() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  // 15. 測驗答對叮咚音效
  playQuizCorrect() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [
        { f: 523.25, t: 0 },
        { f: 659.25, t: 0.09 },
        { f: 783.99, t: 0.18 },
        { f: 1046.50, t: 0.28 }
      ].forEach(({ f, t }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.15, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + t);
        osc.stop(now + t + 0.3);
      });
    } catch {}
  }
}

export const audio = new MeowAudioEngine();
