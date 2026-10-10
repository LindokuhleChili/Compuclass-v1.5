import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert, Platform, StatusBar } from 'react-native';
import Modal from 'react-native-modal';
import * as ScreenOrientation from 'expo-screen-orientation';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import { authService } from '../services/authService';
import { useNavigation } from '@react-navigation/native';
import { appTheme, useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';

const BLUE = appTheme.primary; const WHITE = appTheme.surface; const BG = appTheme.background;
const TEXT = appTheme.text; const MUTED = appTheme.textSecondary; const BORDER = appTheme.border;

export default function Windows11SimulatorScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const startSessionRef = useRef(() => {});
  const endSessionRef = useRef(() => {});

  useEffect(() => {
    const end = endSessionRef.current;
    startSessionRef.current();
    // The mount-time endSession still sees an empty session. Using the latest
    // one here, or listing it as a dependency, would write a second session.
    return () => { end(); ScreenOrientation.unlockAsync().catch(() => {}); };
  }, []);

  const startSession = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        const { data, error } = await supabase.from('windows_simulation_sessions')
          .insert({ user_id: user.id, session_start: new Date().toISOString() }).select().single();
        if (!error && data) { setSessionId(data.id); setSessionStart(new Date()); }
      }
    } catch {}
  };

  const endSession = async () => {
    if (sessionId && sessionStart) {
      try {
        const duration = Math.floor((new Date() - sessionStart) / 1000);
        await supabase.from('windows_simulation_sessions')
          .update({ session_end: new Date().toISOString(), duration_seconds: duration }).eq('id', sessionId);
      } catch {}
    }
  };
  startSessionRef.current = startSession;
  endSessionRef.current = endSession;

  const handleRefresh = () => { setLoading(true); webViewRef.current?.reload(); };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      setTimeout(async () => {
        try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE); } catch {}
      }, 100);
    } else {
      try { await ScreenOrientation.unlockAsync(); } catch {}
      setIsFullscreen(false);
    }
  };

  const glassBtn = [styles.glassBtn, { backgroundColor: theme.glassFill, borderColor: theme.glassBorder }];

  if (Platform.OS === 'web') return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!isFullscreen && (
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.border }]}>
          {shellBack ? <View style={styles.glassBtn} /> : (
            <TouchableOpacity onPress={() => leaveScreen(navigation)} accessibilityRole="button" accessibilityLabel="Go back" style={glassBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: theme.text }]}>Windows 11</Text>
          <TouchableOpacity onPress={toggleFullscreen} accessibilityRole="button" accessibilityLabel="Fullscreen" style={glassBtn}>
            <Ionicons name="expand-outline" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.webviewContainer, isFullscreen && styles.fullscreenContainer, !isFullscreen && styles.stage]}>
        {isFullscreen && (
          <TouchableOpacity onPress={toggleFullscreen} style={styles.exitFullscreenBtn}>
            <Ionicons name="contract-outline" size={18} color={WHITE} />
          </TouchableOpacity>
        )}
        {loading && (
          <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.loadingText}>Loading Windows 11...</Text>
          </View>
        )}
        <iframe
          title="Windows 11"
          src="https://win11.blueedge.me/"
          style={{ width: '100%', height: '100%', border: 'none', opacity: loading ? 0 : 1, backgroundColor: BG }}
          onLoad={() => setLoading(false)}
        />
      </View>
      {!isFullscreen && (
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <Ionicons name="information-circle" size={16} color={BLUE} />
          <Text style={styles.footerText}>This is a full Windows 11 simulation. Explore and learn!</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Modal isVisible={isFullscreen} onBackdropPress={toggleFullscreen} onBackButtonPress={toggleFullscreen} style={{ margin: 0 }} animationIn="fadeIn" animationOut="fadeOut">
        <View style={styles.fullscreenContainer}>
          <StatusBar hidden />
          <TouchableOpacity onPress={toggleFullscreen} style={styles.exitFullscreenBtn}>
            <Ionicons name="close" size={22} color={WHITE} />
          </TouchableOpacity>
          <WebView
            source={{ uri: 'https://win11.blueedge.me/' }}
            style={[styles.webview, { opacity: 1 }]}
            javaScriptEnabled domStorageEnabled scalesPageToFit scrollEnabled bounces
            showsVerticalScrollIndicator showsHorizontalScrollIndicator
            onShouldStartLoadWithRequest={(req) => !req.url.startsWith('about:')}
          />
        </View>
      </Modal>

      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar hidden={false} />
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.border }]}>
          {shellBack ? <View style={styles.glassBtn} /> : (
            <TouchableOpacity onPress={() => leaveScreen(navigation)} accessibilityRole="button" accessibilityLabel="Go back" style={glassBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: theme.text }]}>Windows 11</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleRefresh} accessibilityRole="button" accessibilityLabel="Refresh" style={glassBtn}>
              <Ionicons name="refresh-outline" size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFullscreen} accessibilityRole="button" accessibilityLabel="Fullscreen" style={glassBtn}>
              <Ionicons name="expand-outline" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.webviewContainer, styles.stage]}>
          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={styles.loadingText}>Loading Windows 11...</Text>
              <Text style={styles.loadingSubtext}>This may take 30–60 seconds</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://win11.blueedge.me/' }}
            style={[styles.webview, loading && { opacity: 0 }]}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(e) => { console.error('[Windows11Simulator] WebView load error:', e.nativeEvent); Alert.alert('Error', 'The Windows 11 simulator failed to load. Check your internet connection and try again.'); setLoading(false); }}
            onShouldStartLoadWithRequest={(req) => !req.url.startsWith('about:')}
            javaScriptEnabled domStorageEnabled allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false} scalesPageToFit bounces={false} scrollEnabled
          />
        </View>

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <Ionicons name="information-circle" size={16} color={BLUE} />
          <Text style={styles.footerText}>This is a full Windows 11 simulation. Explore and learn!</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'transparent' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  glassBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  webviewContainer: { flex: 1, backgroundColor: BG },
  stage: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  webview: { flex: 1 },
  fullscreenContainer: { flex: 1, backgroundColor: '#000', marginHorizontal: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0 },
  exitFullscreenBtn: { position: 'absolute', top: 40, right: 20, zIndex: 1000, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: BG, zIndex: 1 },
  loadingText: { marginTop: 14, fontSize: 18, color: TEXT, fontWeight: '800' },
  loadingSubtext: { marginTop: 6, fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 24 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 16, paddingVertical: 12 },
  footerText: { flex: 1, fontSize: 12, color: MUTED, fontWeight: '500' },
});

