import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, Animated, PanResponder, Pressable,
  Vibration, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PROGRESS_KEYS, progressService } from '../services/progressService';
import { useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';
import { Glass, IconButton, Heading, Body, font, useLayout } from '../components/ui/kit';

const CASE_IMG = require('../assets/pc-assembly/case-open.png');
const CASE_RATIO = 712 / 548; // width / height of case-open.png

// Local to this screen on purpose. PC Lab's component cards open the AR viewers
// and stay a separate feature.
//
// `slot` is where the part sits inside the open case, as fractions of the
// case picture (0..1). The CPU and RAM slots line up with the socket and
// DIMM slots on the motherboard picture once it's installed.
const PARTS = [
  { id: 'motherboard', name: 'Motherboard', img: require('../assets/pc-assembly/motherboard.png'),
    slot: { left: 0.14, top: 0.13, width: 0.46, height: 0.51 },
    tip: 'Screw the motherboard onto the standoffs on the back plate of the case.' },
  { id: 'cpu', name: 'CPU', img: require('../assets/pc-assembly/cpu.png'),
    slot: { left: 0.3285, top: 0.25, width: 0.085, height: 0.11 },
    tip: 'Line up the golden triangle and drop the CPU into the socket — no force needed.' },
  { id: 'ram', name: 'RAM', img: require('../assets/pc-assembly/ram.png'), rotate: true,
    slot: { left: 0.466, top: 0.158, width: 0.068, height: 0.30 },
    tip: 'Push the RAM sticks into the DIMM slots beside the CPU until the clips click.' },
  { id: 'gpu', name: 'Graphics Card', img: require('../assets/pc-assembly/gpu.png'),
    slot: { left: 0.05, top: 0.44, width: 0.42, height: 0.24 },
    tip: 'Seat the graphics card in the long PCIe x16 slot and screw it to the rear bracket.' },
  { id: 'storage', name: 'SSD', img: require('../assets/pc-assembly/ssd.png'),
    slot: { left: 0.675, top: 0.30, width: 0.12, height: 0.14 },
    tip: 'Mount the SSD in the drive bay behind the motherboard tray.' },
  { id: 'psu', name: 'Power Supply', img: require('../assets/pc-assembly/psu.png'),
    slot: { left: 0.07, top: 0.72, width: 0.30, height: 0.19 },
    tip: 'Slide the power supply into the bottom shroud, fan facing down.' },
];

const ORDER = PARTS.map(p => p.id);
const PART_BY_ID = Object.fromEntries(PARTS.map(p => [p.id, p]));
const HIT_PAD = 14; // px of forgiveness around small slots like the CPU
// On touch screens the dragged part floats a little above the finger so it
// isn't hidden under it; the drop is judged where the part is, not the finger.
const LIFT = Platform.OS === 'web' ? 0 : 28;

function slotRect(part, caseW, caseH) {
  const s = part.slot;
  return { x: s.left * caseW, y: s.top * caseH, width: s.width * caseW, height: s.height * caseH };
}

function dragSize(part, caseW, caseH) {
  const r = caseW ? slotRect(part, caseW, caseH) : { width: 100, height: 80 };
  const k = Math.max(1, Math.min(56 / Math.min(r.width, r.height), 160 / Math.max(r.width, r.height)));
  return { w: r.width * k, h: r.height * k, k };
}

function PartPicture({ part, width, height, style }) {
  if (part.rotate) {
    return (
      <Image
        source={part.img}
        resizeMode="stretch"
        style={[{
          position: 'absolute', width: height, height: width,
          left: (width - height) / 2, top: (height - width) / 2,
          transform: [{ rotate: '90deg' }],
        }, style]}
      />
    );
  }
  return <Image source={part.img} resizeMode="contain" style={[{ width, height }, style]} />;
}

function CaseSlot({ part, state, caseW, caseH }) {
  const { theme } = useTheme();
  const seat = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === 'filled') {
      seat.setValue(1.06);
      Animated.spring(seat, { toValue: 1, useNativeDriver: true, friction: 5, tension: 160 }).start();
    }
  }, [state, seat]);

  useEffect(() => {
    if (state !== 'active') return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  if (state === 'locked' || !caseW) return null;
  const r = slotRect(part, caseW, caseH);
  const box = { position: 'absolute', left: r.x, top: r.y, width: r.width, height: r.height };

  if (state === 'filled') {
    return (
      <Animated.View pointerEvents="none" style={[box, { transform: [{ scale: seat }] }]}>
        <PartPicture part={part} width={r.width} height={r.height} />
      </Animated.View>
    );
  }

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[box, styles.slotOutline, { borderColor: theme.accent, opacity: glow }]}
    />
  );
}

