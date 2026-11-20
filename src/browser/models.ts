import * as THREE from 'three';
import { colors as c } from './palette.js';
import { createSafeZoneMesh } from './shaders.js';
import { drawFuelSprite, drawShadeHpSprite } from './textures.js';

export const mat = (color: string, emissive?: string, roughness = 0.72, metalness = 0.08) =>
  new THREE.MeshStandardMaterial({
    color, roughness, metalness,
    ...(emissive ? { emissive, emissiveIntensity: 0.9 } : {})
  });

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}

function makeConicalHatGeom(): THREE.LatheGeometry {
  return new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0.31), new THREE.Vector2(0.22, 0.20),
    new THREE.Vector2(0.45, 0.09), new THREE.Vector2(0.64, 0.0)
  ], 28);
}

function makeTunicGeom(): THREE.LatheGeometry {
  return new THREE.LatheGeometry([
    new THREE.Vector2(0.28, 0.0), new THREE.Vector2(0.24, 0.22),
    new THREE.Vector2(0.18, 0.48), new THREE.Vector2(0.14, 0.62), new THREE.Vector2(0.0, 0.64)
  ], 20);
}

function makeLanternBodyGeom(): THREE.LatheGeometry {
  return new THREE.LatheGeometry([
    new THREE.Vector2(0.22, 0.0), new THREE.Vector2(0.42, 0.18),
    new THREE.Vector2(0.49, 0.45), new THREE.Vector2(0.43, 0.74), new THREE.Vector2(0.24, 0.92)
  ], 18);
}

/** Tạo Cây Gậy Phép Trúc Đèn Lồng cầm trên tay phải của Bé Mây. */
function makeMagicStaff(): THREE.Group {
  const staff = new THREE.Group();
  staff.name = 'staff';
  const shaft = mesh(new THREE.CylinderGeometry(0.024, 0.032, 1.35, 8), mat(c.woodLight, undefined, 0.6), 0, 0.45, 0);
  staff.add(shaft);

  // Đỉnh trăng khuyết vàng kim ngậm viên ngọc sáng phát quang
  const goldMat = mat(c.gold, c.gold, 0.25, 0.75);
  goldMat.emissiveIntensity = 1.25;
  const crescent = mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 18, Math.PI * 1.45), goldMat, 0, 1.22, 0);
  crescent.rotation.z = -Math.PI * 0.22;
  staff.add(crescent);

  const orbMat = mat(c.core, c.lamp, 0.15);
  orbMat.emissiveIntensity = 2.4;
  const orb = mesh(new THREE.OctahedronGeometry(0.085, 1), orbMat, 0, 1.22, 0);
  orb.name = 'staff-orb';
  staff.add(orb);

  // Dải lụa đỏ buộc cổ gậy
  staff.add(mesh(new THREE.BoxGeometry(0.05, 0.24, 0.02), mat(c.red), 0.04, 0.96, -0.02));
  return staff;
}

