import test from 'node:test';
import assert from 'node:assert/strict';
import { run, ok, close, quiet, last, named } from './helpers.mjs';
const scene = extra => ({ ...quiet, ...extra });

test('P3-01: lantern fuel decays 1.0 unit/s and turns off when fuel <= 0 with lantern_out', () => {
  const r = ok(run({
    ticks: 61,
    scenario: scene({
      time_left_s: 100,
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 1.0 }]
    })
  }));
  const lOut = named(r, 'lantern_out');
  assert.equal(lOut.length, 1);
  assert.equal(lOut[0].data.lantern_id, 'L1');
  assert.equal(last(r).lanterns.find(l => l.id === 'L1').lit, false);
  assert.equal(last(r).lanterns.find(l => l.id === 'L1').ever_lit, true);
  assert.equal(last(r).lanterns.find(l => l.id === 'L1').fuel, 0);
});

test('P3-02: refuel consumes ceil((100 - fuel) / 10) motes and full lantern cannot be refueled', () => {
  const r = ok(run({
    ticks: 4,
    scenario: scene({
      player: { carried: 5 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 85 }]
    }),
    frames: [{ tick: 0, interact: true }, { tick: 2, interact: true }]
  }));
  const refuels = named(r, 'refuel');
  assert.equal(refuels.length, 1);
  assert.deepEqual(refuels[0].data, { lantern_id: 'L1', amount: 2, fuel: 100 });
  assert.equal(last(r).player.carried, 3);
  assert.equal(last(r).score, 2 * 5);
});

test('P3-03: relighting ever_lit lantern costs only 5 motes and awards relight bonus 40', () => {
  const r = ok(run({
    ticks: 2,
    scenario: scene({
      player: { carried: 5 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: false, ever_lit: true, deposited: 0 }]
    }),
    frames: [{ tick: 0, interact: true }]
  }));
  const lights = named(r, 'lantern_lit');
  assert.equal(lights.length, 1);
  assert.deepEqual(lights[0].data, { lantern_id: 'L1', relight: true });
  assert.equal(last(r).player.carried, 0);
  assert.equal(last(r).lanterns.find(l => l.id === 'L1').lit, true);
  assert.equal(last(r).lanterns.find(l => l.id === 'L1').relit_count, 1);
  assert.equal(last(r).score, 5 * 5 + 40);
});

test('P3-04: wander shade targets low-fuel (< 30) lantern and enters drain at distance <= 2m', () => {
  const r = ok(run({
    ticks: 5,
    scenario: scene({
      player: { pos: [30, 0, 0] },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
      shades: [{ id: 'S1', pos: [1.8, 0, 0], state: 'wander' }]
    })
  }));
  assert.equal(last(r).shades[0].state, 'drain');
});

test('P3-05: drain state drains 5 fuel/s, emits fuel_drain every 60 ticks and breaks on player approach', () => {
  const r = ok(run({
    ticks: 61,
    scenario: scene({
      player: { pos: [20, 0, 0] },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
      shades: [{ id: 'S1', pos: [1.5, 0, 0], state: 'drain', target_lantern_id: 'L1' }]
    })
  }));
  const drains = named(r, 'fuel_drain');
  assert.equal(drains.length, 1);
  assert.equal(drains[0].data.lantern_id, 'L1');
  assert.equal(drains[0].data.shade_id, 'S1');
  close(drains[0].data.fuel, 25 - (1.0 + 5.0), 0.2);

  const chaseRun = ok(run({
    ticks: 5,
    scenario: scene({
      player: { pos: [5, 0, 0] },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
      shades: [{ id: 'S1', pos: [1.5, 0, 0], state: 'drain', target_lantern_id: 'L1' }]
    })
  }));
  assert.equal(last(chaseRun).shades[0].state, 'chase');
});

test('P3-06: pulse on draining shade awards 15 score, vs 5 on normal shade', () => {
  const r = ok(run({
    ticks: 2,
    scenario: scene({
      player: { carried: 6 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
      shades: [
        { id: 'S1', pos: [1.5, 0, 0], state: 'drain', target_lantern_id: 'L1' },
        { id: 'S2', pos: [-1.5, 0, 0], state: 'wander' }
      ]
    }),
    frames: [{ tick: 0, pulse: true }]
  }));
  assert.equal(last(r).shades[0].state, 'stunned');
  assert.equal(last(r).shades[1].state, 'stunned');
  assert.equal(last(r).score, 15 + 5);
});

test('P3-07: dawn win requires ceil(0.6 * N) lit lanterns; below threshold loses with dawn', () => {
  const winRun = ok(run({
    ticks: 60,
    scenario: scene({
      time_left_s: 1.0,
      lanterns: [
        { id: 'L1', lit: true, fuel: 100 },
        { id: 'L2', lit: true, fuel: 80 },
        { id: 'L3', lit: true, fuel: 50 },
        { id: 'L4', lit: false },
        { id: 'L5', lit: false }
      ]
    })
  }));
  assert.equal(winRun.end.state, 'won');
  assert.equal(named(winRun, 'game_over')[0].data.reason, 'dawn_survived');
  assert.equal(winRun.end.score, (50 + 99) + (50 + 79) + (50 + 49) + 3 * 50);

  const loseRun = ok(run({
    ticks: 60,
    scenario: scene({
      time_left_s: 1.0,
      lanterns: [
        { id: 'L1', lit: true, fuel: 100 },
        { id: 'L2', lit: true, fuel: 80 },
        { id: 'L3', lit: false },
        { id: 'L4', lit: false },
        { id: 'L5', lit: false }
      ]
    })
  }));
  assert.equal(loseRun.end.state, 'lost');
  assert.equal(named(loseRun, 'game_over')[0].data.reason, 'dawn');
});

test('P3-08: dynamic capacity increases by 2 per successful light up to max 20', () => {
  const r = ok(run({
    ticks: 2,
    scenario: scene({
      player: { carried: 10, successful_lights: 2 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: false, deposited: 0 }]
    }),
    frames: [{ tick: 0, interact: true }]
  }));
  assert.equal(last(r).player.capacity, 16);
});

test('P3-09: lantern fuel < 30 loses safe zone and restored >= 30 ejects shades within 6m', () => {
  const r = ok(run({
    ticks: 2,
    scenario: scene({
      player: { pos: [0, 0, 0], carried: 3 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
      shades: [{ id: 'S1', pos: [3, 0, 0], state: 'wander' }]
    }),
    frames: [{ tick: 0, interact: true }]
  }));
  assert.ok(last(r).lanterns.find(l => l.id === 'L1').fuel >= 30);
  assert.ok(last(r).shades[0].pos[0] > 3);
});

test('P3-10: snapshot includes fuel, ever_lit, relit_count, player capacity and drain state', () => {
  const r = ok(run({
    ticks: 0,
    scenario: scene({
      player: { carried: 4, successful_lights: 1 },
      lanterns: [{ id: 'L1', lit: true, fuel: 75.5, ever_lit: true, relit_count: 2 }],
      shades: [{ id: 'S1', pos: [0, 0, 0], state: 'drain' }]
    })
  }));
  const snap = r.snapshots[0];
  assert.equal(snap.player.capacity, 12);
  const l1 = snap.lanterns.find(l => l.id === 'L1');
  assert.equal(l1.fuel, 75.5);
  assert.equal(l1.ever_lit, true);
  assert.equal(l1.relit_count, 2);
  assert.equal(snap.shades[0].state, 'drain');
});
