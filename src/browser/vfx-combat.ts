import * as THREE from 'three';
import { colors as c } from './palette.js';

interface Ghost { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; age: number; }
interface Spark { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; }

/** Hiệu ứng chiến đấu & khung cảnh: vệt gậy trăng khuyết, dư ảnh Lướt, gợn sóng tiếp đất & cánh hoa bay. */
export class CombatVfx {
  readonly group = new THREE.Group();
  private slashGroup = new THREE.Group();
  private slashMat: THREE.MeshBasicMaterial;
  private slashAge = 1;

  private dashWave: THREE.Mesh;
  private dashWaveMat: THREE.MeshBasicMaterial;
  private dashWaveAge = 1;

  private landRing: THREE.Mesh;
  private landRingMat: THREE.MeshBasicMaterial;
  private landAge = 1;

  private ghosts: Ghost[] = [];
  private sparks: Spark[] = [];
  private sparkGeom = new THREE.BufferGeometry();
  private sparkPos = new Float32Array(72 * 3);
  private sparkIdx = 0;

  private ambientPetals: THREE.Points;
  private petalPos = new Float32Array(90 * 3);
  private shootingStar: THREE.Mesh;
  private starAge = 4;

  constructor(glowTex: THREE.Texture) {
    // 1. Vệt chém gậy ánh sáng vàng rực rỡ
    this.slashMat = new THREE.MeshBasicMaterial({
      color: c.core, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const arc = new THREE.Mesh(new THREE.RingGeometry(1.15, 2.75, 28, 1, -Math.PI * 0.42, Math.PI * 0.84), this.slashMat);
    arc.rotation.x = -Math.PI / 2;
    this.slashGroup.add(arc);
    this.group.add(this.slashGroup);

    // 2. Vòng xung kích gió khi Lướt (Dash) + 4 dư ảnh ma thuật
    this.dashWaveMat = new THREE.MeshBasicMaterial({
      color: c.jade, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.dashWave = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.2, 16, 1, true), this.dashWaveMat);
    this.dashWave.rotation.x = Math.PI / 2;
    this.group.add(this.dashWave);

    for (let i = 0; i < 5; i++) {
      const gm = new THREE.MeshBasicMaterial({ color: c.halo, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const gMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 8), gm);
      gMesh.visible = false;
      this.group.add(gMesh);
      this.ghosts.push({ mesh: gMesh, mat: gm, age: 1 });
    }

    // 3. Vòng gợn sóng tiếp đất
    this.landRingMat = new THREE.MeshBasicMaterial({ color: c.mote, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this.landRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 32), this.landRingMat);
    this.landRing.rotation.x = -Math.PI / 2;
    this.group.add(this.landRing);

    // 4. Hạt hoa lửa tóe sáng (đòn đánh + va chạm)
    for (let i = 0; i < 72; i++) this.sparks.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
    this.sparkGeom.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3));
    this.group.add(new THREE.Points(this.sparkGeom, new THREE.PointsMaterial({
      size: 0.55, map: glowTex, color: c.lamp, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending
    })));

    // 5. Đốm sáng & cánh hoa bay lững lờ khắp khung cảnh
    for (let i = 0; i < 90; i++) {
      this.petalPos[i * 3] = (Math.sin(i * 12.98) * 38);
      this.petalPos[i * 3 + 1] = 1.2 + (i % 12) * 0.9;
      this.petalPos[i * 3 + 2] = (Math.cos(i * 7.23) * 38);
    }
    const petalGeom = new THREE.BufferGeometry();
    petalGeom.setAttribute('position', new THREE.BufferAttribute(this.petalPos, 3));
    this.ambientPetals = new THREE.Points(petalGeom, new THREE.PointsMaterial({
      size: 0.36, map: glowTex, color: '#FFE9B0', transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.group.add(this.ambientPetals);

    // 6. Sao băng xẹt qua bầu trời đêm
    this.shootingStar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.25, 16, 6),
      new THREE.MeshBasicMaterial({ color: c.moonSilver, transparent: true, opacity: 0 })
    );
    this.shootingStar.rotation.z = 1.25;
    this.group.add(this.shootingStar);
  }

  triggerAttack(pos: number[], yawRad: number, hit: boolean): void {
    this.slashAge = 0;
    this.slashGroup.position.set(pos[0], pos[1] + 0.92, pos[2]);
    this.slashGroup.rotation.y = yawRad - Math.PI / 2;
    this.emitSparks(pos[0] + Math.sin(yawRad) * 1.6, pos[1] + 0.95, pos[2] + Math.cos(yawRad) * 1.6, hit ? 24 : 12, hit ? 6.5 : 3.5);
  }

  triggerDash(pos: number[], yawRad: number): void {
    this.dashWaveAge = 0;
    this.dashWave.position.set(pos[0], pos[1] + 0.85, pos[2]);
    this.dashWave.rotation.y = yawRad;
    this.emitSparks(pos[0], pos[1] + 0.7, pos[2], 14, 4.2);
  }

  spawnGhost(pos: number[], yawRad: number): void {
    const slot = this.ghosts.find(g => g.age >= 0.38) ?? this.ghosts[0];
    slot.age = 0;
    slot.mesh.visible = true;
    slot.mesh.position.set(pos[0], pos[1] + 0.7, pos[2]);
    slot.mesh.rotation.y = yawRad;
  }

  triggerLand(pos: number[]): void {
    this.landAge = 0;
    this.landRing.position.set(pos[0], pos[1] + 0.08, pos[2]);
  }

  /** Hiệu ứng hạt ánh sáng nổ tan biến khi Bóng Mực bị tiêu diệt hoặc hồi sinh. */
  triggerShadeBurst(pos: number[]): void {
    this.emitSparks(pos[0], pos[1] + 0.85, pos[2], 32, 7.2);
  }

  private emitSparks(x: number, y: number, z: number, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkIdx++ % this.sparks.length];
      const a = (i / count) * Math.PI * 2 + this.sparkIdx * 0.4;
      s.x = x; s.y = y; s.z = z;
      s.vx = Math.cos(a) * speed * (0.5 + (i % 3) * 0.35);
      s.vy = 1.6 + (i % 4) * 1.1;
      s.vz = Math.sin(a) * speed * (0.5 + (i % 3) * 0.35);
      s.life = 0.48;
    }
  }

  update(dt: number, time: number, playerPos: number[], creative: boolean): void {
    this.slashAge = Math.min(1, this.slashAge + dt * 3.8);
    this.slashGroup.visible = this.slashAge < 1;
    if (this.slashGroup.visible) {
      this.slashGroup.scale.setScalar(0.85 + this.slashAge * 0.45);
      this.slashMat.opacity = (1 - this.slashAge) * 0.92;
    }

    this.dashWaveAge = Math.min(1, this.dashWaveAge + dt * 3.2);
    this.dashWave.visible = this.dashWaveAge < 1;
    if (this.dashWave.visible) {
      this.dashWave.scale.setScalar(1 + this.dashWaveAge * 1.5);
      this.dashWaveMat.opacity = (1 - this.dashWaveAge) * 0.65;
    }

    for (const g of this.ghosts) {
      g.age = Math.min(1, g.age + dt * 2.5);
      g.mesh.visible = g.age < 1;
      g.mat.opacity = (1 - g.age) * 0.48;
    }

    this.landAge = Math.min(1, this.landAge + dt * 3.0);
    this.landRing.visible = this.landAge < 1;
    this.landRing.scale.setScalar(0.8 + this.landAge * 2.2);
    this.landRingMat.opacity = (1 - this.landAge) * 0.55;

    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (s.life > 0) {
        s.life -= dt; s.vy -= 9.8 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        this.sparkPos[i * 3] = s.x; this.sparkPos[i * 3 + 1] = s.y; this.sparkPos[i * 3 + 2] = s.z;
      } else this.sparkPos[i * 3 + 1] = -999;
    }
    this.sparkGeom.attributes.position.needsUpdate = true;

    this.ambientPetals.visible = creative;
    if (creative) {
      for (let i = 0; i < 90; i++) {
        this.petalPos[i * 3 + 1] = 1.0 + ((time * 0.00055 + i * 0.7) % 10);
        this.petalPos[i * 3] = playerPos[0] + Math.sin(time * 0.0003 + i) * 32;
        this.petalPos[i * 3 + 2] = playerPos[2] + Math.cos(time * 0.00028 + i * 1.7) * 32;
      }
      this.ambientPetals.geometry.attributes.position.needsUpdate = true;

      this.starAge += dt;
      if (this.starAge > 8.5) this.starAge = 0;
      this.shootingStar.visible = this.starAge < 1.2;
      if (this.shootingStar.visible) {
        this.shootingStar.position.set(-140 + this.starAge * 220, 72 - this.starAge * 28, -190);
        (this.shootingStar.material as THREE.MeshBasicMaterial).opacity = Math.sin((this.starAge / 1.2) * Math.PI) * 0.85;
      }
    }
  }
}
