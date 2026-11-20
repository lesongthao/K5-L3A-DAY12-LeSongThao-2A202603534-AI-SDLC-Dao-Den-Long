import type { GameState } from '../core/types.js';
import { nearestLantern } from '../core/items.js';
import { distXZ } from '../core/math.js';
import type { WorldView } from './scene.js';
import { getContextualGuide } from './guide.js';
import { cheatFlags } from './cheats.js';

export const el = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
export const text = (id: string, value: string): void => {
  const o = el(id);
  if (o && o.textContent !== value) o.textContent = value;
};

const FLAME_SVG = '<svg viewBox="0 0 24 24" class="flame-svg %CLS%"><path d="M12 2C12 2 7 7.2 7 12.2A5 5 0 0 0 17 12.2C17 9.8 15.6 7.5 14.3 5.9C14.1 8 12.9 9.2 12 9.4C12.8 7.5 12.6 4.7 12 2Z"/></svg>';

export function updateHud(s: GameState, view: WorldView, spawnAlertTicks = 0): void {
  const p = s.player;
  const flames = Array.from({ length: s.tuning.flames }, (_, i) =>
    FLAME_SVG.replace('%CLS%', i < p.flames ? 'lit' : '')
  ).join('');
  if (el('flames').innerHTML !== flames) el('flames').innerHTML = flames;

  const seconds = Math.ceil(s.timeLeft);
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  text('timer', `${mm}:${ss}`);
  el('timer').classList.toggle('danger', seconds <= 30);

  const litCount = s.lanterns.filter(l => l.lit).length;
  const needed = Math.ceil(s.tuning.win_ratio * s.lanterns.length);
  text('lamp-count', `${litCount} / ${s.lanterns.length} (cần ${needed})`);

  text('score', String(s.score));
  text('carried', `${p.carried} / ${p.capacity}`);
  const slots = Array.from({ length: p.capacity }, (_, i) => `<i class="${i < p.carried ? 'full' : ''}"></i>`).join('');
  if (el('slots').innerHTML !== slots) el('slots').innerHTML = slots;

  text('charm-status', cheatFlags.godMode ? '✦ Bất tử' : cheatFlags.superSpeed ? '✦ Siêu tốc' : p.charm > 0 ? `❧ ${Math.ceil(p.charm / 60)}s` : '');
  text('dash-cd', p.charm > 0 ? 'Bùa Gió' : p.dashCd > 0 ? `${(p.dashCd / 60).toFixed(1)}s` : 'Sẵn sàng');
  text('pulse-cd', p.pulseCd > 0 ? `${(p.pulseCd / 60).toFixed(1)}s` : '3 đom đóm');
  el('dash-ability').classList.toggle('cooling', p.dashCd > 0 && p.charm === 0);
  el('pulse-ability').classList.toggle('cooling', p.pulseCd > 0 || p.carried < s.tuning.pulse_cost);

  const l = nearestLantern(s), near = l && distXZ(p.pos, l.pos) <= s.tuning.interact_radius;
  el('interact').hidden = !near || p.respawn > 0;
  if (l) {
    if (!l.lit) {
      const cost = l.everLit ? s.tuning.relight_cost : s.tuning.lantern_cost;
      text('deposit-progress', `(${l.deposited}/${cost})`);
    } else {
      text('deposit-progress', `(Châm dầu ${Math.round(l.fuelTicks / 60)}/100)`);
    }
  }

  // Cập nhật La bàn Chỉ Dẫn Đường Đi Nước Bước
  const guide = getContextualGuide(s);
  text('guide-step', guide.step);
  text('guide-detail', guide.detail);
  el('mission-guide').classList.toggle('urgent', !!guide.urgent);

  const indicator = l ? view.indicator(l.pos) : null;
  el('direction').hidden = !indicator || indicator.visible;
  if (indicator) el('direction').querySelector('span')!.style.transform = `rotate(${indicator.angle}rad)`;

  const lowFuel = s.lanterns.filter(x => x.lit && x.fuelTicks / 60 < s.tuning.low_fuel_threshold);
  const showWarning = s.wind.warning || s.wind.active || lowFuel.length > 0 || spawnAlertTicks > 0;
  el('wind-warning').hidden = !showWarning;
  if (s.wind.active) text('wind-warning', '❧ Gió mạnh — tránh mép đảo!');
  else if (s.wind.warning) text('wind-warning', '❧ Gió sắp đến!');
  else if (lowFuel.length > 0) text('wind-warning', `⚠ ${lowFuel.length} đèn yếu (<30%)!`);
  else if (spawnAlertTicks > 0) text('wind-warning', '⚠ Bóng Mực vừa xuất hiện!');

  const bigCountdown = el('big-countdown');
  if (bigCountdown) {
    bigCountdown.hidden = !(seconds <= 10 && seconds > 0);
    if (!bigCountdown.hidden) text('big-countdown', String(seconds));
  }

  const shadeWarning = el('shade-warning');
  if (shadeWarning) {
    const threat = s.shades.filter(sh => sh.state === 'chase' || distXZ(sh.pos, p.pos) < 16 || (spawnAlertTicks > 0 && sh.state === 'spawning'));
    if (threat.length > 0) {
      const ind = view.indicator(threat[threat.length - 1].pos);
      if (!ind.visible) {
        shadeWarning.hidden = false;
        shadeWarning.querySelector('span')!.style.transform = `rotate(${ind.angle}rad)`;
      } else shadeWarning.hidden = true;
    } else shadeWarning.hidden = true;
  }
}
