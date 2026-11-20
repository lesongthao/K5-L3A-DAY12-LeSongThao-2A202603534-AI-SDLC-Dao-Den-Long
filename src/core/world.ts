import { makeMap, ground } from './maps.js';
import { seeded, byId } from './math.js';
import { emptyInput } from './types.js';
import { spawnPosition } from './player.js';
import type { GameState, Night, Scenario, Tuning, Vec3, Shade } from './types.js';

export function nextId(s: GameState, kind: 'M'|'S'|'D'): string {
  const list = kind==='M' ? s.motes : kind==='S' ? s.shades : s.drifters;
  let id: string;
  do {
    if(s.ids[kind]>=Number.MAX_SAFE_INTEGER)throw new Error('Hết khoảng ID an toàn');
    id=`${kind}${++s.ids[kind]}`;
  } while(s.reservedIds.has(id)||list.some(x=>x.id===id));
  return id;
}

export const shadeAt = (id: string, pos: Vec3): Shade => ({
  id, pos: [...pos], state: 'wander', timer: 0,
  pushDir: [1, 0], pushLeft: 0, eject: 0, ejectDir: [1, 0], ejectStep: 0,
  drainTicks: 0
});

export function createGame({ seed, night, scenario = {}, tuning }: {
  seed: number; night: Night; scenario?: Scenario; tuning: Tuning;
}): GameState {
  const map = makeMap(night), p = scenario.player ?? {};
  const pos: Vec3 = [...(p.pos ?? spawnPosition(night))];
  const initialTime = scenario.time_left_s ?? [tuning.night1_duration_s, tuning.night2_duration_s, tuning.night3_duration_s][night - 1];
  const successfulLights = p.successful_lights ?? 0;
  const capacity = Math.min(tuning.capacity_max, 10 + 2 * successfulLights);

  const s: GameState = {
    night, tick: 0, simTick: 0, state: 'playing', score: 0, initialTime, timeLeft: initialTime,
    tuning, map, rng: seeded(seed), ids: { M: 0, S: 0, D: 0 }, reservedIds: new Set(), lastInput: emptyInput(),
    player: {
      pos, vel: [...(p.vel ?? [0, 0, 0])], grounded: Math.abs(pos[1] - ground(night, pos[0], pos[2])) < 1e-6,
      carried: p.carried ?? 0, flames: p.flames ?? tuning.flames, invuln: p.invuln_ticks ?? 0,
      dashCd: p.dash_cd_ticks ?? 0, pulseCd: p.pulse_cd_ticks ?? 0, charm: p.charm_ticks ?? 0,
      respawn: 0, facing: [0, 1], dashDir: [0, 1], dashLeft: 0, savedVy: 0, launch: null, padLock: false,
      successful_lights: successfulLights, capacity
    },
    lanterns: map.lanterns.map((pos, i) => ({
      id: `L${i + 1}`, pos: [...pos], lit: false, deposited: 0,
      fuelTicks: 0, everLit: false, relitCount: 0
    })),
    motes: [], shades: [], drifters: [],
    charms: map.charms.map((pos, i) => ({ id: `C${i + 1}`, pos: [...pos], available: true, respawn: 0 })),
    randomMotes: scenario.random_motes ?? true, randomShades: scenario.random_shades ?? true,
    randomDrifters: scenario.random_drifters ?? true, windEnabled: scenario.wind_enabled ?? true,
    wind: { active: false, dir_deg: 0, warning: false }
  };

  // Reserve explicit IDs from scenario
  for (const list of [scenario.motes, scenario.shades, scenario.drifters]) {
    for (const value of list ?? []) if (!Array.isArray(value) && value.id) {
      s.reservedIds.add(value.id);
    }
  }

  for (const override of scenario.lanterns ?? []) {
    const l = s.lanterns.find(l => l.id === override.id)!;
    if (override.pos) l.pos = [...override.pos];
    l.deposited = override.deposited ?? l.deposited;
    if (override.ever_lit !== undefined) l.everLit = override.ever_lit;
    if (override.relit_count !== undefined) l.relitCount = override.relit_count;
    const isLit = override.lit ?? (l.deposited >= tuning.lantern_cost);
    l.lit = isLit;
    if (isLit) {
      l.deposited = tuning.lantern_cost;
      l.everLit = true;
      const f = override.fuel !== undefined ? override.fuel : tuning.fuel_max;
      l.fuelTicks = Math.round(f * 60);
    } else {
      l.fuelTicks = override.fuel !== undefined ? Math.round(override.fuel * 60) : 0;
    }
  }

  if (scenario.motes) {
    for (const m of scenario.motes) {
      const object = Array.isArray(m) ? { pos: m } : m;
      s.motes.push({
        id: object.id ?? nextId(s, 'M'), pos: [...object.pos], kind: object.kind ?? 'random',
        ttl: object.kind === 'dropped' ? (object.ttl_s === undefined || object.ttl_s === null ? tuning.drop_ttl_ticks : Math.round(object.ttl_s * 60)) : null,
        born: 0
      });
    }
  } else if (s.randomMotes) {
    const points = map.motePoints.map(p => [...p] as Vec3);
    for (let i = 0; i < tuning.mote_initial && points.length; i++) {
      const pos = points.splice(Math.floor(s.rng() * points.length), 1)[0];
      s.motes.push({ id: nextId(s, 'M'), pos, kind: 'random', ttl: null, born: 0 });
    }
  }

  for (const sh of scenario.shades ?? []) {
    const shade = shadeAt(sh.id ?? nextId(s, 'S'), sh.pos);
    shade.state = sh.state ?? 'wander';
    shade.timer = sh.state_ticks_left ?? (shade.state === 'stunned' ? Math.round(tuning.pulse_stun_s * 60) : 0);
    if (sh.target_lantern_id) shade.targetLanternId = sh.target_lantern_id;
    if (shade.state === 'drain') shade.drainTicks = sh.state_ticks_left ?? 0;
    s.shades.push(shade);
  }

  for (const d of scenario.drifters ?? []) s.drifters.push({
    id: d.id ?? nextId(s, 'D'), pos: [...d.pos],
    state: d.state ?? 'idle', stolen: d.stolen ?? 0,
    timer: d.state_ticks_left ?? tuning.drifter_flee_ticks, dir: [1, 0], started: -1
  });

  if (scenario.charms) {
    const taken = new Set(scenario.charms.flatMap(c => c.id ? [c.id] : [])); let serial = 0;
    s.charms = scenario.charms.map((c, i) => {
      let id = c.id; if (!id) { do { id = `C${++serial}`; } while (taken.has(id)); taken.add(id); }
      return {
        id, pos: [...(c.pos ?? map.charms[i] ?? [0, 0, 0])],
        available: c.available ?? true,
        respawn: c.respawn_ticks ?? Math.round((c.respawn_s ?? 0) * 60)
      };
    });
  }

  s.shades.sort(byId); s.drifters.sort(byId);
  return s;
}
