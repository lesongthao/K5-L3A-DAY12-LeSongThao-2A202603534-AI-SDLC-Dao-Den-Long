import './style.css';
import contract from '../../game.contract.json';
import { createGame, step, snapshot } from '../core/game.js';
import { direction, distXZ } from '../core/math.js';
import type { GameState, Night, Scenario, GameEvent, Tuning } from '../core/types.js';
import { WorldView } from './scene.js';
import { Controls, ACTION_LABELS, type ActionName } from './input.js';
import { Soundscape } from './audio.js';
import { el, text, updateHud } from './hud.js';
import { getLeaderboard, recordScore, renderLeaderboardRows, isEligible } from './leaderboard.js';
import { setupBenchGame, stepBenchGame, BenchCollector } from './bench.js';
import { applyCheatPostStep, applyCheatPreStep, bindCheatPanel, cheatFlags } from './cheats.js';
import { applyCombatPostStep, applyCombatPreStep, damageShade, resetCombat } from './combat.js';

type Screen = 'menu' | 'intro' | 'playing' | 'pause' | 'settings' | 'help' | 'result' | 'leaderboard';
const tuning: Tuning = contract.tuning;
const controls = new Controls(el<HTMLCanvasElement>('world'));
const audio = new Soundscape();
let view: WorldView;
try { view = new WorldView(el<HTMLCanvasElement>('world')); el('loading').hidden = true; }
catch (error) { el('loading').textContent = 'Không tạo được WebGL. Hãy bật tăng tốc đồ họa và tải lại.'; throw error; }

const urlParams = new URLSearchParams(window.location.search);
const isBench = urlParams.has('bench');
const benchSeed = Number(urlParams.get('seed') ?? 42);
const benchDuration = Number(urlParams.get('duration') ?? 30);
const benchCollector = isBench ? new BenchCollector(benchDuration) : null;

let game: GameState = isBench ? setupBenchGame(benchSeed, tuning) : createGame({ seed: 202603534, night: 1, tuning });
let screen: Screen = 'menu', returnScreen: Screen = 'menu';
let wonScores: number[] = [], lastFrame = 0, accumulator = 0;
let pauseRequested = false, recordingAction: ActionName | null = null;
let spawnAlertTicks = 0, lastCountdown = -1, keyBuffer = '', lastAttackTime = 0;
let settings = { volume: 0.5, sensitivity: 1, colorblind: false, reducedMotion: false, largeFont: false };

try {
  const saved = JSON.parse(localStorage.getItem('dao-den-long-settings') ?? '{}');
  if (Number.isFinite(saved.volume)) settings.volume = Math.max(0, Math.min(1, saved.volume));
  if (Number.isFinite(saved.sensitivity)) settings.sensitivity = Math.max(0.2, Math.min(2, saved.sensitivity));
  if (typeof saved.colorblind === 'boolean') settings.colorblind = saved.colorblind;
  if (typeof saved.reducedMotion === 'boolean') settings.reducedMotion = saved.reducedMotion;
  if (typeof saved.largeFont === 'boolean') settings.largeFont = saved.largeFont;
} catch { /* Dùng mặc định */ }

function applySettings(save = false): void {
  controls.sensitivity = settings.sensitivity; audio.setVolume(settings.volume);
  document.body.dataset.colorblind = String(settings.colorblind);
  document.body.dataset.reducedMotion = String(settings.reducedMotion);
  document.body.dataset.largeFont = String(settings.largeFont);
  view.setColorblind(settings.colorblind); view.reducedMotion = settings.reducedMotion;
  el<HTMLInputElement>('volume').value = String(Math.round(settings.volume * 100));
  el<HTMLInputElement>('sensitivity').value = String(Math.round(settings.sensitivity * 100));
  el<HTMLInputElement>('colorblind').checked = settings.colorblind;
  el<HTMLInputElement>('reduced-motion').checked = settings.reducedMotion;
  el<HTMLInputElement>('large-font').checked = settings.largeFont;
  text('volume-value', `${Math.round(settings.volume * 100)}%`);
  text('sensitivity-value', settings.sensitivity.toFixed(1));
  renderKeybindsList();
  if (save) try { localStorage.setItem('dao-den-long-settings', JSON.stringify(settings)); } catch { toast('Chưa lưu được cài đặt.'); }
}

