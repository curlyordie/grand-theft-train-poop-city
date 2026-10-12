/** Original synthesised placeholder effects; no sampled or licensed recordings. */
export class AudioSystem {
  context?: AudioContext;
  volume = .35;
  engine?: OscillatorNode;
  gain?: GainNode;
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
    if (!this.engine) {
      this.engine = this.context.createOscillator(); this.gain = this.context.createGain();
      this.engine.type = 'sawtooth'; this.engine.frequency.value = 45; this.gain.gain.value = 0;
      const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 170;
      this.engine.connect(filter).connect(this.gain).connect(this.context.destination); this.engine.start();
    }
  }
  tone(frequency: number, duration = .1, type: OscillatorType = 'sine', strength = .1) {
    if (!this.context || this.context.state !== 'running') return;
    const o = this.context.createOscillator(), g = this.context.createGain(), t = this.context.currentTime;
    o.type = type; o.frequency.setValueAtTime(frequency, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, frequency / 2), t + duration);
    g.gain.setValueAtTime(strength * this.volume, t); g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(g).connect(this.context.destination); o.start(); o.stop(t + duration);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  updateEngine(speed: number, driving: boolean) {
    if (!this.context || !this.engine || !this.gain) return;
    this.engine.frequency.setTargetAtTime(43 + Math.abs(speed) * 3.5, this.context.currentTime, .08);
    this.gain.gain.setTargetAtTime(driving ? this.volume * .09 : 0, this.context.currentTime, .08);
  }
}
