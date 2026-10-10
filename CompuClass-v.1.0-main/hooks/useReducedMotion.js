import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

function reducedMotionNow() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(reducedMotionNow);

  useEffect(() => {
    let alive = true;
    const apply = (value) => {
      if (alive) setReduced(Boolean(value));
    };

    const current = AccessibilityInfo.isReduceMotionEnabled?.();
    if (current && typeof current.then === 'function') {
      current.then(apply).catch(() => {});
    }
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', apply);

    let media;
    const onMedia = (event) => apply(event.matches);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      media = window.matchMedia('(prefers-reduced-motion: reduce)');
      apply(media.matches);
      if (typeof media.addEventListener === 'function') media.addEventListener('change', onMedia);
    }

    return () => {
      alive = false;
      subscription?.remove?.();
      media?.removeEventListener?.('change', onMedia);
    };
  }, []);

  return reduced;
}
