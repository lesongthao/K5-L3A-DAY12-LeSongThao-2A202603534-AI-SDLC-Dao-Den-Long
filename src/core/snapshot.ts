import type { GameState } from './types.js';
import { position, round1 } from './math.js';

export function snapshot(s: GameState) {
  const p = s.player;
  return {
    type: 'snapshot' as const, tick: s.tick, sim_tick: s.simTick, night: s.night, state: s.state,
    time_left_s: s.timeLeft, score: s.score, wind: { active: s.wind.active, dir_deg: s.wind.dir_deg },
    player: {
      pos: position(p.pos), vel: position(p.vel), grounded: p.grounded, flames: p.flames,
      carried: p.carried, capacity: p.capacity,
      invuln: p.invuln > 0, dash_cd_s: p.dashCd / 60, pulse_cd_s: p.pulseCd / 60, charm_s: p.charm / 60
    },
    lanterns: s.lanterns.map(l => ({
      id: l.id, pos: position(l.pos), lit: l.lit, deposited: l.deposited,
      fuel: l.lit ? round1(l.fuelTicks / 60) : 0,
      ever_lit: l.everLit, relit_count: l.relitCount
    })),
    shades: s.shades.map(sh => ({ id: sh.id, pos: position(sh.pos), state: sh.state })),
    motes_active: s.motes.length,
    motes: s.motes.map(m => ({ id: m.id, pos: position(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : m.ttl / 60 })),
    drifters: s.drifters.map(d => ({ id: d.id, pos: position(d.pos), state: d.state, stolen: d.stolen })),
    charms: s.charms.map(c => ({ id: c.id, available: c.available, respawn_s: c.respawn / 60 }))
  };
}
