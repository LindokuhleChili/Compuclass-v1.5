import * as THREE from 'three';
import { framePart } from './framePart';

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.25,
    roughness: 0.45,
    ...extra,
  });
}

function addBox(group, w, h, d, color, x, y, z, extra) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), standard(color, extra));
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function buildFan(radius) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.1, 8, 18),
    standard(0x22262e, { metalness: 0.4 }),
  );
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, radius * 0.12, 12),
    standard(0x3a414c),
  );
  hub.rotation.x = Math.PI / 2;
  group.add(ring, hub);
  for (let blade = 0; blade < 6; blade += 1) {
    const shape = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.78, radius * 0.16, radius * 0.04),
      standard(0x2a303a),
    );
    shape.position.x = radius * 0.36;
    const pivot = new THREE.Group();
    pivot.rotation.z = (blade / 6) * Math.PI * 2;
    pivot.add(shape);
    group.add(pivot);
  }
  return group;
}

export function buildPlaceholder(id) {
  const group = new THREE.Group();
  if (id === 'motherboard') {
    addBox(group, 1, 0.8, 0.02, 0x1f6b45, 0, 0, 0);
    addBox(group, 0.16, 0.16, 0.04, 0xd7c07a, -0.16, 0.14, 0.03);
    addBox(group, 0.04, 0.28, 0.03, 0x111111, 0.12, 0.14, 0.025);
    addBox(group, 0.04, 0.28, 0.03, 0x151515, 0.18, 0.14, 0.025);
    addBox(group, 0.04, 0.28, 0.03, 0x1a1a1a, 0.24, 0.14, 0.025);
    addBox(group, 0.42, 0.03, 0.025, 0x2c3340, -0.05, -0.1, 0.02);
    addBox(group, 0.04, 0.22, 0.05, 0xd5dbe3, -0.48, 0.02, 0.02);
  } else if (id === 'cpu') {
    addBox(group, 1, 1, 0.12, 0x2f6b45, 0, 0, 0);
    addBox(group, 0.72, 0.72, 0.04, 0xe2c98a, 0, 0, 0.08);
  } else if (id === 'cooler') {
    addBox(group, 0.7, 0.7, 0.35, 0xb7c0ca, 0, 0, 0, { metalness: 0.7, roughness: 0.3 });
    const fan = buildFan(0.28);
    fan.position.z = 0.28;
    group.add(fan);
  } else if (id === 'ram') {
    addBox(group, 0.08, 1, 0.22, 0x1b1f27, -0.08, 0, 0);
    addBox(group, 0.08, 1, 0.22, 0x242a34, 0.08, 0, 0);
    addBox(group, 0.09, 0.55, 0.02, 0xf2f4f7, -0.08, 0.1, 0.12);
    addBox(group, 0.09, 0.55, 0.02, 0xf2f4f7, 0.08, 0.1, 0.12);
  } else if (id === 'gpu') {
    addBox(group, 1.55, 0.05, 0.46, 0x1f6b45, 0, 0, 0);
    addBox(group, 1.25, 0.14, 0.4, 0x1a1e26, 0.05, 0.08, 0);
    addBox(group, 0.06, 0.28, 0.62, 0xd5dbe3, -0.8, 0.08, 0, { metalness: 0.8, roughness: 0.25 });
    const left = buildFan(0.16);
    const right = buildFan(0.16);
    left.rotation.x = -Math.PI / 2;
    right.rotation.x = -Math.PI / 2;
    left.position.set(-0.28, 0.16, 0);
    right.position.set(0.32, 0.16, 0);
    group.add(left, right);
  } else if (id === 'storage') {
    addBox(group, 1, 0.62, 0.12, 0x2a313c, 0, 0, 0);
    addBox(group, 0.7, 0.08, 0.02, 0x8d97a6, 0, 0.2, 0.07);
  } else if (id === 'psu') {
    addBox(group, 1.2, 0.55, 0.9, 0x2a3038, 0, 0, 0);
    const fan = buildFan(0.22);
    fan.rotation.x = Math.PI / 2;
    fan.position.y = -0.28;
    group.add(fan);
  }
  return group;
}

export function buildRam(stick, axes) {
  const left = framePart(stick, axes);
  const right = framePart(stick.clone(true), axes);
  left.position.x = -0.1;
  right.position.x = 0.1;
  const pair = new THREE.Group();
  pair.add(left, right);
  return framePart(pair, axes);
}

export function buildCooler(heatsink, axes) {
  const body = framePart(heatsink, axes);
  const fan = buildFan(0.32);
  fan.position.z = 0.42;
  const group = new THREE.Group();
  group.add(body, fan);
  return framePart(group, axes);
}
