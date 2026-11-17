import * as THREE from 'three';
import { createAssembly } from '../engine';
import { framePart } from '../framePart';
import { buildPlaceholder } from '../placeholders';
import {
  attachSlotAnchors, buildSeatPlan, classifyBoard, meshRecords, overlappingPairs, slotError,
} from '../seats';

describe('seated parts', () => {
  const features = classifyBoard(meshRecords(framePart(buildPlaceholder('motherboard'), {
    longAxis: 'x', thinAxis: 'z',
  })));
  const plan = buildSeatPlan(features, {});

  it('finds the socket, the DIMM row and the PCIe slot on the board', () => {
    expect(features.socket.x).toBeLessThan(features.dimm.x);
    expect(Math.abs(features.socket.y - features.dimm.y)).toBeLessThan(0.05);
    expect(features.pcie.y).not.toBeCloseTo(features.socket.y, 1);
  });

  it('keeps every placed part on its slot without overlapping another', () => {
    const board = new THREE.Group();
    const seat = new THREE.Group();
    board.position.copy(plan.motherboard.position);
    board.quaternion.copy(plan.motherboard.quaternion);
    board.scale.copy(plan.motherboard.scale);
    attachSlotAnchors(board, seat, plan, true);
    board.updateMatrixWorld(true);
    ['cpu', 'cooler', 'ram', 'gpu'].forEach((id) => {
      const anchor = board.getObjectByName(`${id}-slot`);
      expect(anchor.parent).toBe(board);
      const world = {
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
      };
      anchor.getWorldPosition(world.position);
      anchor.getWorldQuaternion(world.quaternion);
      const error = slotError(world, plan[id]);
      expect(error.position).toBeLessThan(0.02);
      expect(error.angle).toBeLessThan(0.02);
    });
    expect(overlappingPairs(plan)).toEqual([]);
    expect(plan.motherboard.position.z).toBeLessThan(-0.7);
    expect(plan.gpu.position.x).toBeLessThan(plan.motherboard.position.x);
    expect(plan.psu.position.y).toBeLessThan(-1.2);
    expect(plan.cpu.position.z).toBeGreaterThan(plan.motherboard.position.z);
    expect(plan.cooler.position.z).toBeGreaterThan(plan.cpu.position.z);
  });

  it('follows the pointer and snaps only when the part is dropped on its slot', () => {
    const engine = createAssembly({
      renderer: { toneMapping: 0 },
      width: 1280,
      height: 800,
      reducedMotion: true,
    });
    let guard = 0;
    while ((engine.project('motherboard').y > 720 || engine.project('motherboard').y < 60) && guard < 30) {
      engine.orbitBy(0, -30);
      guard += 1;
    }
    const start = engine.project('motherboard');
    const origin = engine.partPosition('motherboard');
    const slot = engine.slotPosition('motherboard');
    engine.pointerDown([{ x: start.x, y: start.y }]);
    engine.pointerMove([{ x: start.x - 140, y: start.y + 30 }]);
    const dragged = engine.partPosition('motherboard');
    expect(dragged.distanceTo(origin)).toBeGreaterThan(0.15);
    expect(dragged.distanceTo(slot)).toBeGreaterThan(0.45);
    engine.pointerUp([{ x: start.x - 140, y: start.y + 30 }]);
    expect(engine.partPosition('motherboard').distanceTo(slot)).toBeGreaterThan(0.45);

    const again = engine.project('motherboard');
    engine.pointerDown([{ x: again.x, y: again.y }]);
    const target = engine.slotPosition('motherboard');
    const projected = target.clone().project(engine.camera);
    const sx = (projected.x * 0.5 + 0.5) * 1280;
    const sy = (-projected.y * 0.5 + 0.5) * 800;
    const steps = 12;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      engine.pointerMove([{ x: again.x + (sx - again.x) * t, y: again.y + (sy - again.y) * t }]);
      if (i === 1) {
        expect(engine.partPosition('motherboard').distanceTo(target)).toBeGreaterThan(0.35);
      }
    }
    engine.pointerUp([{ x: sx, y: sy }]);
    expect(engine.partPosition('motherboard').distanceTo(engine.slotPosition('motherboard'))).toBeLessThan(0.05);
    expect(engine.slotAnchor('cpu').parent.name).toBe('motherboard');
  });
});
