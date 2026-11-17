import * as THREE from 'three';

const AXES = ['x', 'y', 'z'];

function axisSize(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

function rotateSwap(object, a, b) {
  if (a === b) return;
  const pair = [a, b].sort().join('');
  if (pair === 'yz') object.rotateX(Math.PI / 2);
  else if (pair === 'xz') object.rotateY(Math.PI / 2);
  else object.rotateZ(Math.PI / 2);
}

function centerUnit(object) {
  const holder = new THREE.Group();
  holder.add(object);
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  holder.scale.setScalar(1 / maxDim);
  return holder;
}

function cloneMaterials(source) {
  source.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
  });
}

// Puts a model's long and thin axes on the axes the slot expects, then
// centers it and scales the largest side to 1.
export function framePart(source, { longAxis = 'y', thinAxis = 'z', spin = null } = {}) {
  cloneMaterials(source);
  const spinner = new THREE.Group();
  spinner.add(source);
  for (let step = 0; step < 4; step += 1) {
    const size = axisSize(spinner);
    const thin = AXES.reduce((best, axis) => (size[axis] < size[best] ? axis : best), 'x');
    const long = AXES.reduce((best, axis) => (size[axis] > size[best] ? axis : best), 'x');
    const longClose = size[long] > 0 && Math.abs(size[long] - size[longAxis]) <= size[long] * 0.12;
    if (thin === thinAxis && (long === longAxis || longClose)) break;
    if (thin !== thinAxis) rotateSwap(spinner, thin, thinAxis);
    else if (long !== longAxis) rotateSwap(spinner, long, longAxis);
  }
  let framed = centerUnit(spinner);
  if (!spin) return framed;
  const spun = new THREE.Group();
  spun.rotation.set(spin[0], spin[1], spin[2]);
  spun.add(framed);
  framed = centerUnit(spun);
  return framed;
}

export function muteRaycast(object) {
  object.traverse((child) => {
    child.raycast = () => {};
  });
}
