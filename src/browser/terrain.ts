import * as THREE from 'three';
import type { GameState } from '../core/types.js';
import { mat, mesh } from './models.js';
import { ancientTree, rockCluster, ongDangBoat } from './models-world.js';
import { createIslandTopTexture, createStoneTexture, createWoodTexture } from './textures.js';
import { createGrassField } from './shaders.js';
import { colors as c } from './palette.js';

export interface TerrainAssets {
  group: THREE.Group;
  grass: ReturnType<typeof createGrassField> | null;
  boat: THREE.Group | null;
  padRings: THREE.Mesh[];
}

function buildIslandMesh(
  g: THREE.Group, s: GameState, x: number, r: number,
  stoneMat: THREE.Material, woodTex: THREE.Texture, stoneTex: THREE.Texture, creative: boolean
): void {
  // Mặt trên đảo dùng Texture có cỏ hữu cơ, viền cát & đường mòn đá cuội
  const topTex = createIslandTopTexture(s.night, s.lanterns.map(l => l.pos), x, r);
  const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.85, metalness: 0.02 });
  const topDisc = mesh(new THREE.CylinderGeometry(r, r, 0.14, 72), topMat, x, -0.06, 0);
  g.add(topDisc);

  // Vành bờ đất cát & vách đá gồ ghề dưới đáy
  g.add(mesh(new THREE.CylinderGeometry(r, r - 2.4, 3.8, 48), mat(c.sand, undefined, 0.9), x, -2.02, 0));
  g.add(mesh(new THREE.ConeGeometry(r - 2.2, 13.5, 14), stoneMat, x, -10.4, 0));

  // Cây cổ thụ & cụm đá rêu phong rải quanh mép đảo
  const treeCount = Math.max(6, Math.floor(r / 5.5));
  for (let i = 0; i < treeCount; i++) {
    const a = (i / treeCount) * Math.PI * 2 + 0.3;
    const dist = r - 3.6;
    const tx = x + Math.cos(a) * dist, tz = Math.sin(a) * dist;
    const t = ancientTree(woodTex, i, creative && i % 2 === 0);
    t.position.set(tx, 0, tz);
    t.rotation.y = -a + Math.PI / 2;
    t.scale.setScalar(0.85 + (i % 3) * 0.14);
    g.add(t);

    if (i % 2 === 0) {
      const rock = rockCluster(stoneTex, i);
      rock.position.set(x + Math.cos(a + 0.25) * (dist - 1.3), 0, Math.sin(a + 0.25) * (dist - 1.3));
      g.add(rock);
    }
  }
}

function buildRamp(g: THREE.Group, deg: number, stoneMat: THREE.Material): void {
  const a = (deg * Math.PI) / 180, verts: number[] = [];
  const vertex = (r: number, w: number) => [r * Math.cos(a) - w * Math.sin(a), (30 - r) / 2, r * Math.sin(a) + w * Math.cos(a)];
  for (const [r, w] of [[30, -1.5], [24, -1.5], [24, 1.5], [30, -1.5], [24, 1.5], [30, 1.5]]) verts.push(...vertex(r, w));
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  const rampMat = mat(c.sand, undefined, 0.85);
  rampMat.side = THREE.DoubleSide;
  g.add(mesh(geom, rampMat));

  // Trụ đá nhỏ hai bên chân dốc
  for (const w of [-1.7, 1.7]) {
    const [px, py, pz] = vertex(29.8, w);
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.9, 6), stoneMat, px, py + 0.45, pz));
  }
}

