import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { ensurePreviewServer } from './server-helper.mjs';

function parseArgs(args) {
  let seed = 42, duration = 30, out = 'bench.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) seed = Number(args[++i]);
    else if (args[i] === '--duration' && args[i + 1]) duration = Number(args[++i]);
    else if (args[i] === '--out' && args[i + 1]) out = args[++i];
  }
  return { seed, duration, out };
}

const procStart = performance.now();
const { seed, duration, out } = parseArgs(process.argv.slice(2));
const base = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const stopServer = await ensurePreviewServer(base);

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--window-size=1280,720'],
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : platform() === 'win32' ? { channel: 'msedge' } : {})
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const url = `${base}/?bench=1&seed=${seed}&duration=${duration}`;
  await page.goto(url);
  await page.waitForFunction(() => !!window.__BENCH_FIRST_FRAME__, null, { timeout: 15000 });
  const loadMs = Math.round(performance.now() - procStart);

  await page.waitForFunction(() => !!window.__BENCH_DONE__, null, { timeout: (duration + 20) * 1000 });
  const benchResult = await page.evaluate(() => window.__BENCH_RESULT__);
  if (!benchResult) throw new Error('Không lấy được kết quả benchmark từ window.__BENCH_RESULT__');
  benchResult.load_ms = loadMs;

  const jsonStr = JSON.stringify(benchResult, null, 2) + '\n';
  writeFileSync(out, jsonStr, 'utf-8');
  console.log(jsonStr);
} finally {
  await browser.close();
  stopServer();
}
