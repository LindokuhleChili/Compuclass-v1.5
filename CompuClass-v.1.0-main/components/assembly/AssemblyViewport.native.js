import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { createAssembly } from './engine';
import { loadAssemblyModels } from './loadModels';

function pointsFrom(event) {
  const touches = event.nativeEvent.touches || [];
  if (touches.length) {
    return touches.map((touch, index) => ({
      id: touch.identifier ?? index,
      x: touch.locationX,
      y: touch.locationY,
    }));
  }
  const { locationX, locationY } = event.nativeEvent;
  return [{ id: 0, x: locationX, y: locationY }];
}

function createNativeRenderer(gl) {
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
    style: {},
    addEventListener() {},
    removeEventListener() {},
    getContext: () => gl,
  };
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  const render = renderer.render.bind(renderer);
  renderer.render = (scene, camera) => {
    render(scene, camera);
    gl.endFrameEXP();
  };
  return renderer;
}

const AssemblyViewport = forwardRef(function AssemblyViewport({
  style,
  installed,
  reducedMotion,
  onReady,
  onUnavailable,
  onChange,
  onFeedback,
  onInfo,
  onView,
}, ref) {
  const engineRef = useRef(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const callbacks = useRef({ onChange, onFeedback, onInfo, onView });
  callbacks.current = { onChange, onFeedback, onInfo, onView };

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

  useEffect(() => { engineRef.current?.setReduced(reducedMotion); }, [reducedMotion]);

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => engineRef.current?.pointerDown(pointsFrom(event)),
    onPanResponderMove: (event) => engineRef.current?.pointerMove(pointsFrom(event)),
    onPanResponderRelease: (event) => engineRef.current?.pointerUp(pointsFrom(event)),
    onPanResponderTerminate: () => engineRef.current?.pointerUp([]),
  })).current;

  const onContextCreate = (gl) => {
    let renderer;
    try {
      renderer = createNativeRenderer(gl);
    } catch {
      onUnavailable?.();
      return;
    }
    const { width, height } = sizeRef.current;
    const engine = createAssembly({
      renderer,
      width,
      height,
      installed,
      reducedMotion,
      callbacks: {
        onChange: (ids) => callbacks.current.onChange?.(ids),
        onFeedback: (feedback) => callbacks.current.onFeedback?.(feedback),
        onInfo: (info) => callbacks.current.onInfo?.(info),
        onView: (view) => callbacks.current.onView?.(view),
      },
    });
    engineRef.current = engine;
    let alive = true;
    loadAssemblyModels().then((models) => {
      if (!alive) return;
      Object.entries(models).forEach(([id, object]) => engine.useModel(id, object));
      onReady?.(Object.keys(models));
    }).catch(() => onReady?.([]));
    let frame = 0;
    let last = Date.now();
    const loop = () => {
      if (!alive) return;
      const now = Date.now();
      engine.tick(Math.min(0.05, (now - last) / 1000));
      last = now;
      renderer.render(engine.scene, engine.camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    engineRef.current = Object.assign(engine, {
      stop: () => { alive = false; cancelAnimationFrame(frame); renderer.dispose?.(); },
    });
  };

  useEffect(() => () => {
    engineRef.current?.stop?.();
    engineRef.current?.dispose?.();
    engineRef.current = null;
  }, []);

  return (
    <View
      style={[{ flex: 1 }, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        sizeRef.current = { width, height };
        engineRef.current?.setSize(width, height);
      }}
      {...responder.panHandlers}
    >
      <GLView style={{ flex: 1 }} pointerEvents="none" onContextCreate={onContextCreate} />
    </View>
  );
});

export default AssemblyViewport;
