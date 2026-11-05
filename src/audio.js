// Procedural combat audio. No external assets: everything is synthesized on demand.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.62;
    this.muted = false;
    this.noise = null;
    this.ambientStarted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);

    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    this.noise = buffer;
    this.startAmbient();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
  }

  startAmbient() {
    if (this.ambientStarted || !this.ctx) return;
    this.ambientStarted = true;
    const ctx = this.ctx;

    // Wind bed
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.075;
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();

    // Low compound hum
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 48;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 120;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.018;
    hum.connect(humFilter).connect(humGain).connect(this.master);
    hum.start();

    const hum2 = ctx.createOscillator();
    hum2.type = 'sine';
    hum2.frequency.value = 97;
    const hum2Gain = ctx.createGain();
    hum2Gain.gain.value = 0.009;
    hum2.connect(hum2Gain).connect(this.master);
    hum2.start();
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  burst({ duration = 0.18, volume = 0.5, filter = 1800, type = 'lowpass', pan = 0, pitch = 1 }) {
    if (!this.ctx) return;
    const t = this.t;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = pitch;
    const bq = this.ctx.createBiquadFilter();
    bq.type = type;
    bq.frequency.setValueAtTime(filter, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(120, filter * 0.25), t + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(bq).connect(gain).connect(panner).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  tone({ freq = 120, end = 40, duration = 0.16, volume = 0.3, type = 'sine', pan = 0 }) {
    if (!this.ctx) return;
    const t = this.t;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(12, end), t + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(gain).connect(panner).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  shot(pan = 0) {
    this.burst({ duration: 0.14, volume: 0.72, filter: 3400, type: 'lowpass', pan });
    this.tone({ freq: 155, end: 46, duration: 0.17, volume: 0.5, type: 'square', pan });
    this.tone({ freq: 920, end: 190, duration: 0.055, volume: 0.15, type: 'sawtooth', pan });
    this.burst({ duration: 0.34, volume: 0.13, filter: 900, type: 'lowpass', pan });
  }

  enemyShot(volume = 0.3, pan = 0) {
    this.burst({ duration: 0.12, volume: volume * 0.9, filter: 2600, type: 'bandpass', pan, pitch: 0.9 });
    this.tone({ freq: 120, end: 42, duration: 0.14, volume: volume * 0.45, type: 'square', pan });
  }

  dryFire() {
    this.burst({ duration: 0.045, volume: 0.18, filter: 2600, type: 'highpass' });
    this.tone({ freq: 620, end: 300, duration: 0.05, volume: 0.05, type: 'square' });
  }

  reload() {
    if (!this.ctx) return;
    const clicks = [[0, 0.05], [0.28, 0.045], [0.52, 0.05], [0.86, 0.035]];
    for (const [delay, dur] of clicks) {
      setTimeout(() => {
        if (!this.ctx) return;
        this.burst({ duration: dur, volume: 0.16, filter: 3400, type: 'highpass' });
        this.tone({ freq: 780, end: 420, duration: dur, volume: 0.045, type: 'square' });
      }, delay * 1000);
    }
  }

  hit() {
    this.tone({ freq: 1600, end: 1150, duration: 0.055, volume: 0.16, type: 'square' });
  }

  headshot() {
    this.tone({ freq: 2100, end: 1400, duration: 0.07, volume: 0.2, type: 'square' });
    this.tone({ freq: 2600, end: 1800, duration: 0.09, volume: 0.1, type: 'sine' });
  }

  kill() {
    this.tone({ freq: 520, end: 300, duration: 0.1, volume: 0.11, type: 'triangle' });
    setTimeout(() => this.tone({ freq: 760, end: 520, duration: 0.09, volume: 0.08, type: 'triangle' }), 55);
  }

  footstep(intensity = 0.12) {
    this.burst({ duration: 0.095, volume: intensity, filter: 420, type: 'lowpass', pitch: 0.6 + Math.random() * 0.2 });
    this.tone({ freq: 90, end: 48, duration: 0.07, volume: intensity * 0.4, type: 'sine' });
  }

  impact() {
    this.burst({ duration: 0.07, volume: 0.18, filter: 4600, type: 'highpass', pitch: 1.4 });
    this.tone({ freq: 300, end: 90, duration: 0.06, volume: 0.08, type: 'triangle' });
  }

  explosion() {
    this.burst({ duration: 1.2, volume: 0.95, filter: 2200, type: 'lowpass', pitch: 0.45 });
    this.tone({ freq: 95, end: 22, duration: 0.9, volume: 0.7, type: 'sine' });
    this.tone({ freq: 70, end: 18, duration: 1.25, volume: 0.5, type: 'triangle' });
    this.burst({ duration: 0.2, volume: 0.55, filter: 5200, type: 'highpass', pitch: 1.8 });
  }

  pickup() {
    this.tone({ freq: 660, end: 990, duration: 0.13, volume: 0.11, type: 'sine' });
    setTimeout(() => this.tone({ freq: 990, end: 1320, duration: 0.16, volume: 0.08, type: 'sine' }), 80);
  }

  wave() {
    if (!this.ctx) return;
    const t = this.t;
    for (const [freq, when] of [[220, 0], [277, 0.18], [330, 0.36]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + when);
      g.gain.linearRampToValueAtTime(0.055, t + when + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + when + 0.5);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      osc.connect(filter).connect(g).connect(this.master);
      osc.start(t + when);
      osc.stop(t + when + 0.55);
    }
  }

  hurt() {
    this.tone({ freq: 140, end: 60, duration: 0.22, volume: 0.2, type: 'sawtooth' });
    this.burst({ duration: 0.12, volume: 0.12, filter: 700, type: 'lowpass' });
  }

  ui() {
    this.tone({ freq: 900, end: 680, duration: 0.05, volume: 0.05, type: 'square' });
  }
}
