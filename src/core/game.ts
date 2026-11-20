import { emptyInput } from './types.js';
import type { GameState, InputState, GameEvent } from './types.js';
import { updateCounters, movePlayer } from './player.js';
import { pickup, deposit, pulse } from './items.js';
import { safeZones, updateShades, updateDrifters, contacts } from './enemies.js';
import { updateWind, spawnEntities } from './spawn.js';
import { emit } from './events.js';
import { distXZ, round1 } from './math.js';
export { createGame } from './world.js';
export { snapshot } from './snapshot.js';

function updateLanternFuel(s: GameState, events: GameEvent[]): void {
  const t = s.tuning;
  for (const l of s.lanterns) {
    if (!l.lit) continue;
    let decayTicks = Math.round(t.fuel_decay_per_s);
    for (const sh of s.shades) {
      if (sh.state === 'drain') {
        const isTarget = sh.targetLanternId ? sh.targetLanternId === l.id : distXZ(sh.pos, l.pos) <= 2 + 1e-9;
        if (isTarget) {
          decayTicks += Math.round(t.drain_per_s);
          sh.drainTicks = (sh.drainTicks || 0) + 1;
          if (sh.drainTicks % 60 === 0) {
            emit(s, events, 'fuel_drain', {
              lantern_id: l.id, shade_id: sh.id,
              fuel: round1(Math.max(0, l.fuelTicks - decayTicks) / 60)
            });
          }
        }
      }
    }
    l.fuelTicks -= decayTicks;
    if (l.fuelTicks <= 0) {
      l.fuelTicks = 0;
      l.lit = false;
      l.deposited = 0;
      l.everLit = true;
      emit(s, events, 'lantern_out', { lantern_id: l.id });
      for (const sh of s.shades) {
        if (sh.state === 'drain' && (sh.targetLanternId === l.id || distXZ(sh.pos, l.pos) <= 2 + 1e-9)) {
          sh.state = 'wander'; sh.targetLanternId = undefined;
        }
      }
    }
  }
}

export function step(state: GameState, patch: Partial<InputState>): { state: GameState; events: GameEvent[] } {
  const s = state, events: GameEvent[] = [];
  if (s.state === 'won' || s.state === 'lost') return { state: s, events };
  s.tick++;
  const input: InputState = { ...s.lastInput, ...patch, move: patch.move ? [...patch.move] : [...s.lastInput.move] };
  const edges = emptyInput();
  for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause'] as const) edges[key] = input[key] && !s.lastInput[key];
  s.lastInput = input;
  if (edges.pause) {
    s.state = s.state === 'paused' ? 'playing' : 'paused'; emit(s, events, s.state === 'paused' ? 'paused' : 'resumed');
  }
  if (s.state === 'paused') return { state: s, events };
  s.simTick++;
  if (s.simTick === 1) emit(s, events, 'night_start', { night: s.night });

  updateCounters(s);
  s.timeLeft = Math.max(0, s.initialTime - s.simTick / 60);
  updateWind(s);
  movePlayer(s, input, edges, events);
  updateLanternFuel(s, events);
  pickup(s, events);
  if (edges.interact) deposit(s, events);
  safeZones(s);
  if (edges.pulse) pulse(s, events);
  updateShades(s);
  updateDrifters(s);
  contacts(s, events);
  spawnEntities(s, events);

  let reason: string | null = null;
  if (s.player.flames <= 0) {
    s.state = 'lost'; reason = 'no_flames';
  } else if (s.timeLeft <= 0) {
    const litCount = s.lanterns.filter(l => l.lit).length;
    const needed = Math.ceil(s.tuning.win_ratio * s.lanterns.length);
    if (litCount >= needed) {
      s.state = 'won'; reason = 'dawn_survived';
      for (const l of s.lanterns) {
        if (l.lit) s.score += s.tuning.score.per_lit_lantern + Math.floor(l.fuelTicks / 60);
      }
      s.score += s.player.flames * s.tuning.score.per_flame_left;
    } else {
      s.state = 'lost'; reason = 'dawn';
    }
  }
  if (reason) emit(s, events, 'game_over', { result: s.state, reason });
  return { state: s, events };
}
