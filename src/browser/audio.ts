import type { GameEvent } from '../core/types.js';
import { AmbienceEngine } from './ambience.js';

/** Bộ tổng hợp nhạc nền Ngũ Cung có vang dịu + hiệu ứng sự kiện + âm thanh thiên nhiên. */
export class Soundscape {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private delay: DelayNode | null = null;
  private ambience = new AmbienceEngine();
  private volume = 0.5;
  private lastBeat = 0;
  private beat = 0;
  readonly played = new Set<string>();

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);

      // Bộ vang nhẹ (Delay Reverb) làm nhạc nền huyền ảo như tiếng chuông ngân trên biển mây
      this.music = this.context.createGain();
      this.music.gain.value = 0.26;
      this.delay = this.context.createDelay(0.6);
      this.delay.delayTime.value = 0.34;
      const fb = this.context.createGain();
      fb.gain.value = 0.32;
      this.music.connect(this.master);
      this.music.connect(this.delay);
      this.delay.connect(fb);
      fb.connect(this.delay);
      this.delay.connect(this.master);

      this.ambience.init(this.context, this.master);
    }
    await this.context.resume();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private note(freq: number, duration: number, delay = 0, volume = 0.13, type: OscillatorType = 'sine', music = false): void {
    const ctx = this.context, target = music ? this.music : this.master;
    if (!ctx || !target || ctx.state !== 'running') return;
    const osc = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain); gain.connect(target);
    osc.start(at); osc.stop(at + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  play(name: string): void {
    this.played.add(name);
    if (name === 'dash') this.ambience.playDashWhoosh();
    const sequences: Record<string, number[]> = {
      mote_picked: [880, 1174, 1568],
      lantern_lit: [392, 494, 587, 784, 988],
      refuel: [523, 659, 784],
      lantern_out: [330, 247, 196],
      pulse: [220, 440, 660, 880],
      player_hit: [170, 110],
      jump: [330, 494],
      dash: [440, 740],
      won: [523, 659, 784, 1046, 1318],
      lost: [294, 247, 196],
      shade_spawned: [130, 138],
      countdown: [660],
      charm_picked: [698, 880, 1046],
      wind: [180, 220],
      drifter_steal: [440, 294],
      drifter_drop: [587, 784]
    };
    (sequences[name] ?? []).forEach((f, i) =>
      this.note(f, name === 'pulse' ? 0.45 : 0.24, i * 0.08, 0.11, name === 'player_hit' ? 'triangle' : 'sine')
    );
  }

  playAttack(hitCount: number): void {
    this.ambience.playAttackSwing(hitCount);
  }

  events(events: GameEvent[]): void {
    for (const e of events) this.play(e.name === 'game_over' ? String(e.data.result) : e.name);
  }

  update(
    playing: boolean, time: number,
    env: { wind: 'calm' | 'warn' | 'strong'; moving: boolean; nearMote: boolean } = { wind: 'calm', moving: false, nearMote: false }
  ): void {
    if (!this.context) return;
    if (this.music && this.context.state === 'running') {
      this.music.gain.setTargetAtTime(playing ? 0.26 : 0.08, this.context.currentTime, 0.25);
    }
    this.ambience.update(playing, env.wind, env.moving, env.nearMote, time);

    if (!playing || time - this.lastBeat < 560) return;
    this.lastBeat = time;

    // Giai điệu Ngũ Cung Đêm Á Đông (C5-D5-E5-G5-A5) kết hợp hợp âm Pad trầm ấm
    const melody = [392.0, 440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 440.0, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 293.66, 329.63];
    const bass = [130.81, 146.83, 164.81, 196.0];
    const step = this.beat++;
    this.note(melody[step % melody.length], 1.45, 0, 0.09, 'triangle', true);
    if (step % 4 === 0) {
      const b = bass[Math.floor(step / 4) % bass.length];
      this.note(b, 2.5, 0, 0.08, 'sine', true);
      this.note(b * 1.5, 2.2, 0.06, 0.05, 'sine', true);
    }
  }

  status(): string {
    return this.context?.state ?? 'not-started';
  }
}
