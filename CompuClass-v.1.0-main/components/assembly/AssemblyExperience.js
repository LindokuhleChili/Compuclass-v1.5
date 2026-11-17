import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

        <View style={{ flex: 1 }} pointerEvents="none" />

        {!gestures && (
          <Glass strong radius={16} style={styles.note}>
            <Body variant="small">Hand gestures run in the browser, using the front camera. On this phone app, drag each part with your finger. The same build is on the CompuClass website.</Body>
          </Glass>
        )}
        {gestures && !stream && (
          <Glass strong radius={16} style={styles.note}>
            <Body variant="small">{cameraError || 'Turn on the front camera. The parts float over what the camera sees.'}</Body>
            <Button label="Enable front camera" onPress={enableCamera} fit />
          </Glass>
        )}

        {infoPart && (
          <View testID="part-info">
            <Glass strong radius={18} style={styles.info}>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 12, color: theme.textTertiary }, font(theme, 'semibold')]}>
                {info?.reason === 'hold' ? 'Holding' : info?.reason === 'point' ? 'Selected' : `Step ${Math.min(step + 1, ASSEMBLY_ORDER.length)}`}
              </Text>
              <Text style={[{ fontSize: 16, color: theme.text }, font(theme, 'h3')]}>{infoPart.name}</Text>
              <Body variant="small">{hint || info?.reason === 'point' || info?.reason === 'hold' ? infoPart.tip : 'Point at a part, or use peace and three fingers to move through the steps.'}</Body>
            </View>
            {!hint && info?.reason !== 'point' && info?.reason !== 'hold' && (
              <Pressable onPress={() => setHint(true)} accessibilityRole="button" accessibilityLabel="Show part info" style={styles.hintBtn}>
                <Text style={[{ color: theme.primary, fontSize: 14 }, font(theme, 'semibold')]}>Info</Text>
              </Pressable>
            )}
            </Glass>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: phone ? 78 : 92 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <View testID="gesture-legend" style={styles.legend}>
            {GESTURE_LEGEND.map((item) => (
              <View key={item.gesture} style={[styles.legendItem, { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: theme.border }]}>
                <Text style={[{ fontSize: 12, color: theme.text }, font(theme, 'semibold')]}>{item.gesture}</Text>
                <Text style={[{ fontSize: 12, color: theme.textSecondary }, font(theme, 'body')]}>{item.action}</Text>
              </View>
            ))}
            <View style={[styles.legendItem, { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: theme.border }]}>
              <Text style={[{ fontSize: 12, color: theme.text }, font(theme, 'semibold')]}>Mouse or touch</Text>
              <Text style={[{ fontSize: 12, color: theme.textSecondary }, font(theme, 'body')]}>Drag a part, or drag empty space to rotate</Text>
            </View>
          </View>
        </ScrollView>
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
  info: { padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  hintBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  legend: { flexDirection: 'row', gap: 8 },
  legendItem: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, maxWidth: 220 },
  completeWrap: { ...StyleSheet.absoluteFillObject, zIndex: 5, alignItems: 'center', justifyContent: 'center', padding: 24 },
  complete: { padding: 20, gap: 8, maxWidth: 420, width: '100%' },
});
