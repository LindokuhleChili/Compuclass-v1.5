import { OneEuroFilter } from '../oneEuroFilter';
import {
  createGestureFilter,
  createSmoother,
  gestureAction,
  mapVideoPoint,
  measureHand,
} from '../gestures';

function finger(pts, ids, start, end) {
  ids.forEach((id, index) => {
    const t = index / (ids.length - 1);
    pts[id] = {
      x: start[0] + (end[0] - start[0]) * t,
      y: start[1] + (end[1] - start[1]) * t,
      z: 0,
    };
  });
}

function hand({ index, middle, ring, pinky, pinch = false }) {
  const pts = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  const curl = (out) => (out ? -0.46 : -0.08);
  finger(pts, [1, 2, 3, 4], [-0.04, -0.06], pinch ? [0.08, -0.28] : [-0.16, -0.2]);
  finger(pts, [5, 6, 7, 8], [0.08, -0.12], [0.1, curl(index)]);
  finger(pts, [9, 10, 11, 12], [0.03, -0.12], [0.03, curl(middle)]);
  finger(pts, [13, 14, 15, 16], [-0.03, -0.12], [-0.04, curl(ring)]);
  finger(pts, [17, 18, 19, 20], [-0.09, -0.1], [-0.12, curl(pinky)]);
  if (pinch) pts[8] = { x: 0.09, y: -0.28, z: 0 };
  return pts;
}

describe('hand poses', () => {
  it('names an open palm, a point, a pinch, a fist, peace, three and OK', () => {
    expect(measureHand(hand({ index: true, middle: true, ring: true, pinky: true })).open).toBe(true);
    expect(measureHand(hand({ index: true, middle: false, ring: false, pinky: false })).point).toBe(true);
    expect(measureHand(hand({ index: false, middle: false, ring: false, pinky: false })).fist).toBe(true);
    expect(measureHand(hand({ index: true, middle: true, ring: false, pinky: false })).peace).toBe(true);
    expect(measureHand(hand({ index: true, middle: true, ring: true, pinky: false })).three).toBe(true);
    const pinched = measureHand(hand({ index: true, middle: false, ring: false, pinky: false, pinch: true }));
    expect(pinched.pinchLikely).toBe(true);
    const ok = measureHand(hand({ index: true, middle: true, ring: true, pinky: true, pinch: true }));
    expect(ok.extendedCount).toBeGreaterThanOrEqual(3);
    expect(ok.pinchDistance).toBeLessThan(0.05);
  });
});

describe('gesture filter', () => {
  const point = { pinchDistance: 0.2, pinchLikely: false, extendedCount: 1, fist: false, peace: false, three: false, point: true, open: false };

  it('waits for a few agreeing frames before it changes pose', () => {
    const filter = createGestureFilter();
    expect(filter.push(point)).toBe('none');
    expect(filter.push(point)).toBe('none');
    expect(filter.push(point)).toBe('point');
  });

  it('holds a pinch across a distance that would not start a new one', () => {
    const filter = createGestureFilter();
    const grab = { ...point, point: false, pinchDistance: 0.04, pinchLikely: true, extendedCount: 1 };
    const fuzzy = { ...grab, pinchDistance: 0.08 };
    expect(filter.push(grab)).toBe('none');
    expect(filter.push(grab)).toBe('pinch');
    expect(filter.push(fuzzy)).toBe('pinch');
    expect(filter.push(fuzzy)).toBe('pinch');
    expect(filter.push(point)).toBe('pinch');
    expect(filter.push(point)).toBe('pinch');
    expect(filter.push(point)).toBe('point');
  });
});

describe('gesture actions', () => {
  it('rotates a moving open palm and explodes a still one', () => {
    expect(gestureAction({ gesture: 'open', moving: true, stillMs: 20 })).toBe('rotate');
    expect(gestureAction({ gesture: 'open', moving: false, stillMs: 600 })).toBe('explode');
  });

  it('zooms a moving fist and assembles a still one', () => {
    expect(gestureAction({ gesture: 'fist', moving: true, stillMs: 0 })).toBe('zoom');
    expect(gestureAction({ gesture: 'fist', moving: false, stillMs: 600 })).toBe('assemble');
  });

  it('maps the rest of the build onto one hand', () => {
    expect(gestureAction({ gesture: 'point', moving: false, stillMs: 0 })).toBe('point');
    expect(gestureAction({ gesture: 'pinch', moving: true, stillMs: 0 })).toBe('pinch');
    expect(gestureAction({ gesture: 'peace', moving: false, stillMs: 0 })).toBe('next');
    expect(gestureAction({ gesture: 'three', moving: false, stillMs: 0 })).toBe('previous');
    expect(gestureAction({ gesture: 'ok', moving: false, stillMs: 800 })).toBe('reset');
    expect(gestureAction({ gesture: 'ok', moving: false, stillMs: 100 })).toBe('idle');
  });
});

describe('one euro filter', () => {
  it('holds a steady value and does not jump a whole step', () => {
    const filter = new OneEuroFilter(60, 1, 0, 1);
    expect(filter.filter(0, 0)).toBe(0);
    const next = filter.filter(10, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });
});

describe('camera mapping', () => {
  it('mirrors a cover-fitted webcam so the skeleton sits on the hand', () => {
    const left = mapVideoPoint(0, 0.5, 100, 100, 200, 100, true);
    const right = mapVideoPoint(1, 0.5, 100, 100, 200, 100, true);
    expect(left.x).toBeGreaterThan(right.x);
    expect(left.y).toBeCloseTo(50);
  });

  it('eases the cursor instead of jumping to the fingertip', () => {
    const smooth = createSmoother(0.5);
    expect(smooth(0, 0)).toEqual({ x: 0, y: 0 });
    expect(smooth(10, 0).x).toBeCloseTo(5);
  });
});
