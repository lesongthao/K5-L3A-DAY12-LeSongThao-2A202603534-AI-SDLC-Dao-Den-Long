import type { GameState, GameEvent, Shade, Vec2, Vec3 } from './types.js';
import { DT, direction, distXZ, byId, ticks } from './math.js';
import { ground, blocked } from './maps.js';
import { emit } from './events.js';
import { dropMotes } from './items.js';

function moveShade(s: GameState, sh: Shade, dir: Vec2, amount: number): void {
  const target: Vec3 = [sh.pos[0] + dir[0] * amount, sh.pos[1], sh.pos[2] + dir[1] * amount];
  const floor = Math.max(sh.pos[1] - 0.8, ground(s.night, sh.pos[0], sh.pos[2]));
  const from: Vec3 = [sh.pos[0], floor, sh.pos[2]], to: Vec3 = [target[0], floor, target[2]];
  if (blocked(s.night, from, to) || !Number.isFinite(ground(s.night, to[0], to[2]))) return;
  for (const l of s.lanterns) {
    const isSafe = l.lit && (l.fuelTicks / 60 >= s.tuning.low_fuel_threshold);
    if (isSafe && distXZ(sh.pos, l.pos) >= s.tuning.safe_radius - 1e-8 && distXZ(target, l.pos) < s.tuning.safe_radius - 1e-8) {
      const ox = sh.pos[0] - l.pos[0], oz = sh.pos[2] - l.pos[2], dx = target[0] - sh.pos[0], dz = target[2] - sh.pos[2];
      const a = dx * dx + dz * dz, b = 2 * (ox * dx + oz * dz), c = ox * ox + oz * oz - s.tuning.safe_radius ** 2;
      if (a < 1e-12) return;
      const f = Math.max(0, Math.min(1, (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a)));
      target[0] = sh.pos[0] + dx * f; target[2] = sh.pos[2] + dz * f;
    }
  }
  sh.pos[0] = target[0]; sh.pos[2] = target[2];
  const y = ground(s.night, to[0], to[2]);
  if (Number.isFinite(y) && y <= sh.pos[1] + 0.2) sh.pos[1] = y + 0.8;
}

export function safeZones(s: GameState): void {
  const t = s.tuning;
  for (const sh of s.shades) {
    const inside = s.lanterns.find(l => l.lit && (l.fuelTicks / 60 >= t.low_fuel_threshold) && distXZ(sh.pos, l.pos) < t.safe_radius - 1e-8);
    if (!inside) { sh.eject = 0; continue; }
    if (sh.eject === 0) {
      sh.eject = t.safe_eject_ticks; sh.ejectDir = direction(inside.pos, sh.pos);
      sh.ejectStep = (t.safe_radius - distXZ(sh.pos, inside.pos) + 0.001) / t.safe_eject_ticks;
    }
    sh.pos[0] += sh.ejectDir[0] * sh.ejectStep; sh.pos[2] += sh.ejectDir[1] * sh.ejectStep;
    sh.eject--;
  }
}

