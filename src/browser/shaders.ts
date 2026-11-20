import * as THREE from 'three';
import type { Night, Vec3 } from '../core/types.js';
import { ground } from '../core/maps.js';
import { colors as c } from './palette.js';

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 19.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Bầu trời đêm GLSL chuyển sắc bình minh & vầng trăng khuyết khổng lồ. */
export function createSkyDome(): { mesh: THREE.Mesh; uniforms: { uTime: { value: number }; uDawn: { value: number } } } {
  const uniforms = { uTime: { value: 0 }, uDawn: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uTime;
      uniform float uDawn;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 zenith = vec3(0.035, 0.055, 0.14);
        vec3 midSky = vec3(0.055, 0.078, 0.188); // #0E1430
        vec3 horizon = mix(vec3(0.106, 0.137, 0.314), vec3(0.75, 0.44, 0.38), uDawn); // #1B2350 -> rạng đông
        vec3 col = mix(horizon, midSky, smoothstep(-0.02, 0.28, h));
        col = mix(col, zenith, smoothstep(0.28, 0.88, h));

        // Dải Ngân Hà mờ ảo chạy xiên bầu trời
        float band = exp(-pow((vDir.y * 0.65 - vDir.x * 0.55 + 0.12) * 3.8, 2.0));
        col += vec3(0.08, 0.13, 0.28) * band * smoothstep(0.0, 0.4, h);

        // Ngàn sao lấp lánh trong Shader (0 draw call, nét căng)
        vec3 starGrid = floor(vDir * 240.0);
        float sh = fract(sin(dot(starGrid, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        if (sh > 0.992 && h > 0.04) {
          float twinkle = 0.55 + 0.45 * sin(uTime * 2.5 + sh * 100.0);
          col += vec3(1.0, 0.95, 0.82) * twinkle * smoothstep(0.04, 0.25, h) * 0.85;
        }

        // Vầng trăng khuyết lớn rạng ngời phía trước góc nhìn bầu trời
        vec3 moonPos = normalize(vec3(-0.32, 0.24, -0.88));
        float mDot = dot(vDir, moonPos);
        float moonHalo = pow(max(0.0, mDot), 22.0) * 0.42;
        float moonDisc = smoothstep(0.9942, 0.9952, mDot);
        vec3 cutPos = normalize(moonPos + vec3(0.048, 0.028, 0.0));
        float crescent = moonDisc * (1.0 - smoothstep(0.9938, 0.9948, dot(vDir, cutPos)));
        col += vec3(0.55, 0.72, 0.98) * moonHalo + vec3(1.35, 1.38, 1.48) * crescent;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  return { mesh: new THREE.Mesh(new THREE.SphereGeometry(460, 32, 24), mat), uniforms };
}

/** Biển mây GLSL gợn sóng FBM phản chiếu ánh trăng & ánh đèn ấm. */
export function createCloudSea(): { mesh: THREE.Mesh; uniforms: { uTime: { value: number }; uDawn: { value: number } } } {
  const uniforms = { uTime: { value: 0 }, uDawn: { value: 0 } };
  const geom = new THREE.PlaneGeometry(1100, 1100, 88, 88);
  geom.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vec3 pos = position;
        float w1 = sin(pos.x * 0.038 + uTime * 0.42) * cos(pos.z * 0.032 - uTime * 0.31);
        float w2 = sin((pos.x + pos.z) * 0.022 + uTime * 0.25);
        pos.y += w1 * 1.45 + w2 * 0.95;
        vWave = w1 * 0.6 + w2 * 0.4;
        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uDawn;
      varying vec3 vWorld;
      varying float vWave;

      float puff(vec2 p) {
        return sin(p.x) * cos(p.y) * 0.5 + sin(p.x * 2.1 - p.y * 1.7) * 0.25;
      }

      void main() {
        vec2 uv = vWorld.xz * 0.028;
        float n = puff(uv + vec2(uTime * 0.08, uTime * 0.04)) + 0.5 * puff(uv * 2.3 - vec2(uTime * 0.05, 0.0));
        float crest = smoothstep(-0.35, 0.75, n + vWave * 0.45);
        vec3 deepSea = vec3(0.055, 0.145, 0.235); // hòa quyện #12384A
        vec3 seaMid = vec3(0.071, 0.220, 0.290);  // #12384A
        vec3 cloudPeak = mix(vec3(0.24, 0.34, 0.52), vec3(0.62, 0.50, 0.56), uDawn);
        vec3 col = mix(deepSea, seaMid, smoothstep(-0.6, 0.2, n));
        col = mix(col, cloudPeak, crest * 0.75);

        // Hào quang mờ dần vào sương chân trời #1B2350
        float dist = length(vWorld.xz);
        float fogFactor = smoothstep(140.0, 460.0, dist);
        vec3 fogCol = mix(vec3(0.106, 0.137, 0.314), vec3(0.45, 0.30, 0.38), uDawn);
        col = mix(col, fogCol, fogFactor);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const m = new THREE.Mesh(geom, mat);
  m.position.set(35, -13.5, 0);
  return { mesh: m, uniforms };
}

/** Tạo hình bụi cỏ 3 lá dẹt mềm mại thay cho khối chóp nhọn. */
function makeGrassTuftGeometry(): THREE.BufferGeometry {
  const pos: number[] = [], norm: number[] = [];
  const blades = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  for (const ang of blades) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const w = 0.045, h = 0.42, lean = 0.08;
    const x1 = -w * ca, z1 = -w * sa;
    const x2 = w * ca, z2 = w * sa;
    const tx = -sa * lean, tz = ca * lean;
    pos.push(x1, 0, z1, x2, 0, z2, tx, h, tz);
    for (let k = 0; k < 3; k++) norm.push(0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  return g;
}

/** Đồng cỏ 3D InstancedMesh nghiêng theo hướng gió thực của màn chơi. */
export function createGrassField(
  night: Night, lanterns: Vec3[]
): { mesh: THREE.InstancedMesh; uniforms: { uTime: { value: number }; uWindDir: { value: THREE.Vector2 }; uWindStrength: { value: number } } } {
  const count = 4200;
  const geom = makeGrassTuftGeometry();

  const uniforms = {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1, 0) },
    uWindStrength: { value: 0.25 }
  };

  const mat = new THREE.MeshStandardMaterial({ color: '#397362', roughness: 0.85, side: THREE.DoubleSide });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWindDir = uniforms.uWindDir;
    shader.uniforms.uWindStrength = uniforms.uWindStrength;
    shader.vertexShader = `
      uniform float uTime;
      uniform vec2 uWindDir;
      uniform float uWindStrength;
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float hFactor = clamp(position.y / 0.52, 0.0, 1.0);
       vec4 instOrigin = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
       float sway = sin(uTime * 2.2 + instOrigin.x * 0.45 + instOrigin.z * 0.35) * 0.08;
       transformed.x += (sway + uWindDir.x * uWindStrength * (0.28 + 0.14 * sin(uTime * 5.0 + instOrigin.x))) * hFactor * hFactor;
       transformed.z += (sway * 0.6 + uWindDir.y * uWindStrength * (0.28 + 0.14 * cos(uTime * 4.5 + instOrigin.z))) * hFactor * hFactor;`
    );
  };

  const inst = new THREE.InstancedMesh(geom, mat, count);
  inst.userData.ignoreCam = true;
  inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let placed = 0;

  for (let i = 0; i < count * 3 && placed < count; i++) {
    const useSecondIsland = night === 2 && i % 2 === 1;
    const cx = useSecondIsland ? 70 : 0;
    const maxR = night === 1 ? 37.5 : night === 2 ? 25.5 : 42;
    const r = Math.sqrt(hash(i * 5 + 1)) * maxR;
    const a = hash(i * 5 + 2) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = ground(night, x, z);
    if (!Number.isFinite(y)) continue;
    // Tránh mọc đè lên chân đèn lồng hoặc bệ tâm đảo
    if (r < 2.2 && !useSecondIsland) continue;
    if (lanterns.some(l => Math.hypot(x - l[0], z - l[2]) < 2.3)) continue;

    dummy.position.set(x, y - 0.03, z);
    dummy.rotation.set(0, hash(i * 5 + 3) * Math.PI * 2, 0);
    const s = 0.7 + hash(i * 5 + 4) * 0.85;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    inst.setMatrixAt(placed++, dummy.matrix);
  }
  inst.count = placed;
  inst.instanceMatrix.needsUpdate = true;
  return { mesh: inst, uniforms };
}

/** Vòng tròn trận pháp bảo vệ 6m mềm mại dưới chân đèn sáng. */
export function createSafeZoneMesh(): { mesh: THREE.Mesh; uniforms: { uTime: { value: number }; uColor: { value: THREE.Color }; uOpacity: { value: number } } } {
  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(c.gold) },
    uOpacity: { value: 0 }
  };
  const geom = new THREE.RingGeometry(5.55, 6.02, 64);
  geom.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: `
      varying vec2 vPos;
      void main() {
        vPos = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vPos;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float r = length(vPos);
        float a = atan(vPos.y, vPos.x);
        float edge = smoothstep(5.55, 5.88, r) * smoothstep(6.02, 5.92, r);
        float runes = 0.65 + 0.35 * sin(a * 16.0 + uTime * 1.4);
        gl_FragColor = vec4(uColor * 1.25, edge * runes * uOpacity);
      }
    `
  });
  const m = new THREE.Mesh(geom, mat);
  m.position.y = 0.06;
  return { mesh: m, uniforms };
}
