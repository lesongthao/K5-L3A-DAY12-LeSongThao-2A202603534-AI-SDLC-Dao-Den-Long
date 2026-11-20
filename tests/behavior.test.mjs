import test from 'node:test';
import assert from 'node:assert/strict';
import { run, ok, quiet, named, last, close, contract } from './helpers.mjs';

const t = contract.tuning;
const scene = extra => ({ ...quiet, ...extra });
const lantern = (id, pos = [0, 0, 0], deposited = 0) => ({ id, pos, deposited });

test('v1.1 pickup includes radius boundary, respects height and capacity', () => {
  const r = ok(run({ scenario: scene({ player: { carried: 9 }, motes: [[1, 0, 0], [0, 0, 0]] }) }));
  assert.equal(last(r).player.carried, 10); assert.equal(named(r, 'mote_picked').length, 1);
  assert.equal(named(r, 'mote_picked')[0].tick, 1); assert.equal(last(r).motes_active, 1);
  assert.equal(r.end.score, 0); // Ticket-02: score belongs to deposit, not pickup.
  const high=ok(run({scenario:scene({player:{pos:[0,2,0]},motes:[[0,0,0]]})}));
  assert.equal(last(high).player.carried,0);
});

test('outside pickup radius is not collected', () => {
  const r = ok(run({ scenario: scene({ motes: [[1.001, 0, 0]] }) }));
  assert.equal(last(r).player.carried, 0); assert.equal(last(r).motes_active, 1);
});

test('deposit partial amount and finish lantern without excess spend', () => {
  const r = ok(run({ scenario: scene({ player: { carried: 5 }, lanterns: [lantern('L1', [2, 9, 0], 8)] }),
    frames: [{ tick: 0, interact: true }] }));
  assert.deepEqual(named(r, 'deposit')[0].data, { lantern_id: 'L1', amount: 2, deposited: 10 });
  assert.equal(last(r).player.carried, 3); assert.equal(named(r, 'lantern_lit').length, 1);
  assert.equal(last(r).lanterns.find(x => x.id === 'L1').lit, true);
  assert.equal(r.end.score, t.score.per_lantern+2*t.score.per_mote);
});

test('nearest eligible lantern chosen; ties use ID; holding interact does not repeat', () => {
  const r = ok(run({ ticks: 4, scenario: scene({ player: { carried: 10 },
    lanterns: [lantern('L2', [1, 0, 0]), lantern('L1', [-1, 0, 0])] }),
    frames: [{ tick: 0, interact: true }] }));
  assert.equal(named(r, 'deposit').length, 1);
  assert.equal(named(r, 'deposit')[0].data.lantern_id, 'L1');
});

test('releasing then pressing interact triggers another action (deposit then refuel)', () => {
  const r = ok(run({ ticks: 3, scenario: scene({ player: { carried: 10 },
    motes: Array.from({ length: 10 }, () => [0, 0, 0]),
    lanterns: [lantern('L1'), lantern('L2', [1, 0, 0])] }),
    frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }, { tick: 2, interact: true }] }));
  assert.equal(named(r, 'deposit').length, 1);
  assert.equal(named(r, 'refuel').length, 1);
});

test('pulse costs carried, pushes, stuns all in radius, excludes outside', () => {
  const r = ok(run({ ticks:15, scenario: scene({ player: { carried: 6 }, shades: [
    { id: 'A', pos: [t.pulse_radius, 0.8, 0] }, { id: 'B', pos: [0, 0.8, 2] },
    { id: 'C', pos: [t.pulse_radius + 0.01, 0.8, 0] }] }), frames: [{ tick: 0, pulse: true }] }));
  assert.equal(last(r).player.carried, 3);
  assert.deepEqual([...named(r, 'pulse')[0].data.stunned_ids].sort(), ['A', 'B']);
  const a = last(r).shades.find(s => s.id === 'A'); assert.equal(a.state, 'stunned');
  close(a.pos[0], t.pulse_radius + t.pulse_push_m);
  assert.equal(r.end.score, t.score.per_stun * 2);
});

