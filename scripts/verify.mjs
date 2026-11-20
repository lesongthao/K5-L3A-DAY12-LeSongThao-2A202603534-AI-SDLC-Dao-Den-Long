import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { platform, cpus } from 'node:os';
import { fingerprint } from './fingerprint.mjs';

const proof = 'docs/proof/phase-4';
mkdirSync(proof, { recursive: true });

const npmScript = join(process.env.npm_execpath ? resolve(process.env.npm_execpath) : join(process.execPath, '..', 'node_modules/npm/bin/npm-cli.js'));

function command(name, args, log) {
  const r = spawnSync(name, args, { encoding: 'utf8', timeout: 120000 });
  writeFileSync(`${proof}/${log}.log`, (r.stdout ?? '') + (r.stderr ?? ''));
  if (r.status !== 0) throw new Error(`${log} failed (${r.status}): ${r.stderr || r.stdout || r.error}`);
  return r;
}

console.log('1. Build TypeScript and Web bundle...');
const build = command(process.execPath, [npmScript, 'run', 'build'], 'build');

console.log('2. Run unit tests...');
const tests = command(process.execPath, [npmScript, 'test'], 'tests');

console.log('3. Run Soak Test (10 nights)...');
const soak = command(process.execPath, ['scripts/soak.mjs', '--seed', '7', '--nights', '10', '--out', `${proof}/soak.json`], 'soak');

console.log('4. Export Leaderboard via CLI...');
const exportLb = command(process.execPath, [resolve('dist/node/headless/cli.js'), '--export-leaderboard', `${proof}/leaderboard.json`], 'export-leaderboard');

console.log('5. Check Benchmark result...');
if (existsSync('bench.json')) {
  copyFileSync('bench.json', `${proof}/bench.json`);
}

const hash = createHash('sha256');
for (const file of ['game.contract.json', 'package-lock.json']) {
  if (existsSync(file)) hash.update(file).update(readFileSync(file));
}

console.log('6. Headless Night 3 deterministic check (18000 ticks)...');
const base = [resolve('dist/node/headless/cli.js'), '--seed', '42', '--night', '3', '--ticks', '18000', '--snapshot-every', '60'];
const scenario = resolve('tests/scenarios/night3-full.json');
base.push('--scenario', scenario);

const begin = performance.now();
command(process.execPath, [...base, '--out', `${proof}/night3-a.jsonl`], 'headless-a');
const elapsed = performance.now() - begin;
command(process.execPath, [...base, '--out', `${proof}/night3-b.jsonl`], 'headless-b');

const a = readFileSync(`${proof}/night3-a.jsonl`), b = readFileSync(`${proof}/night3-b.jsonl`);
if (!a.equals(b)) throw new Error('Determinism failed');
if (elapsed > 30000) throw new Error(`Headless too slow: ${elapsed}ms`);

const lines = a.toString().trim().split('\n').map(l => JSON.parse(l));
const end = lines.at(-1);
if (end.ticks !== 18000 || end.type !== 'end') throw new Error(`Whole night did not run 18000 ticks (actual: ${end.ticks}, type: ${end.type})`);

console.log('7. Run Feature Scenarios...');
const caseDir = `${proof}/scenarios`;
mkdirSync(caseDir, { recursive: true });
const cases = JSON.parse(readFileSync('tests/scenarios/features.json', 'utf8'));
const checked = [];

for (const c of cases) {
  const scenarioFile = `${caseDir}/${c.name}.scenario.json`;
  const inputFile = `${caseDir}/${c.name}.inputs.json`;
  const outputFile = `${caseDir}/${c.name}.jsonl`;
  writeFileSync(scenarioFile, JSON.stringify(c.scenario, null, 2) + '\n');
  writeFileSync(inputFile, JSON.stringify({ frames: c.frames }, null, 2) + '\n');
  command(process.execPath, [
    resolve('dist/node/headless/cli.js'), '--seed', '42', '--night', String(c.night),
    '--ticks', String(c.ticks), '--scenario', scenarioFile, '--inputs', inputFile,
    '--snapshot-every', '1', '--out', outputFile
  ], `scenario-${c.name}`);
  const result = readFileSync(outputFile, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const final = result.filter(x => x.type === 'snapshot').at(-1);
  if (c.event && !result.some(x => x.type === 'event' && x.name === c.event)) throw new Error(`Missing event ${c.name}`);
  if (c.wind && !final.wind.active) throw new Error('Wind scenario failed');
  if (c.landed && (!final.player.grounded || final.player.pos[0] <= 40)) throw new Error('Launch scenario failed');
  checked.push({ name: c.name, night: c.night, ticks: c.ticks, passed: true, output: outputFile });
}

const report = {
  passed: true,
  contract_version: '1.3',
  phase: 4,
  date_utc: new Date().toISOString(),
  node: process.version,
  platform: platform(),
  cpu: cpus()[0]?.model,
  source_sha256: fingerprint(),
  test_summary: tests.stdout.match(/ℹ (tests|pass|fail) \d+/g),
  headless: {
    ticks: end.ticks,
    elapsed_ms: elapsed,
    limit_ms: 30000,
    deterministic: true,
    output_sha256: createHash('sha256').update(a).digest('hex')
  },
  configuration_sha256: hash.digest('hex'),
  feature_scenarios: checked,
  soak_test: existsSync(`${proof}/soak.json`) ? JSON.parse(readFileSync(`${proof}/soak.json`, 'utf8')) : null,
  benchmark: existsSync(`${proof}/bench.json`) ? JSON.parse(readFileSync(`${proof}/bench.json`, 'utf8')) : null,
  leaderboard_exported: existsSync(`${proof}/leaderboard.json`),
  browser: existsSync(`${proof}/browser-report.json`) ? 'Separate browser-report.json; compare source_sha256' : 'Run npm run test:browser',
  linux: 'CI configured separately; local verification runs on reported platform.'
};

writeFileSync(`${proof}/verification.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