function renderKeybindsList(): void {
  const list = el('keybinds-list');
  if (!list) return;
  list.innerHTML = (Object.keys(ACTION_LABELS) as ActionName[]).map(act => {
    const keys = controls.keybinds[act]?.map(k => k.replace(/^(Key|Digit)/, '')).join(' / ') || 'Trống';
    const isRec = recordingAction === act;
    return `<div class="keybind-row"><span>${ACTION_LABELS[act]}</span><button class="keybind-btn ${isRec ? 'recording' : ''}" data-action="${act}">${isRec ? 'Bấm phím...' : keys}</button></div>`;
  }).join('');
  list.querySelectorAll('.keybind-btn').forEach(btn => {
    (btn as HTMLButtonElement).onclick = e => { recordingAction = (e.currentTarget as HTMLButtonElement).dataset.action as ActionName; renderKeybindsList(); };
  });
}

function show(next: Screen): void {
  screen = next; document.body.dataset.screen = next;
  document.body.dataset.fromPause = String(next === 'settings' && returnScreen === 'pause');
  for (const id of ['menu', 'intro', 'pause', 'settings', 'help', 'result', 'leaderboard']) el(id).hidden = id !== next;
  el('overlay').hidden = next === 'playing';
  el('hud').hidden = !(next === 'playing' || next === 'pause' || (next === 'settings' && returnScreen === 'pause')) || game.state === 'won' || game.state === 'lost';
  el('menu-footer').hidden = next !== 'menu';
  document.querySelectorAll('#top-nav .nav-tab').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === next);
  });
}

function toast(message: string): void {
  text('toast', message); el('toast').classList.add('visible'); window.setTimeout(() => el('toast').classList.remove('visible'), 2500);
}

function newNight(night: Night, scenario?: Scenario): void {
  resetCombat();
  game = createGame({ seed: 202603534 + night, night, tuning, scenario });
  controls.clear(); controls.yaw = !urlParams.has('qa') && night === 3 ? 28 : 0;
  accumulator = 0; pauseRequested = false; spawnAlertTicks = 0; lastCountdown = -1;
  view.reset(game); text('caption-night', String(night).padStart(2, '0')); text('caption-name', game.map.name);
}

function introduction(night: Night): void {
  newNight(night); text('intro-title', `Đêm ${night} · ${game.map.name}`);
  const stories = [
    '“Mây à, đừng sợ màn đêm. Gom đủ 10 đom đóm để thắp Đèn Lồng, rồi châm thêm dầu giữ đảo sáng tới bình minh nhé.”',
    '“Hai bờ Đảo Cau chờ nhau qua cầu tre. Giữ đèn trên 30% dầu để Bóng Mực không hút mất ánh sáng nhé.”',
    '“Tiếng chuông ngân trên đỉnh Đảo Chuông. Hãy giữ ít nhất 5 ngọn đèn rực sáng tới hết giờ đón Bình Minh!”'
  ];
  text('intro-text', stories[night - 1]); show('intro');
}

