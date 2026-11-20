import type { Vec2, Vec3 } from './types.js';
export const DT = 1 / 60;
export const ticks = (seconds: number) => Math.round(seconds * 60);
export const distXZ = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const dist3 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function direction(a: Vec3, b: Vec3): Vec2 {
  const d = distXZ(a, b); return d < 1e-9 ? [1, 0] : [(b[0] - a[0]) / d, (b[2] - a[2]) / d];
}
export function seeded(seed: number): () => number {
  let n = seed >>> 0;
  return () => {
    n = (n + 0x6D2B79F5) >>> 0; let z = n;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
export function movement(move: Vec2, yaw: number): Vec2 {
  const length = Math.max(1, Math.hypot(...move)); const a = yaw * Math.PI / 180;
  return [(move[0] * Math.cos(a) + move[1] * Math.sin(a)) / length,
    (-move[0] * Math.sin(a) + move[1] * Math.cos(a)) / length];
}
export const round1 = (v: number) => { const x = Math.round(v * 10) / 10; return Object.is(x, -0) ? 0 : x; };
export const round3 = (v: number) => { const x = Math.round(v * 1000) / 1000; return Object.is(x, -0) ? 0 : x; };
export const position = (v: Vec3): Vec3 => v.map(round3) as Vec3;
export function byId(a:{id:string},b:{id:string}):number {
  const am=/^([A-Za-z]+)(\d+)$/.exec(a.id),bm=/^([A-Za-z]+)(\d+)$/.exec(b.id);
  if(am&&bm&&am[1]===bm[1]&&Number.isSafeInteger(Number(am[2]))&&Number.isSafeInteger(Number(bm[2])))return Number(am[2])-Number(bm[2]);
  return a.id<b.id?-1:a.id>b.id?1:0;
}