test('pulse fails without resources, held button does not retrigger, cooldown enforced', () => {
  assert.equal(named(ok(run({ frames: [{ tick: 0, pulse: true }] })), 'pulse').length, 0);
  const r = ok(run({ ticks: 182, scenario: scene({ player: { carried: 10 } }), frames: [
    { tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 2, pulse: true },
    { tick: 179, pulse: false }, { tick: 180, pulse: true }] }));
  assert.deepEqual(named(r, 'pulse').map(e => e.tick), [1, 181]);
  assert.equal(last(r).player.carried, 4);
});

test('shades chase immediately; overlapping shade hits and invulnerability protects', () => {
  const chase = ok(run({ ticks: 60, scenario: scene({ shades: [{ id: 'S', pos: [10, 0, 0] }] }) }));
  close(last(chase).shades[0].pos[0], 10 - t.shade_speed);
  const hit = ok(run({ ticks: 30, scenario: scene({ shades: [{ pos: [0, 0, 0] }] }) }));
  assert.equal(named(hit, 'player_hit').length, 1);
  assert.deepEqual(named(hit, 'player_hit')[0].data, { by: 'shade', flames: 2, dropped: 0 });
});

test('lit lantern shields player and expels already-inside shade', () => {
  const r = ok(run({ ticks: 120, scenario: scene({ shades: [{ pos: [0, 0, 0] }],
    lanterns: [{ ...lantern('L1'), lit: true }] }) }));
  assert.equal(named(r, 'player_hit').length, 0);
  assert.ok(Math.hypot(last(r).shades[0].pos[0], last(r).shades[0].pos[2]) >= t.safe_radius);
});

test('stunned shade cannot hit, then recovers after duration', () => {
  const r = ok(run({ ticks: 150, scenario: scene({ player: { carried: 3 },
    shades: [{ id: 'S', pos: [0, 0, 0] }] }), frames: [{ tick: 0, pulse: true }] }));
  assert.equal(r.snapshots.find(x => x.tick === 60).shades[0].state, 'stunned');
  assert.notEqual(last(r).shades[0].state, 'stunned');
  assert.ok(named(r, 'player_hit').every(e => e.tick > 120));
});

test('win at dawn requires living player and >= 60% lit lanterns, awards dawn bonus', () => {
  const r = ok(run({ ticks: 100, scenario: scene({ player: { carried: 10 }, time_left_s: 100 / 60,
    lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [0, 0, 0], lit: i < 3 })) }) }));
  assert.equal(r.end.ticks, 100); assert.equal(r.end.state, 'won');
  assert.deepEqual(named(r, 'game_over')[0].data, { result: 'won', reason: 'dawn_survived' });
  assert.equal(named(r, 'game_over').length, 1);
});

test('zero flames loses; dawn ends at exact tick; loss has no win bonus', () => {
  const h = ok(run({ ticks: 100, scenario: scene({ player: { flames: 1 }, shades: [{ pos: [0, 0, 0] }] }) }));
  assert.equal(h.end.ticks, 1); assert.equal(h.end.state, 'lost');
  assert.equal(named(h, 'game_over')[0].data.reason, 'no_flames'); assert.equal(h.end.score, 0);
  const d = ok(run({ ticks: 200, scenario: scene({ time_left_s: 1 }) }));
  assert.equal(d.end.ticks, 60); assert.equal(named(d, 'game_over')[0].data.reason, 'dawn');
});

test('win takes precedence over dawn in same tick', () => {
  const r = ok(run({ scenario: scene({ player: { carried: 10 }, time_left_s: 1 / 60,
    lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [0, 0, 0], lit: i < 4 })) }),
    frames: [{ tick: 0, interact: true }] }));
  assert.equal(r.end.state, 'won');
});

test('holding jump produces one jump and landing; new press allows second jump', () => {
  const r = ok(run({ ticks: 100, frames: [{ tick: 0, jump: true },
    { tick: 80, jump: false }, { tick: 81, jump: true }] }));
  assert.ok(r.snapshots.find(x => x.tick === 10).player.pos[1] > 0);
  assert.equal(r.snapshots.find(x => x.tick === 75).player.pos[1], 0);
  assert.ok(last(r).player.pos[1] > 0);
});

test('random false suppresses all future spawns, scenario IDs remain stable', () => {
  const r = ok(run({ ticks: 650, scenario: scene({ shades: [{ id: 'custom', pos: [30, 0, 30] }] }) }));
  assert.equal(named(r, 'shade_spawned').length, 0); assert.equal(last(r).motes_active, 0);
  assert.equal(last(r).shades[0].id, 'custom');
});