function finish(): void {
  if (game.state === 'won') wonScores[game.night - 1] = game.score;
  const dawn = game.state === 'won' && game.night === 3, won = game.state === 'won';
  const totalScore = dawn ? wonScores.reduce((a, b) => a + b, 0) : game.score;
  const nightsWon = wonScores.filter(s => Number.isFinite(s) && s > 0).length;
  text('result-eyebrow', dawn ? 'BA HÒN ĐẢO ĐÃ TỈNH GIẤC' : won ? 'MỘT MIỀN SÁNG ĐÃ TRỞ VỀ' : 'ÁNH SÁNG VẪN ĐANG ĐỢI BẠN');
  text('result-title', dawn ? 'Bình Minh' : won ? `${game.map.name} đã qua đêm!` : 'Mình thử lại nhé.');
  text('result-text', dawn ? 'Tiếng chuông ngân qua biển mây. Cảm ơn người giữ đèn nhỏ đã giữ đảo sáng tới bình minh.' : won ? 'Ông Đăng đang chờ ở hòn đảo kế tiếp.' : game.player.flames <= 0 ? 'Mây đã mất hết Ngọn Lửa.' : 'Trời đã sáng nhưng số đèn sáng chưa đạt ngưỡng.');
  text('result-score', String(totalScore));
  text('result-action', dawn ? 'Một hành trình mới' : won ? 'Đến Đêm tiếp theo' : 'Chơi lại Đêm này');

  const saveBox = el('result-save-container');
  saveBox.hidden = cheatFlags.usedAny || !isEligible(totalScore);
  el('save-score').onclick = () => {
    const res = recordScore(el<HTMLInputElement>('player-name').value, totalScore, nightsWon, 202603534 + game.night);
    if (!res.ok) { toast('Tên cần dài 3–12 ký tự (chữ, số hoặc _).'); return; }
    saveBox.hidden = true; toast('Đã lưu điểm vào Bảng xếp hạng!');
  };
  show('result');
}

function handleEvents(events: GameEvent[]): void {
  audio.events(events);
  for (const e of events) {
    if (e.name === 'pulse') { view.pulse(game); if (!settings.reducedMotion) { el('pulse-flash').classList.remove('flash'); void el('pulse-flash').offsetWidth; el('pulse-flash').classList.add('flash'); } }
    if (e.name === 'player_hit' && !settings.reducedMotion && !cheatFlags.godMode) { el('hit-flash').classList.remove('flash'); void el('hit-flash').offsetWidth; el('hit-flash').classList.add('flash'); }
    if (e.name === 'shade_spawned') spawnAlertTicks = 150;
    if (e.name === 'lantern_lit') toast(`${e.data.lantern_id} đã sáng! Túi chứa tăng lên ${game.player.capacity}!`);
    if (e.name === 'refuel') toast(`Châm thêm ${e.data.amount} đom đóm vào ${e.data.lantern_id}.`);
    if (e.name === 'lantern_out') toast(`⚠ ${e.data.lantern_id} đã hết dầu và tắt!`);
    if (e.name === 'charm_picked') toast('Bùa Gió · Chạy nhanh & lướt không hồi chiêu');
    if (e.name === 'drifter_steal') toast('Gió Lạc cướp đom đóm! Đánh gậy hoặc Tỏa sáng (Q) để lấy lại.');
  }
}

el('start').onclick = () => { void audio.start(); wonScores = []; cheatFlags.usedAny = false; introduction(1); };
el('enter-night').onclick = () => { void audio.start(); controls.clear(); show('playing'); accumulator = 0; };
el('resume').onclick = () => { controls.clear(); pauseRequested = true; };
el('hud-pause').onclick = () => { if (game.state === 'playing') pauseRequested = true; };
el('restart').onclick = () => introduction(game.night);
el('to-menu').onclick = () => { newNight(1); show('menu'); };
el('result-menu').onclick = () => { newNight(1); show('menu'); };
el('result-action').onclick = () => {
  if (game.state === 'won' && game.night === 3) { wonScores = []; cheatFlags.usedAny = false; introduction(1); }
  else introduction((game.state === 'won' ? game.night + 1 : game.night) as Night);
};
el('nav-menu').onclick = () => show('menu');
el('open-leaderboard').onclick = () => { el('lb-body').innerHTML = renderLeaderboardRows(getLeaderboard()); show('leaderboard'); };
el('close-leaderboard').onclick = () => show('menu');
el('open-settings').onclick = () => { returnScreen = 'menu'; show('settings'); };
el('pause-settings').onclick = () => { returnScreen = 'pause'; show('settings'); };
el('close-settings').onclick = () => { recordingAction = null; show(returnScreen); };
el('open-help').onclick = () => show('help'); el('close-help').onclick = () => show('menu');
el('pause-cheats').onclick = () => { if (!isBench) el('cheat-panel').hidden = !el('cheat-panel').hidden; };
el('menu-cheat-open').onclick = () => { if (!isBench) el('cheat-panel').hidden = !el('cheat-panel').hidden; };
el('toggle-guide').onclick = () => el('mission-guide').classList.toggle('collapsed');
el<HTMLInputElement>('volume').oninput = e => { settings.volume = Number((e.target as HTMLInputElement).value) / 100; applySettings(true); };
el<HTMLInputElement>('sensitivity').oninput = e => { settings.sensitivity = Number((e.target as HTMLInputElement).value) / 100; applySettings(true); };
el<HTMLInputElement>('colorblind').onchange = e => { settings.colorblind = (e.target as HTMLInputElement).checked; applySettings(true); };
el<HTMLInputElement>('reduced-motion').onchange = e => { settings.reducedMotion = (e.target as HTMLInputElement).checked; applySettings(true); };
el<HTMLInputElement>('large-font').onchange = e => { settings.largeFont = (e.target as HTMLInputElement).checked; applySettings(true); };
el('reset-keybinds').onclick = () => { controls.resetKeybinds(); renderKeybindsList(); toast('Đã khôi phục phím mặc định.'); };

