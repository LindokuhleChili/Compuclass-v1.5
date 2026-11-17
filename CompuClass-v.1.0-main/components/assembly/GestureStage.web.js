import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  createGestureFilter,
  gestureAction,
  mapVideoPoint,
  measureHand,
} from './gestures';
import { createPointEuroFilter } from './oneEuroFilter';

// Same wasm and model URLs as the MediaPipe Hand Landmarker web guide.
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const EMPTY_HAND = {
  pinchDistance: 1,
  pinchLikely: false,
  extendedCount: 0,
  fist: false,
  peace: false,
  three: false,
  point: false,
  open: false,
};

function domNode(ref, testId) {
  const value = ref.current;
  if (value?.nodeType === 1) return value;
  if (typeof document !== 'undefined' && testId) {
    return document.querySelector(`[data-testid="${testId}"]`);
  }
  return null;
}

async function createLandmarker(vision) {
  const files = await vision.FilesetResolver.forVisionTasks(WASM);
  const shared = {
    numHands: 1,
    runningMode: 'VIDEO',
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
  try {
    return await vision.HandLandmarker.createFromOptions(files, {
      ...shared,
      baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
    });
  } catch {
    return vision.HandLandmarker.createFromOptions(files, {
      ...shared,
      baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
    });
  }
}

export default function GestureStage({ stream, viewportRef, onGesture, onError }) {
  const videoHost = useRef(null);
  const boneHost = useRef(null);
  const cursorHost = useRef(null);
  const handlers = useRef({ onGesture, onError });
  handlers.current = { onGesture, onError };

  useEffect(() => {
    if (!stream) return undefined;
    const videoNode = domNode(videoHost, 'ar-video');
    const boneNode = domNode(boneHost, 'ar-bones');
    const cursorNode = domNode(cursorHost, 'ar-cursor');
    if (!videoNode || !boneNode || !cursorNode) {
      handlers.current.onError?.('The camera view could not be attached.');
      return undefined;
    }

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    Object.assign(video.style, {
      width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block',
    });
    video.srcObject = stream;
    videoNode.appendChild(video);
    video.play?.().catch(() => {});

    const bones = document.createElement('canvas');
    Object.assign(bones.style, {
      width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block',
    });
    boneNode.appendChild(bones);
    const cursor = document.createElement('canvas');
    Object.assign(cursor.style, { width: '100%', height: '100%', display: 'block' });
    cursorNode.appendChild(cursor);

    let alive = true;
    let landmarker = null;
    let drawing = null;
    let connections = null;
    let frame = 0;
    let latest = null;
    let missing = 0;
    let lastVideoTime = -1;
    let lastStamp = performance.now();
    let stillMs = 0;
    let lastGesture = 'none';
    let pinching = false;
    let prevWrist = null;
    const filter = createGestureFilter();
    const cursorEuro = createPointEuroFilter();
    const wristEuro = createPointEuroFilter();
    const fired = { explode: false, assemble: false, reset: false };
    const edgeAt = { next: 0, prev: 0 };

    const drawCursor = (gesture, point, target) => {
      const rect = cursorNode.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      if (cursor.width !== Math.round(width * dpr)) {
        cursor.width = Math.round(width * dpr);
        cursor.height = Math.round(height * dpr);
      }
      const ctx = cursor.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!point || (gesture !== 'point' && gesture !== 'pinch')) return;
      if (target) {
        ctx.save();
        ctx.setLineDash([7, 7]);
        ctx.strokeStyle = '#F5C518';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.arc(target.x, target.y, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.fillStyle = '#F5C518';
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0B1B3A';
      ctx.stroke();
    };

    const loop = () => {
      if (!alive) return;
      frame = requestAnimationFrame(loop);
      if (!landmarker || video.readyState < 2) return;
      const now = performance.now();
      const dt = Math.min(0.08, (now - lastStamp) / 1000);
      lastStamp = now;

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const result = landmarker.detectForVideo(video, now);
          const found = result?.landmarks?.[0] || null;
          if (found && video.videoWidth) {
            missing = 0;
            latest = found;
            if (bones.width !== video.videoWidth || bones.height !== video.videoHeight) {
              bones.width = video.videoWidth;
              bones.height = video.videoHeight;
              drawing = new landmarker.DrawingUtilsCtor(bones.getContext('2d'));
            }
            const ctx = bones.getContext('2d');
            ctx.clearRect(0, 0, bones.width, bones.height);
            drawing?.drawConnectors(found, connections, { color: '#F5C518', lineWidth: 4 });
            drawing?.drawLandmarks(found, { color: '#FFE56A', fillColor: '#F5C518', radius: 5, lineWidth: 2 });
          } else {
            missing += 1;
            if (missing > 6) latest = null;
            bones.getContext('2d').clearRect(0, 0, bones.width, bones.height);
          }
        } catch (error) {
          handlers.current.onError?.(error?.message || 'Hand tracking stopped.');
        }
      }

      const sample = latest ? measureHand(latest) : EMPTY_HAND;
      const gesture = filter.push(sample);
      if (gesture !== lastGesture) handlers.current.onGesture?.(gesture);

      const rect = cursorNode.getBoundingClientRect();
      const seconds = now / 1000;
      let cursorPoint = null;
      let dx = 0;
      let dy = 0;
      if (latest && sample.indexTip && sample.wrist) {
        const index = mapVideoPoint(sample.indexTip.x, sample.indexTip.y, video.videoWidth, video.videoHeight, rect.width, rect.height, true);
        const thumb = sample.thumbTip
          ? mapVideoPoint(sample.thumbTip.x, sample.thumbTip.y, video.videoWidth, video.videoHeight, rect.width, rect.height, true)
          : index;
        const aim = gesture === 'pinch'
          ? { x: (index.x + thumb.x) / 2, y: (index.y + thumb.y) / 2 }
          : index;
        cursorPoint = cursorEuro(aim.x, aim.y, seconds);
        const wristRaw = mapVideoPoint(sample.wrist.x, sample.wrist.y, video.videoWidth, video.videoHeight, rect.width, rect.height, true);
        const wrist = wristEuro(wristRaw.x, wristRaw.y, seconds);
        if (prevWrist) {
          dx = wrist.x - prevWrist.x;
          dy = wrist.y - prevWrist.y;
        }
        prevWrist = wrist;
      } else {
        prevWrist = null;
      }

      const moving = gesture === 'fist'
        ? dt > 0 && Math.abs(dy) / dt > 160
        : dt > 0 && Math.hypot(dx, dy) / dt > 140;
      if (gesture !== lastGesture || moving) {
        stillMs = 0;
        if (gesture !== 'open') fired.explode = false;
        if (gesture !== 'fist') fired.assemble = false;
        if (gesture !== 'ok') fired.reset = false;
      } else {
        stillMs += dt * 1000;
      }
      lastGesture = gesture;

      const action = gestureAction({ gesture, moving, stillMs });
      const viewport = viewportRef.current;
      if (viewport) {
        if (action === 'rotate') viewport.orbitBy(dx, dy);
        if (action === 'zoom') viewport.zoomBy(dy);
        if (action === 'explode' && !fired.explode) { fired.explode = true; viewport.explode(); }
        if (action === 'assemble' && !fired.assemble) { fired.assemble = true; viewport.assemble(); }
        if (action === 'reset' && !fired.reset) { fired.reset = true; viewport.reset(); }
        if (action === 'next' && now - edgeAt.next > 800) { edgeAt.next = now; viewport.focusDelta(1); }
        if (action === 'previous' && now - edgeAt.prev > 800) { edgeAt.prev = now; viewport.focusDelta(-1); }
        if (action === 'point' && cursorPoint) viewport.aim(cursorPoint.x, cursorPoint.y);
        else if (gesture !== 'pinch') viewport.aim(null);
        if (action === 'pinch' && cursorPoint) {
          viewport.pinch(cursorPoint.x, cursorPoint.y, pinching ? 'move' : 'start');
          pinching = true;
        } else if (pinching) {
          viewport.pinch(cursorPoint?.x || 0, cursorPoint?.y || 0, 'end');
          pinching = false;
        }
      }
      drawCursor(gesture, cursorPoint, viewport?.cursorTarget?.() || null);
    };

    import('@mediapipe/tasks-vision').then(async (vision) => {
      const created = await createLandmarker(vision);
      if (!alive) {
        created.close?.();
        return;
      }
      landmarker = created;
      landmarker.DrawingUtilsCtor = vision.DrawingUtils;
      connections = vision.HandLandmarker.HAND_CONNECTIONS;
      if (video.videoWidth) {
        bones.width = video.videoWidth;
        bones.height = video.videoHeight;
      }
      drawing = new vision.DrawingUtils(bones.getContext('2d'));
      frame = requestAnimationFrame(loop);
    }).catch(() => {
      handlers.current.onError?.('Hand tracking could not start. Drag with the mouse or your finger instead.');
    });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      landmarker?.close?.();
      video.srcObject = null;
      video.remove();
      bones.remove();
      cursor.remove();
    };
  }, [stream, viewportRef]);

  return (
    <>
      <View ref={videoHost} testID="ar-video" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.video]} />
      <View ref={boneHost} testID="ar-bones" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bones]} />
      <View ref={cursorHost} testID="ar-cursor" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cursor]} />
    </>
  );
}

const styles = StyleSheet.create({
  video: { zIndex: 0 },
  bones: { zIndex: 2 },
  cursor: { zIndex: 3 },
});
