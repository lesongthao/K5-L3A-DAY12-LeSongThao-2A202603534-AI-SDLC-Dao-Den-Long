import test from 'node:test';
import assert from 'node:assert/strict';
import { run, ok, close, quiet, last } from './helpers.mjs';

test('tick zero: scenario overlay, no score or events, exactly five lanterns', () => {
  const r = ok(run({ ticks: 0, scenario: { ...quiet, player: { pos: [3, 2, 1], carried: 4, flames: 2 },
    lanterns: [{ id: 'L1', pos: [1, 0, 1], lit: true }], time_left_s: 123 } }));
  const s = r.snapshots[0];
  assert.equal(r.events.length, 0); assert.equal(s.tick, 0); assert.equal(s.sim_tick, 0);
  assert.equal(s.score, 0); assert.equal(s.state, 'playing');
  assert.deepEqual(s.player.pos, [3, 2, 1]);assert.equal(s.player.carried,4);assert.equal(s.player.flames,2);
  assert.deepEqual(s.player.vel,[0,0,0]);assert.equal(s.night,1);
  assert.equal(s.time_left_s, 123); assert.equal(s.lanterns.length, 5);
  assert.equal(s.lanterns.find(l => l.id === 'L1').lit, true); assert.equal(r.end.ticks, 0);
});

test('120 fixed steps move 12m and consume exactly two seconds', () => {
  const r = ok(run({ ticks: 120, every: 10, frames: [{ tick: 0, move: [0, 1] }] }));
  close(last(r).player.pos[2], 12); close(last(r).time_left_s, 238);
  assert.deepEqual(r.snapshots.map(s => s.tick), Array.from({ length: 13 }, (_, i) => i * 10));
  assert.equal(r.end.ticks, 120); assert.equal(last(r).sim_tick, 120);
});

test('camera yaw 90 rotates forward into positive X', () => {
  const r = ok(run({ ticks: 60, frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] }));
  close(last(r).player.pos[0], 6); close(last(r).player.pos[2], 0);
});

test('diagonal speed is normalized, analog values below one are preserved', () => {
  const d = ok(run({ ticks: 60, frames: [{ tick: 0, move: [1, 1] }] }));
  close(last(d).player.pos[0], 6 / Math.sqrt(2));
  close(last(d).player.pos[2], 6 / Math.sqrt(2));
  const a = ok(run({ ticks: 60, frames: [{ tick: 0, move: [0.5, 0] }] }));
  close(last(a).player.pos[0], 3);
});

test('omitted fields persist; input at tick 10 applies on step 11', () => {
  const r = ok(run({ ticks: 20, frames: [{ tick: 0, move: [0, 1] },
    { tick: 5, interact: false }, { tick: 10, move: [0, 0] }] }));
  close(r.snapshots.find(s => s.tick === 10).player.pos[2], 1);
  close(last(r).player.pos[2], 1);
});

test('absent input means idle, explicit empty arrays replace initial entities', () => {
  const r = ok(run({ ticks: 90 }));
  assert.deepEqual(last(r).player.pos, [0, 0, 0]);
  assert.deepEqual(last(r).shades, []); assert.equal(last(r).motes_active, 0);
});

test('same seed has byte-identical random output including IDs', () => {
  const options = { scenario: null, ticks: 700, every: 10, seed: 113 };
  assert.equal(ok(run(options)).raw, ok(run(options)).raw);
});

test('positions are serialized to at most three decimal places', () => {
  const r = ok(run({ ticks: 7, frames: [{ tick: 0, move: [1, 1] }] }));
  for (const s of r.snapshots) {
    for (const p of [s.player.pos, ...s.lanterns.map(l => l.pos), ...s.shades.map(l => l.pos)]) {
      p.forEach(n => close(n * 1000, Math.round(n * 1000), 0.000001));
    }
  }
});

test('snapshot interval need not divide total ticks; end is last', () => {
  const r = ok(run({ ticks: 11, every: 5 }));
  assert.deepEqual(r.snapshots.map(x => x.tick), [0, 5, 10]);
  assert.equal(r.end.ticks, 11); assert.equal(r.end.state, 'playing');
});

const badInputs = [
  '{', '{}', 'null', '{"frames":{}}',
  '{"frames":[{"tick":1},{"tick":1}]}',
  '{"frames":[{"tick":2},{"tick":0}]}',
  '{"frames":[{"tick":-1}]}',
  '{"frames":[{"tick":0.5}]}',
  '{"frames":[{"tick":0,"move":[2,0]}]}',
  '{"frames":[{"tick":0,"move":[0]}]}',
  '{"frames":[{"tick":0,"cam_yaw_deg":"0"}]}',
  '{"frames":[{"tick":0,"pulse":1}]}',
];
badInputs.forEach((rawInputs, i) => test(`invalid inputs ${i}: exit2, diagnostic stderr`, () => {
  const r = run({ rawInputs }); assert.equal(r.status, 2, r.stderr); assert.ok(r.stderr.trim());
}));

const badScenarios = [
  '{', 'null', '[]', '{"player":{"pos":[0,0]}}',
  '{"motes":[[0,"0",0]]}', '{"shades":[{"pos":[0,0]}]}',
  '{"random_motes":"false"}', '{"player":{"flames":-1}}',
  '{"lanterns":[{"id":"L9"}]}', '{"time_left_s":-2}',
];
badScenarios.forEach((rawScenario, i) => test(`invalid scenario ${i}: exit2`, () => {
  const r = run({ rawScenario }); assert.equal(r.status, 2, r.stderr); assert.ok(r.stderr.trim());
}));

test('invalid CLI options and unsupported night are nonzero', () => {
  for (const args of [['--ticks', '-1'], ['--snapshot-every', '0'], ['--night', '4'], ['--bogus', '1']]) {
    const r = run({ args }); assert.notEqual(r.status, 0); assert.ok(r.stderr.trim());
  }
});