bindCheatPanel({ onJumpNight: n => { newNight(n); show('playing'); }, onToast: toast, getGame: () => game, view, isBench });

window.addEventListener('keydown', e => {
  if (recordingAction) {
    e.preventDefault(); e.stopPropagation();
    const res = controls.setKeybind(recordingAction, e.code);
    toast(res.success ? `Đã gán ${ACTION_LABELS[recordingAction]}: ${e.code.replace(/^(Key|Digit)/, '')}` : `Trùng phím với ${ACTION_LABELS[res.conflictAction!]}!`);
    recordingAction = null; renderKeybindsList(); return;
  }
  if (e.target instanceof HTMLInputElement && !['checkbox', 'range'].includes(e.target.type)) return;
  if (!isBench && e.code === 'F9') { e.preventDefault(); el('cheat-panel').hidden = !el('cheat-panel').hidden; }
  if (!isBench && e.code === 'KeyI' && screen === 'playing') el('mission-guide').classList.toggle('collapsed');
  if (!isBench && e.code === 'KeyH' && screen === 'playing') {
    cheatFlags.hudHidden = !cheatFlags.hudHidden;
    el('hud').style.opacity = cheatFlags.hudHidden ? '0' : '1';
    el('scene-caption').style.opacity = cheatFlags.hudHidden ? '0' : '1';
  }
  if (!isBench && /^[a-zA-Z]$/.test(e.key)) {
    keyBuffer = (keyBuffer + e.key.toUpperCase()).slice(-6);
    if (keyBuffer === 'MAYVIP') { el('cheat-panel').hidden = false; toast('✦ Đã mở Bí Kíp Ông Đăng!'); }
  }
  if (e.code === 'KeyR' && screen === 'result') introduction(game.night);
});
window.addEventListener('blur', () => { if (screen === 'playing') pauseRequested = true; });

if (urlParams.has('qa')) {
  (window as unknown as Record<string, unknown>).__DAO_QA__ = {
    snapshot: () => snapshot(game), load: (night: Night, scenario?: Scenario) => { newNight(night, scenario); show('playing'); },
    screen: () => screen, scores: () => wonScores, info: () => view.info(), audio: () => ({ state: audio.status() === 'not-started' ? 'running' : audio.status() }),
    getGameState: () => game, getLeaderboard, recordScore
  };
}
if (isBench) { view.benchMode = true; view.reset(game); show('playing'); }

