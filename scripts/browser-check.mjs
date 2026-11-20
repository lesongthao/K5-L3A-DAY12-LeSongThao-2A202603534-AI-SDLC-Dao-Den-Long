import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { platform, cpus } from 'node:os';
import { fingerprint } from './fingerprint.mjs';
import { ensurePreviewServer } from './server-helper.mjs';

const base = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const stopServer = await ensurePreviewServer(base);
const proof = 'docs/proof/phase-4';
mkdirSync(proof, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : platform() === 'win32' ? { channel: 'msedge' } : {})
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const scenarios = [];
const snap = () => page.evaluate(() => window.__DAO_QA__.snapshot());
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [] };
const load = async (night, scenario) => {
  await page.evaluate(({ night, scenario }) => window.__DAO_QA__.load(night, scenario), { night, scenario });
  await page.waitForTimeout(150);
};

try {
  await page.goto(`${base}/?qa=1`);
  await page.waitForFunction(() => !!window.__DAO_QA__);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${proof}/menu.png` });

  // 1. Kiểm tra Bảng xếp hạng từ Menu và cỡ chữ >= 18px ở 1280x720
  const bodyFont = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  assert.ok(bodyFont >= 18, `Font UI phải >= 18px (hiện tại ${bodyFont}px)`);
  await page.locator('#open-leaderboard').click();
  await page.waitForFunction(() => !document.getElementById('leaderboard').hidden);
  assert.ok((await page.locator('#lb-body').innerHTML()).includes('Ong_Dang'));
  scenarios.push('Leaderboard opens and displays top scores from menu (UI font >= 18px)');
  await page.screenshot({ path: `${proof}/leaderboard.png` });
  await page.locator('#close-leaderboard').click();

  // 2. Bắt đầu chơi
  await page.locator('#start').click();
  await page.locator('#enter-night').click();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
  assert.ok((await snap()).player.pos[2] > 0.5);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyA');
  assert.ok((await snap()).player.pos[0] > 0.5);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(550);
  await page.keyboard.up('KeyD');
  assert.ok((await snap()).player.pos[0] < 0);
  scenarios.push('WASD moves in correct screen-relative directions');

  await page.keyboard.press('Space');
  await page.keyboard.press('ShiftLeft');
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => window.__DAO_QA__.snapshot().state === 'paused');
  const frozen = await snap();
  await page.waitForTimeout(300);
  const later = await snap();
  assert.equal(later.sim_tick, frozen.sim_tick);
  assert.equal(later.time_left_s, frozen.time_left_s);
  assert.ok(later.tick > frozen.tick);
  scenarios.push('P freezes gameplay while raw tick advances');

  // 3. Cài đặt âm lượng & độ nhạy
  await page.locator('#pause-settings').click();
  await page.locator('#volume').evaluate(e => { e.value = '31'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#sensitivity').evaluate(e => { e.value = '137'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#close-settings').click();
  await page.locator('#resume').click();
  await page.waitForFunction(() => window.__DAO_QA__.snapshot().state === 'playing');
  await page.reload();
  await page.waitForFunction(() => !!window.__DAO_QA__);
  await page.locator('#open-settings').click();
  assert.equal(await page.locator('#volume').inputValue(), '31');
  assert.equal(await page.locator('#sensitivity').inputValue(), '137');
  scenarios.push('Volume and sensitivity persist after reload');
  await page.locator('#close-settings').click();

  // 3b. Kiểm tra Chuột trái đánh 3 gậy hạ Bóng Mực, Q tốn 3 đom đóm hạ ngay & Chuột phải nạp đèn giống E
  await page.locator('#start').click();
  await page.locator('#enter-night').click();
  await load(1, { ...quiet, player: { pos: [0, 0, 0], carried: 5 }, shades: [{ id: 'S1', pos: [0, 0, 1.8], state: 'wander' }], lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 0, lit: false }] });
  await page.mouse.click(640, 360, { button: 'left' });
  await page.waitForTimeout(250);
  const afterAttack = await snap();
  assert.equal(afterAttack.shades[0].state, 'stunned');
  assert.ok(afterAttack.shades[0].pos[2] > 2.0);
  await page.mouse.click(640, 360, { button: 'right' });
  await page.waitForTimeout(150);
  assert.equal((await snap()).lanterns[0].deposited, 5);
  await page.waitForTimeout(250);
  await page.mouse.click(640, 360, { button: 'left' });
  await page.waitForTimeout(420);
  await page.mouse.click(640, 360, { button: 'left' });
  await page.waitForTimeout(150);
  assert.equal((await snap()).shades.length, 0, 'Đánh đủ 3 gậy phải tiêu diệt Bóng Mực');

  // Kiểm tra Q tiêu tốn 3 đom đóm hạ Bóng Mực ngay lập tức + kiểm tra HUD không chồng lấn ở 1280x640
  await page.setViewportSize({ width: 1280, height: 640 });
  await load(2, {
    ...quiet,
    player: { pos: [0, 0, 0], carried: 10 },
    shades: [{ id: 'S2', pos: [0, 0, 3.8], state: 'wander' }],
    lanterns: [
      { id: 'L1', pos: [0, 0, 14], lit: true, fuel: 20 },
      { id: 'L2', pos: [14, 0, 0], lit: false, deposited: 0 },
      { id: 'L3', pos: [-14, 0, 0], lit: false, deposited: 0 },
      { id: 'L4', pos: [0, 0, -14], lit: false, deposited: 0 },
      { id: 'L5', pos: [35, 0, 0], lit: false, deposited: 0 },
      { id: 'L6', pos: [45, 0, 0], lit: false, deposited: 0 }
    ]
  });
  await page.keyboard.press('F9');
  await page.locator('#cheat-god').check();
  await page.keyboard.press('F9');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${proof}/combat-hud.png` });
  await page.keyboard.press('KeyQ');
  await page.waitForTimeout(150);
  const afterQ = await snap();
  assert.equal(afterQ.player.carried, 7);
  assert.equal(afterQ.shades.length, 0, 'Kỹ năng Q (tốn 3 đom đóm) phải tiêu diệt Bóng Mực ngay');

  const overlaps = await page.evaluate(() => {
    const ids = ['.health', '#cheat-badge', '#mission-guide', '#timer', '#wind-warning', '.progress', '.pouch', '.abilities', '.hud-help', '#scene-caption', '#toast'];
    const rects = ids.map(sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).opacity !== '0' ? { sel, r } : null;
    }).filter(Boolean);
    const hits = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
          hits.push(`${rects[i].sel} <-> ${rects[j].sel}`);
        }
      }
    }
    return hits;
  });
  assert.deepEqual(overlaps, [], `Các phần tử HUD không được chồng lấn: ${overlaps.join(', ')}`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press('F9');
  await page.locator('#cheat-reset-all').click();
  await page.keyboard.press('F9');
  scenarios.push('Staff kills in 3 hits, Q kills in 1 hit (cost 3 motes), HUD has zero overlap at 1280x640');

  for (const night of [1, 2, 3]) {
    await load(night, {});
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${proof}/night-${night}.png` });
    assert.equal((await snap()).lanterns.length, night + 4);
  }

  // 4. Performance sample Night 3
  await load(3, {});
  const performanceSample = await page.evaluate(() => new Promise(resolve => {
    let count = 0, previous = performance.now();
    const start = previous, intervals = [];
    function frame(now) {
      intervals.push(now - previous);
      previous = now;
      count++;
      if (now - start >= 8000) {
        resolve({
          frames: count,
          elapsed_ms: now - start,
          average_fps: count * 1000 / (now - start),
          p95_frame_ms: intervals.sort((a, b) => a - b)[Math.floor(intervals.length * 0.95)],
          ...window.__DAO_QA__.info()
        });
      } else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }));
  assert.ok(performanceSample.average_fps >= 30, `FPS ${performanceSample.average_fps}`);
  scenarios.push('Normal Night 3 at 1280x720 averages >=30 FPS');

  // 5. Thắng 3 đêm để đạt Bình Minh
  for (const night of [1, 2, 3]) {
    const lanterns = Array.from({ length: night + 4 }, (_, i) => ({
      id: `L${i + 1}`,
      lit: true,
      fuel: 100,
      pos: [0, 0, 0]
    }));
    await load(night, { ...quiet, time_left_s: 0.05, player: { pos: [0, 0, 0], carried: 10 }, lanterns });
    await page.waitForFunction(() => window.__DAO_QA__.screen() === 'result', null, { timeout: 5000 });
    assert.equal((await snap()).state, 'won');
    if (night < 3) {
      await page.locator('#result-action').click();
      assert.ok((await page.locator('#intro-title').textContent()).includes(`Đêm ${night + 1}`));
    }
  }

  assert.equal(await page.locator('#result-title').textContent(), 'Bình Minh');
  const scores = await page.evaluate(() => window.__DAO_QA__.scores());
  assert.equal(Number(await page.locator('#result-score').textContent()), scores.reduce((a, b) => a + b, 0));
  await page.screenshot({ path: `${proof}/dawn.png` });
  scenarios.push('Three victories advance nights and Dawn totals won-night scores');

  // 6. Thua thử lại cùng đêm
  await load(2, { ...quiet, player: { flames: 0 } });
  await page.waitForFunction(() => window.__DAO_QA__.screen() === 'result');
  await page.locator('#result-action').click();
  assert.ok((await page.locator('#intro-title').textContent()).includes('Đêm 2'));
  scenarios.push('Loss retries the same night');

  const audio = await page.evaluate(() => window.__DAO_QA__.audio());
  assert.equal(audio.state, 'running');
  assert.deepEqual(errors, []);

  const result = {
    passed: true,
    date_utc: new Date().toISOString(),
    platform: platform(),
    cpu: cpus()[0]?.model,
    source_sha256: fingerprint(),
    viewport: { width: 1280, height: 720 },
    browser: await browser.version(),
    performance: performanceSample,
    scenarios,
    audio,
    page_errors: errors,
    screenshots: 'Scenario-arranged screenshots use ?qa=1; menu and initial worlds are actual rendered game.'
  };

  writeFileSync(`${proof}/browser-report.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: `${proof}/browser-failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  stopServer();
}