/** Nhân vật Bé Mây Chibi Cute: mắt long lanh biết chớp, má hồng, 2 bím tóc nơ đỏ & gậy phép. */
export function playerModel(): THREE.Group {
  const g = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.name = 'body-pivot';
  g.add(pivot);

  const skinMat = mat('#FCE0CE', undefined, 0.52);
  const shirtMat = mat(c.shirt, undefined, 0.65);
  const scarfMat = mat(c.red, undefined, 0.55);
  const hairMat = mat('#221B24', undefined, 0.75);

  // Áo bà ba xòe bầu bĩnh + cổ sen + khăn choàng 2 đốt mềm mại
  pivot.add(mesh(makeTunicGeom(), shirtMat, 0, 0.28, 0));
  pivot.add(mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 18), scarfMat, 0, 0.92, 0));
  const s1 = new THREE.Group(); s1.name = 'scarf-1'; s1.position.set(0.04, 0.9, -0.15);
  s1.add(mesh(new THREE.BoxGeometry(0.11, 0.26, 0.028), scarfMat, 0, -0.13, -0.02));
  const s2 = new THREE.Group(); s2.name = 'scarf-2'; s2.position.set(0, -0.24, -0.02);
  s2.add(mesh(new THREE.BoxGeometry(0.09, 0.24, 0.024), scarfMat, 0, -0.12, 0));
  s1.add(s2);
  pivot.add(s1);

  // Đầu Chibi tròn bầu bĩnh + 2 má hồng + mắt long lanh chớp được
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, 1.15, 0);
  head.add(mesh(new THREE.SphereGeometry(0.255, 22, 18), skinMat, 0, 0, 0));
  head.add(mesh(new THREE.SphereGeometry(0.262, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat, 0, 0.02, -0.02));

  // Hai má hồng & đôi mắt sáng có catchlight
  const blushMat = mat('#FF9EBB', '#FF8DA1', 0.6);
  for (const side of [-1, 1]) {
    const blush = mesh(new THREE.SphereGeometry(0.048, 8, 6), blushMat, side * 0.145, -0.04, 0.195);
    blush.scale.set(1.2, 0.7, 0.4); head.add(blush);

    const eye = new THREE.Group(); eye.name = side < 0 ? 'eye-l' : 'eye-r';
    eye.position.set(side * 0.088, 0.0, 0.228);
    eye.add(mesh(new THREE.SphereGeometry(0.042, 10, 8), mat('#1A1420', undefined, 0.25), 0, 0, 0));
    eye.add(mesh(new THREE.SphereGeometry(0.016, 6, 6), mat('#FFFFFF', '#FFFFFF', 0.1), 0.014, 0.015, 0.032));
    head.add(eye);

    // Bím tóc tết nhỏ có nơ đỏ hai bên
    const pig = new THREE.Group(); pig.name = side < 0 ? 'pigtail-l' : 'pigtail-r';
    pig.position.set(side * 0.23, 0.02, -0.06);
    pig.add(mesh(new THREE.SphereGeometry(0.075, 8, 8), scarfMat, side * 0.01, -0.02, 0));
    pig.add(mesh(new THREE.CapsuleGeometry(0.058, 0.14, 4, 8), hairMat, side * 0.03, -0.15, -0.03));
    head.add(pig);
  }

  // Nón lá Việt Nam hơi ngửa nhẹ + chiếc đèn lồng nhỏ treo vành nón
  const hatGroup = new THREE.Group(); hatGroup.name = 'hat'; hatGroup.position.set(0, 0.16, -0.02);
  const hatMat = mat(c.sand, undefined, 0.78); hatMat.side = THREE.DoubleSide;
  const hatMesh = mesh(makeConicalHatGeom(), hatMat, 0, 0.02, 0);
  hatMesh.rotation.x = -0.14; hatGroup.add(hatMesh);
  const rim = mesh(new THREE.TorusGeometry(0.635, 0.02, 6, 28), mat(c.wood), 0, 0.02, 0);
  rim.rotation.x = Math.PI / 2 - 0.14; hatGroup.add(rim);

  const hatLamp = new THREE.Group(); hatLamp.name = 'hat-lamp'; hatLamp.position.set(-0.4, 0.02, 0.34);
  hatLamp.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), scarfMat, 0, -0.1, 0));
  const miniBulb = mesh(new THREE.SphereGeometry(0.095, 10, 8), mat(c.lamp, c.core, 0.2), 0, -0.22, 0);
  (miniBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6;
  hatLamp.add(miniBulb);
  const miniLight = new THREE.PointLight(c.lamp, 2.5, 8, 1.5);
  miniLight.position.set(0, -0.22, 0); hatLamp.add(miniLight);
  hatGroup.add(hatLamp);
  head.add(hatGroup);
  pivot.add(head);

  // Tay trái vung tự nhiên, Tay phải cầm Cây Gậy Phép Trăng Khuyết
  const armL = new THREE.Group(); armL.name = 'arm-l'; armL.position.set(-0.22, 0.84, 0.02);
  armL.add(mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), shirtMat, -0.02, -0.12, 0));
  armL.add(mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat, -0.02, -0.26, 0));
  pivot.add(armL);

  const armR = new THREE.Group(); armR.name = 'arm-r'; armR.position.set(0.24, 0.84, 0.04);
  armR.add(mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), shirtMat, 0.02, -0.1, 0.06));
  armR.add(mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat, 0.04, -0.22, 0.14));
  const staff = makeMagicStaff();
  staff.position.set(0.05, -0.22, 0.16);
  staff.rotation.x = 0.65;
  armR.add(staff);
  pivot.add(armR);

  // Đôi chân ngắn cute có giày vải
  for (const [id, x] of [['leg-l', -0.10], ['leg-r', 0.10]] as const) {
    const leg = new THREE.Group(); leg.name = id; leg.position.set(x, 0.3, 0);
    leg.add(mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.26, 10), mat(c.wood), 0, -0.13, 0));
    const shoe = mesh(new THREE.SphereGeometry(0.068, 10, 8), mat(c.woodDark), 0, -0.26, 0.03);
    shoe.scale.set(0.9, 0.65, 1.3); leg.add(shoe);
    pivot.add(leg);
  }

  // Vòng khiên hào quang vàng kim dưới chân khi bật Bí Kíp Bất tử (không nhấp nháy nhân vật)
  const aura = mesh(new THREE.RingGeometry(0.46, 0.62, 24), new THREE.MeshBasicMaterial({ color: c.gold, transparent: true, opacity: 0.72, side: THREE.DoubleSide }), 0, 0.06, 0);
  aura.rotation.x = -Math.PI / 2; aura.name = 'god-aura'; aura.visible = false;
  g.add(aura);
  return g;
}

