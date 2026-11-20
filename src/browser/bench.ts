import type { GameState, Shade, Mote, Tuning } from '../core/types.js';
import { createGame } from '../core/game.js';
import { updateShades } from '../core/enemies.js';
import { seeded } from '../core/math.js';

export interface BenchResult {
  contract_version: string;
  avg_fps: number;
  p1_low_fps: number;
  frame_ms_p95: number;
  frames: number;
  load_ms: number;
  peak_mem_mb: number | null;
  vsync_off: boolean;
  renderer: string;
  os: string;
}

/** Dựng cảnh Benchmark chuẩn Ticket-04: Đêm 1, 200 Shades wander, 100 Motes, L1–L3 sáng 100 fuel. */
export function setupBenchGame(seed: number, tuning: Tuning): GameState {
  const game = createGame({ seed, night: 1, tuning });
  const rng = seeded(seed);

  game.randomMotes = false;
  game.randomShades = false;
  game.randomDrifters = false;
  game.windEnabled = false;

  game.player.pos = [0, 0, 0];
  game.player.vel = [0, 0, 0];

  // Đèn L1–L3 đang sáng với fuel 100; L4–L5 tắt
  for (let i = 0; i < game.lanterns.length; i++) {
    const l = game.lanterns[i];
    if (i < 3) {
      l.lit = true;
      l.fuelTicks = 100 * 60;
      l.deposited = tuning.lantern_cost;
      l.everLit = true;
    } else {
      l.lit = false;
      l.fuelTicks = 0;
      l.deposited = 0;
    }
  }

  // Sinh đúng 200 Bóng Mực ở trạng thái wander rải đều trên Đảo Bến (bán kính <= 37m)
  const shades: Shade[] = [];
  for (let i = 0; i < 200; i++) {
    const r = 7 + Math.sqrt(rng()) * 30;
    const theta = rng() * Math.PI * 2;
    shades.push({
      id: `bench_s${i + 1}`,
      pos: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
      state: 'wander',
      timer: 0,
      pushDir: [0, 0],
      pushLeft: 0,
      eject: 0,
      ejectDir: [0, 0],
      ejectStep: 0,
      targetLanternId: 'L4',
      drainTicks: 0
    });
  }
  game.shades = shades;

  // Sinh đúng 100 đom đóm
  const motes: Mote[] = [];
  for (let i = 0; i < 100; i++) {
    const r = 2 + Math.sqrt(rng()) * 35;
    const theta = rng() * Math.PI * 2;
    motes.push({
      id: `bench_m${i + 1}`,
      pos: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
      kind: 'random',
      ttl: null,
      born: 0
    });
  }
  game.motes = motes;
  return game;
}

/** Bước mô phỏng chuẩn Benchmark: chỉ di chuyển Bóng Mực theo wander, tắt hao dầu/nhặt/sát thương/spawn. */
export function stepBenchGame(game: GameState): void {
  game.tick++;
  game.simTick++;
  game.player.pos = [0, 0, 0];
  game.player.respawn = 1; // Bóng Mực không chase Mây trong bench, chỉ wander bình thường
  updateShades(game);
}

export class BenchCollector {
  private warmupMs = 3000;
  private durationMs: number;
  private startTime = 0;
  private warmupDone = false;
  private frameDts: number[] = [];
  private lastTime = 0;
  private firstFrameReported = false;
  isDone = false;
  result: BenchResult | null = null;

  constructor(durationSec = 30) {
    this.durationMs = durationSec * 1000;
  }

  recordFrame(now: number, rendererInfo: string): BenchResult | null {
    if (!this.firstFrameReported) {
      this.firstFrameReported = true;
      (window as unknown as { __BENCH_FIRST_FRAME__: boolean }).__BENCH_FIRST_FRAME__ = true;
    }
    if (this.isDone) return this.result;

    if (!this.startTime) {
      this.startTime = now;
      this.lastTime = now;
      return null;
    }

    const elapsed = now - this.startTime;
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (elapsed < this.warmupMs) return null;
    if (!this.warmupDone) { this.warmupDone = true; this.frameDts = []; }
    if (dt > 0) this.frameDts.push(dt);

    if (elapsed >= this.warmupMs + this.durationMs) {
      this.isDone = true;
      const n = Math.max(1, this.frameDts.length);
      const totalDt = this.frameDts.reduce((a, b) => a + b, 0);
      const avgFps = totalDt > 0 ? (1000 * n) / totalDt : 0;

      const sortedDesc = [...this.frameDts].sort((a, b) => b - a);
      const k = Math.max(1, Math.ceil(0.01 * n));
      const avgTopK = sortedDesc.slice(0, k).reduce((a, b) => a + b, 0) / k;
      const p1LowFps = avgTopK > 0 ? 1000 / avgTopK : 0;

      const sortedAsc = [...this.frameDts].sort((a, b) => a - b);
      const p95 = sortedAsc[Math.min(n - 1, Math.floor(0.95 * n))] ?? 16.6;

      this.result = {
        contract_version: '1.3',
        avg_fps: Math.round(avgFps * 10) / 10,
        p1_low_fps: Math.round(p1LowFps * 10) / 10,
        frame_ms_p95: Math.round(p95 * 10) / 10,
        frames: n,
        load_ms: Math.round(performance.now()),
        peak_mem_mb: null,
        vsync_off: true,
        renderer: rendererInfo,
        os: navigator.userAgent
      };
      (window as unknown as { __BENCH_RESULT__: BenchResult; __BENCH_DONE__: boolean }).__BENCH_RESULT__ = this.result;
      (window as unknown as { __BENCH_DONE__: boolean }).__BENCH_DONE__ = true;
      return this.result;
    }
    return null;
  }
}
