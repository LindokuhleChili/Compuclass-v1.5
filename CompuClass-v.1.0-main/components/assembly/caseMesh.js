import * as THREE from 'three';

const STEEL = 0x2c3340;
const STEEL_DARK = 0x1a2030;
const TRAY = 0x3a4454;
const BRASS = 0xc6a15b;
const FAN = 0x141820;

function metal(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.62,
    roughness: 0.38,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity > 0.85,
  });
}

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.userData.kind = 'case';
  return mesh;
}

function fan(radius, x, y, z, face) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.08, 8, 20),
    metal(FAN, 1),
  );
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, radius * 0.1, 10),
    metal(0x2a3140, 1),
  );
  hub.rotation.x = Math.PI / 2;
  group.add(ring, hub);
  for (let blade = 0; blade < 5; blade += 1) {
    const shape = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.72, radius * 0.14, radius * 0.035),
      metal(0x222836, 1),
    );
    shape.position.x = radius * 0.38;
    const pivot = new THREE.Group();
    pivot.rotation.z = (blade / 5) * Math.PI * 2;
    pivot.add(shape);
    group.add(pivot);
  }
  group.position.set(x, y, z);
  if (face === 'x') group.rotation.y = Math.PI / 2;
  group.userData.kind = 'case';
  group.traverse((child) => { child.userData.kind = 'case'; });
  return group;
}

export function buildCase() {
  const group = new THREE.Group();
  group.name = 'case';
  const panel = metal(STEEL, 0.62);
  const frame = metal(STEEL_DARK, 1);
  const trayMat = metal(TRAY, 0.94);
  const add = (mesh) => group.add(mesh);

  // Open toward the camera (+Z). Rear is -X, front is +X, tray is -Z.
  add(box(4.7, 0.08, 2.15, frame, 0, -2.08, -0.05));
  add(box(4.7, 0.07, 2.05, panel, 0, 2.12, -0.08));
  add(box(0.08, 4.2, 2.05, frame, -2.32, 0.02, -0.08));
  add(box(0.08, 4.2, 2.05, panel, 2.32, 0.02, -0.08));
  add(box(4.55, 4.15, 0.06, trayMat, 0, 0.05, -1.02));
  add(box(4.7, 0.08, 0.08, frame, 0, 2.12, 0.9));
  add(box(4.7, 0.08, 0.08, frame, 0, -2.08, 0.9));
  add(box(0.08, 4.2, 0.08, frame, -2.32, 0.02, 0.9));
  add(box(0.08, 4.2, 0.08, frame, 2.32, 0.02, 0.9));

  // PSU shroud, open on the camera side so the supply stays visible.
  add(box(2.3, 0.06, 1.55, frame, -0.95, -1.05, -0.15));
  add(box(2.3, 0.9, 0.06, metal(STEEL, 0.72), -0.95, -1.5, -0.9));
  add(box(0.06, 0.9, 1.5, metal(STEEL, 0.62), 0.18, -1.5, -0.15));

  // Drive cage at the front, the bay the SSD step uses.
  add(box(0.7, 0.05, 0.55, frame, 1.5, -0.15, -0.35));
  add(box(0.7, 0.05, 0.55, frame, 1.5, -0.62, -0.35));
  add(box(0.05, 0.7, 0.55, frame, 1.82, -0.38, -0.35));

  // Standoffs. The motherboard covers them once it is seated.
  const posts = metal(BRASS, 1);
  [[-0.7, 1.35], [0.7, 1.35], [-0.7, -0.45], [0.7, -0.45], [0, 0.45]].forEach(([x, y]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), posts);
    post.position.set(x, y, -0.9);
    post.rotation.x = Math.PI / 2;
    post.userData.kind = 'case';
    add(post);
  });

  add(fan(0.38, -2.24, 1.15, 0.05, 'x'));
  add(fan(0.32, 2.24, 1.25, 0.05, 'x'));
  add(fan(0.32, 2.24, 0.35, 0.05, 'x'));
  add(fan(0.32, 2.24, -0.55, 0.05, 'x'));

  [[-0.15], [-0.38], [-0.61]].forEach(([y]) => {
    add(box(0.05, 0.16, 0.7, frame, -2.2, y, 0.05));
  });

  const foot = metal(0x11151c, 1);
  [[-1.8, -1.6], [1.8, -1.6], [-1.8, 1.5], [1.8, 1.5]].forEach(([x, z]) => {
    add(box(0.28, 0.1, 0.4, foot, x, -2.18, z * 0.35));
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 32),
    new THREE.MeshBasicMaterial({ color: 0x0b1b3a, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.22;
  shadow.userData.kind = 'case';
  shadow.raycast = () => {};
  add(shadow);
  return group;
}

export function buildShelf(x, y, z, width, depth) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.045, depth),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  mesh.position.set(x, y, z);
  mesh.userData.kind = 'shelf';
  return mesh;
}
