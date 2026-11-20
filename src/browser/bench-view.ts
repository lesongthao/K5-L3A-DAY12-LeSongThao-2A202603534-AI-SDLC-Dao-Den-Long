import * as THREE from 'three';
import type { GameState } from '../core/types.js';
import { colors as c } from './palette.js';

/** Bộ render gộp (GPU InstancedMesh) cho cảnh Benchmark: 200 Bóng Mực + 100 Đom đóm chỉ tốn 4 Draw Calls. */
export class BenchBatchRenderer {
  readonly group = new THREE.Group();
  private shadeBodyMesh: THREE.InstancedMesh;
  private shadeRimMesh: THREE.InstancedMesh;
  private moteCoreMesh: THREE.InstancedMesh;
  private moteHaloMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  constructor() {
    const shadeGeom = new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(0.45, 0.25),
      new THREE.Vector2(0.55, 0.72), new THREE.Vector2(0.32, 1.25), new THREE.Vector2(0, 1.48)
    ], 10);
    this.shadeBodyMesh = new THREE.InstancedMesh(
      shadeGeom,
      new THREE.MeshStandardMaterial({ color: c.shade, roughness: 0.45 }),
      250
    );
    this.shadeRimMesh = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.52, 0.045, 5, 14),
      new THREE.MeshBasicMaterial({ color: c.edge }),
      250
    );
    this.moteCoreMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.15, 6, 5),
      new THREE.MeshBasicMaterial({ color: c.mote }),
      150
    );
    this.moteHaloMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.42, 6, 5),
      new THREE.MeshBasicMaterial({ color: c.halo, transparent: true, opacity: 0.3, depthWrite: false }),
      150
    );
    this.group.add(this.shadeBodyMesh, this.shadeRimMesh, this.moteCoreMesh, this.moteHaloMesh);
  }

  update(s: GameState, time: number): void {
    const sCount = Math.min(s.shades.length, 250);
    this.shadeBodyMesh.count = sCount;
    this.shadeRimMesh.count = sCount;
    for (let i = 0; i < sCount; i++) {
      const sh = s.shades[i];
      this.dummy.position.set(sh.pos[0], sh.pos[1] + 0.1, sh.pos[2]);
      this.dummy.rotation.set(0, Math.atan2(s.player.pos[0] - sh.pos[0], s.player.pos[2] - sh.pos[2]), 0);
      this.dummy.scale.set(1, 1 + Math.sin(time * 0.004 + i) * 0.08, 1);
      this.dummy.updateMatrix();
      this.shadeBodyMesh.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.y += 0.72;
      this.dummy.rotation.set(Math.PI / 2 - 0.2, 0, 0);
      this.dummy.updateMatrix();
      this.shadeRimMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.shadeBodyMesh.instanceMatrix.needsUpdate = true;
    this.shadeRimMesh.instanceMatrix.needsUpdate = true;

    const mCount = Math.min(s.motes.length, 150);
    this.moteCoreMesh.count = mCount;
    this.moteHaloMesh.count = mCount;
    for (let i = 0; i < mCount; i++) {
      const m = s.motes[i];
      this.dummy.position.set(m.pos[0], m.pos[1] + 0.85 + Math.sin(time * 0.003 + i) * 0.15, m.pos[2]);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.moteCoreMesh.setMatrixAt(i, this.dummy.matrix);
      this.moteHaloMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.moteCoreMesh.instanceMatrix.needsUpdate = true;
    this.moteHaloMesh.instanceMatrix.needsUpdate = true;
  }
}
