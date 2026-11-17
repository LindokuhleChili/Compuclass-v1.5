import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useShellBack } from '../../context/ChromeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { PROGRESS_KEYS, progressService } from '../../services/progressService';
import { leaveScreen } from '../../utils/screenNav';
import { Body, Button, Glass, Heading, IconButton, font, useLayout } from '../ui/kit';
import { GESTURE_LABELS } from './gestures';
import { GESTURE_LEGEND, PART_BY_ID, ASSEMBLY_ORDER } from './catalog';
import { nextPartId, sanitizeInstalled } from './rules';
import { beginFrontCamera, consumeFrontCamera, frontCameraSupported, stopStream } from './camera';
import AssemblyViewport from './AssemblyViewport';
import GestureStage from './GestureStage';

export default function AssemblyExperience({ navigation, onExit }) {
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { bottom, phone } = useLayout();
  const viewportRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);
  const [installed, setInstalled] = useState([]);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [gesture, setGesture] = useState('none');
  const [info, setInfo] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [exploded, setExploded] = useState(false);
  const [done, setDone] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [hint, setHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [legendOpen, setLegendOpen] = useState(!phone);
  const gestures = frontCameraSupported();

  useEffect(() => {
    let live = true;
    const saved = Promise.race([
      progressService.get(PROGRESS_KEYS.pcAssembly3d),
      new Promise((resolve) => setTimeout(() => resolve(null), 700)),
    ]);
    saved.then((value) => {
      if (!live) return;
      const ids = sanitizeInstalled(value?.installed);
      setInstalled(ids);
      setDone(ids.length === ASSEMBLY_ORDER.length);
      setHydrated(true);
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!gestures) return undefined;
    let live = true;
    consumeFrontCamera().then((next) => {
      if (!live) {
        stopStream(next);
        return;
      }
      if (next) setStream(next);
      else setCameraError('Allow the front camera to build with your hands. Mouse and touch still work.');
    });
    return () => { live = false; };
  }, [gestures]);

  useEffect(() => () => stopStream(stream), [stream]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3200);
    return () => clearTimeout(timer);
  }, [feedback]);

  const enableCamera = () => {
    setCameraError('');
    beginFrontCamera().then((next) => {
      if (next) setStream(next);
      else setCameraError('The front camera did not start. You can still drag each part with the mouse or your finger.');
    });
  };

  const onChange = (ids) => {
    setInstalled(ids);
    setDone(ids.length === ASSEMBLY_ORDER.length);
    progressService.set(PROGRESS_KEYS.pcAssembly3d, { installed: ids });
    if (ids.length === 0) setMistakes(0);
  };

  const onFeedback = (next) => {
    if (!next) {
      setFeedback(null);
      return;
    }
    setFeedback(next);
    if (next.kind === 'error') {
      setMistakes((count) => count + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const infoPart = PART_BY_ID[info?.id] || PART_BY_ID[nextPartId(installed)];
  const step = installed.length;

  if (!hydrated) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
        <Body style={{ textAlign: 'center', marginTop: 48 }}>Setting up the bench…</Body>
      </View>
    );
  }

  if (webglFailed) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.background, padding: 24, justifyContent: 'center' }]}>
        <Glass strong radius={24} style={{ padding: 20, gap: 12 }}>
          <Heading level={2}>3D view is not available</Heading>
          <Body>This device could not start WebGL. The step-by-step assembly still works.</Body>
          <Button label="Back to steps" onPress={onExit} />
        </Glass>
      </View>
    );
  }

  return (
    <View testID="ar-stage" style={[styles.fill, { backgroundColor: '#071018' }]}>
      <GestureStage
        stream={stream}
        viewportRef={viewportRef}
        onGesture={setGesture}
        onError={setCameraError}
      />
      <AssemblyViewport
        ref={viewportRef}
        installed={installed}
        reducedMotion={reduced}
        videoBackdrop={!!stream}
        onChange={onChange}
        onFeedback={onFeedback}
        onInfo={setInfo}
        onView={(view) => { setExploded(!!view.exploded); setDone(!!view.done); }}
        onUnavailable={() => setWebglFailed(true)}
      />

      <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: shellBack ? 8 : insets.top + 8, paddingBottom: Math.max(12, bottom - 24) }]}>
        <View style={styles.topRow}>
          {!shellBack && (
            <IconButton name="chevLeft" label="Go back" onPress={() => leaveScreen(navigation)} />
          )}
          <Glass strong radius={20} style={styles.titleCard}>
            <Text style={[{ fontSize: 13, color: theme.accentInk }, font(theme, 'semibold')]}>AR / Gesture mode</Text>
            <Text style={[{ fontSize: 18, color: theme.text }, font(theme, 'h2')]}>{step} of {ASSEMBLY_ORDER.length} parts</Text>
          </Glass>
          <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Steps" style={[styles.stepsBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[{ color: theme.text, fontSize: 14 }, font(theme, 'semibold')]}>Steps</Text>
          </Pressable>
        </View>

        <View style={styles.statusRow}>
          <View testID="gesture-status" style={[styles.pill, { backgroundColor: theme.surface }]}>
            <Text style={[{ fontSize: 12, color: theme.textTertiary }, font(theme, 'semibold')]}>Gesture</Text>
            <Text style={[{ fontSize: 16, color: theme.text }, font(theme, 'h3')]}>{GESTURE_LABELS[gesture] || 'None'}</Text>
          </View>
          {exploded && (
            <View style={[styles.pill, { backgroundColor: theme.secondary }]}>
              <Text style={[{ color: theme.accentInk, fontSize: 14 }, font(theme, 'semibold')]}>Exploded</Text>
            </View>
          )}
          <Pressable
            onPress={() => viewportRef.current?.reset()}
            accessibilityRole="button"
            accessibilityLabel="Reset build"
            style={[styles.stepsBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Text style={[{ color: theme.text, fontSize: 14 }, font(theme, 'semibold')]}>Reset</Text>
          </Pressable>
        </View>

        {feedback && (
          <Glass strong radius={16} style={[styles.toast, { borderColor: feedback.kind === 'ok' ? theme.success : theme.error }]}>
            <Ionicons name={feedback.kind === 'ok' ? 'checkmark-circle' : 'alert-circle'} size={18} color={feedback.kind === 'ok' ? theme.success : theme.error} />
            <Text style={[{ flex: 1, color: theme.text, fontSize: 14 }, font(theme, 'semibold')]}>{feedback.text}</Text>
          </Glass>
        )}

        {!gestures ? (
          <Text style={[{ color: theme.text, fontSize: 13, marginTop: 6 }, font(theme, 'semibold')]}>Drag with your finger. Hand tracking runs in the browser.</Text>
        ) : null}
        {gestures && !stream ? (
          <Pressable onPress={enableCamera} accessibilityRole="button" accessibilityLabel="Enable front camera">
            <Text style={[{ color: theme.text, fontSize: 13, marginTop: 6 }, font(theme, 'semibold')]}>
              {cameraError || 'Front camera is off. Tap to enable. Drag still works.'}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }} pointerEvents="none" />

        {infoPart && (
          <View testID="part-info" style={{ marginBottom: 8 }}>
            <Glass strong radius={16} style={styles.info}>
              <Text style={[{ flex: 1, fontSize: 15, color: theme.text }, font(theme, 'h3')]} numberOfLines={1}>
                {(info?.reason === 'hold' ? 'Holding' : info?.reason === 'point' ? 'Selected' : `Step ${Math.min(step + 1, ASSEMBLY_ORDER.length)}`) + ' · ' + infoPart.name}
              </Text>
              {!hint && info?.reason !== 'point' && info?.reason !== 'hold' ? (
                <Pressable onPress={() => setHint(true)} accessibilityRole="button" accessibilityLabel="Show part info" style={styles.hintBtn}>
                  <Text style={[{ color: theme.primary, fontSize: 14 }, font(theme, 'semibold')]}>Info</Text>
                </Pressable>
              ) : (
                <Text style={[{ flex: 1.4, fontSize: 13, color: theme.textSecondary }, font(theme, 'body')]} numberOfLines={2}>{infoPart.tip}</Text>
              )}
            </Glass>
          </View>
        )}

        <View testID="gesture-legend">
          {phone ? (
            <Pressable onPress={() => setLegendOpen((open) => !open)} accessibilityRole="button" accessibilityLabel="Gestures" style={[styles.stepsBtn, { alignSelf: 'flex-start', marginBottom: 6, backgroundColor: theme.surface }]}>
              <Text style={[{ color: theme.text, fontSize: 14 }, font(theme, 'semibold')]}>{legendOpen ? 'Hide gestures' : 'Gestures'}</Text>
            </Pressable>
          ) : null}
          {!phone || legendOpen ? (
            <View style={styles.legend}>
              {GESTURE_LEGEND.map((item) => (
                <Text key={item.gesture} style={[styles.chip, font(theme, 'semibold'), { color: theme.text, backgroundColor: 'rgba(255,255,255,0.94)', borderColor: theme.border }]}>
                  {item.gesture + ': ' + item.action}
                </Text>
              ))}
              <Text style={[styles.chip, font(theme, 'semibold'), { color: theme.text, backgroundColor: 'rgba(255,255,255,0.94)', borderColor: theme.border }]}>
                Mouse or touch: drag a part, or empty space to rotate
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {done && (
        <View style={styles.completeWrap} pointerEvents="box-none">
          <View testID="assembly-complete">
            <Glass strong radius={24} style={styles.complete}>
            <Ionicons name="trophy" size={28} color={theme.success} />
            <Heading level={2}>Build complete</Heading>
            <Body>
              {mistakes === 0 ? 'Perfect build — no mistakes.' : `Finished with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`}
            </Body>
            <Button label="New build" onPress={() => viewportRef.current?.reset()} />
            </Glass>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 4, paddingHorizontal: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleCard: { flex: 1, paddingHorizontal: 14, paddingVertical: 8 },
  stepsBtn: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  pill: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, minHeight: 44, justifyContent: 'center' },
  toast: { marginTop: 8, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1 },
  note: { padding: 14, gap: 10, marginBottom: 8 },
  info: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 12, alignItems: 'center' },
  hintBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 12, lineHeight: 16, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  completeWrap: { ...StyleSheet.absoluteFillObject, zIndex: 5, alignItems: 'center', justifyContent: 'center', padding: 24 },
  complete: { padding: 20, gap: 8, maxWidth: 420, width: '100%' },
});