function PartCard({ part, lifted, handlers }) {
  const { theme } = useTheme();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, g) => handlersRef.current.onStart(part.id, g.x0, g.y0),
      onPanResponderMove: (_, g) => handlersRef.current.onMove(g.x0 + g.dx, g.y0 + g.dy),
      onPanResponderRelease: (_, g) => handlersRef.current.onEnd(part.id, g.x0 + g.dx, g.y0 + g.dy),
      onPanResponderTerminate: () => handlersRef.current.onCancel(),
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      className="cc-glass"
      style={[styles.card, {
        backgroundColor: theme.glassPanel,
        borderColor: theme.glassBorder,
        shadowColor: theme.glassShadow,
      }, Platform.OS === 'web' ? { backdropFilter: 'blur(28px) saturate(1.5)' } : null]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.glassTint }]} />
      <Image source={part.img} resizeMode="contain" style={[styles.cardImg, lifted && { opacity: 0.2 }]} />
      <View style={[styles.cardLabel, { backgroundColor: theme.secondary }]}>
        <Text style={[{ fontSize: 12, textAlign: 'center', color: theme.text }, font(theme, 'semibold')]} numberOfLines={1}>{part.name}</Text>
      </View>
    </View>
  );
}

export default function PCAssemblyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const { width } = useWindowDimensions();
  const { laptop, horizontal, bottom } = useLayout();
  const [columnWidth, setColumnWidth] = useState(0);
  const column = columnWidth || Math.max(320, width - (laptop ? 256 : 0));
  const isWide = column >= 880;

  const [installed, setInstalled] = useState([]);
  const progressHydrated = useRef(false);

  useEffect(() => {
    progressService.get(PROGRESS_KEYS.pcAssembly).then((saved) => {
      progressHydrated.current = true;
      if (Array.isArray(saved?.installed)) setInstalled(saved.installed);
    });
  }, []);

  useEffect(() => {
    if (!progressHydrated.current) return;
    progressService.set(PROGRESS_KEYS.pcAssembly, { installed });
  }, [installed]);
  const [mistakes, setMistakes] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [caseSize, setCaseSize] = useState({ w: 0, h: 0 });
  const [dragId, setDragId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const containerRef = useRef(null);
  const caseRef = useRef(null);
  const containerOffset = useRef({ x: 0, y: 0 });
  const activeDrag = useRef(null);
  const busy = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const dragPos = useRef(new Animated.ValueXY()).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const caseShake = useRef(new Animated.Value(0)).current;

  const expectedId = ORDER[installed.length];
  const expected = expectedId ? PART_BY_ID[expectedId] : null;
  const done = installed.length === ORDER.length;

  const zoneState = (id) => {
    if (installed.includes(id)) return 'filled';
    return expectedId === id ? 'active' : 'locked';
  };

  const measureContainer = () => {
    containerRef.current?.measureInWindow((x, y) => { containerOffset.current = { x, y }; });
  };

  const toLocal = (x, y) => ({
    x: x - containerOffset.current.x,
    y: y - containerOffset.current.y - LIFT,
  });

  const endDrag = () => {
    busy.current = false;
    setDragId(null);
    dragScale.setValue(1);
  };

  const returnToTray = () => {
    Animated.parallel([
      Animated.spring(dragPos, { toValue: toLocal(dragStart.current.x, dragStart.current.y + LIFT), useNativeDriver: true, speed: 14, bounciness: 4 }),
      Animated.timing(dragScale, { toValue: 0.6, duration: 260, useNativeDriver: true }),
    ]).start(endDrag);
  };

  const signalIncorrect = (text) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Vibration.vibrate(Platform.OS === 'android' ? [0, 90, 60, 160] : 400);
    setMistakes((m) => m + 1);
    setFeedback({ kind: 'error', text });

    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.delay(650),
      Animated.timing(flash, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    caseShake.setValue(0);
    Animated.sequence([10, -10, 7, -7, 3, 0].map((v) =>
      Animated.timing(caseShake, { toValue: v, duration: 50, useNativeDriver: true }))).start();
  };

  const handlers = {
    onStart: (partId, x, y) => {
      if (busy.current || done) return;
      measureContainer();
      activeDrag.current = partId;
      dragStart.current = { x, y };
      dragPos.setValue(toLocal(x, y));
      dragScale.setValue(0.8);
      Animated.spring(dragScale, { toValue: 1.06, useNativeDriver: true, speed: 30 }).start();
      setDragId(partId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    onMove: (x, y) => {
      if (activeDrag.current) dragPos.setValue(toLocal(x, y));
    },
    onCancel: () => {
      if (!activeDrag.current) return;
      activeDrag.current = null;
      busy.current = true;
      returnToTray();
    },
    onEnd: (partId, x, y) => {
      if (activeDrag.current !== partId) return;
      activeDrag.current = null;
      busy.current = true;

      caseRef.current?.measureInWindow((cx, cy, cw, ch) => {
        const px = x - cx;
        const py = y - LIFT - cy;
        const overCase = px >= 0 && px <= cw && py >= 0 && py <= ch;
        if (!overCase) { returnToTray(); return; }

        const target = PART_BY_ID[expectedId];
        const r = slotRect(target, cw, ch);
        const onSlot = px >= r.x - HIT_PAD && px <= r.x + r.width + HIT_PAD &&
          py >= r.y - HIT_PAD && py <= r.y + r.height + HIT_PAD;

        if (partId === expectedId && onSlot) {
          const { k } = dragSize(target, cw, ch);
          const centre = {
            x: cx + r.x + r.width / 2 - containerOffset.current.x,
            y: cy + r.y + r.height / 2 - containerOffset.current.y,
          };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Animated.parallel([
            Animated.timing(dragPos, { toValue: centre, duration: 160, useNativeDriver: true }),
            Animated.timing(dragScale, { toValue: 1 / k, duration: 160, useNativeDriver: true }),
          ]).start(() => {
            setInstalled((prev) => [...prev, partId]);
            setShowHint(false);
            setFeedback({ kind: 'ok', text: `Correct! ${target.name} installed.` });
            endDrag();
          });
          return;
        }

        const name = PART_BY_ID[partId].name;
        signalIncorrect(partId !== expectedId
          ? `Incorrect — the ${name} doesn't go in next.`
          : `Incorrect — the ${name} goes in the glowing spot.`);
        const p = toLocal(x, y);
        Animated.sequence([
          ...[12, -12, 8, -8, 0].map((dx) =>
            Animated.timing(dragPos, { toValue: { x: p.x + dx, y: p.y }, duration: 45, useNativeDriver: true })),
        ]).start(returnToTray);
      });
    },
  };

  const installPart = (partId) => {
    if (done || busy.current || installed.includes(partId)) return;
    const target = PART_BY_ID[partId];
    if (!target) return;
    if (partId !== expectedId) {
      signalIncorrect(`Incorrect — the ${target.name} doesn't go in next.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setInstalled((prev) => [...prev, partId]);
    setShowHint(false);
    setFeedback({ kind: 'ok', text: `Correct! ${target.name} installed.` });
  };

  const reset = () => { setInstalled([]); setMistakes(0); setShowHint(false); setFeedback(null); };
  const remaining = PARTS.filter((p) => !installed.includes(p.id));

  const dragPart = dragId ? PART_BY_ID[dragId] : null;
  const dragBox = dragPart ? dragSize(dragPart, caseSize.w, caseSize.h) : null;
  const backTop = shellBack ? 12 : insets.top + 12;

  const actionBtn = (filled) => ({
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: theme.radiusButton,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,
    backgroundColor: filled ? theme.primary : theme.surface,
    borderWidth: filled ? 0 : 1,
    borderColor: theme.border,
  });

  return (
    <View
      testID="pc-assembly-screen"
      ref={containerRef}
      onLayout={(e) => {
        setColumnWidth(e.nativeEvent.layout.width);
        requestAnimationFrame(measureContainer);
      }}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {!shellBack && (
        <IconButton name="chevLeft" label="Go back" onPress={() => leaveScreen(navigation)} style={[styles.floatBack, { top: backTop }]} />
      )}

      <ScrollView
        scrollEnabled={!dragId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom, paddingHorizontal: horizontal, paddingTop: shellBack ? 8 : insets.top + 60 }}
      >
        <View style={[styles.content, { maxWidth: 1100 }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Heading level={1}>PC Assembly Challenge</Heading>
              <Body variant="small" style={{ marginTop: 4 }}>Drag the next part into the glowing spot, or use Place.</Body>
            </View>
            <View style={[styles.progressPill, { backgroundColor: theme.glassPanel, borderColor: theme.glassBorder }]}>
              <Text style={[{ fontSize: 13, color: theme.text }, font(theme, 'semibold')]}>{installed.length}/{ORDER.length}</Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.borderLight }]}>
            <View style={[styles.progressFill, { width: `${(installed.length / ORDER.length) * 100}%`, backgroundColor: theme.primary }]} />
          </View>

          <View style={[styles.workArea, isWide && styles.workAreaWide]}>
            <View style={[styles.stage, isWide && styles.stageWide]}>
              <Glass strong radius={24} style={{ padding: 8 }}>
                <Animated.View
                  ref={caseRef}
                  onLayout={(e) => setCaseSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
                  style={[styles.caseWrap, { aspectRatio: CASE_RATIO, transform: [{ translateX: caseShake }] }]}
                >
                  <Image source={CASE_IMG} resizeMode="stretch" style={StyleSheet.absoluteFill} />
                  {PARTS.map((part) => (
                    <CaseSlot key={part.id} part={part} state={zoneState(part.id)} caseW={caseSize.w} caseH={caseSize.h} />
                  ))}

                  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrongOverlay, { borderColor: theme.error, backgroundColor: theme.errorWash, opacity: flash }]}>
                    <View style={[styles.wrongBadge, { backgroundColor: theme.error }]}>
                      <Ionicons name="close-circle" size={20} color={theme.surface} />
                      <Text style={[{ color: theme.surface, fontSize: 15 }, font(theme, 'semibold')]}>Incorrect</Text>
                    </View>
                  </Animated.View>
                </Animated.View>
              </Glass>

              {done ? (
                <Glass strong radius={16} style={[styles.infoBox, { borderColor: theme.success }]}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.successWash }]}>
                    <Ionicons name="trophy" size={22} color={theme.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 16, color: theme.text }, font(theme, 'h3')]}>Build complete!</Text>
                    <Body variant="small" style={{ marginTop: 2 }}>
                      {mistakes === 0 ? 'Perfect build — no mistakes!' : `Finished with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`}
                    </Body>
                  </View>
                  <Pressable style={actionBtn(true)} onPress={reset} accessibilityRole="button" accessibilityLabel="New Build">
                    <Text style={[{ color: theme.surface, fontSize: 15 }, font(theme, 'semibold')]}>New Build</Text>
                  </Pressable>
                </Glass>
              ) : (
                <Glass strong radius={16} style={[styles.infoBox, showHint && { backgroundColor: theme.yellowWash }]}>
                  {showHint && <Image source={expected.img} resizeMode="contain" style={styles.infoImg} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 16, color: theme.text }, font(theme, 'h3')]}>
                      Step {installed.length + 1} of {ORDER.length}{showHint ? `: ${expected.name}` : ''}
                    </Text>
                    <Body variant="small" style={{ marginTop: 2 }}>
                      {showHint ? expected.tip : 'Which component goes into the glowing spot?'}
                    </Body>
                    {feedback && (
                      <Text style={[{ fontSize: 13, marginTop: 6, color: feedback.kind === 'ok' ? theme.successInk : theme.errorInk }, font(theme, 'semibold')]}>
                        {feedback.text}
                      </Text>
                    )}
                  </View>
                  {!showHint && (
                    <Pressable style={actionBtn(false)} onPress={() => setShowHint(true)} accessibilityRole="button" accessibilityLabel="Hint">
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="bulb-outline" size={16} color={theme.yellowInk} />
                        <Text style={[{ fontSize: 15, color: theme.text }, font(theme, 'semibold')]}>Hint</Text>
                      </View>
                    </Pressable>
                  )}
                </Glass>
              )}
            </View>

            <Glass strong radius={24} style={[styles.tray, isWide && styles.trayWide]}>
              <Heading level={3} style={{ marginBottom: 12 }}>Drag and drop components</Heading>
              <View style={styles.trayGrid}>
                {remaining.map((part) => (
                  <View key={part.id} style={styles.trayItem}>
                    <PartCard part={part} lifted={dragId === part.id} handlers={handlers} />
                    <Pressable
                      onPress={() => installPart(part.id)}
                      style={[actionBtn(false), styles.placeBtn]}
                      accessibilityRole="button"
                      accessibilityLabel={`Place ${part.name}`}
                    >
                      <Text style={[{ fontSize: 15, color: theme.primary }, font(theme, 'semibold')]}>Place</Text>
                    </Pressable>
                  </View>
                ))}
                {remaining.length === 0 && (
                  <View style={styles.doneRow}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                    <Text style={[{ fontSize: 14, color: theme.successInk }, font(theme, 'semibold')]}>All parts installed</Text>
                  </View>
                )}
              </View>
            </Glass>
          </View>
        </View>
      </ScrollView>

      {dragPart && (
        <Animated.View
          pointerEvents="none"
          style={[styles.dragLayer, {
            left: -dragBox.w / 2, top: -dragBox.h / 2, width: dragBox.w, height: dragBox.h,
            transform: [{ translateX: dragPos.x }, { translateY: dragPos.y }, { scale: dragScale }],
          }]}
        >
          <PartPicture part={dragPart} width={dragBox.w} height={dragBox.h} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  floatBack: { position: 'absolute', left: 16, zIndex: 10 },
  content: { width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressPill: { borderRadius: 999, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  progressTrack: { height: 8, borderRadius: 999, marginTop: 16, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 999 },
  workArea: { flexDirection: 'column', gap: 20 },
  workAreaWide: { flexDirection: 'row', alignItems: 'flex-start' },
  stage: { gap: 12 },
  stageWide: { flex: 1.6 },
  caseWrap: { width: '100%', position: 'relative', borderRadius: 16, overflow: 'hidden' },
  slotOutline: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 8 },
  wrongOverlay: { borderWidth: 3, borderRadius: 12, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14 },
  wrongBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, minHeight: 44 },
  dragLayer: { position: 'absolute', zIndex: 50, elevation: 50 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, flexWrap: 'wrap' },
  infoIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoImg: { width: 56, height: 44 },
  tray: { padding: 16 },
  trayWide: { flex: 1 },
  trayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trayItem: { width: '47%', flexGrow: 1, maxWidth: 400 },
  placeBtn: { marginTop: 8, width: '100%' },
  card: {
    width: '100%', borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24, elevation: 4,
  },
  cardImg: { width: '100%', height: 72 },
  cardLabel: { marginTop: 8, alignSelf: 'stretch', borderRadius: 8, minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
});
