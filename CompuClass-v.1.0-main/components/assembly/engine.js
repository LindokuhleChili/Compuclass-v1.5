import * as THREE from 'three';
import { ASSEMBLY_PARTS } from './catalog';
import { judgeDrop, nextPartId, sanitizeInstalled } from './rules';
import { framePart, muteRaycast } from './framePart';
import { buildCase, buildShelf } from './caseMesh';
import { buildPlaceholder } from './placeholders';

// Pointer dragging follows the plane method in three.js DragControls
// (MIT, mrdoob/three.js examples/jsm/controls/DragControls.js):
// the ray hits a camera-facing plane through the part, and an offset keeps
// the grab point under the pointer. Snap then uses the slot's real depth.

const ACCENT = 0x3bb8c4;
const PRIMARY = 0x0a66ff;
const ERROR = 0xd92d4a;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeOutBack(t) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function takePose(object) {
  return {
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
  };
}

function writePose(object, pose) {
  object.position.copy(pose.position);
  object.quaternion.copy(pose.quaternion);
  object.scale.copy(pose.scale);
}

function clonePose(pose) {
  return {
    position: pose.position.clone(),
    quaternion: pose.quaternion.clone(),
    scale: pose.scale.clone(),
  };
}

function poseAt(x, y, z, scale) {
  return {
    position: new THREE.Vector3(x, y, z),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(scale, scale, scale),
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeLabel(text) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  roundRect(ctx, 6, 10, 244, 44, 14);
  ctx.fill();
  ctx.fillStyle = '#0B1B3A';
  ctx.font = '600 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const map = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false }));
  sprite.scale.set(0.78, 0.16, 1);
  sprite.center.set(0.5, 1);
  sprite.raycast = () => {};
  return sprite;
}

function makeGuide(size) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  }));
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: PRIMARY, transparent: true, opacity: 0.9 }),
  );
  edges.raycast = () => {};
  mesh.add(edges);
  mesh.raycast = () => {};
  mesh.visible = false;
  return mesh;
}

function setGlow(root, color, intensity) {
  root.traverse((child) => {
    if (!child.isMesh || !child.material?.emissive) return;
    const materials = [].concat(child.material);
    materials.forEach((material) => {
      if (!material.userData.baseEmissive) {
        material.userData.baseEmissive = material.emissive.clone();
        material.userData.baseIntensity = material.emissiveIntensity || 0;
      }
      if (intensity <= 0) {
        material.emissive.copy(material.userData.baseEmissive);
        material.emissiveIntensity = material.userData.baseIntensity;
      } else {
        material.emissive.set(color);
        material.emissiveIntensity = intensity;
      }
    });
  });
}

function trayPosition(index, count, phone) {
  const scale = phone ? 0.46 : 0.5;
  const col = index % 2;
  const row = Math.floor(index / 2);
  const y = (phone ? 1.7 : 1.25) - row * (phone ? 0.74 : 0.78);
  const x = phone ? (col === 0 ? -1.15 : 1.15) : (col === 0 ? 2.15 : 2.85);
  const z = phone ? 1.35 : 0.35;
  return { x, y, z, scale };
}

