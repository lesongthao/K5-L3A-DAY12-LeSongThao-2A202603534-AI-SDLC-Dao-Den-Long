/** Bộ tổng hợp âm thanh thiên nhiên & hiệu ứng chiến đấu bằng Web Audio API (0 asset ngoài). */
export class AmbienceEngine {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastCricket = 0;
  private lastStep = 0;
  private lastFirefly = 0;

  init(ctx: AudioContext, master: GainNode): void {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.85;
    this.out.connect(master);

    // Tạo 2 giây White Noise dùng chung cho gió rít, tiếng cỏ lay & vung gậy
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.950 * b2 + w * 0.048;
      data[i] = (b0 + b1 + b2 + w * 0.04) * 0.65;
    }

    // Kênh gió thổi liên tục qua bộ lọc Bandpass
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.noiseBuf;
    windSrc.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 340;
    this.windFilter.Q.value = 2.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0001;
    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.out);
    windSrc.start();
  }

  /** Cập nhật âm thanh môi trường theo trạng thái thật của game: gió rít, côn trùng, cỏ lay, đom đóm. */
  update(playing: boolean, windState: 'calm' | 'warn' | 'strong', moving: boolean, nearMote: boolean, time: number): void {
    if (!this.ctx || !this.out || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 1. Tiếng gió rít thay đổi êm ái theo windState
    if (this.windGain && this.windFilter) {
      const targetVol = !playing ? 0.03 : windState === 'strong' ? 0.34 : windState === 'warn' ? 0.16 : 0.065;
      const targetFreq = windState === 'strong' ? 820 + Math.sin(time * 0.004) * 210 : windState === 'warn' ? 520 : 320 + Math.sin(time * 0.001) * 60;
      this.windGain.gain.setTargetAtTime(targetVol, now, 0.35);
      this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.25);
    }

    if (!playing) return;

    // 2. Tiếng cỏ xào xạc khi Bé Mây chạy trên thảm cỏ
    if (moving && time - this.lastStep > 230) {
      this.lastStep = time;
      this.playNoiseBurst(1600, 1.4, 0.065, 0.055);
    }

    // 3. Tiếng côn trùng đêm (dế gáy nhè nhẹ theo chu kỳ tự nhiên)
    if (time - this.lastCricket > 2400) {
      this.lastCricket = time + (Math.sin(time) * 600);
      this.playCricket(now);
    }

    // 4. Tiếng chuông pha lê li ti của đom đóm khi đứng gần
    if (nearMote && time - this.lastFirefly > 1700) {
      this.lastFirefly = time;
      this.playSparkChime(now);
    }
  }

  playAttackSwing(hitCount: number): void {
    if (!this.ctx || !this.out || this.ctx.state !== 'running') return;
    this.playNoiseBurst(920, 2.2, 0.16, 0.18);
    const now = this.ctx.currentTime;
    this.tone(520, 310, 0.14, 0.11, 'triangle', now);
    if (hitCount > 0) {
      this.tone(784, 1174, 0.24, 0.16, 'sine', now + 0.03);
      this.playNoiseBurst(520, 1.2, 0.2, 0.12);
    }
  }

  playDashWhoosh(): void {
    if (!this.ctx || !this.out || this.ctx.state !== 'running') return;
    this.playNoiseBurst(1250, 1.8, 0.22, 0.2);
  }

  private playNoiseBurst(freq: number, q: number, peak: number, dur: number): void {
    if (!this.ctx || !this.out || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(), t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out);
    src.start(t, Math.random() * 1.2, dur + 0.02);
  }

  private playCricket(t: number): void {
    if (!this.ctx || !this.out) return;
    for (let i = 0; i < 3; i++) {
      this.tone(4250, 4380, 0.045, 0.024, 'sine', t + i * 0.085);
    }
  }

  private playSparkChime(t: number): void {
    this.tone(1568, 1760, 0.18, 0.038, 'sine', t);
    this.tone(2093, 2093, 0.22, 0.028, 'sine', t + 0.09);
  }

  private tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType, at: number): void {
    if (!this.ctx || !this.out) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(this.out);
    o.start(at); o.stop(at + dur + 0.02);
  }
}