/** Xây dựng toàn cảnh địa hình 3 đảo Đêm 1 / 2 / 3 (tắt chi tiết sáng tạo phụ khi bench). */
export function buildTerrain(
  s: GameState, woodTex: THREE.Texture, stoneTex: THREE.Texture, creative: boolean
): TerrainAssets {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.78 });
  const padRings: THREE.Mesh[] = [];

  buildIslandMesh(g, s, 0, s.night === 1 ? 40 : s.night === 2 ? 28 : 45, stoneMat, woodTex, stoneTex, creative);

  if (s.night === 2) {
    buildIslandMesh(g, s, 70, 28, stoneMat, woodTex, stoneTex, creative);
    for (let i = 0; i < 26; i++) {
      g.add(mesh(new THREE.BoxGeometry(0.68, 0.18, 3.85), woodMat, 25.7 + i * 0.72, -0.06, 0));
    }
    for (const z of [-1.85, 1.85]) {
      const rail = mesh(new THREE.CylinderGeometry(0.055, 0.055, 19, 8), mat(c.woodLight), 35, 0.68, z);
      rail.rotation.z = Math.PI / 2; g.add(rail);
      for (let j = 0; j < 7; j++) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 6), woodMat, 26 + j * 3, 0.32, z));
    }
    for (const cx of [25.5, 44.5]) {
      g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(c.lamp, c.core, 0.2), cx, 1.32, -1.85));
    }
  }

  if (s.night === 3) {
    const top = mesh(new THREE.RingGeometry(12, 24, 64, 1, 0, Math.PI), mat(c.grass), 0, 3.01, 0);
    top.rotation.x = Math.PI / 2; (top.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; g.add(top);
    for (const r of [12, 24]) {
      const wall = mesh(new THREE.CylinderGeometry(r, r, 3, 64, 1, true, -Math.PI / 2, Math.PI), stoneMat, 0, 1.5, 0);
      (wall.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; g.add(wall);
    }
    for (const x of [-18, 18]) g.add(mesh(new THREE.BoxGeometry(12, 3, 0.14), stoneMat, x, 1.5, 0));

    // Tầng đỉnh 3 & Đình Chuông 2 tầng mái đao
    g.add(mesh(new THREE.CylinderGeometry(8, 8, 6, 48), stoneMat, 0, 3, 0));
    g.add(mesh(new THREE.CylinderGeometry(7.96, 7.96, 0.12, 48), mat(c.grass), 0, 6.02, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const col = mesh(new THREE.CylinderGeometry(0.2, 0.24, 6.2, 8), woodMat, Math.cos(a) * 2.1, 9.1, Math.sin(a) * 2.1);
      col.userData.ignoreCam = true; g.add(col);
    }
    const roofMat = mat(c.tileRoof, undefined, 0.55);
    for (const rMesh of [
      mesh(new THREE.ConeGeometry(3.9, 1.8, 6), roofMat, 0, 12.6, 0),
      mesh(new THREE.ConeGeometry(2.4, 1.4, 6), roofMat, 0, 13.8, 0),
      mesh(new THREE.CylinderGeometry(0.65, 0.85, 1.65, 16), mat(c.gold, c.gold, 0.28, 0.85), 0, 10.2, 0)
    ]) { rMesh.userData.ignoreCam = true; g.add(rMesh); }
    buildRamp(g, 30, stoneMat); buildRamp(g, 150, stoneMat);
  }

  // Bục nhảy không gian nạm ngọc
  for (const p of s.map.pads) {
    g.add(mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.16, 28), mat(c.gold, c.gold, 0.3, 0.7), p.pos[0], p.pos[1] + 0.08, p.pos[2]));
    g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.2, 28), mat(c.red, c.red, 0.25), p.pos[0], p.pos[1] + 0.12, p.pos[2]));
    const ring = mesh(new THREE.TorusGeometry(0.86, 0.06, 8, 28), mat(c.core, c.gold, 0.2), p.pos[0], p.pos[1] + 0.26, p.pos[2]);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    padRings.push(ring);
  }

  // Sáng tạo thêm (tắt khi chạy Benchmark theo Ticket-04)
  let grass: ReturnType<typeof createGrassField> | null = null;
  let boat: THREE.Group | null = null;
  if (creative) {
    grass = createGrassField(s.night, s.lanterns.map(l => l.pos));
    g.add(grass.mesh);
    boat = ongDangBoat(woodTex);
    boat.position.set(s.night === 2 ? 35 : -43.5, -1.8, 12);
    boat.rotation.y = 0.65;
    g.add(boat);
  }

  return { group: g, grass, boat, padRings };
}
