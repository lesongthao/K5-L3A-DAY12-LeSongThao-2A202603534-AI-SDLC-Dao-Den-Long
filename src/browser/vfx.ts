import * as THREE from 'three';
import type { GameState } from '../core/types.js';
import { colors as c } from './palette.js';
import { paperCraneMesh } from './models-world.js';

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
}

/** Quản lý hiệu ứng hạt GPU: bụi sáng chân Mây, tàn lửa đèn, tia hút dầu & đàn hạc Bình Minh. */
export class VfxSystem {
  readonly group = new THREE.Group();
  private trailPool: Particle[] = [];
  private trailGeom = new THREE.BufferGeometry();
  private trailPos = new Float32Array(60 * 3);

  private emberPool: Particle[] = [];
  private emberGeom = new THREE.BufferGeometry();
  private emberPos = new Float32Array(48 * 3);

  private beamGroup = new THREE.Group();
  private cranes: THREE.Group[] = [];
  private cursor = 0;
  private emberCursor = 0;

  constructor(glowTex: THREE.Texture) {
    for (let i = 0; i < 60; i++) this.trailPool.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
    for (let i = 0; i < 48; i++) this.emberPool.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });

    this.trailGeom.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 0.42, map: glowTex, color: c.halo, transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.group.add(new THREE.Points(this.trailGeom, trailMat));

    this.emberGeom.setAttribute('position', new THREE.BufferAttribute(this.emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      size: 0.34, map: glowTex, color: c.lamp, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.group.add(new THREE.Points(this.emberGeom, emberMat));
    this.group.add(this.beamGroup);

    // 5 chú Hạc giấy ánh sáng đón Bình Minh
    for (let i = 0; i < 5; i++) {
      const crane = paperCraneMesh();
      crane.visible = false;
      this.cranes.push(crane);
      this.group.add(crane);
    }
  }

  emitStep(x: number, y: number, z: number, dash: boolean): void {
    const count = dash ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const p = this.trailPool[this.cursor++ % this.trailPool.length];
      p.x = x + (Math.sin(this.cursor * 1.7) * 0.25);
      p.y = y + 0.18;
      p.z = z + (Math.cos(this.cursor * 2.3) * 0.25);
      p.vx = Math.sin(this.cursor) * (dash ? 0.8 : 0.2);
      p.vy = 0.7 + (dash ? 0.6 : 0.15);
      p.vz = Math.cos(this.cursor) * (dash ? 0.8 : 0.2);
      p.life = dash ? 0.65 : 0.45;
    }
  }

  update(s: GameState, dt: number, time: number, creative: boolean): void {
    // 1. Bụi sáng bước chân & vệt lướt
    for (let i = 0; i < this.trailPool.length; i++) {
      const p = this.trailPool[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        this.trailPos[i * 3] = p.x; this.trailPos[i * 3 + 1] = p.y; this.trailPos[i * 3 + 2] = p.z;
      } else {
        this.trailPos[i * 3 + 1] = -999;
      }
    }
    this.trailGeom.attributes.position.needsUpdate = true;

    // 2. Tàn lửa bay lên từ đèn đang sáng
    if (creative) {
      for (const l of s.lanterns) {
        if (!l.lit || (s.tick + l.id.length) % 9 !== 0) continue;
        const p = this.emberPool[this.emberCursor++ % this.emberPool.length];
        p.x = l.pos[0] + Math.sin(time * 0.01 + this.emberCursor) * 0.28;
        p.y = l.pos[1] + 3.4;
        p.z = l.pos[2] + Math.cos(time * 0.013 + this.emberCursor) * 0.28;
        p.vx = Math.sin(this.emberCursor) * 0.15;
        p.vy = 0.85;
        p.vz = Math.cos(this.emberCursor) * 0.15;
        p.life = 1.6;
      }
    }
    for (let i = 0; i < this.emberPool.length; i++) {
      const p = this.emberPool[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        this.emberPos[i * 3] = p.x; this.emberPos[i * 3 + 1] = p.y; this.emberPos[i * 3 + 2] = p.z;
      } else {
        this.emberPos[i * 3 + 1] = -999;
      }
    }
    this.emberGeom.attributes.position.needsUpdate = true;

    // 3. Tia năng lượng mực tím khi Bóng Mực đang drain đèn
    while (this.beamGroup.children.length > 0) {
      const ch = this.beamGroup.children.pop() as THREE.Line;
      ch.geometry.dispose();
    }
    for (const sh of s.shades) {
      if (sh.state !== 'drain' || !sh.targetLanternId) continue;
      const target = s.lanterns.find(l => l.id === sh.targetLanternId);
      if (!target) continue;
      const pts = [
        new THREE.Vector3(target.pos[0], target.pos[1] + 3.1, target.pos[2]),
        new THREE.Vector3(
          (target.pos[0] + sh.pos[0]) * 0.5 + Math.sin(time * 0.015) * 0.35,
          target.pos[1] + 2.1 + Math.cos(time * 0.02) * 0.25,
          (target.pos[2] + sh.pos[2]) * 0.5
        ),
        new THREE.Vector3(sh.pos[0], sh.pos[1] + 0.9, sh.pos[2])
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: c.edge }));
      this.beamGroup.add(line);
    }

    // 4. Đàn Hạc giấy bay quanh đảo khi đủ đèn ngưỡng Bình Minh (chỉ khi bật sáng tạo)
    const litCount = s.lanterns.filter(l => l.lit).length;
    const enough = litCount >= Math.ceil(s.tuning.win_ratio * s.lanterns.length);
    for (let i = 0; i < this.cranes.length; i++) {
      const crane = this.cranes[i];
      crane.visible = creative && enough;
      if (!crane.visible) continue;
      const a = time * 0.00055 + i * ((Math.PI * 2) / this.cranes.length);
      const rad = 18 + Math.sin(time * 0.001 + i) * 3;
      crane.position.set(Math.cos(a) * rad, 9.5 + Math.sin(time * 0.002 + i) * 1.4, Math.sin(a) * rad);
      crane.rotation.y = -a;
      const flap = Math.sin(time * 0.012 + i) * 0.55;
      const wl = crane.getObjectByName('wing-l'), wr = crane.getObjectByName('wing-r');
      if (wl && wr) { wl.rotation.y = flap; wr.rotation.y = -flap; }
    }
  }

  dispose(): void {
    this.trailGeom.dispose();
    this.emberGeom.dispose();
  }
}