export function createAssembly({ renderer, width, height, installed, reducedMotion = false, callbacks = {} }) {
  const scene = new THREE.Scene();
  const backdrop = new THREE.Color(0xf7fbfd);
  scene.background = backdrop;
  const camera = new THREE.PerspectiveCamera(34, width / Math.max(height, 1), 0.08, 80);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  const scratch = new THREE.Vector3();

  scene.add(new THREE.HemisphereLight(0xf7fbfd, 0xc5d0dc, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 7, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xddf3f4, 0.55);
  fill.position.set(-5, 3, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(0, 2, -6);
  scene.add(rim);

  if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const caseGroup = buildCase();
  scene.add(caseGroup);

  const parts = ASSEMBLY_PARTS.map((spec) => {
    const content = framePart(buildPlaceholder(spec.id), spec.axes);
    muteRaycast(content);
    const root = new THREE.Group();
    root.name = spec.id;
    root.add(content);
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hitMesh.userData.partId = spec.id;
    root.add(hitMesh);
    const label = makeLabel(spec.name);
    if (label) scene.add(label);
    const guide = makeGuide(spec.guide);
    guide.position.set(spec.position[0], spec.position[1], spec.position[2]);
    scene.add(root, guide);
    return {
      spec,
      root,
      content,
      hit: hitMesh,
      label,
      guide,
      placeholder: true,
      installed: false,
      tray: poseAt(0, 0, 2, 0.8),
      slot: poseAt(spec.position[0], spec.position[1], spec.position[2], spec.fit),
    };
  });
  const byId = Object.fromEntries(parts.map((part) => [part.spec.id, part]));

  let viewW = width;
  let viewH = height;
  let reduced = reducedMotion;
  let exploded = false;
  let phone = width < 900 || height < 720;
  let shelves = [];
  let installedIds = sanitizeInstalled(installed);
  let drag = null;
  let lock = null;
  let focusedId = nextPartId(installedIds);
  let aimedId = null;
  let heldId = null;
  let tweens = [];
  let clock = 0;
  let orbit = { theta: phone ? 0.05 : 0.28, phi: 1.05, radius: phone ? 10.4 : 10.6 };
  const target = new THREE.Vector3(0, 0.2, 0.35);
  let disposed = false;

  function duration(seconds) {
    return reduced ? 0 : seconds;
  }

  function displayPose(part) {
    const pose = part.installed ? clonePose(part.slot) : clonePose(part.tray);
    if (exploded && part.installed) pose.position.z += 0.9;
    if (exploded && !part.installed) pose.position.y += 0.4;
    return pose;
  }

  function applyInstalledFlags() {
    parts.forEach((part) => {
      part.installed = installedIds.includes(part.spec.id);
      if (part.label) part.label.visible = !part.installed;
    });
  }

  function seat(part, seconds = 0, wiggle = false) {
    tweenTo(part.root, displayPose(part), seconds, wiggle);
  }

  function tweenTo(root, pose, seconds, wiggle = false, onDone) {
    tweens = tweens.filter((item) => item.root !== root);
    if (seconds <= 0) {
      writePose(root, pose);
      onDone?.();
      return;
    }
    tweens.push({ root, from: takePose(root), to: pose, elapsed: 0, seconds, wiggle, onDone });
  }

  function layout(nextPhone, animate) {
    phone = nextPhone;
    camera.fov = phone ? 40 : 38;
    camera.updateProjectionMatrix();
    orbit.radius = phone ? 10.4 : 10.6;
    orbit.theta = phone ? 0.05 : 0.28;
    shelves.forEach((shelf) => {
      scene.remove(shelf);
      shelf.geometry?.dispose?.();
    });
    shelves = [];
    if (phone) {
      shelves.push(buildShelf(-1.15, -1.55, 1.35, 1.15, 1.3));
      shelves.push(buildShelf(1.15, -1.55, 1.35, 1.15, 1.3));
    } else {
      shelves.push(buildShelf(2.5, -1.7, 0.35, 1.7, 2.2));
    }
    shelves.forEach((shelf) => scene.add(shelf));
    parts.forEach((part, index) => {
      const spot = trayPosition(index, parts.length, phone);
      part.tray.position.set(spot.x, spot.y, spot.z);
      part.tray.scale.setScalar(spot.scale);
      if (!part.installed && drag !== part) seat(part, animate ? duration(0.25) : 0);
    });
  }

  function placeLabels() {
    parts.forEach((part) => {
      if (!part.label) return;
      part.label.visible = !part.installed && drag !== part;
      const drop = (part.tray?.scale?.x || 0.5) * 0.55;
      part.label.position.set(part.root.position.x, part.root.position.y - drop, part.root.position.z + 0.08);
    });
  }

  function updateCamera() {
    const { theta, phi, radius } = orbit;
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(target);
  }

  function rayFrom(x, y) {
    pointer.x = (x / viewW) * 2 - 1;
    pointer.y = -(y / viewH) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray;
  }

  function projectOf(world) {
    const v = scratch.copy(world).project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * viewW,
      y: (-v.y * 0.5 + 0.5) * viewH,
      behind: v.z > 1,
    };
  }

  // A drop counts for a slot when it lands inside that slot's on-screen footprint.
  // The part's own slot wins when several overlap, so a big board does not lose
  // to a smaller socket drawn on top of it.
  function slotUnder(x, y, preferId) {
    const hits = [];
    parts.forEach((part) => {
      const center = projectOf(part.slot.position);
      if (center.behind) return;
      const edge = projectOf(new THREE.Vector3(
        part.slot.position.x + part.spec.guide[0] / 2,
        part.slot.position.y + part.spec.guide[1] / 2,
        part.slot.position.z,
      ));
      const halfW = Math.max(48, Math.abs(edge.x - center.x) * 1.55);
      const halfH = Math.max(48, Math.abs(edge.y - center.y) * 1.55);
      if (Math.abs(x - center.x) <= halfW && Math.abs(y - center.y) <= halfH) {
        hits.push({ part, area: halfW * halfH });
      }
    });
    const own = hits.find((item) => item.part.spec.id === preferId);
    if (own) return own.part;
    hits.sort((a, b) => a.area - b.area);
    return hits[0]?.part || null;
  }

  function pickDraggable(x, y) {
    rayFrom(x, y);
    const hits = raycaster.intersectObjects(parts.filter((part) => !part.installed).map((part) => part.hit), false);
    const id = hits[0]?.object?.userData?.partId;
    return id ? byId[id] : null;
  }

  function paint() {
    parts.forEach((part) => {
      const hot = part.spec.id === heldId || part.spec.id === aimedId || part.spec.id === focusedId;
      setGlow(part.content, hot ? ACCENT : 0x000000, hot ? 0.38 : 0);
    });
  }

  function tellInfo(id, reason) {
    callbacks.onInfo?.({ id, reason });
  }

  function publish() {
    callbacks.onChange?.([...installedIds]);
    callbacks.onView?.({ exploded, done: installedIds.length === ASSEMBLY_PARTS.length });
  }

  function beginDrag(part, x, y, source) {
    if (!part || part.installed) return false;
    const origin = new THREE.Vector3().setFromMatrixPosition(part.root.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(plane.normal), origin);
    if (!rayFrom(x, y).intersectPlane(plane, hit)) return false;
    inverse.copy(part.root.parent.matrixWorld).invert();
    offset.copy(hit).sub(origin);
    drag = part;
    lock = source;
    heldId = part.spec.id;
    paint();
    tellInfo(part.spec.id, 'hold');
    return true;
  }

  function reachRadius() {
    return Math.max(160, viewW * 0.18);
  }

  function moveDrag(x, y) {
    if (!drag || !rayFrom(x, y).intersectPlane(plane, hit)) return;
    drag.root.position.copy(hit.clone().sub(offset).applyMatrix4(inverse));
    if (drag.spec.id === nextPartId(installedIds)) {
      const here = projectOf(drag.root.position);
      const slot = projectOf(drag.slot.position);
      const distance = Math.hypot(here.x - slot.x, here.y - slot.y);
      const reach = reachRadius();
      if (distance < reach) {
        const pull = (1 - distance / reach) * 0.55;
        drag.root.position.lerp(drag.slot.position, pull);
      }
    }
  }

  function finishDrag(x, y) {
    const part = drag;
    drag = null;
    heldId = null;
    lock = null;
    if (!part) return;
    const aimed = slotUnder(x, y, part.spec.id);
    const slotPoint = projectOf(part.slot.position);
    const nearOwn = Math.hypot(slotPoint.x - x, slotPoint.y - y) <= reachRadius();
    const onOwn = nearOwn || (aimed && aimed.spec.id === part.spec.id);
    const wrong = aimed && aimed.spec.id !== part.spec.id && !onOwn;
    const decision = onOwn || wrong
      ? judgeDrop({
        partId: part.spec.id,
        installed: installedIds,
        slotId: onOwn ? part.spec.id : aimed.spec.id,
        onTarget: true,
        overCase: true,
      })
      : { outcome: 'return' };
    if (decision.outcome === 'install') {
      installedIds = [...installedIds, part.spec.id];
      part.installed = true;
      if (part.label) part.label.visible = false;
      focusedId = nextPartId(installedIds);
      tweenTo(part.root, displayPose(part), duration(0.28), false, () => paint());
      callbacks.onFeedback?.({ kind: 'ok', text: decision.text });
      publish();
      if (focusedId) tellInfo(focusedId, 'focus');
    } else if (decision.outcome === 'reject') {
      tweenTo(part.root, displayPose(part), duration(0.42), true);
      callbacks.onFeedback?.({ kind: 'error', text: decision.text });
    } else {
      tweenTo(part.root, displayPose(part), duration(0.32), false);
    }
    paint();
  }

  function updateGuides() {
    const next = nextPartId(installedIds);
    let nearNext = false;
    if (drag && drag.spec.id === next) {
      const here = projectOf(drag.root.position);
      const slot = projectOf(byId[next].slot.position);
      nearNext = Math.hypot(here.x - slot.x, here.y - slot.y) <= reachRadius();
    }
    const pointerSlot = drag ? slotUnder(projectOf(drag.root.position).x, projectOf(drag.root.position).y, drag.spec.id) : null;
    parts.forEach((part) => {
      const id = part.spec.id;
      const isNext = id === next && !part.installed;
      const isHot = isNext && (nearNext || pointerSlot === part);
      const isWrong = pointerSlot === part && drag && drag.spec.id !== id;
      part.guide.visible = isNext || isWrong;
      const pulse = 0.22 + Math.sin(clock * 5) * 0.08;
      part.guide.material.color.set(isWrong ? ERROR : ACCENT);
      part.guide.material.opacity = isHot ? 0.62 : isWrong ? 0.4 : isNext ? pulse : 0;
      part.guide.children[0].material.color.set(isWrong ? ERROR : PRIMARY);
      const pop = isHot ? 1.08 : 1;
      part.guide.scale.setScalar(pop);
    });
  }

  applyInstalledFlags();
  layout(phone, false);
  parts.forEach((part) => {
    if (part.installed) writePose(part.root, displayPose(part));
  });
  if (focusedId) tellInfo(focusedId, 'focus');
  updateCamera();
  paint();

  return {
    scene,
    camera,
    setSize(w, h) {
      viewW = Math.max(1, w);
      viewH = Math.max(1, h);
      camera.aspect = viewW / viewH;
      camera.updateProjectionMatrix();
      const nextPhone = viewW < 900 || viewH < 720;
      if (nextPhone !== phone) layout(nextPhone, true);
    },
    setReduced(value) { reduced = !!value; },
    setVideoBackdrop(on) {
      scene.background = on ? null : backdrop;
      renderer.setClearColor(0x000000, on ? 0 : 1);
    },
    useModel(id, framed) {
      const part = byId[id];
      if (!part || !framed || disposed) return;
      muteRaycast(framed);
      part.root.remove(part.content);
      part.content.traverse((child) => {
        if (part.placeholder && child.geometry) child.geometry.dispose();
        if (child.material) [].concat(child.material).forEach((material) => material.dispose?.());
      });
      part.content = framed;
      part.placeholder = false;
      part.root.add(framed);
      part.hit.parent.remove(part.hit);
      part.root.add(part.hit);
      paint();
    },
    orbitBy(dx, dy) {
      if (lock === 'pointer') return;
      orbit.theta = THREE.MathUtils.clamp(orbit.theta - dx * 0.0052, -0.95, 1.05);
      orbit.phi = THREE.MathUtils.clamp(orbit.phi - dy * 0.0042, 0.72, 1.42);
      updateCamera();
    },
    zoomBy(dy) {
      orbit.radius = THREE.MathUtils.clamp(orbit.radius + dy * 0.011, 5.4, 12.5);
      updateCamera();
    },
    wheel(deltaY) { this.zoomBy(deltaY * 0.18); },
    aim(x, y) {
      if (x == null) {
        aimedId = null;
        paint();
        return null;
      }
      const part = pickDraggable(x, y) || parts.find((item) => {
        const point = projectOf(item.root.position);
        return !point.behind && Math.hypot(point.x - x, point.y - y) < 70;
      });
      const id = part?.spec.id || null;
      if (id !== aimedId) {
        aimedId = id;
        paint();
        if (id) tellInfo(id, 'point');
      }
      return this.cursorTarget();
    },
    cursorTarget() {
      const id = heldId || aimedId || focusedId;
      const part = id ? byId[id] : null;
      if (!part) return null;
      const point = projectOf(part.root.position);
      if (point.behind) return null;
      return { id, x: point.x, y: point.y };
    },
    pinch(x, y, phase) {
      if (phase === 'start') {
        if (lock === 'pointer') return;
        const part = (aimedId && byId[aimedId] && !byId[aimedId].installed) ? byId[aimedId] : pickDraggable(x, y);
        beginDrag(part, x, y, 'gesture');
        return;
      }
      if (phase === 'move' && lock === 'gesture') moveDrag(x, y);
      if (phase === 'end' && lock === 'gesture') finishDrag(x, y);
    },
    pointerDown(points) {
      if (!points?.length || lock === 'gesture') return;
      if (points.length >= 2) {
        lock = 'pinch';
        pointer.pinch = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        return;
      }
      const part = pickDraggable(points[0].x, points[0].y);
      if (part && beginDrag(part, points[0].x, points[0].y, 'pointer')) return;
      lock = 'orbit';
      pointer.last = points[0];
    },
    pointerMove(points) {
      if (!points?.length) return;
      if (lock === 'pinch' && points.length >= 2) {
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        this.zoomBy((pointer.pinch - distance) * 0.35);
        pointer.pinch = distance;
        return;
      }
      if (lock === 'pointer' && drag) moveDrag(points[0].x, points[0].y);
      else if (lock === 'orbit' && pointer.last) {
        this.orbitBy(points[0].x - pointer.last.x, points[0].y - pointer.last.y);
        pointer.last = points[0];
      }
    },
    pointerUp(points) {
      if (lock === 'pointer') finishDrag(points?.[0]?.x ?? 0, points?.[0]?.y ?? 0);
      else if (lock === 'orbit' || lock === 'pinch') lock = null;
    },
    focusDelta(dir) {
      const index = ASSEMBLY_PARTS.findIndex((part) => part.id === focusedId);
      const start = index < 0 ? 0 : index;
      const next = (start + dir + ASSEMBLY_PARTS.length) % ASSEMBLY_PARTS.length;
      focusedId = ASSEMBLY_PARTS[next].id;
      paint();
      tellInfo(focusedId, 'focus');
      return focusedId;
    },
    explode() {
      if (exploded) return;
      exploded = true;
      parts.forEach((part) => { if (part !== drag) seat(part, duration(0.45)); });
      callbacks.onView?.({ exploded, done: installedIds.length === ASSEMBLY_PARTS.length });
    },
    assemble() {
      if (!exploded) return;
      exploded = false;
      parts.forEach((part) => { if (part !== drag) seat(part, duration(0.45)); });
      callbacks.onView?.({ exploded, done: installedIds.length === ASSEMBLY_PARTS.length });
    },
    reset() {
      drag = null;
      heldId = null;
      aimedId = null;
      lock = null;
      exploded = false;
      installedIds = [];
      applyInstalledFlags();
      focusedId = nextPartId([]);
      parts.forEach((part) => seat(part, duration(0.35)));
      paint();
      publish();
      callbacks.onFeedback?.(null);
      if (focusedId) tellInfo(focusedId, 'focus');
    },
    tick(dt) {
      if (disposed) return;
      clock += dt;
      tweens.forEach((item) => { item.elapsed += dt; });
      tweens = tweens.filter((item) => {
        const t = item.seconds <= 0 ? 1 : Math.min(1, item.elapsed / item.seconds);
        const eased = item.wiggle ? easeOutBack(t) : easeOutCubic(t);
        item.root.position.lerpVectors(item.from.position, item.to.position, eased);
        if (item.wiggle) item.root.position.x += Math.sin(t * Math.PI * 5) * (1 - t) * 0.14;
        item.root.quaternion.slerpQuaternions(item.from.quaternion, item.to.quaternion, eased);
        item.root.scale.lerpVectors(item.from.scale, item.to.scale, eased);
        if (t < 1) return true;
        writePose(item.root, item.to);
        item.onDone?.();
        return false;
      });
      updateCamera();
      placeLabels();
      updateGuides();
    },
    dispose() {
      disposed = true;
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          [].concat(child.material).forEach((material) => {
            material.map?.dispose?.();
            material.dispose?.();
          });
        }
      });
    },
  };
}
