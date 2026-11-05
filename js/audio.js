// ---------------------------------------------------------------------------
// A tiny procedural sound studio. No audio files, just paper and air.
// ---------------------------------------------------------------------------

export class SoundStudio {
  constructor (settings = {}) {
    this.settings = { sfx: true, music: true, ...settings };
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.noiseBuffer = null;
    this.started = false;
    this.mood = 'forest';
    this._foldSrc = null;
    this._foldGain = null;
    this._foldFilter = null;
    this._musicTimer = null;
    this._pad = [];
    this._nextNote = 0;
  }

  unlock () {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.settings.sfx ? 0.9 : 0;
      this.sfxBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.settings.music ? 0.55 : 0;
      this.musicBus.connect(this.master);

      const len = Math.floor(this.ctx.sampleRate * 2);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.7 + white * 0.3;
        data[i] = last;
      }
      this.noiseBuffer = buffer;

      this.started = true;
      this._startMusic();
      this._startPad();
    } catch (e) {
      console.warn('Audio unavailable', e);
    }
  }

  setSettings (settings) {
    this.settings = { ...this.settings, ...settings };
    if (!this.ctx) return;
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx ? 0.9 : 0, this.ctx.currentTime, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.music ? 0.55 : 0, this.ctx.currentTime, 0.2);
  }

  setMood (mood) {
    this.mood = mood;
    if (!this.ctx) return;
    const roots = { forest: 196, frost: 220, city: 174.61, sky: 246.94, cosmic: 164.81 };
    const root = roots[mood] || 196;
    this._pad.forEach(({ osc, ratio }, i) => {
      osc.frequency.setTargetAtTime(root * ratio, this.ctx.currentTime, 1.1);
    });
    this._startMusic();
  }

  _startPad () {
    if (!this.ctx || this._pad.length) return;
    const roots = { forest: 196, frost: 220, city: 174.61, sky: 246.94, cosmic: 164.81 };
    const root = roots[this.mood] || 196;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 540;
    filter.Q.value = 0.4;
    const bus = this.ctx.createGain();
    bus.gain.value = 0.028;
    filter.connect(bus);
    bus.connect(this.musicBus);
    [1, 1.5, 2.01].forEach((ratio, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.value = root * ratio;
      const g = this.ctx.createGain();
      g.gain.value = i === 0 ? 0.8 : 0.32;
      osc.connect(g); g.connect(filter);
      osc.start();
      this._pad.push({ osc, ratio });
    });
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start();
  }

  _startMusic () {
    if (!this.ctx) return;
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = setInterval(() => {
      if (!this.started || !this.settings.music) return;
      if (this.ctx.state !== 'running') return;
      if (Math.random() < 0.44) this._pluck();
    }, 3200);
  }

  _pluck () {
    if (!this.ctx) return;
    const scales = {
      forest: [392, 440, 493.88, 587.33, 659.25, 783.99],
      frost: [440, 523.25, 587.33, 659.25, 783.99, 880],
      city: [349.23, 392, 440, 523.25, 587.33, 698.46],
      sky: [493.88, 587.33, 659.25, 739.99, 880, 987.77],
      cosmic: [329.63, 392, 440, 493.88, 587.33, 659.25],
    };
    const scale = scales[this.mood] || scales.forest;
    const note = scale[Math.floor(Math.random() * scale.length)];
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const delay = this.ctx.createDelay(1.2);
    const fb = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    delay.delayTime.value = 0.38;
    fb.gain.value = 0.28;
    osc.type = 'triangle';
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.055, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    osc.connect(gain); gain.connect(filter); filter.connect(this.musicBus);
    filter.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(this.musicBus);
    osc.start(t); osc.stop(t + 1.8);
  }

  _env (node, t, a, d, peak, sustain = 0) {
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d);
  }

  tone (freq, { dur = 0.25, type = 'sine', gain = 0.12, when = 0, slide = 0, bus = null } = {}) {
    if (!this.ctx || !this.settings.sfx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    this._env(g, t, 0.008, dur, gain);
    osc.connect(g); g.connect(bus || this.sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  noise ({ dur = 0.3, gain = 0.1, freq = 900, q = 1.2, type = 'bandpass', when = 0, slide = 0, bus = null } = {}) {
    if (!this.ctx || !this.noiseBuffer || !this.settings.sfx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    if (slide) filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), t + dur);
    const g = this.ctx.createGain();
    this._env(g, t, 0.01, dur, gain);
    src.connect(filter); filter.connect(g); g.connect(bus || this.sfxBus);
    src.start(t); src.stop(t + dur + 0.05);
  }

  click () {
    this.tone(680, { dur: 0.055, type: 'triangle', gain: 0.06 });
    this.tone(980, { dur: 0.04, type: 'sine', gain: 0.03, when: 0.03 });
  }

  swish (strong = false) {
    this.noise({ dur: strong ? 0.5 : 0.3, gain: strong ? 0.12 : 0.07, freq: 1700, slide: -1100, q: 1.6 });
  }

  crease () {
    this.noise({ dur: 0.16, gain: 0.07, freq: 1300, slide: 1400, q: 2.4 });
    this.tone(430, { dur: 0.09, type: 'triangle', gain: 0.035, slide: 60 });
  }

  snap (angle = 90) {
    this.noise({ dur: 0.09, gain: 0.1, freq: 700, q: 0.8, type: 'lowpass' });
    this.tone(angle >= 170 ? 120 : 180, { dur: 0.19, type: 'sine', gain: 0.09, slide: -30 });
    if (angle >= 170) this.tone(70, { dur: 0.3, type: 'sine', gain: 0.06 });
  }

  unfold () {
    this.noise({ dur: 0.25, gain: 0.06, freq: 900, slide: 600, q: 1.2 });
  }

  step () {
    this.noise({ dur: 0.055, gain: 0.022, freq: 950, q: 1.6, type: 'bandpass' });
  }

  star () {
    const notes = [783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((n, i) => {
      this.tone(n, { dur: 0.5, type: 'sine', gain: 0.08, when: i * 0.075 });
      this.tone(n * 2, { dur: 0.3, type: 'triangle', gain: 0.025, when: i * 0.075 + 0.01 });
    });
    this.tone(392, { dur: 0.8, type: 'sine', gain: 0.04 });
  }

  portal () {
    const chord = [261.63, 329.63, 392, 523.25, 659.25];
    chord.forEach((n, i) => {
      this.tone(n, { dur: 1.2 - i * 0.06, type: 'sine', gain: 0.06, when: i * 0.035 });
      this.tone(n * 2, { dur: 0.8, type: 'triangle', gain: 0.018, when: i * 0.04 });
    });
  }

  error () {
    this.tone(150, { dur: 0.22, type: 'sawtooth', gain: 0.04, slide: -40 });
    this.tone(110, { dur: 0.3, type: 'sine', gain: 0.05 });
  }

  fall () {
    this.tone(420, { dur: 0.7, type: 'sine', gain: 0.05, slide: -320 });
    this.noise({ dur: 0.55, gain: 0.04, freq: 900, slide: -500 });
  }

  trapped () {
    this.noise({ dur: 0.7, gain: 0.08, freq: 500, slide: -350, type: 'lowpass', q: 0.7 });
    this.tone(90, { dur: 0.6, type: 'sine', gain: 0.05 });
  }

  startFold () {
    if (!this.ctx) return;
    this.stopFold();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(filter); filter.connect(g); g.connect(this.sfxBus);
    src.start();
    this._foldSrc = src;
    this._foldGain = g;
    this._foldFilter = filter;
    g.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.05);
  }

  updateFold (progress) {
    if (!this.ctx || !this._foldFilter) return;
    const p = Math.max(0, Math.min(1, progress));
    this._foldFilter.frequency.setTargetAtTime(420 + p * 1500, this.ctx.currentTime, 0.05);
    this._foldGain.gain.setTargetAtTime(0.018 + p * 0.04, this.ctx.currentTime, 0.06);
  }

  stopFold () {
    if (!this.ctx || !this._foldSrc) return;
    try {
      this._foldGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.07);
      this._foldSrc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
    this._foldSrc = null;
    this._foldGain = null;
    this._foldFilter = null;
  }
}
