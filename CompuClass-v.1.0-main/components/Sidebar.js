import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, PanResponder, useWindowDimensions, Easing, BackHandler, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './ui/Icon';
import { Glass, Mark, Wordmark, Avatar, initials, font } from './ui/kit';
import { navKeyForRoute } from '../utils/screenNav';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  claimDrawerClose,
  drawerTransitionMs,
  isDrawerDismissKey,
  shouldCloseFromDrawer,
} from '../utils/drawerGesture';

const SIDEBAR_MAX_WIDTH = 360;
export const getSidebarWidth = (windowWidth) => Math.min(windowWidth * 0.78, SIDEBAR_MAX_WIDTH);
export const getSidebarHiddenX = (windowWidth) => -(getSidebarWidth(windowWidth) + 24);

export const PRIMARY_NAV = [
  { icon: 'home', title: 'Home', screen: 'Home' },
  { icon: 'book', title: 'Learning materials', screen: 'Materials' },
  { icon: 'quiz', title: 'Quizzes', screen: 'Quiz' },
  { icon: 'trophy', title: 'Leaderboard', screen: 'Leaderboard' },
  { icon: 'user', title: 'Profile', screen: 'Profile' },
  { icon: 'sliders', title: 'Settings', screen: 'Settings' },
];

export const EXPLORE_NAV = [
  { icon: 'monitor', title: 'PC Lab', screen: 'PC Lab' },
  { icon: 'cpu', title: 'PC Assembly', screen: 'PC Assembly' },
  { icon: 'windows', title: 'Windows 11', screen: 'Windows 11' },
  { icon: 'wrench', title: 'Troubleshooting', screen: 'Troubleshoot' },
  { icon: 'bot', title: 'CompuBot', screen: 'Chatbot' },
];