export function updateShades(s: GameState): void {
  const t = s.tuning, p = s.player;
  for (const sh of s.shades) {
    const protectedNow = s.lanterns.some(l => l.lit && (l.fuelTicks / 60 >= t.low_fuel_threshold) && distXZ(sh.pos, l.pos) < t.safe_radius - 1e-8);
    if (sh.state === 'stunned') {
      if (sh.timer > 0) {
        if (sh.pushLeft > 0) { moveShade(s, sh, sh.pushDir, t.pulse_push_m / t.pulse_push_ticks); sh.pushLeft--; }
        continue;
      }
      sh.state = 'wander'; sh.pushLeft = 0;
    }
    if (protectedNow || sh.eject > 0) continue;
    if (sh.state === 'recoil') {
      if (sh.pushLeft > 0) {
        moveShade(s, sh, sh.pushDir, t.recoil_m / t.recoil_ticks); sh.pushLeft--;
        if (sh.pushLeft === 0) sh.state = 'wander';
        continue;
      }
      if (sh.timer > 0) { moveShade(s, sh, sh.pushDir, t.recoil_m / t.recoil_ticks); continue; }
      sh.state = 'wander';
    }
    if (sh.state === 'spawning') { if (sh.timer > 0) continue; sh.state = 'wander'; }

    const d = distXZ(sh.pos, p.pos);

    // Xử lý trạng thái drain
    if (sh.state === 'drain') {
      if (d <= 6 && p.respawn === 0) {
        sh.state = 'chase'; sh.targetLanternId = undefined;
      } else {
        const l = sh.targetLanternId ? s.lanterns.find(x => x.id === sh.targetLanternId) : s.lanterns.find(x => distXZ(sh.pos, x.pos) <= 2 + 1e-9);
        if (!l || !l.lit || (l.fuelTicks / 60 >= t.low_fuel_threshold) || distXZ(sh.pos, l.pos) > 2 + 1e-9) {
          sh.state = 'wander'; sh.targetLanternId = undefined;
        } else {
          continue; // Đứng yên hút dầu
        }
      }
    }

    if (sh.state === 'chase' && (d > t.shade_lose_radius || p.respawn > 0)) sh.state = 'wander';
    if (sh.state === 'wander' && d <= t.shade_detect_radius && p.respawn === 0) sh.state = 'chase';

    const speed = s.night === 3 ? t.shade_speed_night3 : t.shade_speed;
    if (sh.state === 'chase') {
      moveShade(s, sh, direction(sh.pos, p.pos), Math.min(d, speed * DT));
    } else {
      // Wander: ưu tiên đèn sáng có fuel < 30 gần nhất; không có thì tìm đèn tắt gần nhất
      const weakLit = s.lanterns.filter(l => l.lit && (l.fuelTicks / 60 < t.low_fuel_threshold))
        .sort((a, b) => distXZ(sh.pos, a.pos) - distXZ(sh.pos, b.pos) || byId(a, b));
      const unlit = s.lanterns.filter(l => !l.lit)
        .sort((a, b) => distXZ(sh.pos, a.pos) - distXZ(sh.pos, b.pos) || byId(a, b));
      const targetL = weakLit[0] ?? unlit[0];

      if (targetL) {
        sh.targetLanternId = targetL.id;
        const distL = distXZ(sh.pos, targetL.pos);
        if (targetL.lit && (targetL.fuelTicks / 60 < t.low_fuel_threshold) && distL <= 2 + 1e-9) {
          sh.state = 'drain';
          sh.drainTicks = 0;
        } else {
          moveShade(s, sh, direction(sh.pos, targetL.pos), DT);
        }
      } else {
        const a = s.simTick * 0.007 + sh.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
        moveShade(s, sh, [Math.cos(a), Math.sin(a)], DT);
      }
    }
  }
}

export function updateDrifters(s: GameState): void {
  const t = s.tuning, p = s.player;
  for (const d of s.drifters) {
    if (d.state === 'removed') continue;
    if (d.state === 'flee') {
      if (d.started < s.simTick) d.timer--;
      if (d.timer <= 0) { d.state = 'removed'; continue; }
      d.pos[0] += d.dir[0] * t.drifter_speed * DT; d.pos[2] += d.dir[1] * t.drifter_speed * DT; continue;
    }
    const chase = p.carried >= 5 && distXZ(d.pos, p.pos) <= t.drifter_detect_radius && p.respawn === 0;
    d.state = chase ? 'chase' : 'idle';
    const a = s.simTick * 0.01 + d.id.length;
    const dir = chase ? direction(d.pos, p.pos) : [Math.cos(a), Math.sin(a)];
    const speed = chase ? t.drifter_speed : t.drifter_idle_speed;
    d.pos[0] += dir[0] * speed * DT; d.pos[2] += dir[1] * speed * DT;
  }
  s.drifters = s.drifters.filter(d => d.state !== 'removed');
}

export function contacts(s: GameState, events: GameEvent[]): void {
  const p = s.player, t = s.tuning;
  if (p.respawn > 0 || p.flames <= 0) return;
  for (const d of [...s.drifters].sort(byId)) if (d.state === 'chase' && distXZ(d.pos, p.pos) <= t.drifter_hit_radius + 1e-9) {
    const amount = Math.min(3, p.carried); p.carried -= amount; d.stolen = amount; d.state = 'flee';
    d.timer = t.drifter_flee_ticks; d.started = s.simTick; d.dir = direction(p.pos, d.pos);
    emit(s, events, 'drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
  }
  if (p.invuln > 0) return;
  for (const sh of [...s.shades].sort(byId)) {
    const safe = s.lanterns.some(l => l.lit && (l.fuelTicks / 60 >= t.low_fuel_threshold) && distXZ(sh.pos, l.pos) < t.safe_radius - 1e-8);
    if (safe || sh.eject > 0 || sh.state === 'stunned' || sh.state === 'recoil' || sh.state === 'spawning') continue;
    if (distXZ(sh.pos, p.pos) <= t.shade_hit_radius + 1e-9 && Math.abs(sh.pos[1] - p.pos[1]) <= t.pickup_height + 1e-9) {
      const dropped = Math.floor(p.carried * t.hit_drop_ratio); p.carried -= dropped; p.flames--;
      p.invuln = ticks(t.invuln_s);
      dropMotes(s, dropped, p.pos, true);
      sh.state = 'recoil'; sh.timer = t.recoil_ticks; sh.pushLeft = t.recoil_ticks;
      sh.pushDir = direction(p.pos, sh.pos);
      emit(s, events, 'player_hit', { by: 'shade', flames: p.flames, dropped });
      break;
    }
  }
}
