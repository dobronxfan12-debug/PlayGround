// Lightweight procedural sound effects — no external assets.
export class Sound {
  constructor() {
    this.ctx = null
    this.master = null
    this.enabled = true
    this.noiseBuffer = null
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
      return
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    try {
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.enabled ? 0.55 : 0
      this.master.connect(this.ctx.destination)
      const length = Math.floor(this.ctx.sampleRate * 0.6)
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    } catch {
      this.ctx = null
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled
    if (this.master) this.master.gain.value = enabled ? 0.55 : 0
    if (enabled) this.init()
  }

  tone({ freq = 440, dur = 0.15, type = 'sine', gain = 0.18, when = 0, slide = null, attack = 0.008, release = null }) {
    if (!this.ctx || !this.enabled) return
    const t = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (release || 0))
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + (release || 0) + 0.03)
  }

  noise({ dur = 0.2, gain = 0.12, when = 0, filter = 1200, q = 0.7, type = 'lowpass' }) {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return
    const t = this.ctx.currentTime + when
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = filter
    f.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  click() {
    this.tone({ freq: 620, slide: 520, dur: 0.06, type: 'triangle', gain: 0.07 })
  }

  error() {
    this.tone({ freq: 150, slide: 110, dur: 0.16, type: 'sawtooth', gain: 0.06 })
  }

  collect(full = false) {
    const base = full ? 523.25 : 440
    this.noise({ dur: 0.28, gain: 0.1, filter: 900 })
    this.tone({ freq: base, dur: 0.22, type: 'triangle', gain: 0.13 })
    this.tone({ freq: base * 1.25, dur: 0.24, type: 'sine', gain: 0.11, when: 0.06 })
    this.tone({ freq: base * 1.5, dur: 0.32, type: 'sine', gain: 0.1, when: 0.13 })
    if (full) this.tone({ freq: base * 2, dur: 0.4, type: 'triangle', gain: 0.08, when: 0.21 })
  }

  autoCollect() {
    this.tone({ freq: 880, slide: 1320, dur: 0.12, type: 'sine', gain: 0.06 })
  }

  buy() {
    this.tone({ freq: 392, dur: 0.12, type: 'triangle', gain: 0.1 })
    this.tone({ freq: 587.33, dur: 0.18, type: 'triangle', gain: 0.1, when: 0.08 })
    this.tone({ freq: 783.99, dur: 0.3, type: 'sine', gain: 0.08, when: 0.16 })
  }

  beeBuy() {
    this.tone({ freq: 300, slide: 520, dur: 0.16, type: 'sawtooth', gain: 0.045 })
    this.tone({ freq: 660, dur: 0.18, type: 'triangle', gain: 0.08, when: 0.08 })
  }

  zone() {
    this.noise({ dur: 0.7, gain: 0.09, filter: 600, q: 0.4 })
    this.tone({ freq: 261.63, dur: 0.5, type: 'sine', gain: 0.08 })
    this.tone({ freq: 392, dur: 0.6, type: 'sine', gain: 0.07, when: 0.1 })
    this.tone({ freq: 523.25, dur: 0.8, type: 'sine', gain: 0.06, when: 0.2 })
  }

  rebirth() {
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99]
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.7, type: 'triangle', gain: 0.09, when: i * 0.09 }))
    this.noise({ dur: 1.1, gain: 0.08, filter: 2400, q: 0.3 })
    this.tone({ freq: 1046.5, dur: 1.4, type: 'sine', gain: 0.07, when: 0.55 })
  }

  full() {
    this.tone({ freq: 783.99, dur: 0.18, type: 'triangle', gain: 0.08 })
    this.tone({ freq: 1046.5, dur: 0.3, type: 'sine', gain: 0.06, when: 0.1 })
  }
}
