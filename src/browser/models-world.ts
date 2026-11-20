import * as THREE from 'three';
import { mat, mesh } from './models.js';
import { colors as c } from './palette.js';

/** Cây cổ thụ làng mây với thân uốn, tán lá đa cụm và lồng đèn nhỏ treo cành. */
export function ancientTree(woodTex: THREE.Texture, seed = 0, withLantern = false): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });

  // Thân chính uốn nhẹ + 2 cành nhánh tự nhiên
  const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.36, 3.3, 8), trunkMat, 0, 1.65, 0);
  trunk.rotation.z = ((seed % 3) - 1) * 0.1;
  g.add(trunk);

  const branch = mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.8, 7), trunkMat, 0.65, 2.8, 0.15);
  branch.rotation.z = -0.65;
  g.add(branch);

  // 4 cụm tán lá khối tròn đa diện mềm mại (xanh ngọc đậm-nhạt hòa quyện)
  const canopies: [number, number, number, number, string][] = [
    [0.0, 3.65, 0.0, 1.55, c.grass],
    [-0.85, 3.25, 0.45, 1.1, c.grassDark],
    [1.15, 3.35, 0.2, 1.05, c.grassTip],
    [0.15, 4.35, -0.3, 1.0, c.grassTip]
  ];
  for (const [x, y, z, r, col] of canopies) {
    const puff = mesh(new THREE.IcosahedronGeometry(r, 1), mat(col, undefined, 0.78), x, y, z);
    puff.scale.set(1.18, 0.68, 1.15);
    g.add(puff);
  }

  // Đèn lồng trang trí treo dưới nhánh cây (tắt ở chế độ bench)
  if (withLantern) {
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), mat(c.red), 1.35, 2.75, 0.2));
    const tinyMat = mat(c.lamp, c.core, 0.2);
    tinyMat.emissiveIntensity = 1.6;
    g.add(mesh(new THREE.SphereGeometry(0.18, 10, 8), tinyMat, 1.35, 2.38, 0.2));
  }
  g.traverse(o => { o.userData.ignoreCam = true; });
  return g;
}

/** Cụm đá rêu phong tạo điểm nhấn ven đảo và đường mòn. */
export function rockCluster(stoneTex: THREE.Texture, seed = 0): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92 });
  const main = mesh(new THREE.DodecahedronGeometry(0.85, 0), stoneMat, 0, 0.28, 0);
  main.scale.set(1.2, 0.7, 0.95);
  main.rotation.set(seed * 0.7, seed * 1.1, 0);
  g.add(main);

  const sub = mesh(new THREE.DodecahedronGeometry(0.45, 0), stoneMat, 0.7, 0.16, 0.4);
  sub.rotation.set(0.4, seed, 0.2);
  g.add(sub);
  return g;
}

/** Sáng tạo riêng: NPC Ông Đăng ngồi thuyền mây ngay mép đảo (tắt trong headless & bench). */
export function ongDangBoat(woodTex: THREE.Texture): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });

  // Thân thuyền gỗ cong nhẹ
  const hull = mesh(new THREE.CylinderGeometry(0.55, 0.35, 3.8, 10), woodMat, 0, 0, 0);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(0.65, 1, 1.35);
  g.add(hull);

  // Ông Đăng mặc áo nâu, râu trắng, đội nón cầm sào đèn
  g.add(mesh(new THREE.CapsuleGeometry(0.24, 0.42, 4, 10), mat(c.woodDark), -0.3, 0.58, 0));
  g.add(mesh(new THREE.SphereGeometry(0.2, 12, 10), mat('#E9C2A8'), -0.3, 1.08, 0));
  g.add(mesh(new THREE.ConeGeometry(0.11, 0.32, 6), mat('#F2F4F8'), -0.3, 0.92, 0.18));
  g.add(mesh(new THREE.ConeGeometry(0.64, 0.32, 18), mat(c.sand), -0.3, 1.36, 0));

  // Mũi thuyền treo chiếc đèn báo hiệu ấm áp
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 6), woodMat, 1.55, 0.85, 0));
  const lampMat = mat(c.lamp, c.core, 0.2);
  lampMat.emissiveIntensity = 1.8;
  g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), lampMat, 1.82, 1.45, 0));
  const glow = new THREE.PointLight(c.lamp, 4, 10, 1.5);
  glow.position.set(1.82, 1.45, 0);
  g.add(glow);
  return g;
}

/** Đàn Hạc Giấy ánh sáng bay lượn khi sắp thắng Bình Minh. */
export function paperCraneMesh(): THREE.Group {
  const g = new THREE.Group();
  const craneMat = mat(c.core, c.halo, 0.3);
  craneMat.emissiveIntensity = 1.4;
  craneMat.side = THREE.DoubleSide;

  const body = mesh(new THREE.ConeGeometry(0.12, 0.65, 4), craneMat, 0, 0, 0);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  for (const [name, side] of [['wing-l', -1], ['wing-r', 1]] as const) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.28), craneMat);
    wing.name = name;
    wing.rotation.x = -Math.PI / 2;
    wing.position.set(side * 0.28, 0.02, 0);
    g.add(wing);
  }
  return g;
}
