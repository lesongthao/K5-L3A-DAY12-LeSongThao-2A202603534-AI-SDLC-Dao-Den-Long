import { readFileSync, writeFileSync, openSync, writeSync, closeSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGame, step, snapshot } from '../core/game.js';
import { emptyInput } from '../core/types.js';
import type { Night, Tuning } from '../core/types.js';
import { FormatError, parseJson, validateInputs, validateScenario } from './validate.js';
import { sortLeaderboard } from '../core/leaderboard.js';

export function main(args = process.argv.slice(2)): number {
  let fd: number | undefined;
  try {
    // Check --export-leaderboard flag
    const exportIdx = args.indexOf('--export-leaderboard');
    if (exportIdx !== -1) {
      const targetFile = args[exportIdx + 1];
      if (!targetFile) throw new FormatError('Thiếu tên file cho --export-leaderboard');
      const lbPath = resolve('data/leaderboard.json');
      let entries = [];
      if (existsSync(lbPath)) {
        try {
          const raw = JSON.parse(readFileSync(lbPath, 'utf8'));
          entries = Array.isArray(raw.entries) ? raw.entries : Array.isArray(raw) ? raw : [];
        } catch { /* empty on parse error */ }
      }
      const sorted = sortLeaderboard(entries);
      const targetDir = dirname(resolve(targetFile));
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(resolve(targetFile), JSON.stringify({ entries: sorted }, null, 2) + '\n');
      return 0;
    }

    const flags = new Map<string, string>(), allowed = ['--seed', '--night', '--scenario', '--inputs', '--ticks', '--out', '--snapshot-every'];
    for (let i = 0; i < args.length; i += 2) {
      if (!allowed.includes(args[i]) || args[i + 1] === undefined) throw new FormatError('Tham số không hợp lệ');
      flags.set(args[i], args[i + 1]);
    }
    const int = (key: string, fallback?: number, min = 0) => {
      const raw = flags.get(key); if (raw === undefined && fallback !== undefined) return fallback;
      if (raw === undefined || !/^[-+]?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < min) throw new FormatError(`Sai ${key}`);
      return Number(raw);
    };
    const seed = int('--seed', undefined, -Number.MAX_SAFE_INTEGER), night = int('--night');
    if (![1, 2, 3].includes(night)) throw new FormatError('--night chỉ nhận 1, 2, 3');
    const count = int('--ticks'), every = int('--snapshot-every', 10, 1), out = flags.get('--out');
    if (!out) throw new FormatError('Thiếu --out');
    const contract = JSON.parse(readFileSync(resolve('game.contract.json'), 'utf8')) as { tuning: Tuning };
    const scenario = flags.has('--scenario') ? validateScenario(parseJson(readFileSync(flags.get('--scenario')!, 'utf8')), night) : undefined;
    const frames = flags.has('--inputs') ? validateInputs(parseJson(readFileSync(flags.get('--inputs')!, 'utf8'))) : [];
    const s = createGame({ seed, night: night as Night, scenario, tuning: contract.tuning });
    fd = openSync(out, 'w');
    const line = (o: unknown) => writeSync(fd!, JSON.stringify(o) + '\n');
    line(snapshot(s)); let index = 0, input = emptyInput();
    for (let k = 0; k < count; k++) {
      if (frames[index]?.tick === k) { const f = frames[index++]; input = { ...input, ...f }; }
      const result = step(s, input); result.events.forEach(line);
      if (s.tick % every === 0) line(snapshot(s));
      if (s.state === 'won' || s.state === 'lost') break;
    }
    line({ type: 'end', ticks: s.tick, state: s.state, score: s.score });
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return error instanceof FormatError ? 2 : 1;
  } finally { if (fd !== undefined) closeSync(fd); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();
