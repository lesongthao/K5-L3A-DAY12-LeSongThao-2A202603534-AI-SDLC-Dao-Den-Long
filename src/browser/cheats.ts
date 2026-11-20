import type { GameEvent, GameState, Night } from '../core/types.js';
import type { WorldView } from './scene.js';

export interface CheatFlags {
  godMode: boolean;
  infiniteMotes: boolean;
  freezeShades: boolean;
  superSpeed: boolean;
  hudHidden: boolean;
  directorCam: boolean;
  usedAny: boolean;
}

export const cheatFlags: CheatFlags = {
  godMode: false, infiniteMotes: false, freezeShades: false,
  superSpeed: false, hudHidden: false, directorCam: false, usedAny: false
};

let savedFlamesBeforeStep = 3;

/** Áp dụng trước mỗi bước mô phỏng — không ép invuln để tránh nhấp nháy tàng hình nhân vật. */
export function applyCheatPreStep(s: GameState, isBench: boolean): void {
  if (isBench) return;
  savedFlamesBeforeStep = s.player.flames;
  if (cheatFlags.godMode) {
    s.player.flames = s.tuning.flames;
    if (s.player.pos[1] < -9) {
      s.player.pos = [0, 1.5, 0]; s.player.vel = [0, 0, 0]; s.player.respawn = 0;
    }
  }
  if (cheatFlags.infiniteMotes) {
    s.player.carried = s.player.capacity;
  }
  if (cheatFlags.superSpeed) {
    s.player.charm = Math.max(s.player.charm, 120);
  }
  if (cheatFlags.freezeShades) {
    for (const sh of s.shades) {
      sh.state = 'stunned';
      // Giữ nguyên pushLeft nếu người chơi vừa đánh gậy trúng để quái vẫn bị văng bay mượt mà
      if (sh.pushLeft <= 0) sh.timer = 120;
    }
  }
}

/** Khôi phục sạch sẽ ngay sau step nếu bật God Mode (chỉ hoàn đom đóm khi bị quái đánh rơi, không chặn Q/nạp đèn). */
export function applyCheatPostStep(s: GameState, events: GameEvent[], isBench: boolean): void {
  if (isBench || !cheatFlags.godMode) return;
  if (s.player.flames < s.tuning.flames) {
    s.player.flames = Math.max(savedFlamesBeforeStep, s.tuning.flames);
  }
  const hit = events.find(e => e.name === 'player_hit');
  if (hit) {
    const dropped = Number(hit.data.dropped ?? 0);
    if (dropped > 0) {
      s.player.carried = Math.min(s.player.capacity, s.player.carried + dropped);
      s.motes = s.motes.filter(m => !(m.kind === 'dropped' && m.born === s.simTick));
    }
  }
  s.player.invuln = 0;
  s.player.respawn = 0;
}

export function lightAllLanterns(s: GameState): void {
  cheatFlags.usedAny = true;
  for (const l of s.lanterns) {
    l.lit = true; l.everLit = true;
    l.fuelTicks = s.tuning.fuel_max * 60;
    l.deposited = s.tuning.lantern_cost;
  }
  s.player.successful_lights = Math.max(s.player.successful_lights, s.lanterns.length);
  s.player.capacity = Math.min(s.tuning.capacity_max, s.tuning.carry_capacity + 2 * s.player.successful_lights);
}

export function triggerDawnCheat(s: GameState): void {
  lightAllLanterns(s);
  s.simTick = Math.max(0, Math.round(s.initialTime * 60) - 2);
  s.timeLeft = 2 / 60;
}

export function resetAllCheats(view: WorldView): void {
  cheatFlags.godMode = false; cheatFlags.infiniteMotes = false; cheatFlags.freezeShades = false;
  cheatFlags.superSpeed = false; cheatFlags.hudHidden = false; cheatFlags.directorCam = false;
  view.directorCam = false;
  for (const id of ['cheat-god', 'cheat-motes', 'cheat-freeze', 'cheat-speed', 'cheat-hide-hud', 'cheat-director']) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.checked = false;
  }
  const hud = document.getElementById('hud'), cap = document.getElementById('scene-caption');
  if (hud) hud.style.opacity = '1';
  if (cap) cap.style.opacity = '1';
}

export function bindCheatPanel(actions: {
  onJumpNight: (n: Night) => void; onToast: (msg: string) => void; getGame: () => GameState; view: WorldView; isBench: boolean;
}): void {
  if (actions.isBench) return;
  const panel = document.getElementById('cheat-panel');
  if (!panel) return;

  const syncUi = () => {
    const anyActive = cheatFlags.godMode || cheatFlags.infiniteMotes || cheatFlags.freezeShades || cheatFlags.superSpeed || cheatFlags.directorCam;
    const badge = document.getElementById('cheat-badge');
    if (badge) badge.hidden = !anyActive;
    const hud = document.getElementById('hud'), cap = document.getElementById('scene-caption');
    if (hud) hud.style.opacity = cheatFlags.hudHidden ? '0' : '1';
    if (cap) cap.style.opacity = cheatFlags.hudHidden ? '0' : '1';
    actions.view.directorCam = cheatFlags.directorCam;
  };

  const toggle = (flag: keyof Omit<CheatFlags, 'usedAny'>, id: string) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return;
    input.checked = cheatFlags[flag];
    input.onchange = () => {
      cheatFlags[flag] = input.checked;
      if (flag !== 'hudHidden' && flag !== 'directorCam') cheatFlags.usedAny = true;
      if (flag === 'directorCam' && input.checked) {
        const p = actions.getGame().player.pos;
        actions.view.freeCamPos.set(p[0] + 10, p[1] + 6, p[2] - 12);
      }
      input.blur();
      syncUi();
    };
  };

  toggle('godMode', 'cheat-god'); toggle('infiniteMotes', 'cheat-motes');
  toggle('freezeShades', 'cheat-freeze'); toggle('superSpeed', 'cheat-speed');
  toggle('hudHidden', 'cheat-hide-hud'); toggle('directorCam', 'cheat-director');

  document.getElementById('cheat-light-all')?.addEventListener('click', () => {
    lightAllLanterns(actions.getGame()); syncUi(); actions.onToast('Bí Kíp: Đã thắp sáng toàn đảo!');
  });
  document.getElementById('cheat-dawn')?.addEventListener('click', () => {
    triggerDawnCheat(actions.getGame()); syncUi(); actions.onToast('Bí Kíp: Đang triệu hồi Bình Minh!');
  });
  document.getElementById('cheat-reset-all')?.addEventListener('click', () => {
    resetAllCheats(actions.view); syncUi(); actions.onToast('Đã tắt tất cả hiệu ứng Bí Kíp.');
  });
  for (const n of [1, 2, 3] as Night[]) {
    document.getElementById(`cheat-n${n}`)?.addEventListener('click', () => {
      cheatFlags.usedAny = true; actions.onJumpNight(n); syncUi(); actions.onToast(`Bí Kíp: Chuyển tới Đêm ${n}`);
    });
  }
  document.getElementById('cheat-close')?.addEventListener('click', () => { panel.hidden = true; });
}
