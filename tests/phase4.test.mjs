import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateName, sortLeaderboard, insertScore } from '../dist/node/core/leaderboard.js';

function listTsFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listTsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

test('P4-09: game.contract.json conforms to Contract v1.3 schema', () => {
  const contract = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(contract.contract_version, '1.3');
  assert.ok(contract.build_cmd && contract.run_cmd && contract.headless_cmd);
  assert.ok(contract.bench_cmd && contract.soak_cmd);
  for (const key of ['player_speed', 'carry_capacity', 'capacity_max', 'lantern_cost', 'relight_cost', 'fuel_max', 'win_ratio', 'drain_per_s', 'low_fuel_threshold']) {
    assert.equal(typeof contract.tuning[key], 'number', `Missing tuning.${key}`);
  }
  assert.equal(typeof contract.tuning.score.per_relight, 'number');
  assert.equal(typeof contract.tuning.score.per_lit_lantern, 'number');
});

test('P4-03: leaderboard validates names, sorts Top 10 and exports via CLI', () => {
  assert.equal(validateName('May_Vang'), true);
  assert.equal(validateName('Ab'), false);
  assert.equal(validateName('TooLongPlayerName123'), false);
  assert.equal(validateName('Bad!Name'), false);

  const seed = Array.from({ length: 12 }, (_, i) => ({
    name: `Player_${i}`, score: 100 + i * 50, nights_won: 3,
    achieved_at: `2026-11-20T00:${String(i).padStart(2, '0')}:00.000Z`, seed: i
  }));
  const top = sortLeaderboard(seed);
  assert.equal(top.length, 10);
  assert.equal(top[0].score, 650);
  assert.equal(top[9].score, 200);

  const inserted = insertScore(top, { name: 'May Nho', score: 700, nights_won: 3, seed: 99, achieved_at: '2026-11-20T12:00:00.000Z' });
  assert.equal(inserted[0].name, 'May_Nho');
  assert.equal(inserted[0].score, 700);

  const outPath = 'docs/proof/phase-4/.tmp-lb-test.json';
  try {
    const r = spawnSync(process.execPath, ['dist/node/headless/cli.js', '--export-leaderboard', outPath], { encoding: 'utf8' });
    assert.equal(r.status, 0);
    const exported = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.ok(Array.isArray(exported.entries));
    assert.ok(exported.entries.length >= 2);
  } finally {
    if (existsSync(outPath)) rmSync(outPath, { force: true });
  }
});

test('Architecture invariants: all src/*.ts <= 300 lines and src/core/ stays pure', () => {
  for (const file of listTsFiles('src')) {
    const src = readFileSync(file, 'utf8');
    const lines = src.split(/\r?\n/).length;
    assert.ok(lines <= 300, `${file} exceeds 300 lines (${lines})`);
    if (file.replace(/\\/g, '/').startsWith('src/core/')) {
      assert.equal(/\b(three|node:fs|document|window|Math\.random|Date\.now)\b/.test(src), false, `${file} must remain pure`);
    }
  }
});
