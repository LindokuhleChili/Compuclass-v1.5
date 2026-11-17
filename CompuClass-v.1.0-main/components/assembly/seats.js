import * as THREE from 'three';

// The open side of the case faces +Z. Rear is -X, the tray is the -Z wall.
export const CASE = {
  rearInner: -2.06,
  trayFace: -1.0,
  standoff: 0.08,
  topSlotY: 0.22,
  floor: -2.1,
  boardScale: 2.32,
  shroud: { x: -1.12, y: -1.68, z: -0.22 },
  cage: { x: 1.38, y: -0.38, z: -0.3 },
};

const CHILD_SLOTS = ['cpu', 'cooler', 'ram', 'gpu'];

function vec(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

function pose(x, y, z, scale) {
  return {
    position: vec(x, y, z),
    quaternion: new THREE.Quaternion(),
    scale: vec(scale, scale, scale),
  };
}

export function meshRecords(root) {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const records = [];
  root.traverse((child) => {
    if (!child.isMesh) return;
    const box = new THREE.Box3().setFromObject(child).applyMatrix4(inverse);
    records.push({
      name: child.name || '',
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
      min: box.min.clone(),
      max: box.max.clone(),
    });
  });
  return records;
}

// Socket, DIMM row and the PCIe slot nearest that row, in the framed board's
// own space (long side on X, thin side on Z, component face toward +Z).
export function classifyBoard(records) {
  if (!records?.length) return null;
  const board = records.reduce((best, item) => (
    item.size.x * item.size.y > best.size.x * best.size.y ? item : best
  ));
  const dimms = records.filter((item) => item !== board
    && item.size.x < 0.11
    && item.size.y > 0.16
    && item.size.z < 0.14);
  const pcie = records.filter((item) => item !== board
    && item.size.x > 0.2
    && item.size.y < 0.1
    && item.size.z < 0.14);
  if (!dimms.length || !pcie.length) return null;
  const dimm = {
    x: dimms.reduce((sum, item) => sum + item.center.x, 0) / dimms.length,
    y: dimms.reduce((sum, item) => sum + item.center.y, 0) / dimms.length,
    z: Math.max(...dimms.map((item) => item.max.z)),
  };
  const slot = pcie.slice().sort((a, b) => (
    Math.abs(a.center.y - dimm.y) - Math.abs(b.center.y - dimm.y)
  ))[0];
  const rearEdge = board.min.x;
  const socketCandidates = records.filter((item) => {
    if (item === board || dimms.includes(item) || pcie.includes(item)) return false;
    const area = item.size.x * item.size.y;
    return area > 0.02 && area < 0.22
      && item.size.z < 0.16
      && Math.abs(item.center.y - dimm.y) < 0.22
      && item.center.x < dimm.x - 0.05
      && item.center.x > rearEdge + 0.08;
  });
  const socketMesh = socketCandidates.sort((a, b) => (
    (b.size.x * b.size.y) - (a.size.x * a.size.y)
  ))[0];
  if (!socketMesh) return null;
  return {
    board,
    socket: { x: socketMesh.center.x, y: socketMesh.center.y, z: socketMesh.max.z },
    dimm,
    pcie: { x: slot.center.x, y: slot.center.y, z: slot.max.z },
  };
}

function unitSize(size, fallback) {
  if (!size) return fallback.clone();
  return size.clone ? size.clone() : vec(size.x, size.y, size.z);
}

// World pose for every part, plus the board-local point for the four parts
// that belong to the motherboard.
export function buildSeatPlan(features, extents = {}) {
  const found = features || null;
  const board = found?.board;
  const boardScale = CASE.boardScale;
  const minX = board ? board.min.x : -0.5;
  const minZ = board ? board.min.z : -0.02;
  const socket = found?.socket || { x: -0.16, y: 0.14, z: 0.04 };
  const dimm = found?.dimm || { x: 0.18, y: 0.14, z: 0.03 };
  const pcie = found?.pcie || { x: -0.05, y: -0.08, z: 0.02 };
  const boardX = CASE.rearInner + 0.16 - minX * boardScale;
  const boardY = CASE.topSlotY - pcie.y * boardScale;
  const boardZ = CASE.trayFace + CASE.standoff - minZ * boardScale;

  const cpuSize = unitSize(extents.cpu, vec(1, 1, 0.12));
  const coolerSize = unitSize(extents.cooler, vec(0.85, 0.85, 0.55));
  const ramSize = unitSize(extents.ram, vec(0.28, 1, 0.22));
  const gpuSize = unitSize(extents.gpu, vec(1, 0.2, 0.42));
  const ssdSize = unitSize(extents.storage, vec(1, 0.62, 0.14));
  const psuSize = unitSize(extents.psu, vec(1, 0.48, 0.78));
  const boardSize = unitSize(extents.motherboard, vec(1, 0.82, 0.08));

  const cpuScale = Math.min(0.46, Math.max(socket.z, 0.12) * boardScale * 1.15);
  const ramScale = 0.58;
  const gpuScale = 1.52;
  const coolerScale = cpuScale * 1.7;
  const ssdScale = 0.58;
  const psuScale = 1.22;

  const cpuLocalZ = socket.z + (cpuSize.z * cpuScale) / (2 * boardScale);
  const coolerLocalZ = cpuLocalZ + (cpuSize.z * cpuScale + coolerSize.z * coolerScale) / (2 * boardScale);
  const ramLocalZ = dimm.z + (ramSize.z * ramScale) / (2 * boardScale);
  const gpuLocalZ = pcie.z + (gpuSize.z * gpuScale) / (2 * boardScale);
  const gpuWorldX = (CASE.rearInner + 0.08) + (gpuSize.x * gpuScale) / 2;
  const gpuLocalX = (gpuWorldX - boardX) / boardScale;

  const cpu = pose(boardX + socket.x * boardScale, boardY + socket.y * boardScale, boardZ + cpuLocalZ * boardScale, cpuScale);
  const cooler = pose(cpu.position.x, cpu.position.y, boardZ + coolerLocalZ * boardScale, coolerScale);
  const ram = pose(boardX + dimm.x * boardScale, boardY + dimm.y * boardScale, boardZ + ramLocalZ * boardScale, ramScale);
  const gpu = pose(gpuWorldX, CASE.topSlotY, boardZ + gpuLocalZ * boardScale, gpuScale);
  const storage = pose(CASE.cage.x, CASE.cage.y, CASE.cage.z, ssdScale);
  const psuTop = CASE.floor + 0.05 + (psuSize.y * psuScale) / 2;
  const psu = pose(CASE.shroud.x, psuTop, CASE.shroud.z, psuScale);
  const motherboard = pose(boardX, boardY, boardZ, boardScale);

  const local = {
    cpu: vec(socket.x, socket.y, cpuLocalZ),
    cooler: vec(socket.x, socket.y, coolerLocalZ),
    ram: vec(dimm.x, dimm.y, ramLocalZ),
    gpu: vec(gpuLocalX, pcie.y, gpuLocalZ),
  };

  return {
    motherboard,
    cpu,
    cooler,
    ram,
    gpu,
    storage,
    psu,
    local,
    sizes: {
      motherboard: boardSize.clone().multiplyScalar(boardScale),
      cpu: cpuSize.clone().multiplyScalar(cpuScale),
      cooler: coolerSize.clone().multiplyScalar(coolerScale),
      ram: ramSize.clone().multiplyScalar(ramScale),
      gpu: gpuSize.clone().multiplyScalar(gpuScale),
      storage: ssdSize.clone().multiplyScalar(ssdScale),
      psu: psuSize.clone().multiplyScalar(psuScale),
    },
  };
}

export function attachSlotAnchors(boardRoot, seatGroup, plan, installed) {
  const host = installed ? boardRoot : seatGroup;
  if (!installed) {
    seatGroup.position.copy(plan.motherboard.position);
    seatGroup.quaternion.copy(plan.motherboard.quaternion);
    seatGroup.scale.copy(plan.motherboard.scale);
  }
  CHILD_SLOTS.forEach((id) => {
    let anchor = host.getObjectByName(`${id}-slot`) || boardRoot.getObjectByName(`${id}-slot`) || seatGroup.getObjectByName(`${id}-slot`);
    if (!anchor) {
      anchor = new THREE.Group();
      anchor.name = `${id}-slot`;
    }
    host.add(anchor);
    anchor.position.copy(plan.local[id]);
    anchor.quaternion.identity();
  });
  return CHILD_SLOTS.map((id) => host.getObjectByName(`${id}-slot`));
}

export function placedBoxes(plan) {
  return Object.entries(plan.sizes).map(([id, size]) => {
    const center = plan[id].position;
    if (id === 'motherboard') {
      const thickness = 0.07;
      const back = center.z - size.z / 2;
      return {
        id,
        min: vec(center.x - size.x / 2, center.y - size.y / 2, back),
        max: vec(center.x + size.x / 2, center.y + size.y / 2, back + thickness),
      };
    }
    return {
      id,
      min: center.clone().sub(size.clone().multiplyScalar(0.5)),
      max: center.clone().add(size.clone().multiplyScalar(0.5)),
    };
  });
}

export function overlappingPairs(plan, tolerance = 0.02) {
  const boxes = placedBoxes(plan);
  const hits = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlap = ['x', 'y', 'z'].every((axis) => (
        a.min[axis] < b.max[axis] - tolerance && b.min[axis] < a.max[axis] - tolerance
      ));
      if (overlap) hits.push([a.id, b.id]);
    }
  }
  return hits;
}

export function slotError(anchorWorld, planPose) {
  return {
    position: anchorWorld.position.distanceTo(planPose.position),
    angle: anchorWorld.quaternion.angleTo(planPose.quaternion),
  };
}
