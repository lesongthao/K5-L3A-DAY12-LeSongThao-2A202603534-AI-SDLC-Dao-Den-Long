import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { GameState } from '../core/types.js';
import { colors as c } from './palette.js';
import { playerModel, lanternVisual, shadeModel, drifterModel, charmModel, mesh, type LanternVisual } from './models.js';
import { buildTerrain, type TerrainAssets } from './terrain.js';
import { createSkyDome, createCloudSea } from './shaders.js';
import { createWoodTexture, createStoneTexture, createLanternPaperTexture, createSoftGlowTexture, drawFuelSprite, drawShadeHpSprite } from './textures.js';
import { VfxSystem } from './vfx.js';
import { CombatVfx } from './vfx-combat.js';
import { BenchBatchRenderer } from './bench-view.js';
import { cheatFlags } from './cheats.js';
import { getShadeHp } from './combat.js';

export class WorldView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 900);
  readonly ambient = new THREE.AmbientLight('#C7D7FF', 0.15);
  private composer: EffectComposer | null = null;
  private actors = new THREE.Group();
  private player = playerModel();
  private lanterns = new Map<string, LanternVisual>();
  private entities = new Map<string, THREE.Object3D>();
  private terrainAssets: TerrainAssets | null = null;
  private sky = createSkyDome();
  private cloudSea = createCloudSea();
  private vfx: VfxSystem;
  private combatVfx: CombatVfx;
  private benchBatch: BenchBatchRenderer | null = null;

  private woodTex = createWoodTexture();
  private stoneTex = createStoneTexture();
  private litPaperTex = createLanternPaperTexture(false);
  private tornPaperTex = createLanternPaperTexture(true);
  private glowTex = createSoftGlowTexture();
  private moteMat = new THREE.MeshStandardMaterial({ color: c.mote, emissive: c.halo, emissiveIntensity: 2.2 });
  private moteGeom = new THREE.SphereGeometry(0.14, 10, 8);
  private haloMat: THREE.SpriteMaterial;
  private pulseRing = mesh(new THREE.RingGeometry(0.92, 1.0, 64), new THREE.MeshBasicMaterial({ color: c.lamp, transparent: true, opacity: 0, side: THREE.DoubleSide }));

  private lastNight = 0;
  private follow = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private pulseAge = 1;
  private attackAnim = 1;
  private wasGrounded = true;
  private wasDashing = false;
  private lastTime = 0;
  private intervals: number[] = [];
  fps = 0; colorblind = false; benchMode = false; reducedMotion = false; directorCam = false;
  freeCamPos = new THREE.Vector3(0, 8, 25);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.haloMat = new THREE.SpriteMaterial({ map: this.glowTex, color: c.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.scene.background = new THREE.Color(c.sky); this.scene.fog = new THREE.FogExp2(c.fog, 0.0048);
    this.scene.add(this.ambient, this.sky.mesh, this.cloudSea.mesh);

    const moon = new THREE.DirectionalLight('#D2E4FF', 1.85);
    moon.position.set(-40, 58, 42); moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024); moon.shadow.camera.near = 10; moon.shadow.camera.far = 165;
    moon.shadow.camera.left = -52; moon.shadow.camera.right = 52; moon.shadow.camera.top = 52; moon.shadow.camera.bottom = -52;
    moon.shadow.bias = -0.0008; this.scene.add(moon);
    const rim = new THREE.DirectionalLight(c.lamp, 0.6); rim.position.set(35, 16, -35); this.scene.add(rim);

    this.vfx = new VfxSystem(this.glowTex); this.combatVfx = new CombatVfx(this.glowTex);
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.pulseRing, this.vfx.group, this.combatVfx.group);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.56, 0.48, 0.76));
    this.composer.addPass(new OutputPass());
    window.addEventListener('resize', () => this.resize()); this.resize();
  }

  setColorblind(cb: boolean): void {
    if (this.colorblind === cb) return;
    this.colorblind = cb;
    for (const [key, o] of this.entities) if (key.startsWith('s')) { this.actors.remove(o); this.entities.delete(key); }
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  reset(s: GameState): void {
    if (this.terrainAssets) this.scene.remove(this.terrainAssets.group);
    this.scene.remove(this.actors);
    if (this.benchBatch) { this.scene.remove(this.benchBatch.group); this.benchBatch = null; }
    this.terrainAssets = buildTerrain(s, this.woodTex, this.stoneTex, !this.benchMode);
    this.actors = new THREE.Group(); this.player = playerModel();
    this.actors.add(this.player); this.scene.add(this.terrainAssets.group, this.actors);
    if (this.benchMode) { this.benchBatch = new BenchBatchRenderer(); this.scene.add(this.benchBatch.group); }
    this.lanterns.clear(); this.entities.clear(); this.lastNight = s.night;
    this.follow.set(...s.player.pos); this.pulseAge = 1; this.attackAnim = 1;
    this.wasGrounded = s.player.grounded; this.wasDashing = false;
    this.camera.position.set(s.player.pos[0], s.player.pos[1] + (s.night === 3 ? 7.4 : 4.6), s.player.pos[2] - 11.5);
    this.camera.lookAt(s.player.pos[0], s.player.pos[1] + 2.4, s.player.pos[2]);
  }

  pulse(s: GameState): void { this.pulseAge = 0; this.pulseRing.position.set(s.player.pos[0], s.player.pos[1] + 0.1, s.player.pos[2]); }
  attack(s: GameState, hit: boolean): void {
    this.attackAnim = 0;
    this.combatVfx.triggerAttack(s.player.pos, Math.atan2(s.player.facing[0], s.player.facing[1]), hit);
  }
  shadeBurst(pos: number[]): void { this.combatVfx.triggerShadeBurst(pos); }

  private updateLanterns(s: GameState, time: number): void {
    const blink = Math.floor(time / 500) % 2 === 0;
    for (const l of s.lanterns) {
      let v = this.lanterns.get(l.id);
      if (!v) { v = lanternVisual(this.woodTex, this.stoneTex, this.litPaperTex, this.tornPaperTex); v.group.position.set(...l.pos); this.actors.add(v.group); this.lanterns.set(l.id, v); }
      const fuel = l.lit ? l.fuelTicks / 60 : 0, low = l.lit && fuel < s.tuning.low_fuel_threshold;
      const flicker = low ? (blink ? 1.0 : 0.22) : (1 + 0.06 * Math.sin(time * 0.01 + l.id.length));
      v.bulbMat.map = l.lit ? this.litPaperTex : this.tornPaperTex;
      v.bulbMat.color.set(l.lit ? c.lamp : c.unlit); v.bulbMat.emissive.set(l.lit ? c.core : '#000000'); v.bulbMat.emissiveIntensity = l.lit ? 1.65 * flicker : 0;
      v.bulb.scale.set(1, l.lit ? 1 : 0.8, 1); v.roofGroup.position.y = l.lit ? 3.74 : 3.55;
      v.flame.visible = l.lit; v.flame.scale.setScalar(l.lit ? (0.85 + 0.18 * Math.sin(time * 0.015)) * flicker : 0);
      v.light.intensity = l.lit ? 22 * flicker : 0;
      v.safeZone.mesh.visible = l.lit; v.safeZone.uniforms.uTime.value = time * 0.001;
      v.safeZone.uniforms.uColor.value.set(low ? c.danger : c.gold); v.safeZone.uniforms.uOpacity.value = low ? (blink ? 0.55 : 0.08) : 0.65;
      v.fuelSprite.visible = !this.benchMode && l.lit && (!low || blink);
      if (v.fuelSprite.visible && s.tick % 6 === 0) { drawFuelSprite(v.fuelCanvas, fuel, low); v.fuelTex.needsUpdate = true; }
    }
  }

  private updateActors(s: GameState, time: number): void {
    if (this.benchBatch) { this.benchBatch.update(s, time); return; }
    const active = new Set<string>();
    const entity = (key: string, make: () => THREE.Object3D, pos: number[]) => {
      active.add(key); let o = this.entities.get(key);
      if (!o) { o = make(); this.entities.set(key, o); this.actors.add(o); }
      o.position.set(pos[0], pos[1], pos[2]); return o;
    };
    for (const m of s.motes) {
      const o = entity(`m${m.id}`, () => {
        const grp = new THREE.Group(); grp.add(new THREE.Mesh(this.moteGeom, this.moteMat));
        const halo = new THREE.Sprite(this.haloMat); halo.scale.setScalar(1.65); grp.add(halo); return grp;
      }, m.pos);
      o.position.y += 0.88 + Math.sin(time * 0.003 + m.id.length) * 0.16; o.scale.setScalar(m.kind === 'dropped' ? 0.85 : 1.15);
    }
    for (const sh of s.shades) {
      const o = entity(`s${sh.id}`, () => shadeModel(this.colorblind), sh.pos);
      o.rotation.y = Math.atan2(s.player.pos[0] - sh.pos[0], s.player.pos[2] - sh.pos[2]);
      ((o.getObjectByName('body') as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(sh.state === 'stunned' ? c.stunned : c.shade);
      o.scale.y = 1 + (sh.state === 'drain' ? Math.sin(time * 0.025) * 0.14 : Math.sin(time * 0.004) * 0.07);
      o.visible = sh.state !== 'spawning' || Math.floor(time / 80) % 2 === 0;
      const { hp, maxHp } = getShadeHp(sh.id);
      if (o.userData.hpSprite) (o.userData.hpSprite as THREE.Sprite).visible = !this.benchMode;
      if (!this.benchMode && o.userData.lastHp !== hp && o.userData.hpCanvas) {
        drawShadeHpSprite(o.userData.hpCanvas as HTMLCanvasElement, hp, maxHp);
        (o.userData.hpTex as THREE.CanvasTexture).needsUpdate = true;
        o.userData.lastHp = hp;
      }
      for (let i = 0; i < 5; i++) { const t = o.getObjectByName(`tentacle-${i}`); if (t) t.rotation.z = Math.sin(time * 0.008 + i * 1.3) * 0.28; }
    }
    for (const d of s.drifters) { const o = entity(`d${d.id}`, drifterModel, d.pos); o.position.y += 0.75 + Math.sin(time * 0.004) * 0.14; o.rotation.y = time * 0.0012; }
    for (const ch of s.charms) if (ch.available) { const o = entity(`c${ch.id}`, charmModel, ch.pos); o.position.y += 1.05 + Math.sin(time * 0.0025) * 0.15; o.rotation.y = time * 0.0015; }
    for (const [k, o] of this.entities) if (!active.has(k)) { this.actors.remove(o); this.entities.delete(k); }
  }

  private animatePlayer(s: GameState, dt: number, playing: boolean, time: number): void {
    const yawRad = Math.atan2(s.player.facing[0], s.player.facing[1]);
    this.player.position.set(...s.player.pos); this.player.rotation.y = yawRad;
    this.player.visible = s.player.respawn === 0 && (cheatFlags.godMode || !(s.player.invuln > 0 && s.simTick % 8 < 3));
    const aura = this.player.getObjectByName('god-aura');
    if (aura) { aura.visible = !this.benchMode && cheatFlags.godMode; aura.rotation.z = time * 0.002; }

    const moving = Math.hypot(s.player.vel[0], s.player.vel[2]) > 0.1 || (s.lastInput?.move && (s.lastInput.move[0] !== 0 || s.lastInput.move[1] !== 0));
    const walk = moving && s.player.grounded ? time * 0.017 : 0;
    const pivot = this.player.getObjectByName('body-pivot');
    if (pivot) {
      pivot.position.y = moving && s.player.grounded ? Math.abs(Math.sin(walk)) * 0.07 : Math.sin(time * 0.0035) * 0.025;
      pivot.rotation.x = s.player.dashLeft > 0 ? 0.42 : moving ? 0.12 : 0;
      pivot.scale.set(1, !s.player.grounded ? 1.06 : 1, 1);
    }

    // Chân bước, bím tóc lắc, mắt chớp cute, khăn bay & tay cầm gậy tung đòn
    const legL = this.player.getObjectByName('leg-l'), legR = this.player.getObjectByName('leg-r');
    if (legL && legR) { legL.rotation.x = Math.sin(walk) * 0.7; legR.rotation.x = -Math.sin(walk) * 0.7; }
    const blink = (time % 3200) < 120 ? 0.12 : 1;
    const eL = this.player.getObjectByName('eye-l'), eR = this.player.getObjectByName('eye-r');
    if (eL && eR) { eL.scale.y = blink; eR.scale.y = blink; }
    const pL = this.player.getObjectByName('pigtail-l'), pR = this.player.getObjectByName('pigtail-r');
    if (pL && pR) { pL.rotation.z = 0.08 + Math.sin(time * 0.005) * 0.06 + (moving ? 0.15 : 0); pR.rotation.z = -pL.rotation.z; }

    this.attackAnim = Math.min(1, this.attackAnim + dt * 3.8);
    const armL = this.player.getObjectByName('arm-l'), armR = this.player.getObjectByName('arm-r');
    if (armL) armL.rotation.x = -Math.sin(walk) * 0.55;
    if (armR) {
      if (this.attackAnim < 1) {
        armR.rotation.set(-0.9 + Math.sin(this.attackAnim * Math.PI) * 1.4, -1.2 + this.attackAnim * 2.5, 0.35);
      } else {
        armR.rotation.set(Math.sin(walk) * 0.35, 0, 0);
      }
    }
    const hatLamp = this.player.getObjectByName('hat-lamp');
    if (hatLamp) hatLamp.rotation.z = Math.sin(walk + time * 0.003) * 0.15;
    const s1 = this.player.getObjectByName('scarf-1'), s2 = this.player.getObjectByName('scarf-2');
    if (s1 && s2) { s1.rotation.x = (moving ? 0.5 : 0.14) + Math.sin(time * 0.012) * 0.14; s2.rotation.x = 0.25 + Math.cos(time * 0.014) * 0.18; }

    if (!this.benchMode && playing) {
      if (moving && s.player.grounded && s.tick % 4 === 0) this.vfx.emitStep(s.player.pos[0], s.player.pos[1], s.player.pos[2], s.player.dashLeft > 0);
      if (s.player.dashLeft > 0 && !this.wasDashing) this.combatVfx.triggerDash(s.player.pos, yawRad);
      if (s.player.dashLeft > 0 && s.tick % 2 === 0) this.combatVfx.spawnGhost(s.player.pos, yawRad);
      if (!this.wasGrounded && s.player.grounded) this.combatVfx.triggerLand(s.player.pos);
    }
    this.wasDashing = s.player.dashLeft > 0; this.wasGrounded = s.player.grounded;
  }

  render(s: GameState, yaw: number, playing: boolean, time: number): void {
    if (s.night !== this.lastNight) this.reset(s);
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 1 / 60;
    if (this.lastTime && time > this.lastTime) { this.intervals.push(time - this.lastTime); if (this.intervals.length > 240) this.intervals.shift(); }
    this.lastTime = time; this.fps = this.intervals.length * 1000 / Math.max(1, this.intervals.reduce((a, b) => a + b, 0));

    const lit = s.lanterns.filter(l => l.lit).length;
    this.ambient.intensity = 0.15 + 0.55 * (lit / s.lanterns.length);
    const dawn = s.timeLeft <= 45 ? (45 - s.timeLeft) / 45 : 0;
    this.sky.uniforms.uTime.value = time * 0.001; this.sky.uniforms.uDawn.value = dawn * 0.75;
    this.cloudSea.uniforms.uTime.value = time * 0.001; this.cloudSea.uniforms.uDawn.value = dawn * 0.6;

    if (this.terrainAssets?.grass) {
      this.terrainAssets.grass.uniforms.uTime.value = time * 0.001;
      const rad = (s.wind.dir_deg * Math.PI) / 180;
      this.terrainAssets.grass.uniforms.uWindDir.value.set(Math.cos(rad), Math.sin(rad));
      this.terrainAssets.grass.uniforms.uWindStrength.value = s.wind.active ? 1.4 : s.wind.warning ? 0.65 : 0.2;
    }
    if (this.terrainAssets?.boat) this.terrainAssets.boat.position.y = -1.8 + Math.sin(time * 0.0016) * 0.22;
    for (const r of this.terrainAssets?.padRings ?? []) r.position.y = 0.26 + Math.sin(time * 0.004) * 0.05;

    this.animatePlayer(s, dt, playing, time);
    this.updateLanterns(s, time); this.updateActors(s, time);
    this.vfx.update(s, dt, time, !this.benchMode && !this.reducedMotion);
    this.combatVfx.update(dt, time, s.player.pos, !this.benchMode && !this.reducedMotion);
    this.pulseAge += dt; this.pulseRing.scale.setScalar(Math.min(1, this.pulseAge / 0.45) * s.tuning.pulse_radius);
    (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - this.pulseAge * 1.7);

    if (this.benchMode) {
      const a = (time / 1000) * ((2 * Math.PI) / 15);
      this.camera.position.set(30 * Math.cos(a), 15, -30 * Math.sin(a)); this.camera.lookAt(0, 0, 0);
    } else if (this.directorCam) {
      this.camera.position.copy(this.freeCamPos); this.camera.lookAt(s.player.pos[0], s.player.pos[1] + 1.5, s.player.pos[2]);
    } else if (playing) {
      this.follow.lerp(new THREE.Vector3(s.player.pos[0], Math.max(s.player.pos[1], -1), s.player.pos[2]), 1 - Math.exp(-dt * 12));
      const a = (yaw * Math.PI) / 180, distBack = s.night === 3 ? 12.2 : 11.2, height = s.night === 3 ? 7.6 : 4.6;
      const desired = new THREE.Vector3(this.follow.x - Math.sin(a) * distBack, this.follow.y + height, this.follow.z - Math.cos(a) * distBack);
      const target = new THREE.Vector3(this.follow.x, this.follow.y + 1.6, this.follow.z), ray = desired.clone().sub(target);
      this.raycaster.set(target, ray.clone().normalize()); this.raycaster.far = ray.length();
      const hit = this.terrainAssets ? this.raycaster.intersectObjects(this.terrainAssets.group.children, true).find(x => x.distance > 0.6 && !x.object.userData.ignoreCam) : undefined;
      if (hit) desired.copy(target).addScaledVector(ray.normalize(), Math.max(1.8, hit.distance - 0.7));
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 9)); this.camera.lookAt(this.follow.x, this.follow.y + (s.night === 3 ? 2.6 : 2.0), this.follow.z);
    } else {
      const cx = s.night === 2 ? 35 : 0, a = Math.sin(time * 0.00018) * 0.25;
      this.camera.position.set(cx + 8 + Math.sin(a) * 6, 4.4, 34); this.camera.lookAt(cx - 5, 4.2, -16);
    }
    if (!this.benchMode && !this.reducedMotion && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  indicator(pos: number[]): { visible: boolean; angle: number } {
    const p = new THREE.Vector3(pos[0], pos[1] + 2, pos[2]).project(this.camera);
    return { visible: p.z < 1 && Math.abs(p.x) < 0.88 && Math.abs(p.y) < 0.85, angle: Math.atan2(p.x, -p.y) + (p.z > 1 ? Math.PI : 0) };
  }

  info(): { renderer: string; calls: number; triangles: number; fps: number } {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    return { renderer: this.renderer.info.render.calls > 0 ? String(gl.getParameter(0x1F01)) : 'Three.js WebGL2', calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, fps: this.fps };
  }
}
