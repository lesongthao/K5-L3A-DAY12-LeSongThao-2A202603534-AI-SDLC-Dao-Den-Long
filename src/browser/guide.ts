import type { GameState } from '../core/types.js';
import { nearestLantern } from '../core/items.js';
import { distXZ } from '../core/math.js';

export interface GuideHint {
  step: string;
  detail: string;
  urgent?: boolean;
}

/** Sinh chỉ dẫn siêu ngắn gọn theo ngữ cảnh (tối đa 2 dòng để không che góc nhìn). */
export function getContextualGuide(s: GameState): GuideHint {
  const p = s.player;
  const lit = s.lanterns.filter(l => l.lit);
  const needed = Math.ceil(s.tuning.win_ratio * s.lanterns.length);
  const nearShade = s.shades.find(sh => sh.state === 'chase' && distXZ(sh.pos, p.pos) <= 7.5);
  const lowFuel = s.lanterns.find(l => l.lit && l.fuelTicks / 60 < s.tuning.low_fuel_threshold);
  const nearLantern = nearestLantern(s);
  const inInteract = nearLantern && distXZ(p.pos, nearLantern.pos) <= s.tuning.interact_radius;

  if (s.wind.active || s.wind.warning) {
    return { step: 'Cảnh giác Gió Lốc!', detail: 'Giữ phím di chuyển, tránh mép vực.', urgent: true };
  }
  if (nearShade) {
    return { step: 'Bóng Mực áp sát!', detail: 'Click Trái đánh 3 gậy hoặc [Q] hạ ngay!', urgent: true };
  }
  if (inInteract && nearLantern) {
    if (!nearLantern.lit) {
      const req = nearLantern.everLit ? s.tuning.relight_cost : s.tuning.lantern_cost;
      return p.carried > 0
        ? { step: `Nạp đèn ${nearLantern.id} (${nearLantern.deposited}/${req})`, detail: 'Bấm [E] hoặc Chuột Phải để nạp sáng.' }
        : { step: `Đèn ${nearLantern.id} cần đom đóm`, detail: 'Gom đốm vàng rồi quay lại bấm [E].' };
    }
    if (nearLantern.fuelTicks / 60 < 99 && p.carried > 0) {
      return { step: `Châm dầu ${nearLantern.id}`, detail: 'Bấm [E] hoặc Chuột Phải để đổ đầy dầu.' };
    }
  }
  if (lowFuel) {
    return { step: `Đèn ${lowFuel.id} yếu (<30%)!`, detail: 'Tới châm dầu gấp (E / Chuột phải).', urgent: true };
  }
  if (s.drifters.some(d => d.state === 'flee' && d.stolen > 0)) {
    return { step: 'Gió Lạc trộm đom đóm!', detail: 'Đánh gậy hoặc [Q] để thu hồi lại.', urgent: true };
  }
  if (lit.length >= needed) {
    return { step: `Đủ đèn sáng (${lit.length}/${s.lanterns.length})`, detail: 'Châm dầu giữ đèn tới hết giờ!' };
  }
  if (p.carried >= 10 || (p.carried >= 5 && nearLantern && !nearLantern.lit && nearLantern.everLit)) {
    return { step: 'Đủ sáng thắp đèn!', detail: 'Theo mũi tên ▲, tới đèn bấm [E] / Phải.' };
  }
  if (s.night === 2 && lit.length < 3 && p.carried < 5) {
    return { step: `Thắp ${needed} đèn Đảo Cau`, detail: 'Qua cầu tre hoặc Bục Ngọc sang đảo kia.' };
  }
  if (s.night === 3 && p.carried < 5) {
    return { step: `Thắp ${needed} đèn Đảo Chuông`, detail: 'Theo dốc đá hoặc Bục Ngọc lên tầng cao.' };
  }
  return { step: `Gom Đom Đóm (${p.carried}/${p.capacity})`, detail: `Gom đốm sáng rồi thắp ${needed}/${s.lanterns.length} đèn.` };
}
