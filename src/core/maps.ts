import type { MapData, Night, Pad, Vec3 } from './types.js';
function ring(n: number, radius: number, y = 0, cx = 0, start = 0, step = 360 / n): Vec3[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (start + step * i) * Math.PI / 180;
    return [cx + radius * Math.cos(a), y, radius * Math.sin(a)];
  });
}
function pad(pos: Vec3, target: Vec3, vy: number, speed: number): Pad {
  const d = Math.hypot(target[0] - pos[0], target[2] - pos[2]);
  return { pos, radius: 1, vy, velocity: [(target[0] - pos[0]) / d * speed, (target[2] - pos[2]) / d * speed] };
}
export function makeMap(night: Night): MapData {
  if (night === 1) return {
    name: 'Đảo Bến', subtitle: 'Một ánh đèn, một lối về.',
    lanterns: [[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]],
    motePoints: [...ring(8,12), ...ring(16,33)], shadePoints: ring(12,37,0,0,15), charms: [], pads: []
  };
  if (night === 2) return {
    name: 'Đảo Cau', subtitle: 'Qua cầu tre, nối lại hai miền sáng.',
    lanterns: [[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]],
    motePoints: [...ring(4,10), ...ring(8,22), ...ring(4,10,0,70), ...ring(8,22,0,70)],
    shadePoints: [...ring(8,26,0,0,22.5), ...ring(8,26,0,70,22.5)], charms: [[35,0,0]],
    pads: [pad([20,0,18],[70,0,0],14,24),pad([50,0,-18],[0,0,0],14,24)]
  };
  return {
    name: 'Đảo Chuông', subtitle: 'Đánh thức tiếng chuông trên biển mây.',
    lanterns: [[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]],
    motePoints: [...ring(18,34), ...ring(8,18,3,0,20,20), ...ring(4,5,6,0,45)],
    shadePoints: ring(16,43), charms: [[30,0,25],[-30,0,25]],
    pads: [{ pos:[0,3,13], radius:1, vy:12, velocity:[0,-8] }]
  };
}
export function surfaces(night: Night, x: number, z: number): number[] {
  const r = Math.hypot(x, z);
  if (night === 1) return r <= 40 + 1e-8 ? [0] : [];
  if (night === 2) return r <= 28 + 1e-8 || Math.hypot(x-70,z) <= 28 + 1e-8 ||
    (x>=26 && x<=44 && Math.abs(z)<=2) ? [0] : [];
  if (r > 45 + 1e-8) return [];
  const levels = [0];
  if (r <= 8 + 1e-8) levels.push(6);
  if (r >= 12 - 1e-8 && r <= 24 + 1e-8 && z > 0) levels.push(3);
  for (const deg of [30,150]) {
    const a = deg*Math.PI/180; const along=x*Math.cos(a)+z*Math.sin(a);
    const cross=-x*Math.sin(a)+z*Math.cos(a);
    if (along>=24-1e-8 && along<=30+1e-8 && Math.abs(cross)<=1.5) levels.push((30-along)/2);
  }
  return levels.sort((a,b)=>b-a);
}
export const ground = (night: Night, x: number, z: number) => surfaces(night,x,z)[0] ?? -Infinity;
export function blocked(night: Night, from: Vec3, to: Vec3): boolean {
  if (night === 3 && Math.hypot(to[0],to[2]) < 2 && to[1] < 14 && to[1] >= 5.7) return true;
  const h = ground(night,to[0],to[2]);
  return h > Math.max(from[1],to[1])+0.26;
}
