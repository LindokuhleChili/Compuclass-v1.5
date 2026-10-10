import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import RealAR from '../components/RealAR';
import RamAR from '../components/RamAR';
import MotherboardAR from '../components/MotherboardAR';
import StorageAR from '../components/StorageAR';
import CPUAR from '../components/CPUAR';
import GPUAR from '../components/GPUAR';
import PSUAR from '../components/PSUAR';
import { PROGRESS_KEYS, progressService } from '../services/progressService';
import { useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';
import { Glass, IconButton, Heading, Body, Button, font, useLayout } from '../components/ui/kit';

const COMPONENTS = [
  { id: 'motherboard', name: 'Motherboard', icon: 'hardware-chip', tone: 'blue' },
  { id: 'cpu', name: 'CPU', icon: 'speedometer', tone: 'yellow' },
  { id: 'ram', name: 'RAM', icon: 'albums', tone: 'teal' },
  { id: 'gpu', name: 'Graphics Card', icon: 'tv', tone: 'blue' },
  { id: 'storage', name: 'Storage (SSD)', icon: 'save', tone: 'teal' },
  { id: 'psu', name: 'Power Supply', icon: 'battery-charging', tone: 'yellow' },
];

const STEPS = ['Install Motherboard', 'Install CPU', 'Install RAM', 'Install Graphics Card', 'Install Storage', 'Connect Power Supply'];

const INSTRUCTIONS = [
  { icon: 'hand-left', tone: 'blue', text: 'Drag to rotate the 3D PC model' },
  { icon: 'resize', tone: 'teal', text: 'Pinch to zoom in/out' },
  { icon: 'construct', tone: 'yellow', text: 'Tap components to learn more' },
];

function toneColors(theme, tone) {
  const map = {
    blue: { bg: theme.tint, fg: theme.primary },
    teal: { bg: theme.secondary, fg: theme.accentInk },
    yellow: { bg: theme.yellowTint, fg: theme.yellowInk },
  };
  return map[tone] || map.blue;
}

function ToneIcon({ name, tone, size = 56, muted }) {
  const { theme } = useTheme();
  const colors = muted
    ? { bg: theme.borderLight, fg: theme.textTertiary }
    : toneColors(theme, tone);
  return (
    <View style={{ width: size, height: size, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size >= 48 ? 26 : 18} color={colors.fg} />
    </View>
  );
}

export default function PCLabScreen({ navigation }) {
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { laptop, horizontal, bottom } = useLayout();
  const [columnWidth, setColumnWidth] = useState(0);
  const column = columnWidth || Math.max(320, width - (laptop ? 256 : 0));
  const content = Math.min(1200, Math.max(280, column - horizontal * 2));
  const numColumns = content < 460 ? 2 : content < 820 ? 3 : 4;
  const cardGap = 16;
  const cardWidth = (content - cardGap * (numColumns - 1)) / numColumns;
  const arHeight = Math.min(480, Math.max(260, height * 0.4));
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const progressHydrated = useRef(false);

  useEffect(() => {
    progressService.get(PROGRESS_KEYS.pcLab).then((saved) => {
      progressHydrated.current = true;
      if (saved && Array.isArray(saved.selectedComponents) && Number.isInteger(saved.currentStep)) {
        setSelectedComponents(saved.selectedComponents);
        setCurrentStep(saved.currentStep);
      }
    });
  }, []);

  useEffect(() => {
    if (!progressHydrated.current) return;
    progressService.set(PROGRESS_KEYS.pcLab, { currentStep, selectedComponents });
  }, [currentStep, selectedComponents]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showMotherboardFullscreen, setShowMotherboardFullscreen] = useState(false);
  const [showCPUFullscreen, setShowCPUFullscreen] = useState(false);
  const [showRAMFullscreen, setShowRAMFullscreen] = useState(false);
  const [showGPUFullscreen, setShowGPUFullscreen] = useState(false);
  const [showStorageFullscreen, setShowStorageFullscreen] = useState(false);
  const [showPSUFullscreen, setShowPSUFullscreen] = useState(false);

  const cardScales = useRef(COMPONENTS.map(() => new Animated.Value(1))).current;

  const animateCard = (index, onDone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(cardScales[index], { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(cardScales[index], { toValue: 1, useNativeDriver: true }),
    ]).start(onDone);
  };

  const openComponentViewer = (id) => {
    if (id === 'motherboard') setShowMotherboardFullscreen(true);
    else if (id === 'cpu') setShowCPUFullscreen(true);
    else if (id === 'ram') setShowRAMFullscreen(true);
    else if (id === 'gpu') setShowGPUFullscreen(true);
    else if (id === 'storage') setShowStorageFullscreen(true);
    else if (id === 'psu') setShowPSUFullscreen(true);
  };

  const handleComponentPress = (id, index) => {
    animateCard(index, () => {
      if (currentStep >= STEPS.length) return;
      if (id === COMPONENTS[currentStep].id) {
        setSelectedComponents([...selectedComponents, id]);
        setCurrentStep(currentStep + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (currentStep === STEPS.length - 1) {
          Alert.alert('Congratulations!', 'You have successfully assembled your PC!', [
            { text: 'Start New Build', onPress: () => { setSelectedComponents([]); setCurrentStep(0); } },
          ]);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Wrong Component', `Next step: ${STEPS[currentStep]}`);
      }
    });
  };

  const backTop = shellBack ? 12 : insets.top + 12;

  const FullscreenView = ({ onBack, children }) => (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <IconButton name="chevLeft" label="Back to PC Lab" onPress={onBack} style={[styles.floatBack, { top: backTop }]} />
      {children}
    </View>
  );

  if (showMotherboardFullscreen) return <FullscreenView onBack={() => setShowMotherboardFullscreen(false)}><MotherboardAR /></FullscreenView>;
  if (showCPUFullscreen) return <FullscreenView onBack={() => setShowCPUFullscreen(false)}><CPUAR /></FullscreenView>;
  if (showRAMFullscreen) return <FullscreenView onBack={() => setShowRAMFullscreen(false)}><RamAR /></FullscreenView>;
  if (showGPUFullscreen) return <FullscreenView onBack={() => setShowGPUFullscreen(false)}><GPUAR /></FullscreenView>;
  if (showStorageFullscreen) return <FullscreenView onBack={() => setShowStorageFullscreen(false)}><StorageAR /></FullscreenView>;
  if (showPSUFullscreen) return <FullscreenView onBack={() => setShowPSUFullscreen(false)}><PSUAR /></FullscreenView>;

  if (isFullscreen) return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <IconButton name="chevLeft" label="Back to PC Lab" onPress={() => setIsFullscreen(false)} style={[styles.floatBack, { top: backTop }]} />
      <RealAR captionOffset={72} />
      {showInstructions && (
        <View style={[styles.instructionsOverlay, { backgroundColor: theme.overlay }]}>
          <Glass strong radius={24} style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <Heading level={3}>How to Use 3D Viewer</Heading>
              <IconButton name="close" label="Close instructions" onPress={() => setShowInstructions(false)} />
            </View>
            {INSTRUCTIONS.map((item) => {
              const colors = toneColors(theme, item.tone);
              return (
                <View key={item.text} style={styles.instructionRow}>
                  <View style={[styles.instructionIcon, { backgroundColor: colors.bg }]}>
                    <Ionicons name={item.icon} size={18} color={colors.fg} />
                  </View>
                  <Text style={[{ flex: 1, color: theme.textSecondary, fontSize: 14, lineHeight: 20 }, font(theme, 'body')]}>{item.text}</Text>
                </View>
              );
            })}
          </Glass>
        </View>
      )}
    </View>
  );

  return (
    <View testID="pc-lab-screen" onLayout={(e) => setColumnWidth(e.nativeEvent.layout.width)} style={[styles.fill, { backgroundColor: theme.background }]}>
      {!shellBack && (
        <IconButton name="chevLeft" label="Go back" onPress={() => leaveScreen(navigation)} style={[styles.floatBack, { top: backTop }]} />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom, paddingHorizontal: horizontal, paddingTop: shellBack ? 8 : insets.top + 60 }}>
        <View style={{ width: '100%', maxWidth: 1200, alignSelf: 'center' }}>
          <View style={styles.sectionHeader}>
            <Heading level={2}>3D PC Model</Heading>
            <Button
              label="Fullscreen"
              variant="secondary"
              fit
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsFullscreen(true); setShowInstructions(true); }}
              accessibilityLabel="Fullscreen"
            />
          </View>
          <Glass strong radius={24} style={{ height: arHeight }}>
            <RealAR />
          </Glass>

          <Heading level={2} style={{ marginTop: 28, marginBottom: 4 }}>Available Components</Heading>
          <Body variant="small" style={[{ marginBottom: 16, color: theme.text }, font(theme, 'semibold')]}>
            {currentStep < STEPS.length ? `Next step: ${STEPS[currentStep]}` : 'Build complete'}
          </Body>
          <View style={[styles.componentsGrid, { gap: cardGap }]}>
            {COMPONENTS.map((component, index) => {
              const installed = selectedComponents.includes(component.id);
              return (
                <Animated.View key={component.id} style={{ transform: [{ scale: cardScales[index] }], width: Math.min(cardWidth, 400) }}>
                  <Pressable
                    style={({ pressed }) => [{ opacity: installed ? 0.55 : pressed ? 0.92 : 1 }]}
                    onPress={() => handleComponentPress(component.id, index)}
                    disabled={installed}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: installed }}
                    accessibilityLabel={installed ? `${component.name} installed` : component.name}
                  >
                    <Glass strong radius={16} style={styles.componentCard}>
                      <ToneIcon name={component.icon} tone={component.tone} muted={installed} />
                      <Text style={[{ marginTop: 10, fontSize: 13, textAlign: 'center', color: installed ? theme.textSecondary : theme.text }, font(theme, 'semibold')]}>{component.name}</Text>
                      {installed && (
                        <View style={[styles.installedBadge, { backgroundColor: theme.success }]}>
                          <Ionicons name="checkmark" size={12} color={theme.surface} />
                        </View>
                      )}
                    </Glass>
                  </Pressable>
                  <Pressable
                    onPress={() => openComponentViewer(component.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${component.name} model`}
                    style={styles.viewModelBtn}
                  >
                    <Text style={[{ fontSize: 14, color: theme.primary }, font(theme, 'semibold')]}>View model</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  floatBack: { position: 'absolute', left: 16, zIndex: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  componentsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  componentCard: { padding: 16, alignItems: 'center', minHeight: 132 },
  installedBadge: { position: 'absolute', top: 10, right: 10, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  viewModelBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  instructionsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 2, padding: 20 },
  instructionsCard: { padding: 24, width: '100%', maxWidth: 480 },
  instructionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  instructionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