export interface LanternVisual {
  group: THREE.Group; bulb: THREE.Mesh; bulbMat: THREE.MeshStandardMaterial; roofGroup: THREE.Group;
  flame: THREE.Mesh; light: THREE.PointLight; safeZone: ReturnType<typeof createSafeZoneMesh>;
  fuelSprite: THREE.Sprite; fuelCanvas: HTMLCanvasElement; fuelTex: THREE.CanvasTexture;
}

/** Đèn lồng lớn cổ phong — phân biệt bật/tắt bằng hình khối xẹp 20% + vân giấy rách. */
export function lanternVisual(
  woodTex: THREE.Texture, stoneTex: THREE.Texture, litTex: THREE.Texture, tornTex: THREE.Texture
): LanternVisual {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
  g.add(mesh(new THREE.CylinderGeometry(0.76, 0.88, 0.24, 10), stoneMat, 0, 0.12, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.22, 10), stoneMat, 0, 0.34, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.17, 2.75, 10), woodMat, 0, 1.75, 0));
  g.add(mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 16), mat(c.gold, c.gold), 0, 1.9, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.2, 8), woodMat, 0, 2.72, 0));

  const bulbMat = new THREE.MeshStandardMaterial({ map: tornTex, color: c.unlit, roughness: 0.45, emissive: '#000000', emissiveIntensity: 0 });
  const bulb = mesh(makeLanternBodyGeom(), bulbMat, 0, 2.82, 0);
  g.add(bulb);
  const flame = mesh(new THREE.OctahedronGeometry(0.22, 1), mat(c.core, c.lamp, 0.2), 0, 3.25, 0);
  (flame.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.4;
  flame.visible = false; g.add(flame);

  const roofGroup = new THREE.Group(); roofGroup.position.set(0, 3.74, 0);
  const roofMat = mat(c.tileRoof, undefined, 0.55);
  roofGroup.add(mesh(new THREE.ConeGeometry(0.86, 0.42, 8), roofMat, 0, 0.16, 0));
  roofGroup.add(mesh(new THREE.ConeGeometry(0.52, 0.32, 8), roofMat, 0, 0.46, 0));
  roofGroup.add(mesh(new THREE.SphereGeometry(0.11, 10, 8), mat(c.gold, c.gold), 0, 0.66, 0));
  g.add(roofGroup);
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.42, 6), mat(c.red), 0, 2.52, 0));

  const light = new THREE.PointLight(c.lamp, 0, 22, 1.35);
  light.position.set(0, 3.3, 0); g.add(light);
  const safeZone = createSafeZoneMesh(); g.add(safeZone.mesh);

  const fuelCanvas = document.createElement('canvas'); fuelCanvas.width = 160; fuelCanvas.height = 30;
  drawFuelSprite(fuelCanvas, 100, false);
  const fuelTex = new THREE.CanvasTexture(fuelCanvas);
  const fuelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: fuelTex, transparent: true, depthTest: false }));
  fuelSprite.position.set(0, 4.95, 0); fuelSprite.scale.set(1.9, 0.36, 1); fuelSprite.visible = false;
  g.add(fuelSprite);
  return { group: g, bulb, bulbMat, roofGroup, flame, light, safeZone, fuelSprite, fuelCanvas, fuelTex };
}

