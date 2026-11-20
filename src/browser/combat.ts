import type { GameEvent, GameState, Shade, Vec3 } from '../core/types.js';
import { distXZ } from '../core/math.js';

export const SHADE_MAX_HP = 3;
export const SHADE_RESPAWN_TICKS = 20 * 60; // 20 giây (1200 bước mô phỏng ở 60Hz)

interface DeadShadeEntry {
  shade: Shade;
  origin: Vec3;
  respawnAtTick: number;
}

const hpMap = new Map<string, number>();
let deadQueue: DeadShadeEntry[] = [];
let savedRandomShades = true;

/** Xóa sạch bộ đếm máu quái và hàng chờ hồi sinh khi qua màn hoặc chơi lại. */
export function resetCombat(): void {
  hpMap.clear();
  deadQueue = [];
}

/** Lấy số máu hiện tại và máu tối đa của một Bóng Mực. */
export function getShadeHp(id: string): { hp: number; maxHp: number } {
  let hp = hpMap.get(id);
  if (hp === undefined) {
    hp = SHADE_MAX_HP;
    hpMap.set(id, hp);
  }
  return { hp, maxHp: SHADE_MAX_HP };
}

/** Gây sát thương lên Bóng Mực; trả về true nếu Bóng Mực bị tiêu diệt và chờ hồi sinh sau 20s. */
export function damageShade(s: GameState, sh: Shade, dmg: number, onKill?: (pos: Vec3) => void): boolean {
  const { hp } = getShadeHp(sh.id);
  const next = hp - dmg;
  if (next > 0) {
    hpMap.set(sh.id, next);
    return false;
  }

  hpMap.delete(sh.id);
  deadQueue.push({
    shade: sh,
    origin: [...sh.pos],
    respawnAtTick: s.simTick + SHADE_RESPAWN_TICKS
  });
  s.shades = s.shades.filter(item => item.id !== sh.id);
  s.score += s.tuning.score.per_stun;
  onKill?.(sh.pos);
  return true;
}

/** Trả về danh sách các quái sắp hồi sinh để ngăn core spawn thừa vượt cap trong lúc đang chờ 20s. */
export function applyCombatPreStep(s: GameState, isBench: boolean): void {
  if (isBench) return;
  savedRandomShades = s.randomShades;
  const cap = s.tuning.shade_caps[s.night - 1];
  if (s.shades.length + deadQueue.length >= cap) {
    s.randomShades = false;
  }
}

/** Xử lý Q tiêu diệt ngay lập tức và hồi sinh Bóng Mực sau đúng 20 giây mô phỏng. */
export function applyCombatPostStep(
  s: GameState, events: GameEvent[], isBench: boolean,
  onKill?: (pos: Vec3, viaPulse: boolean, count: number) => void, onRespawn?: (pos: Vec3) => void
): void {
  if (isBench) return;
  s.randomShades = savedRandomShades;

  // Kỹ năng Tỏa sáng (Q - tốn 3 đom đóm): tiêu diệt ngay mọi Bóng Mực dính đòn trong tầm
  for (const e of events) {
    if (e.name === 'pulse' && Array.isArray(e.data.stunned_ids)) {
      const ids = e.data.stunned_ids as string[];
      let pulseKills = 0;
      let lastPos: Vec3 | null = null;
      for (const id of ids) {
        const target = s.shades.find(sh => sh.id === id);
        if (target && damageShade(s, target, SHADE_MAX_HP)) {
          pulseKills++;
          lastPos = target.pos;
        }
      }
      if (pulseKills > 0 && lastPos) onKill?.(lastPos, true, pulseKills);
    }
  }

  // Hồi sinh Bóng Mực sau đúng 20 giây (đóng băng tự nhiên nếu người chơi Pause)
  if (deadQueue.length === 0) return;
  const stillWaiting: DeadShadeEntry[] = [];
  for (const item of deadQueue) {
    if (s.simTick >= item.respawnAtTick) {
      const sh = item.shade;
      const farSpawn = s.map.shadePoints
        .filter(pt => distXZ(pt, s.player.pos) >= 12)
        .sort((a, b) => distXZ(b, item.origin) - distXZ(a, item.origin))[0];
      const spawnPos: Vec3 = distXZ(item.origin, s.player.pos) >= 10
        ? [...item.origin]
        : farSpawn ? [farSpawn[0], farSpawn[1] + 0.8, farSpawn[2]] : [...item.origin];

      sh.pos = spawnPos;
      sh.state = 'spawning';
      sh.timer = 45;
      sh.pushLeft = 0;
      sh.eject = 0;
      sh.targetLanternId = undefined;
      hpMap.set(sh.id, SHADE_MAX_HP);
      s.shades.push(sh);
      onRespawn?.(sh.pos);
    } else {
      stillWaiting.push(item);
    }
  }
  deadQueue = stillWaiting;
}
