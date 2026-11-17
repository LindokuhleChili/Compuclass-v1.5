// One-hand vocabulary for the front camera. MediaPipe landmarks are 0..20.
// Pinch and the OK sign share a closed thumb and index, so the other fingers decide.

export const HAND_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

export const GESTURE_LABELS = {
  none: 'None',
  open: 'Open',
  point: 'Point',
  pinch: 'Pinch',
  fist: 'Fist',
  peace: 'Peace',
  three: 'Three',
  ok: 'OK',
};

const EMPTY = {
  pinchDistance: 1,
  pinchLikely: false,
  extendedCount: 0,
  fist: false,
  peace: false,
  three: false,
  point: false,
  open: false,
  wrist: null,
  indexTip: null,
  thumbTip: null,
  landmarks: null,
};

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

export function measureHand(landmarks) {
  if (!landmarks || landmarks.length < 21) return { ...EMPTY };
  const wrist = landmarks[0];
  const reach = (index) => distance(landmarks[index], wrist);
  const extended = (tip, mcp) => reach(tip) > reach(mcp) * 1.42 && distance(landmarks[tip], landmarks[mcp]) > reach(mcp) * 0.45;
  const index = extended(8, 5);
  const middle = extended(12, 9);
  const ring = extended(16, 13);
  const pinky = extended(20, 17);
  const fingers = [index, middle, ring, pinky];
  const extendedCount = fingers.filter(Boolean).length;
  const pinchDistance = distance(landmarks[4], landmarks[8]);
  return {
    pinchDistance,
    pinchLikely: pinchDistance < 0.12 && reach(8) > reach(5) * 1.05 && !middle && !ring && !pinky,
    extendedCount,
    fist: extendedCount === 0,
    peace: index && middle && !ring && !pinky,
    three: index && middle && ring && !pinky,
    point: index && !middle && !ring && !pinky,
    open: extendedCount >= 4,
    wrist,
    indexTip: landmarks[8],
    thumbTip: landmarks[4],
    landmarks,
  };
}

export function instantGesture(sample, pinching) {
  const close = pinching ? sample.pinchDistance <= 0.095 : sample.pinchDistance <= 0.05;
  if (close && sample.extendedCount >= 3) return 'ok';
  if (close && sample.pinchLikely) return 'pinch';
  if (sample.fist) return 'fist';
  if (sample.peace) return 'peace';
  if (sample.three) return 'three';
  if (sample.point) return 'point';
  if (sample.open) return 'open';
  return 'none';
}

export function createGestureFilter({ holdFrames = 3 } = {}) {
  let stable = 'none';
  let pending = 'none';
  let count = 0;
  let pinching = false;
  let release = 0;

  return {
    push(sample) {
      const instant = instantGesture(sample, pinching);
      const grabbing = instant === 'pinch' || instant === 'ok';
      if (grabbing) {
        release = 0;
        if (instant === pending) count += 1;
        else { pending = instant; count = 1; }
        if (pinching || count >= 2) {
          pinching = instant === 'pinch';
          stable = instant;
        }
        return stable;
      }
      if (pinching || stable === 'ok') {
        release += 1;
        if (release < 3) return stable;
        pinching = false;
        release = 0;
        pending = instant;
        count = holdFrames;
        stable = instant;
        return stable;
      }
      if (instant === pending) count += 1;
      else { pending = instant; count = 1; }
      if (count >= holdFrames) stable = instant;
      return stable;
    },
    current() { return stable; },
  };
}

// One action per frame. Movement wins over the matching held pose so a
// travelling palm rotates instead of exploding.
export function gestureAction({ gesture, moving, stillMs, holdMs = 560, resetMs = 720 }) {
  if (gesture === 'open' && moving) return 'rotate';
  if (gesture === 'open' && stillMs >= holdMs) return 'explode';
  if (gesture === 'fist' && moving) return 'zoom';
  if (gesture === 'fist' && stillMs >= holdMs) return 'assemble';
  if (gesture === 'point') return 'point';
  if (gesture === 'pinch') return 'pinch';
  if (gesture === 'peace') return 'next';
  if (gesture === 'three') return 'previous';
  if (gesture === 'ok' && stillMs >= resetMs) return 'reset';
  return 'idle';
}

export function mapVideoPoint(nx, ny, videoW, videoH, viewW, viewH, mirror = true) {
  const width = viewW || 1;
  const height = viewH || 1;
  let x;
  let y;
  if (!videoW || !videoH) {
    x = nx * width;
    y = ny * height;
  } else {
    const scale = Math.max(width / videoW, height / videoH);
    const drawnW = videoW * scale;
    const drawnH = videoH * scale;
    x = (width - drawnW) / 2 + nx * drawnW;
    y = (height - drawnH) / 2 + ny * drawnH;
  }
  return { x: mirror ? width - x : x, y };
}

export function createSmoother(alpha = 0.42) {
  let x = null;
  let y = null;
  return (nx, ny) => {
    if (x == null) { x = nx; y = ny; }
    else {
      x += (nx - x) * alpha;
      y += (ny - y) * alpha;
    }
    return { x, y };
  };
}
