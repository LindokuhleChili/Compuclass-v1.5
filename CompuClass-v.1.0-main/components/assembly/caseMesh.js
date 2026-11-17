import * as THREE from 'three';

// Original procedural mid-tower. Same axes as the part slots:
// rear is -X, front is +X, tray is -Z, the open side faces the camera (+Z).

const PAINT = 0x2a3140;
const PAINT_DARK = 0x1a2030;
const EDGE = 0x8d98a8;
const TRAY = 0x4a5568;
const MESH = 0x12161e;
const BRASS = 0xc6a15b;
const RUBBER = 0x141414;

function metal(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.72,
    roughness: 0.32,
    ...extra,
  });
}

function addBox(group, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.userData.kind = 'case';
  group.add(mesh);
  return mesh;
}

function fan(radius) {
  const group = new THREE.Group();
  const frameMat = metal(0x1c2230, { roughness: 0.4 });
  const bladeMat = metal(0x2c3548, { roughness: 0.45, metalness: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.07, 8, 28), frameMat);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.22, radius * 0.16, 16), metal(0x3a4356));
  hub.rotation.x = Math.PI / 2;
  group.add(ring, hub);
  for (let i = 0; i < 7; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.72, radius * 0.13, radius * 0.03), bladeMat);
    blade.position.x = radius * 0.36;
    blade.rotation.z = 0.35;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 7) * Math.PI * 2;
    pivot.add(blade);
    group.add(pivot);
  }
  group.userData.kind = 'case';
  group.traverse((child) => { child.userData.kind = 'case'; });
  return group;
}

export function buildCase() {
  const group = new THREE.Group();
  group.name = 'case';
  const paint = metal(PAINT, { roughness: 0.4 });
  const dark = metal(PAINT_DARK, { roughness: 0.46 });
  const edge = metal(EDGE, { metalness: 0.85, roughness: 0.22 });
  const tray = metal(TRAY, { metalness: 0.55, roughness: 0.4 });
  const mesh = metal(MESH, { roughness: 0.7, metalness: 0.2 });

  const W = 4.55;
  const H = 4.35;
  const D = 2.05;
  const T = 0.055;

  // Floor, roof, and the front/rear walls. The camera side stays open.
  addBox(group, W, T, D, dark, 0, -H / 2, -0.08);
  addBox(group, W, T, D, paint, 0, H / 2, -0.08);
  addBox(group, T, H, D, dark, -W / 2, 0, -0.08);
  addBox(group, T, H, D * 0.92, paint, W / 2, 0, -0.16);
  addBox(group, W - 0.12, H - 0.12, 0.04, tray, 0, 0.02, -1.02);

  // Corner posts so the frame reads as tubing, not a solid block.
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sy]) => {
    addBox(group, 0.09, 0.09, D + 0.08, edge, sx * (W / 2 - 0.02), sy * (H / 2 - 0.02), -0.04);
  });
  [[-1, -1], [-1, 1]].forEach(([sx, sz]) => {
    addBox(group, 0.07, H, 0.07, edge, sx * (W / 2 - 0.02), 0, sz * 0.92);
  });

  // Top ventilation slots.
  for (let i = 0; i < 8; i += 1) {
    addBox(group, 0.28, 0.02, 0.9, mesh, -1.3 + i * 0.36, H / 2 + 0.02, -0.15);
  }

  // Rear I/O window and a column of PCIe slot covers.
  addBox(group, 0.03, 0.7, 0.85, mesh, -W / 2 - 0.02, 1.15, 0.05);
  addBox(group, 0.02, 0.62, 0.72, metal(0x0c1018, { roughness: 0.8 }), -W / 2 - 0.03, 1.15, 0.05);
  for (let i = 0; i < 7; i += 1) {
    const y = 0.15 - i * 0.16;
    addBox(group, 0.025, 0.1, 0.62, edge, -W / 2 - 0.01, y, 0.08);
    addBox(group, 0.02, 0.04, 0.08, metal(0xc5ccd6, { metalness: 0.9, roughness: 0.2 }), -W / 2 - 0.02, y, 0.32);
  }
  const rearFan = fan(0.42);
  rearFan.rotation.y = Math.PI / 2;
  rearFan.position.set(-W / 2 + 0.02, 1.25, 0.02);
  group.add(rearFan);

  // Three front intake fans behind a mesh strip.
  [1.15, 0.15, -0.85].forEach((y) => {
    const intake = fan(0.36);
    intake.rotation.y = Math.PI / 2;
    intake.position.set(W / 2 - 0.04, y, 0.0);
    group.add(intake);
  });
  for (let i = 0; i < 10; i += 1) {
    addBox(group, 0.02, H * 0.86, 0.03, mesh, W / 2 + 0.02, 0, -0.55 + i * 0.1);
  }

  // PSU shroud with a cable grommet. Open toward the camera so the supply shows.
  addBox(group, 2.35, 0.05, 1.55, dark, -0.95, -1.02, -0.12);
  addBox(group, 2.35, 0.85, 0.05, paint, -0.95, -1.46, -0.86);
  addBox(group, 0.05, 0.85, 1.5, paint, 0.2, -1.46, -0.12);
  const grommet = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.035, 8, 20),
    metal(RUBBER, { roughness: 0.8, metalness: 0.1 }),
  );
  grommet.position.set(-0.35, -1.0, 0.15);
  grommet.userData.kind = 'case';
  group.add(grommet);

  // Drive cage beside the shroud, where the SSD step mounts.
  addBox(group, 0.72, 0.04, 0.5, edge, 1.48, -0.12, -0.32);
  addBox(group, 0.72, 0.04, 0.5, edge, 1.48, -0.58, -0.32);
  addBox(group, 0.04, 0.62, 0.5, edge, 1.82, -0.35, -0.32);
  addBox(group, 0.04, 0.62, 0.5, edge, 1.14, -0.35, -0.32);

  // Brass standoffs on the tray. The motherboard covers them once seated.
  const brass = metal(BRASS, { metalness: 0.8, roughness: 0.28 });
  [[-0.75, 1.4], [0.75, 1.4], [-0.75, -0.5], [0.75, -0.5], [0, 0.45], [-0.75, 0.45], [0.75, 0.45]].forEach(([x, y]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.07, 10), brass);
    post.rotation.x = Math.PI / 2;
    post.position.set(x, y, -0.96);
    post.userData.kind = 'case';
    group.add(post);
  });

  // Feet.
  [[-1.7, -0.55], [1.7, -0.55], [-1.7, 0.7], [1.7, 0.7]].forEach(([x, z]) => {
    addBox(group, 0.36, 0.08, 0.46, metal(RUBBER, { roughness: 0.9, metalness: 0.05 }), x, -H / 2 - 0.06, z);
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 40),
    new THREE.MeshBasicMaterial({ color: 0x0b1b3a, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -H / 2 - 0.1;
  shadow.raycast = () => {};
  group.add(shadow);

  const glow = new THREE.PointLight(0xfff4e0, 0.55, 8, 2);
  glow.position.set(0.2, 0.4, 0.15);
  group.add(glow);
  return group;
}

export function buildShelf(x, y, z, width, depth) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.04, depth),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  mesh.position.set(x, y, z);
  mesh.userData.kind = 'shelf';
  return mesh;
}
