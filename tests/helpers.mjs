import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

export const contract = JSON.parse(readFileSync('game.contract.json', 'utf8'));
export const quiet = { random_motes: false, random_shades: false, random_drifters: false,
  wind_enabled: false, motes: [], shades: [] };

export function run({ scenario = quiet, frames, ticks = 1, every = 1, seed = 42,
  rawScenario, rawInputs, args = [], night = 1 } = {}) {
  const folder = mkdtempSync(join(tmpdir(), 'dao-den-long-'));
  try {
    const out = join(folder, 'out.jsonl');
    const options = ['--seed', String(seed), '--night', String(night), '--ticks', String(ticks),
      '--out', out, '--snapshot-every', String(every)];
    if (scenario !== null || rawScenario !== undefined) {
      const file = join(folder, 'scenario.json');
      writeFileSync(file, rawScenario ?? JSON.stringify(scenario));
      options.push('--scenario', file);
    }
    if (frames !== undefined || rawInputs !== undefined) {
      const file = join(folder, 'inputs.json');
      writeFileSync(file, rawInputs ?? JSON.stringify({ frames }));
      options.push('--inputs', file);
    }
    const result = spawnSync(process.execPath, [resolve('dist/node/headless/cli.js'), ...options, ...args],
      { encoding: 'utf8', timeout: 15000 });
    let raw = '';
    try { raw = readFileSync(out, 'utf8'); } catch { /* Invalid input may not create output. */ }
    const lines = raw.trim() ? raw.trim().split('\n').map(line => JSON.parse(line)) : [];
    return { ...result, raw, lines, snapshots: lines.filter(x => x.type === 'snapshot'),
      events: lines.filter(x => x.type === 'event'), end: lines.at(-1) };
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

export function ok(result) {
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.equal(result.end?.type, 'end');
  return result;
}
export function close(actual, expected, tolerance = 0.002) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}
export const named = (result, name) => result.events.filter(e => e.name === name);
export const last = result => result.snapshots.at(-1);