function performStaffAttack(time: number): void {
  if (isBench || time - lastAttackTime < 340 || game.player.respawn > 0) return;
  lastAttackTime = time;
  const fx = game.player.facing[0], fz = game.player.facing[1];
  let hits = 0;
  for (const sh of [...game.shades]) {
    if (sh.state === 'spawning') continue;
    const d = distXZ(game.player.pos, sh.pos), dir = direction(game.player.pos, sh.pos);
    if (d <= 1.8 || (d <= 4.0 && dir[0] * fx + dir[1] * fz >= -0.15)) {
      sh.state = 'stunned'; sh.timer = 48; sh.pushLeft = 4; sh.pushDir = dir; hits++;
      damageShade(game, sh, 1, pos => { view.shadeBurst(pos); toast('Đã hạ Bóng Mực! Hồi sinh sau 20s.'); });
    }
  }
  for (const d of game.drifters) {
    if (distXZ(game.player.pos, d.pos) <= 3.6) {
      d.state = 'flee'; d.timer = 120; d.started = game.simTick; d.dir = direction(game.player.pos, d.pos); hits++;
    }
  }
  view.attack(game, hits > 0); audio.playAttack(hits);
}

function animate(time: number): void {
  const delta = lastFrame ? Math.min(0.1, (time - lastFrame) / 1000) : 0; lastFrame = time;
  if (isBench && benchCollector) {
    accumulator += delta;
    while (accumulator >= 1 / 60) { accumulator -= 1 / 60; stepBenchGame(game); }
    benchCollector.recordFrame(time, view.info().renderer);
  } else if (screen === 'playing' || screen === 'pause') {
    if (cheatFlags.directorCam && screen === 'playing') {
      const p = controls.read();
      view.freeCamPos.x += p.move[0] * delta * 18; view.freeCamPos.z += p.move[1] * delta * 18;
      if (p.jump) view.freeCamPos.y += delta * 12;
      if (p.dash) view.freeCamPos.y -= delta * 12;
    }
    if (screen === 'playing' && game.state === 'playing' && controls.consumeAttack()) performStaffAttack(time);
    accumulator += delta;
    while (accumulator >= 1 / 60) {
      accumulator -= 1 / 60;
      const patch = cheatFlags.directorCam ? { pause: pauseRequested } : controls.read();
      if (pauseRequested) { patch.pause = true; pauseRequested = false; }
      applyCheatPreStep(game, isBench); applyCombatPreStep(game, isBench);
      const prev = game.state, out = step(game, patch);
      game = out.state; applyCheatPostStep(game, out.events, isBench);
      applyCombatPostStep(
        game, out.events, isBench,
        (pos, viaPulse, count) => { view.shadeBurst(pos); if (viaPulse) toast(`Tỏa sáng hạ ${count} Bóng Mực! Hồi sinh sau 20s.`); },
        pos => view.shadeBurst(pos)
      );
      handleEvents(out.events);
      if (spawnAlertTicks > 0) spawnAlertTicks--;
      const sec = Math.ceil(game.timeLeft);
      if (sec <= 10 && sec > 0 && sec !== lastCountdown) { lastCountdown = sec; audio.play('countdown'); }
      if (prev === 'playing' && game.state === 'paused') show('pause');
      if (prev === 'paused' && game.state === 'playing') show('playing');
      if (game.state === 'won' || game.state === 'lost') { finish(); break; }
    }
    const moving = Math.hypot(game.player.vel[0], game.player.vel[2]) > 0.25 && game.player.grounded;
    const nearMote = game.motes.some(m => distXZ(game.player.pos, m.pos) <= 9.5);
    audio.update(screen === 'playing' && game.state === 'playing', time, { wind: game.wind.active ? 'strong' : game.wind.warning ? 'warn' : 'calm', moving, nearMote });
  }
  view.render(game, controls.yaw, screen === 'playing' || isBench, time);
  if (!isBench && (screen === 'playing' || screen === 'pause')) updateHud(game, view, spawnAlertTicks);
  requestAnimationFrame(animate);
}
applySettings(false);
if (!isBench) { game.lanterns[2].lit = true; game.lanterns[2].fuelTicks = 6000; game.lanterns[3].lit = true; game.lanterns[3].fuelTicks = 6000; show('menu'); }
requestAnimationFrame(animate);