function animateDrawer(value, toValue, reduced, onEnd) {
  value.stopAnimation();
  if (drawerTransitionMs(reduced) === 0) {
    value.setValue(toValue);
    onEnd?.();
    return;
  }
  Animated.timing(value, {
    toValue,
    duration: drawerTransitionMs(reduced),
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start(({ finished }) => {
    if (finished) onEnd?.();
  });
}

function NavList({ currentScreen, onPress, user }) {
  const { theme } = useTheme();
  const name = user?.user_metadata?.full_name || user?.profile?.full_name || 'Learner';
  const points = user?.profile?.xp;
  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {PRIMARY_NAV.map((item) => {
          const active = navKeyForRoute(currentScreen) === item.screen;
          return (
            <Pressable
              key={item.screen}
              onPress={() => onPress(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: active }}
              aria-selected={active}
              style={[styles.nav, active && { backgroundColor: '#fff', shadowColor: '#0B1B3A', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }]}
            >
              <Icon name={item.icon} size={20} color={active ? theme.primary : theme.textSecondary} />
              <Text style={[{ flex: 1, fontSize: 14, lineHeight: 20, color: active ? theme.primary : theme.textSecondary }, font(theme, 'semibold')]}>{item.title}</Text>
            </Pressable>
          );
        })}
        <Text style={[{ fontSize: 12, lineHeight: 16, color: theme.textTertiary, paddingHorizontal: 12, paddingTop: 24, paddingBottom: 8 }, font(theme, 'semibold')]}>Explore</Text>
        {EXPLORE_NAV.map((item) => {
          const active = navKeyForRoute(currentScreen) === item.screen;
          return (
            <Pressable key={item.screen} onPress={() => onPress(item)} accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: active }} aria-selected={active} style={[styles.nav, active && { backgroundColor: '#fff' }]}>
              <Icon name={item.icon} size={20} color={active ? theme.primary : theme.textSecondary} />
              <Text style={[{ flex: 1, fontSize: 14, lineHeight: 20, color: active ? theme.primary : theme.textSecondary }, font(theme, 'semibold')]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={() => onPress({ screen: 'Profile' })} accessibilityRole="button" accessibilityLabel="Open profile" style={[styles.user, { borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.7)' }]}>
        <Avatar label={initials(name)} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[{ fontSize: 14, color: theme.text }, font(theme, 'semibold')]} numberOfLines={1}>{name}</Text>
          <Text style={[{ fontSize: 12, color: theme.textTertiary }, font(theme, 'body')]} numberOfLines={1}>
            {typeof points === 'number' ? `${points.toLocaleString()} pts` : 'CompuClass'}
          </Text>
        </View>
      </Pressable>
    </>
  );
}

export default function Sidebar({ visible, docked, onClose, onNavigate, onHomePress, translateX: externalTranslateX, suspendAnimation, pointerEvents, retain, currentScreen, user }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const sidebarWidth = docked ? 256 : getSidebarWidth(windowWidth);
  const hiddenX = getSidebarHiddenX(windowWidth);
  const hiddenXRef = React.useRef(hiddenX);
  hiddenXRef.current = hiddenX;
  const reducedRef = React.useRef(reduced);
  reducedRef.current = reduced;
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const internalTranslateX = React.useRef(new Animated.Value(hiddenX)).current;
  const translateX = externalTranslateX || internalTranslateX;
  const [shown, setShown] = React.useState(!!visible);
  const shownRef = React.useRef(!!visible);
  const animGen = React.useRef(0);

  React.useEffect(() => {
    if (docked) return undefined;
    if (suspendAnimation) {
      if (visible) {
        shownRef.current = true;
        setShown(true);
      }
      return undefined;
    }
    const gen = ++animGen.current;
    if (visible) {
      shownRef.current = true;
      setShown(true);
      animateDrawer(translateX, 0, reducedRef.current);
      return undefined;
    }
    if (!shownRef.current) return undefined;
    animateDrawer(translateX, hiddenXRef.current, reducedRef.current, () => {
      if (animGen.current !== gen) return;
      shownRef.current = false;
      setShown(false);
    });
    return undefined;
    // translateX is a stable Animated.Value owned by this drawer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, docked, suspendAnimation, reduced]);

  React.useEffect(() => {
    if (!visible || docked) return undefined;
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
    const onKey = (event) => {
      if (!isDrawerDismissKey(event)) return;
      event.preventDefault?.();
      onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener?.('keydown', onKey);
  }, [visible, docked]);

  React.useEffect(() => {
    if (!visible || docked || typeof BackHandler.addEventListener !== 'function') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current?.();
      return true;
    });
    return () => sub?.remove?.();
  }, [visible, docked]);

  const finishCloseSwipe = React.useRef(() => {});
  finishCloseSwipe.current = (gesture) => {
    if (shouldCloseFromDrawer(gesture)) onCloseRef.current?.();
    else animateDrawer(translateX, 0, reducedRef.current);
  };

  const panResponder = React.useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => claimDrawerClose(gesture),
    onMoveShouldSetPanResponder: (_, gesture) => claimDrawerClose(gesture),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => translateX.stopAnimation(),
    onPanResponderMove: (_, gesture) => {
      const next = gesture.dx < 0 ? Math.max(hiddenXRef.current, gesture.dx) : 0;
      translateX.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => finishCloseSwipe.current(gesture),
    onPanResponderTerminate: () => animateDrawer(translateX, 0, reducedRef.current),
  })).current;

  const onPress = (item) => {
    if (item.screen === 'Home') onHomePress?.();
    else onNavigate?.(item.screen);
    onClose?.();
  };

  const body = (
    <View style={{ flex: 1, paddingTop: docked ? 24 : insets.top + 16, paddingHorizontal: 16, paddingBottom: 16 }}>
      <Pressable onPress={() => { onHomePress?.(); onClose?.(); }} accessibilityRole="link" accessibilityLabel="CompuClass home" style={styles.brand}>
        <Mark size={48} />
        <Wordmark />
      </Pressable>
      <NavList currentScreen={currentScreen} onPress={onPress} user={user} />
    </View>
  );

  if (docked) {
    return (
      <Glass sidebar radius={0} style={[styles.dock, { width: 256, borderRightColor: 'rgba(220,230,239,0.9)', backgroundColor: theme.glassSidebar }]}>
        {body}
      </Glass>
    );
  }

  if (!shown && retain) {
    return <View pointerEvents="none" collapsable={false} style={styles.overlay} />;
  }
  if (!shown) return null;

  const backdropOpacity = translateX.interpolate({
    inputRange: [hiddenX === 0 ? -1 : hiddenX, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  return (
    <View
      testID="phone-drawer-overlay"
      pointerEvents={pointerEvents === 'none' ? 'none' : 'auto'}
      accessibilityViewIsModal
      style={[styles.overlay, Platform.OS === 'web' ? { userSelect: 'none' } : null]}
    >
      <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: theme.overlay }]} />
      <Pressable
        testID="drawer-backdrop"
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      />
      <Animated.View
        testID="phone-drawer"
        style={[
          styles.drawer,
          { width: sidebarWidth, transform: [{ translateX }] },
          Platform.OS === 'web' ? { touchAction: 'pan-y' } : null,
        ]}
        {...panResponder.panHandlers}
      >
        <Glass sidebar radius={0} style={[styles.drawerGlass, { backgroundColor: theme.glassSidebar, borderRightColor: 'rgba(220,230,239,0.9)' }]}>
          {body}
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 30, elevation: 30 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, borderTopRightRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  drawerGlass: {
    flex: 1,
    height: '100%',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  dock: { position: 'relative', height: '100%', borderRadius: 0, borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0, shadowOpacity: 0, elevation: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 24 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12, borderRadius: 12 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, marginTop: 8 },
});
