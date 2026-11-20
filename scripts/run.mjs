import { spawnSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const exportIdx = args.indexOf('--export-leaderboard');

if (exportIdx !== -1) {
  const target = args[exportIdx + 1];
  const r = spawnSync(process.execPath, [resolve('dist/node/headless/cli.js'), '--export-leaderboard', target], {
    stdio: 'inherit'
  });
  process.exit(r.status ?? 0);
} else {
  const viteBin = resolve('node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', ...args], {
    stdio: 'inherit'
  });
  child.on('exit', code => process.exit(code ?? 0));
}
