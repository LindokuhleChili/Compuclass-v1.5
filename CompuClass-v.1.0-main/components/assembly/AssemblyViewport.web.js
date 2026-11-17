import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { createAssembly } from './engine';
import { loadAssemblyModels } from './loadModels';

function domNode(ref) {
  const value = ref.current;
  if (!value) return null;
  if (value.nodeType === 1) return value;
  return null;
}

const AssemblyViewport = forwardRef(function AssemblyViewport({
  style,
  installed,
  reducedMotion,
  videoBackdrop,
  onReady,
  onUnavailable,
  onChange,
  onFeedback,
  onInfo,
  onView,
}, ref) {
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const initialInstalled = useRef(installed);
  const initialReduced = useRef(reducedMotion);
  const initialBackdrop = useRef(videoBackdrop);
  const callbacks = useRef({ onChange, onFeedback, onInfo, onView, onReady, onUnavailable });
  callbacks.current = { onChange, onFeedback, onInfo, onView, onReady, onUnavailable };

  useImperativeHandle(ref, () => ({
    orbitBy: (dx, dy) => engineRef.current?.orbitBy(dx, dy),
    zoomBy: (dy) => engineRef.current?.zoomBy(dy),
    aim: (x, y) => engineRef.current?.aim(x, y) ?? null,
    cursorTarget: () => engineRef.current?.cursorTarget() ?? null,
    pinch: (x, y, phase) => engineRef.current?.pinch(x, y, phase),
    focusDelta: (dir) => engineRef.current?.focusDelta(dir),
    explode: () => engineRef.current?.explode(),
    assemble: () => engineRef.current?.assemble(),
    reset: () => engineRef.current?.reset(),
  }), []);

  useEffect(() => {
    engineRef.current?.setReduced(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    engineRef.current?.setVideoBackdrop(!!videoBackdrop);
  }, [videoBackdrop]);

  useEffect(() => {
    const host = domNode(hostRef) || (typeof document !== 'undefined' ? document.querySelector('[data-testid="ar-viewport"]') : null);
    if (!host) {
      callbacks.current.onUnavailable?.();
      return undefined;
    }
    let canvas;
    try {
      canvas = document.createElement('canvas');
    } catch {
      callbacks.current.onUnavailable?.();
      return undefined;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    host.appendChild(canvas);
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
      || canvas.getContext('experimental-webgl');
    if (!gl) {
      callbacks.current.onUnavailable?.();
      return undefined;
    }
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true, premultipliedAlpha: false });
    const size = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      engineRef.current?.setSize(width, height);
      return { width, height };
    };
    const first = size();
    const engine = createAssembly({
      renderer,
      width: first.width,
      height: first.height,
      installed: initialInstalled.current,
      reducedMotion: initialReduced.current,
      callbacks: {
        onChange: (ids) => callbacks.current.onChange?.(ids),
        onFeedback: (feedback) => callbacks.current.onFeedback?.(feedback),
        onInfo: (info) => callbacks.current.onInfo?.(info),
        onView: (view) => callbacks.current.onView?.(view),
      },
    });
    engine.setVideoBackdrop(!!initialBackdrop.current);
    engineRef.current = engine;
    let alive = true;
    loadAssemblyModels().then((models) => {
      if (!alive) return;
      Object.entries(models).forEach(([id, object]) => engine.useModel(id, object));
      callbacks.current.onReady?.(Object.keys(models));
    }).catch(() => callbacks.current.onReady?.([]));

    const pointers = new Map();
    const local = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const sync = (type, event) => {
      const point = local(event);
      if (type === 'down') pointers.set(event.pointerId, point);
      if (type === 'move') pointers.set(event.pointerId, point);
      if (type === 'up') pointers.delete(event.pointerId);
      const list = [...pointers.values()];
      if (type === 'down') engine.pointerDown(list);
      else if (type === 'move') engine.pointerMove(list.length ? list : [point]);
      else engine.pointerUp(list.length ? list : [point]);
    };
    const down = (event) => {
      canvas.setPointerCapture?.(event.pointerId);
      sync('down', event);
      event.preventDefault();
    };
    const move = (event) => sync('move', event);
    const up = (event) => sync('up', event);
    const wheel = (event) => {
      engine.wheel(event.deltaY);
      event.preventDefault();
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    const lost = (event) => {
      event.preventDefault();
      callbacks.current.onUnavailable?.();
    };
    canvas.addEventListener('webglcontextlost', lost);
    const observer = new ResizeObserver(() => size());
    observer.observe(host);
    let frame = 0;
    let last = performance.now();
    const loop = (now) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      engine.tick(dt);
      renderer.render(engine.scene, engine.camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('webglcontextlost', lost);
      engine.dispose();
      renderer.dispose();
      engineRef.current = null;
      canvas.remove();
    };
  }, []);

  return <View ref={hostRef} testID="ar-viewport" style={[{ flex: 1, zIndex: 1 }, style]} />;
});

export default AssemblyViewport;
