import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './ui/kit';
import {
  EDGE_SWIPE_WIDTH,
  FULLSCREEN_ROUTES,
  TAB_BAR_CLEARANCE,
  claimEdgeSwipe,
  drawerGesturesEnabled,
  edgeOffset,
  isPhoneDrawerWidth,
  shouldOpenFromEdge,
} from '../utils/drawerGesture';
import { getSidebarHiddenX } from './Sidebar';

export function usePhoneDrawer(width, routeName) {
  const phone = isPhoneDrawerWidth(width);
  const edgeEnabled = drawerGesturesEnabled(width, routeName);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const translateX = useRef(null);
  if (translateX.current == null) translateX.current = new Animated.Value(getSidebarHiddenX(width));
  const hiddenRef = useRef(getSidebarHiddenX(width));
  hiddenRef.current = getSidebarHiddenX(width);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!phone || FULLSCREEN_ROUTES.has(routeName)) {
      draggingRef.current = false;
      setDragging(false);
      setOpen(false);
    }
  }, [phone, routeName]);

  useEffect(() => {
    if (openRef.current || draggingRef.current) return;
    translateX.current.setValue(getSidebarHiddenX(width));
  }, [width]);

  const onEdgeMove = useCallback((gesture) => {
    translateX.current.setValue(edgeOffset(gesture.dx, hiddenRef.current));
    if (!draggingRef.current) {
      draggingRef.current = true;
      setDragging(true);
    }
  }, []);

  const onEdgeEnd = useCallback((gesture, cancelled) => {
    draggingRef.current = false;
    setDragging(false);
    setOpen(!cancelled && shouldOpenFromEdge({ dx: gesture.dx, vx: gesture.vx }));
  }, []);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
    setOpen(false);
  }, []);

  return {
    phone,
    edgeEnabled,
    open,
    dragging,
    translateX: translateX.current,
    toggle,
    close,
    onEdgeMove,
    onEdgeEnd,
  };
}

export function PhoneMenuButton({ open, onPress }) {
  return (
    <IconButton
      name="menu"
      label={open ? 'Close menu' : 'Open menu'}
      onPress={onPress}
      accessibilityState={{ expanded: !!open }}
      testID="open-menu"
    />
  );
}

export function EdgeSwipeCatcher({ enabled, onMove, onEnd }) {
  const insets = useSafeAreaInsets();
  const zoneRef = useRef(null);
  const onMoveRef = useRef(onMove);
  const onEndRef = useRef(onEnd);
  onMoveRef.current = onMove;
  onEndRef.current = onEnd;
  const horizontal = useRef(false);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return undefined;
    const node = zoneRef.current;
    const el = node?.getNode?.() || node;
    if (!el?.addEventListener) return undefined;
    const stopBrowserPan = (event) => {
      if (event.cancelable) event.preventDefault();
    };
    el.addEventListener('touchmove', stopBrowserPan, { passive: false });
    return () => el.removeEventListener('touchmove', stopBrowserPan);
  }, [enabled]);

  const pan = useRef(PanResponder.create({
    // Claim on contact so a fast swipe still tracks after it leaves the 24px strip.
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (event) => {
      event.preventDefault?.();
      horizontal.current = false;
    },
    onPanResponderMove: (event, gesture) => {
      event.preventDefault?.();
      if (!horizontal.current) {
        if (!claimEdgeSwipe({ dx: gesture.dx, dy: gesture.dy })) {
          if (Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) >= Math.abs(gesture.dx)) horizontal.current = 'vertical';
          return;
        }
        horizontal.current = true;
      }
      if (horizontal.current === 'vertical') return;
      onMoveRef.current?.(gesture);
    },
    onPanResponderRelease: (_, gesture) => {
      const wasHorizontal = horizontal.current === true;
      horizontal.current = false;
      if (wasHorizontal) onEndRef.current?.(gesture, false);
    },
    onPanResponderTerminate: (_, gesture) => {
      const wasHorizontal = horizontal.current === true;
      horizontal.current = false;
      if (wasHorizontal) onEndRef.current?.(gesture, true);
    },
  })).current;

  if (!enabled) return null;

  return (
    <View
      ref={zoneRef}
      testID="edge-swipe-zone"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      collapsable={false}
      pointerEvents="box-only"
      style={[
        styles.edge,
        { width: EDGE_SWIPE_WIDTH, bottom: TAB_BAR_CLEARANCE + insets.bottom },
        Platform.OS === 'web' ? { touchAction: 'none' } : null,
      ]}
      {...pan.panHandlers}
    />
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, top: 0, zIndex: 15 },
});
