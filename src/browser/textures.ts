import * as THREE from 'three';
import type { Night, Vec3 } from '../core/types.js';
import { colors as c } from './palette.js';

function canvas2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return [cv, cv.getContext('2d')!];
}

function hash2(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Sinh texture mặt đảo (cỏ hữu cơ + viền cát tự nhiên + đường mòn đá cuội nối đèn). */
export function createIslandTopTexture(
  night: Night, lanterns: Vec3[], cx: number, radius: number
): THREE.CanvasTexture {
  const size = 1024;
  const [cv, ctx] = canvas2d(size, size);
  const toPx = (wx: number, wz: number) => [
    size / 2 + ((wx - cx) / (radius * 2)) * size,
    size / 2 + (wz / (radius * 2)) * size
  ];

  // Nền cát ven rìa đảo
  ctx.fillStyle = c.sand;
  ctx.fillRect(0, 0, size, size);

  // Vòng thảm cỏ hữu cơ có gợn sóng nhẹ
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const rRatio = 0.455 + 0.015 * Math.sin(a * 7 + night) + 0.008 * Math.cos(a * 13);
    const px = size / 2 + Math.cos(a) * size * rRatio;
    const py = size / 2 + Math.sin(a) * size * rRatio;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.clip();

  const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size * 0.48);
  grad.addColorStop(0, '#36695B');
  grad.addColorStop(0.65, c.grass);
  grad.addColorStop(1, c.grassDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Chấm hữu cơ tạo chiều sâu cỏ mịn màng
  for (let i = 0; i < 3600; i++) {
    const x = hash2(i * 2 + 1) * size, y = hash2(i * 2 + 2) * size;
    const r = 1.5 + hash2(i + 9) * 5;
    ctx.fillStyle = i % 9 === 0 ? 'rgba(201,180,138,0.08)' : i % 2 === 0 ? 'rgba(75,139,116,0.12)' : 'rgba(20,45,38,0.14)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Vẽ đường mòn đất cát rải sỏi nhỏ mịn nối tới từng đèn
  const [ox, oy] = toPx(cx, 0);
  for (const l of lanterns) {
    if (Math.hypot(l[0] - cx, l[2]) > radius + 2) continue;
    const [lx, ly] = toPx(l[0], l[2]);
    ctx.save();
    ctx.strokeStyle = 'rgba(201,180,138,0.18)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    const mx = (ox + lx) * 0.5 + (l[0] >= cx ? 14 : -14);
    const my = (oy + ly) * 0.5 - (l[2] >= 0 ? 10 : -10);
    ctx.quadraticCurveTo(mx, my, lx, ly);
    ctx.stroke();
    ctx.restore();

    for (let s = 2; s < 28; s++) {
      const t = s / 30;
      const u = 1 - t;
      const sx = u * u * ox + 2 * u * t * mx + t * t * lx;
      const sy = u * u * oy + 2 * u * t * my + t * t * ly;
      for (let k = 0; k < 2; k++) {
        const px = sx + (hash2(s * 17 + k) - 0.5) * 14;
        const py = sy + (hash2(s * 31 + k) - 0.5) * 14;
        const rx = 2.2 + hash2(s + k * 7) * 3.5;
        ctx.fillStyle = k === 0 ? 'rgba(201,180,138,0.34)' : 'rgba(110,104,96,0.38)';
        ctx.beginPath();
        ctx.ellipse(px, py, rx, rx * 0.7, hash2(k + s) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(201,180,138,0.32)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(lx, ly, 20, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Sinh texture đá xếp lớp rêu phong cho vách đảo và Tháp Chuông. */
export function createStoneTexture(): THREE.CanvasTexture {
  const [cv, ctx] = canvas2d(256, 256);
  ctx.fillStyle = c.stone;
  ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const y = row * 32, off = (row % 2) * 32;
    for (let col = -1; col < 5; col++) {
      const x = col * 64 + off;
      const shade = 52 + Math.floor(hash2(row * 11 + col) * 24);
      ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 22})`;
      ctx.fillRect(x + 2, y + 2, 60, 28);
      if ((row + col) % 3 === 0) {
        ctx.fillStyle = 'rgba(47,93,80,0.45)';
        ctx.fillRect(x + 4, y + 2, 26, 7);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

/** Sinh texture gỗ vân mộc cho trụ đèn, cầu tre và thuyền. */
export function createWoodTexture(): THREE.CanvasTexture {
  const [cv, ctx] = canvas2d(128, 128);
  ctx.fillStyle = c.wood;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 42; i++) {
    const y = hash2(i * 3) * 128;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(40,22,12,0.35)' : 'rgba(155,112,72,0.22)';
    ctx.fillRect(0, y, 128, 1 + hash2(i) * 3);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Sinh texture giấy lồng đèn (có vết rách rõ ràng khi đèn tắt theo Ticket-03). */
export function createLanternPaperTexture(torn: boolean): THREE.CanvasTexture {
  const [cv, ctx] = canvas2d(256, 256);
  ctx.fillStyle = torn ? c.unlit : '#FFECC8';
  ctx.fillRect(0, 0, 256, 256);

  // Nan tre đan ngang dọc
  ctx.strokeStyle = torn ? 'rgba(30,32,42,0.6)' : 'rgba(140,85,35,0.45)';
  ctx.lineWidth = 3;
  for (let y = 24; y < 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  for (let x = 32; x < 256; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }

  if (torn) {
    // Vết rách đen chữ thập & mảng giấy nhàu phân biệt không cần màu sắc
    ctx.fillStyle = '#181B24';
    for (const cx of [68, 188]) {
      ctx.beginPath();
      ctx.moveTo(cx - 26, 70); ctx.lineTo(cx + 8, 112); ctx.lineTo(cx - 12, 165);
      ctx.lineTo(cx + 28, 198); ctx.lineTo(cx + 16, 128); ctx.lineTo(cx + 30, 82);
      ctx.closePath(); ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Quầng sáng radial siêu mượt không viền vuông. */
export function createSoftGlowTexture(): THREE.CanvasTexture {
  const [cv, ctx] = canvas2d(128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,246,194,0.75)');
  g.addColorStop(0.55, 'rgba(255,200,90,0.22)');
  g.addColorStop(1, 'rgba(255,180,70,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

/** Vẽ thanh nhiên liệu 3D treo trên đèn đang sáng. */
export function drawFuelSprite(canvas: HTMLCanvasElement, fuelPct: number, lowBlink: boolean): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(14, 20, 48, 0.85)';
  ctx.strokeStyle = lowBlink ? c.danger : c.gold;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 8); ctx.fill(); ctx.stroke();

  const fillW = Math.max(0, Math.min(1, fuelPct / 100)) * (w - 20);
  ctx.fillStyle = fuelPct < 30 ? c.danger : fuelPct < 55 ? c.lamp : '#7AE582';
  ctx.beginPath(); ctx.roundRect(10, 10, fillW, h - 20, 4); ctx.fill();
}

/** Vẽ thanh máu 3 đốt trên đầu Bóng Mực (đánh 3 gậy hoặc 1 phát Q là hạ gục). */
export function drawShadeHpSprite(canvas: HTMLCanvasElement, hp: number, maxHp = 3): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(10, 8, 22, 0.92)';
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.78)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 7); ctx.fill(); ctx.stroke();

  const gap = 5, pad = 9;
  const segW = (w - pad * 2 - gap * (maxHp - 1)) / maxHp;
  for (let i = 0; i < maxHp; i++) {
    const x = pad + i * (segW + gap);
    ctx.fillStyle = i < hp ? (hp === 1 ? '#FF1744' : '#FF476F') : 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath(); ctx.roundRect(x, 8, segW, h - 16, 4); ctx.fill();
  }
}
