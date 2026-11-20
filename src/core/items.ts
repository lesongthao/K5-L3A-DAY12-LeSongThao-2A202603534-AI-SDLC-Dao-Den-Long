import type { GameState, GameEvent, Vec3 } from './types.js';
import { distXZ, dist3, direction, byId, ticks, round1 } from './math.js';
import { emit } from './events.js';
import { ground } from './maps.js';
import { nextId } from './world.js';

export function dropMotes(s: GameState, amount: number, center: Vec3, ring: boolean): void {
  for (let i = 0; i < amount; i++) {
    const a = s.rng() * Math.PI * 2, radius = ring ? 1.5 + s.rng() : 0;
    const x = center[0] + Math.cos(a) * radius, z = center[2] + Math.sin(a) * radius;
    const y = ground(s.night, x, z);
    s.motes.push({
      id: nextId(s, 'M'), pos: [x, Number.isFinite(y) ? y : center[1], z], kind: 'dropped',
      ttl: s.tuning.drop_ttl_ticks, born: s.simTick
    });
  }
}

export function pickup(s: GameState, events: GameEvent[]): void {
  const p = s.player, t = s.tuning;
  if (p.respawn > 0 || p.flames <= 0) return;
  const reachable = (pos: Vec3) => distXZ(p.pos, pos) <= t.pickup_radius + 1e-9 && Math.abs(p.pos[1] - pos[1]) <= t.pickup_height + 1e-9;
  s.motes = s.motes.filter(m => {
    if (m.born >= s.simTick || p.carried >= p.capacity || !reachable(m.pos)) return true;
    p.carried++; emit(s, events, 'mote_picked', { carried: p.carried }); return false;
  });
  for (const c of s.charms) if (c.available && reachable(c.pos)) {
    c.available = false; c.respawn = t.charm_respawn_ticks; p.charm = t.charm_ticks; p.dashCd = 0;
    emit(s, events, 'charm_picked', { charm_id: c.id, charm_ticks: p.charm });
  }
}

export function nearestLantern(s: GameState) {
  return s.lanterns
    .filter(l => !l.lit || l.fuelTicks < s.tuning.fuel_max * 60)
    .sort((a, b) => distXZ(s.player.pos, a.pos) - distXZ(s.player.pos, b.pos) || byId(a, b))[0];
}

export function deposit(s: GameState, events: GameEvent[]): void {
  const p = s.player, t = s.tuning, l = nearestLantern(s);
  if (p.respawn > 0 || p.flames <= 0 || !l || p.carried === 0 || distXZ(p.pos, l.pos) > t.interact_radius + 1e-9) return;

  if (!l.lit) {
    const cost = l.everLit ? t.relight_cost : t.lantern_cost;
    const amount = Math.min(p.carried, cost - l.deposited);
    if (amount <= 0) return;
    p.carried -= amount;
    l.deposited += amount;
    s.score += amount * t.score.per_mote;
    emit(s, events, 'deposit', { lantern_id: l.id, amount, deposited: l.deposited });
    if (l.deposited >= cost) {
      l.lit = true;
      l.fuelTicks = t.fuel_max * 60;
      const relight = l.everLit;
      l.everLit = true;
      if (relight) {
        l.relitCount++;
        s.score += t.score.per_relight;
      } else {
        s.score += t.score.per_lantern;
      }
      p.successful_lights++;
      p.capacity = Math.min(t.capacity_max, 10 + 2 * p.successful_lights);
      emit(s, events, 'lantern_lit', { lantern_id: l.id, relight });
    }
  } else {
    const currentFuel = l.fuelTicks / 60;
    const needed = Math.ceil((t.fuel_max - currentFuel) / t.fuel_per_mote);
    const used = Math.min(p.carried, needed);
    if (used <= 0) return;
    p.carried -= used;
    l.fuelTicks = Math.min(t.fuel_max * 60, l.fuelTicks + used * Math.round(t.fuel_per_mote * 60));
    s.score += used * t.score.per_mote;
    emit(s, events, 'refuel', { lantern_id: l.id, amount: used, fuel: round1(l.fuelTicks / 60) });
  }
}

export function pulse(s: GameState, events: GameEvent[]): void {
  const p = s.player, t = s.tuning;
  if (p.respawn > 0 || p.flames <= 0 || p.carried < t.pulse_cost || p.pulseCd > 0) return;
  p.carried -= t.pulse_cost; p.pulseCd = ticks(t.pulse_cooldown_s);
  const center: Vec3 = [p.pos[0], p.pos[1] + 0.8, p.pos[2]], ids: string[] = [];
  for (const sh of s.shades) if (dist3(center, sh.pos) <= t.pulse_radius + 1e-9) {
    const wasDrain = sh.state === 'drain';
    sh.state = 'stunned'; sh.timer = ticks(t.pulse_stun_s); sh.pushLeft = t.pulse_push_ticks;
    sh.pushDir = direction(p.pos, sh.pos); ids.push(sh.id);
    sh.targetLanternId = undefined;
    s.score += wasDrain ? t.score.per_stun_drain : t.score.per_stun;
  }
  for (const d of s.drifters) if (dist3(center, d.pos) <= t.pulse_radius + 1e-9) {
    if (d.state === 'chase') {
      d.state = 'flee'; d.timer = t.drifter_flee_ticks; d.started = s.simTick; d.dir = direction(p.pos, d.pos);
    } else if (d.state === 'flee' && d.stolen > 0) {
      const amount = d.stolen; dropMotes(s, amount, d.pos, false); d.stolen = 0; d.timer = t.drifter_drop_ticks; d.started = s.simTick;
      emit(s, events, 'drifter_drop', { drifter_id: d.id, amount });
    }
  }
  emit(s, events, 'pulse', { stunned_ids: ids });
}
