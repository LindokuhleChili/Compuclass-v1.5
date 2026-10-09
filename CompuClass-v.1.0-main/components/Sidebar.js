import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Animated, PanResponder, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './ui/Icon';
import { Glass, Mark, Wordmark, Avatar, initials, font } from './ui/kit';

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

function NavList({ currentScreen, onPress, user }) {
  const { theme } = useTheme();
  const name = user?.user_metadata?.full_name || user?.profile?.full_name || 'Learner';
  const points = user?.profile?.xp;
  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {PRIMARY_NAV.map((item) => {
          const active = currentScreen === item.screen || (item.screen === 'Home' && (currentScreen === 'Dashboard' || currentScreen === 'Lecturer' || currentScreen === 'LecturerDashboard'));
          return (
            <Pressable
              key={item.screen}
              onPress={() => onPress(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.nav, active && { backgroundColor: '#fff', shadowColor: '#0B1B3A', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }]}
            >
              <Icon name={item.icon} size={20} color={active ? theme.primary : theme.textSecondary} />
              <Text style={[{ flex: 1, fontSize: 14, lineHeight: 20, color: active ? theme.primary : theme.textSecondary }, font(theme, 'semibold')]}>{item.title}</Text>
            </Pressable>
          );
        })}
        <Text style={[{ fontSize: 12, lineHeight: 16, color: theme.textTertiary, paddingHorizontal: 12, paddingTop: 24, paddingBottom: 8 }, font(theme, 'semibold')]}>Explore</Text>
        {EXPLORE_NAV.map((item) => {
          const active = currentScreen === item.screen;
          return (
            <Pressable key={item.screen} onPress={() => onPress(item)} accessibilityRole="button" style={[styles.nav, active && { backgroundColor: '#fff' }]}>
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

export default function Sidebar({ visible, docked, onClose, onNavigate, onHomePress, translateX: externalTranslateX, currentScreen, user }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const sidebarWidth = docked ? 256 : getSidebarWidth(windowWidth);
  const hiddenX = getSidebarHiddenX(windowWidth);
  const hiddenXRef = React.useRef(hiddenX);
  hiddenXRef.current = hiddenX;
  const internalTranslateX = React.useRef(new Animated.Value(hiddenX)).current;
  const translateX = externalTranslateX || internalTranslateX;
  const [modalVisible, setModalVisible] = React.useState(visible);

  React.useEffect(() => {
    if (docked) return undefined;
    if (visible) {
      setModalVisible(true);
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.spring(translateX, { toValue: hiddenXRef.current, useNativeDriver: true }).start(() => setModalVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, docked]);

  const panResponder = React.useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
    onPanResponderMove: (_, g) => { if (g.dx < 0) translateX.setValue(g.dx); },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50) Animated.spring(translateX, { toValue: hiddenXRef.current, useNativeDriver: true }).start(onClose);
      else Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
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

  if (!modalVisible) return null;

  return (
    <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        <Animated.View style={[styles.drawer, { width: sidebarWidth, backgroundColor: theme.background, transform: [{ translateX }] }]} {...panResponder.panHandlers}>
          {body}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(11,27,58,0.45)' },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  dock: { position: 'relative', height: '100%', borderRadius: 0, borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0, shadowOpacity: 0, elevation: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 24 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12, borderRadius: 12 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, marginTop: 8 },
});