export function shadeModel(colorblind = false): THREE.Group {
  const g = new THREE.Group();
  const bodyGeom = new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.48, 0.25),
    new THREE.Vector2(0.56, 0.72), new THREE.Vector2(0.36, 1.25), new THREE.Vector2(0.0, 1.52)
  ], 16);
  const body = mesh(bodyGeom, mat(c.shade, '#1E0E38', 0.35), 0, 0.15, 0);
  body.name = 'body'; g.add(body);
  const rimColor = colorblind ? c.edgeCb : c.edge;
  const rimMat = mat(rimColor, rimColor, 0.2); rimMat.emissiveIntensity = 1.9;
  const aura = mesh(new THREE.TorusGeometry(0.54, 0.045, 8, 24), rimMat, 0, 0.75, 0);
  aura.rotation.x = Math.PI / 2 - 0.2; g.add(aura);
  for (const x of [-0.17, 0.17]) {
    const eye = mesh(new THREE.ConeGeometry(0.065, 0.18, 4), rimMat, x, 0.96, 0.44);
    eye.rotation.x = Math.PI / 2; eye.rotation.z = x < 0 ? 0.25 : -0.25; g.add(eye);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const t = mesh(new THREE.ConeGeometry(0.11, 0.48, 6), mat(c.shade, rimColor, 0.5), Math.cos(a) * 0.34, 0.24, Math.sin(a) * 0.34);
    t.rotation.x = Math.PI; t.name = `tentacle-${i}`; g.add(t);
  }
  const hpCanvas = document.createElement('canvas'); hpCanvas.width = 144; hpCanvas.height = 28;
  drawShadeHpSprite(hpCanvas, 3, 3);
  const hpTex = new THREE.CanvasTexture(hpCanvas);
  const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTex, transparent: true, depthTest: false }));
  hpSprite.position.set(0, 2.08, 0); hpSprite.scale.set(1.45, 0.28, 1);
  g.add(hpSprite);
  g.userData = { hpCanvas, hpTex, hpSprite, lastHp: 3 };
  return g;
}

export function drifterModel(): THREE.Group {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.9, 0.2, 0.1), new THREE.Vector3(-0.35, 0.55, -0.25),
    new THREE.Vector3(0.25, 0.3, 0.28), new THREE.Vector3(0.85, 0.65, -0.1)
  ]);
  const ribbonMat = mat(c.drifter, c.drifter, 0.35); ribbonMat.emissiveIntensity = 1.1;
  const tube = mesh(new THREE.TubeGeometry(curve, 24, 0.11, 8, false), ribbonMat);
  tube.scale.set(1, 0.55, 1.3); g.add(tube);
  g.add(mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(c.core, c.drifter), -0.85, 0.22, 0.1));
  return g;
}

export function charmModel(): THREE.Group {
  const g = new THREE.Group();
  const goldMat = mat(c.gold, c.gold, 0.3, 0.7); goldMat.emissiveIntensity = 1.35;
  g.add(mesh(new THREE.BoxGeometry(0.68, 0.98, 0.07), goldMat));
  g.add(mesh(new THREE.BoxGeometry(0.54, 0.84, 0.09), mat(c.red, c.red, 0.35)));
  g.add(mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 16), goldMat, 0, 0, 0.06));
  return g;
}
