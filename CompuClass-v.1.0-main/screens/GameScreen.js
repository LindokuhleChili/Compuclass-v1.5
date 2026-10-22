import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, useWindowDimensions, Pressable, Image, ImageBackground,
  Animated, PanResponder, StatusBar, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROGRESS_KEYS, progressService } from '../services/progressService';
import { supabase } from '../config/supabase';
import { saveRunnerScore } from '../utils/gameScore';
import { authService } from '../services/authService';
import { gameRunnerService } from '../services/gameRunnerService';
import { useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';
import { font } from '../components/ui/kit';
import { runnerArt } from '../assets/runner/art';
import { createRunnerAudio } from '../utils/runnerAudio';
import {
  INITIAL_SPEED,
  JUMP_APEX,
  PLAYER_X,
  createRun,
  factById,
  factForRun,
  keyAction,
  runnerFrame,
  tick,
} from '../utils/runnerEngine';

const MUTE_KEY = 'compurunner_muted';
const SPRITE_W = 80;
const SPRITE_H = 110;

const KIND_SIZE = {
  virus: { w: 58, h: 58, lift: 0 },
  firewall: { w: 62, h: 70, lift: 58 },
  circuit: { w: 64, h: 92, lift: 0 },
  coin: { w: 40, h: 40, lift: 22 },
  gem: { w: 36, h: 36, lift: 28 },
  chip: { w: 46, h: 46, lift: 24 },
};

function buzz(kind) {
  try {
    if (kind === 'error') Haptics.notificationAsync?.(Haptics.NotificationFeedbackType?.Error);
    else Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
  } catch { /* haptics are optional on web */ }
}

function PixelButton({ label, onPress, variant = 'primary', icon, disabled }) {
  const { theme } = useTheme();
  const secondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pixelPress, { opacity: disabled ? 0.45 : pressed ? 0.9 : 1 }]}
    >
      <ImageBackground
        source={secondary ? runnerArt.ui.secondary : runnerArt.ui.primary}
        resizeMode="stretch"
        style={styles.pixelBtn}
        imageStyle={styles.pixelBtnImage}
      >
        {icon ? <Image source={icon} style={[styles.pixelIcon, !secondary && styles.pixelIconOn]} accessibilityElementsHidden /> : null}
        <Text style={[styles.pixelLabel, { color: secondary ? theme.text : '#fff' }, font(theme, 'semibold')]}>{label}</Text>
      </ImageBackground>
    </Pressable>
  );
}

function Floater({ text, color }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: 720, useNativeDriver: true }).start();
  }, [rise, text]);
  return (
    <Animated.Text
      style={[styles.floater, {
        color,
        opacity: rise.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }],
      }]}
    >
      {text}
    </Animated.Text>
  );
}

function Scroller({ distance, factor, width, style, children }) {
  const span = Math.max(width, 320);
  const shift = -((distance * factor) % span);
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <View style={[styles.span, { left: shift, width: span }]}>{children}</View>
      <View style={[styles.span, { left: shift + span, width: span }]}>{children}</View>
    </View>
  );
}

function Sky({ distance, width, height }) {
  const star = (source, x, y, size) => (
    <Image source={source} style={{ position: 'absolute', left: x * width, top: y * height * 0.55, width: size, height: size }} resizeMode="contain" />
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#E7F4FB', '#F7FBFD', '#F7FBFD']} style={StyleSheet.absoluteFill} />
      <Scroller distance={distance} factor={0.08} width={width}>
        <Image source={runnerArt.bg.moon} style={[styles.moon, { left: width * 0.72 }]} resizeMode="contain" />
        {star(runnerArt.bg.starTiny, 0.08, 0.12, 18)}
        {star(runnerArt.bg.starSmall, 0.2, 0.22, 16)}
        {star(runnerArt.bg.starTiny, 0.36, 0.08, 14)}
        {star(runnerArt.bg.starSmall, 0.52, 0.18, 18)}
        {star(runnerArt.bg.starTiny, 0.9, 0.14, 16)}
      </Scroller>
      <Scroller distance={distance} factor={0.2} width={width}>
        <Image source={runnerArt.bg.satellite} style={{ position: 'absolute', left: width * 0.18, top: height * 0.16, width: 42, height: 42 }} resizeMode="contain" />
        <Image source={runnerArt.bg.meteor} style={{ position: 'absolute', left: width * 0.58, top: height * 0.28, width: 36, height: 36 }} resizeMode="contain" />
      </Scroller>
      <Scroller distance={distance} factor={0.42} width={width}>
        <Image source={runnerArt.bg.cloud1} style={{ position: 'absolute', left: width * 0.05, top: height * 0.2, width: 150, height: 78 }} resizeMode="contain" />
        <Image source={runnerArt.bg.cloud3} style={{ position: 'absolute', left: width * 0.4, top: height * 0.34, width: 130, height: 70 }} resizeMode="contain" />
        <Image source={runnerArt.bg.cloud5} style={{ position: 'absolute', left: width * 0.72, top: height * 0.14, width: 160, height: 80 }} resizeMode="contain" />
      </Scroller>
    </View>
  );
}

function Ground({ distance, width, groundY }) {
  const tile = 440;
  const shift = -(distance % tile);
  const copies = Math.ceil(width / tile) + 2;
  return (
    <View style={[styles.groundWrap, { top: groundY - 30 }]} pointerEvents="none">
      {Array.from({ length: copies }, (_, index) => (
        <Image
          key={index}
          source={runnerArt.ground}
          resizeMode="stretch"
          style={{ position: 'absolute', left: shift + index * tile, top: 18, width: tile + 1, height: 110 }}
        />
      ))}
      <View style={styles.horizon} />
    </View>
  );
}

function entityNode(entity, laneY) {
  const spec = KIND_SIZE[entity.kind];
  if (!spec) return null;
  const source = entity.group === 'pickup' ? runnerArt.items[entity.kind] : runnerArt.obstacles[entity.kind];
  return (
    <Image
      key={entity.id}
      source={source}
      resizeMode="contain"
      style={{
        position: 'absolute',
        left: entity.x - 6,
        top: laneY - spec.h - spec.lift,
        width: spec.w,
        height: spec.h,
      }}
    />
  );
}

export default function GameScreen({ navigation, route }) {
  const isMulti = route?.params?.multiplayer === true;
  const roomId = route?.params?.roomId || null;
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const groundY = Math.round(height * 0.66);

  const [phase, setPhase] = useState('start');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [run, setRun] = useState(() => createRun(800));
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [summary, setSummary] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finishRank, setFinishRank] = useState(null);
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [floater, setFloater] = useState(null);
  const [toast, setToast] = useState(null);
  const [milestone, setMilestone] = useState(null);

  const world = useRef(createRun(width || 800));
  const inputRef = useRef({ jump: false, duck: false, lane: 0 });
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = createRunnerAudio();
  const phaseRef = useRef(phase);
  const widthRef = useRef(width);
  const highRef = useRef(0);
  const overRef = useRef(false);
  const myIdRef = useRef(null);
  const roomChannelRef = useRef(null);
  const lastPushRef = useRef(0);
  const multiRef = useRef(isMulti);
  const roomRef = useRef(roomId);
  const onEventsRef = useRef(() => {});
  const beginRef = useRef(() => {});
  const togglePauseRef = useRef(() => {});
  const toggleMuteRef = useRef(() => {});
  phaseRef.current = phase;
  widthRef.current = width;
  multiRef.current = isMulti;
  roomRef.current = roomId;

  const laneY = useCallback((lane) => groundY + 10 + lane * 34, [groundY]);

  useEffect(() => {
    progressService.get(PROGRESS_KEYS.compuRunner).then(async (saved) => {
      const legacy = await AsyncStorage.getItem('compurunner_highscore');
      const legacyScore = legacy ? parseInt(legacy, 10) : 0;
      const best = Math.max(Number(saved?.highScore) || 0, Number.isNaN(legacyScore) ? 0 : legacyScore);
      if (best) {
        highRef.current = best;
        setHighScore(best);
      }
    });
    AsyncStorage.getItem(MUTE_KEY).then((value) => {
      if (value === '1') {
        audioRef.current.setMuted(true);
        setMuted(true);
      }
    });
    gameRunnerService.getLeaderboard().then(setLeaderboard).catch(() => setLeaderboard([]));
  }, []);

  useEffect(() => {
    if (!isMulti || !roomId) return undefined;
    let cancelled = false;
    const refreshOthers = async () => {
      const players = await gameRunnerService.getRoomPlayers(roomId);
      if (cancelled) return;
      setOtherPlayers(players.filter((player) => player.user_id !== myIdRef.current));
    };
    authService.getCurrentUser().then((user) => {
      myIdRef.current = user?.id || null;
      refreshOthers();
    });
    roomChannelRef.current = gameRunnerService.subscribeToRoom(roomId, refreshOthers, () => {});
    return () => {
      cancelled = true;
      if (roomChannelRef.current) {
        gameRunnerService.unsubscribe(roomChannelRef.current);
        roomChannelRef.current = null;
      }
    };
  }, [isMulti, roomId]);

  const saveScore = useCallback(async (finalScore, chipIds) => {
    try {
      const stored = await AsyncStorage.getItem('compurunner_highscore');
      const prev = stored ? parseInt(stored, 10) : 0;
      const saved = await progressService.get(PROGRESS_KEYS.compuRunner);
      const unlocked = new Set(Array.isArray(saved?.unlockedIds) ? saved.unlockedIds : []);
      (chipIds || []).forEach((id) => { if (id) unlocked.add(id); });
      const best = Math.max(prev, Number(saved?.highScore) || 0, finalScore);
      if (best > prev) {
        await AsyncStorage.setItem('compurunner_highscore', String(best));
        highRef.current = best;
        setHighScore(best);
        const user = await authService.getCurrentUser();
        if (user) {
          const written = await saveRunnerScore(supabase, user.id, best);
          if (!written.saved) console.error('Runner score was not saved');
        }
        const board = await gameRunnerService.getLeaderboard();
        setLeaderboard(board);
      }
      await progressService.set(PROGRESS_KEYS.compuRunner, { highScore: best, unlockedIds: [...unlocked] });
    } catch { /* keep the score on this device if the account write fails */ }
  }, []);

  const finish = useCallback(async (run) => {
    if (overRef.current) return;
    overRef.current = true;
    const fact = factForRun(run.chips, Math.random);
    setSummary({
      score: run.score,
      fact,
      chips: run.chips.slice(),
      bestStreak: run.bestStreak,
    });
    setIsNewBest(run.score > highRef.current && run.score > 0);
    if (run.score > highRef.current) {
      highRef.current = run.score;
      setHighScore(run.score);
    }
    setPhase('gameover');
    audioRef.current.play('over');
    saveScore(run.score, run.chips);
    if (isMulti && roomId && myIdRef.current) {
      try {
        const rank = await gameRunnerService.getFinishRank(roomId);
        setFinishRank(rank);
        await gameRunnerService.pushPlayerState(roomId, myIdRef.current, {
          lane: run.lane, score: run.score, lives: run.lives, finished: true, finishRank: rank,
        });
      } catch { /* rank is optional if the room read fails */ }
    }
  }, [isMulti, roomId, saveScore]);

  onEventsRef.current = (events) => {
    events.forEach((event) => {
      if (event.type === 'jump') {
        audioRef.current.play('jump');
        buzz('jump');
      } else if (event.type === 'duck') {
        audioRef.current.play('duck');
      } else if (event.type === 'hit') {
        audioRef.current.play('hit');
        buzz('error');
      } else if (event.type === 'collect') {
        audioRef.current.play(event.kind === 'chip' ? 'chip' : 'coin');
        const label = event.multiplier > 1 ? `+${event.points}  x${event.multiplier}` : `+${event.points}`;
        setFloater({ id: `${event.kind}-${event.points}-${world.current.elapsed}`, text: label });
        if (event.kind === 'chip' && event.line) {
          setToast({ id: world.current.elapsed, title: event.title, line: event.line });
        }
      } else if (event.type === 'milestone') {
        setMilestone(event.score);
      } else if (event.type === 'dead') {
        finish(world.current);
      }
    });
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 1700);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!milestone) return undefined;
    const timer = setTimeout(() => setMilestone(null), 1400);
    return () => clearTimeout(timer);
  }, [milestone]);

  useEffect(() => {
    if (phase !== 'playing' || paused) return undefined;
    let raf = 0;
    let last = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const loop = (time) => {
      if (world.current.paused || phaseRef.current !== 'playing') return;
      const dt = time - last;
      last = time;
      const input = inputRef.current;
      inputRef.current = { jump: false, duck: false, lane: 0 };
      world.current.viewWidth = widthRef.current || world.current.viewWidth;
      const result = tick(world.current, dt, input, Math.random);
      world.current = result.state;
      if (result.state.phase === 'playing') setRun(result.state);
      onEventsRef.current(result.events);
      if (multiRef.current && roomRef.current && myIdRef.current && world.current.phase === 'playing') {
        const nowMs = Date.now();
        if (nowMs - lastPushRef.current > 250) {
          lastPushRef.current = nowMs;
          gameRunnerService.pushPlayerState(roomRef.current, myIdRef.current, {
            lane: world.current.lane,
            score: world.current.score,
            lives: world.current.lives,
            finished: false,
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused]);

  const begin = useCallback(() => {
    overRef.current = false;
    const next = createRun(widthRef.current || 800);
    world.current = next;
    setRun(next);
    inputRef.current = { jump: false, duck: false, lane: 0 };
    setSummary(null);
    setFinishRank(null);
    setFloater(null);
    setToast(null);
    setMilestone(null);
    setPaused(false);
    setPhase('playing');
    audioRef.current.play('click');
  }, []);
  beginRef.current = begin;

  const togglePause = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setPaused((value) => {
      const next = !value;
      world.current.paused = next;
      if (!next) audioRef.current.play('click');
      return next;
    });
  }, []);
  togglePauseRef.current = togglePause;

  const toggleMute = useCallback(() => {
    const next = audioRef.current.toggleMuted();
    setMuted(next);
    AsyncStorage.setItem(MUTE_KEY, next ? '1' : '0').catch(() => {});
    if (!next) audioRef.current.play('click');
  }, []);
  toggleMuteRef.current = toggleMute;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKey = (event) => {
      const action = keyAction(event.key);
      if (!action) return;
      const current = phaseRef.current;
      if (current === 'start' && (action === 'jump' || action === 'confirm')) {
        event.preventDefault();
        beginRef.current();
        return;
      }
      if (current === 'gameover' && (action === 'confirm' || action === 'jump')) {
        event.preventDefault();
        beginRef.current();
        return;
      }
      if (current !== 'playing') return;
      if (action === 'pause') {
        event.preventDefault();
        togglePauseRef.current();
        return;
      }
      if (action === 'mute') {
        event.preventDefault();
        toggleMuteRef.current();
        return;
      }
      if (world.current.paused || event.repeat) return;
      event.preventDefault();
      if (action === 'jump') inputRef.current.jump = true;
      if (action === 'duck') inputRef.current.duck = true;
      if (action === 'lane-left') inputRef.current.lane = -1;
      if (action === 'lane-right') inputRef.current.lane = 1;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => (
      phaseRef.current === 'playing' && (Math.abs(gesture.dx) > 14 || Math.abs(gesture.dy) > 14)
    ),
    onPanResponderRelease: (_, gesture) => {
      if (phaseRef.current !== 'playing' || world.current.paused) return;
      const { dx, dy } = gesture;
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy < -24) inputRef.current.jump = true;
        else if (dy > 24) inputRef.current.duck = true;
      } else if (dx > 24) inputRef.current.lane = 1;
      else if (dx < -24) inputRef.current.lane = -1;
    },
  })).current;

  const press = (patch) => {
    if (phaseRef.current !== 'playing' || world.current.paused) return;
    inputRef.current = { ...inputRef.current, ...patch };
  };

  const quit = () => {
    world.current.paused = true;
    audioRef.current.stopAll();
    if (roomChannelRef.current) {
      gameRunnerService.unsubscribe(roomChannelRef.current);
      roomChannelRef.current = null;
    }
    navigation.goBack();
  };

  if (phase === 'start') {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <LinearGradient colors={['#E7F4FB', theme.background]} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={[styles.startScroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
          {shellBack ? <View style={styles.backSpacer} /> : (
            <Pressable
              onPress={() => leaveScreen(navigation)}
              style={[styles.iconBtn, { backgroundColor: theme.glassFill, borderColor: theme.glassBorder }]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Image source={runnerArt.ui.back} style={styles.iconGlyph} />
            </Pressable>
          )}
          <Image source={runnerArt.player.idle} style={styles.heroSprite} resizeMode="contain" accessibilityElementsHidden />
          <Text style={[styles.title, { color: theme.text }, font(theme, 'display')]}>CompuRunner</Text>
          <Text style={[styles.sub, { color: theme.textSecondary }, font(theme, 'body')]}>
            Jump the virus, duck the firewall, and switch lanes at a circuit board.
          </Text>
          <View style={[styles.tipCard, { backgroundColor: theme.glassFill, borderColor: theme.border }]}>
            {[
              [runnerArt.ui.up, 'Space, swipe up, or the jump button'],
              [runnerArt.ui.down, 'Down arrow or swipe down to duck'],
              [runnerArt.ui.left, 'Left and right move between lanes'],
              [runnerArt.items.coin, 'Coins build a combo. Chips teach a hardware fact'],
            ].map(([icon, text]) => (
              <View key={text} style={styles.tipRow}>
                <Image source={icon} style={styles.tipIcon} />
                <Text style={[styles.tipText, { color: theme.text }, font(theme, 'body')]}>{text}</Text>
              </View>
            ))}
          </View>
          {highScore > 0 ? (
            <View style={[styles.bestPill, { backgroundColor: theme.tint }]}>
              <Image source={runnerArt.ui.trophy} style={styles.tipIcon} />
              <Text style={[styles.bestText, { color: theme.primary }, font(theme, 'semibold')]}>Best {highScore}</Text>
            </View>
          ) : null}
          <PixelButton label="Run" onPress={begin} icon={runnerArt.ui.play} />
          <Pressable onPress={toggleMute} style={styles.muteLink} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
            <Image source={muted ? runnerArt.ui.audioOff : runnerArt.ui.audioOn} style={styles.tipIcon} />
            <Text style={[styles.muteText, { color: theme.textSecondary }, font(theme, 'semibold')]}>{muted ? 'Sound off' : 'Sound on'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (phase === 'gameover' && summary) {
    const best = Math.max(highScore, summary.score);
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <LinearGradient colors={['#E7F4FB', theme.background]} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={[styles.overScroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}>
          <Image source={runnerArt.player.hurt} style={styles.heroSprite} resizeMode="contain" accessibilityElementsHidden />
          <Text style={[styles.overKicker, { color: theme.accentInk }, font(theme, 'semibold')]}>RUN OVER</Text>
          {finishRank != null ? (
            <Text style={[styles.rankText, { color: theme.primary }, font(theme, 'semibold')]}>
              {['1st', '2nd', '3rd'][finishRank - 1] || `#${finishRank}`} place
            </Text>
          ) : null}
          <Text style={[styles.scoreHuge, { color: theme.primary }, font(theme, 'display')]}>{summary.score}</Text>
          <Text style={[styles.scoreCaption, { color: theme.textTertiary }, font(theme, 'semibold')]}>SCORE</Text>
          {isNewBest ? (
            <View style={[styles.bestPill, { backgroundColor: theme.yellowTint }]}>
              <Image source={runnerArt.ui.trophy} style={styles.tipIcon} />
              <Text style={[styles.bestText, { color: theme.yellowInk }, font(theme, 'semibold')]}>New best</Text>
            </View>
          ) : (
            <Text style={[styles.bestLine, { color: theme.textSecondary }, font(theme, 'body')]}>Best {best}</Text>
          )}
          {summary.bestStreak > 1 ? (
            <Text style={[styles.bestLine, { color: theme.accentInk }, font(theme, 'semibold')]}>Best combo x{summary.bestStreak}</Text>
          ) : null}
          <View style={[styles.factCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.factKicker, { color: theme.accentInk }, font(theme, 'semibold')]}>HARDWARE FACT</Text>
            <Text style={[styles.factTitle, { color: theme.text }, font(theme, 'h2')]}>{summary.fact.title}</Text>
            <Text style={[styles.factBody, { color: theme.textSecondary }, font(theme, 'body')]}>{summary.fact.body}</Text>
          </View>
          {summary.chips.length > 0 ? (
            <View style={styles.chipRow}>
              {summary.chips.map((id) => (
                <View key={id} style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.tint }]}>
                  <Image source={runnerArt.items.chip} style={styles.chipIcon} />
                  <Text style={[styles.chipLabel, { color: theme.primary }, font(theme, 'semibold')]}>{factById(id)?.title || id}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <PixelButton label="Play again" onPress={begin} icon={runnerArt.ui.play} />
          <View style={{ height: 10 }} />
          <PixelButton label="Back to dashboard" onPress={() => navigation.goBack()} variant="secondary" icon={runnerArt.ui.home} />
          {leaderboard.length > 0 ? (
            <View style={[styles.board, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.factKicker, { color: theme.textTertiary }, font(theme, 'semibold')]}>LEADERBOARD</Text>
              {leaderboard.map((entry, index) => (
                <View key={`${entry.profiles?.full_name || 'player'}-${index}`} style={styles.boardRow}>
                  <Text style={[styles.boardRank, { color: theme.primary }, font(theme, 'semibold')]}>{index + 1}</Text>
                  <Text style={[styles.boardName, { color: theme.text }, font(theme, 'body')]}>{entry.profiles?.full_name || 'Player'}</Text>
                  <Text style={[styles.boardScore, { color: theme.accentInk }, font(theme, 'semibold')]}>{entry.score}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  const pose = runnerFrame(run.pose, run.elapsed);
  const lift = run.pose === 'jump' ? run.jumpH : 0;
  const shadow = 1 - Math.min(1, lift / JUMP_APEX) * 0.65;
  const blinking = run.elapsed < run.invincibleUntil && Math.floor(run.elapsed / 90) % 2 === 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]} {...panResponder.panHandlers} collapsable={false}>
      <StatusBar hidden />
      <Sky distance={run.distance} width={width} height={height} />
      <Ground distance={run.distance} width={width} groundY={groundY} />
      {[0, 1, 2].map((lane) => (
        <View key={lane} pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.laneGuide, { top: laneY(lane) - 2, backgroundColor: run.lane === lane ? theme.accent : 'rgba(11,27,58,0.12)', opacity: run.lane === lane ? 0.9 : 1 }]} />
          {run.entities.filter((entity) => entity.lane === lane).map((entity) => entityNode(entity, laneY(lane)))}
          {isMulti && otherPlayers.filter((player) => (player.lane ?? 1) === lane).map((player) => (
            <View key={player.user_id} style={[styles.ghost, { left: PLAYER_X - 78, top: laneY(lane) - SPRITE_H }]}>
              <Text style={[styles.ghostName, { color: theme.text }]} numberOfLines={1}>{(player.full_name || 'Player').split(' ')[0]}</Text>
              <Image source={runnerFrame('run', run.elapsed) === 'run1' ? runnerArt.ghost.run1 : runnerArt.ghost.run2} style={styles.ghostSprite} resizeMode="contain" />
            </View>
          ))}
          {run.lane === lane ? (
            <View style={{ position: 'absolute', left: PLAYER_X - 22, top: laneY(lane) - SPRITE_H - lift, width: SPRITE_W, height: SPRITE_H, opacity: blinking ? 0.45 : 1 }}>
              <View style={[styles.shadow, { opacity: shadow, transform: [{ scaleX: shadow }], top: SPRITE_H - 8 + lift }]} />
              <Image source={runnerArt.player[pose]} style={styles.playerSprite} resizeMode="contain" />
            </View>
          ) : null}
        </View>
      ))}

      <View style={[styles.hud, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={[styles.hudCard, { backgroundColor: theme.glassFill, borderColor: theme.glassBorder }]}>
          <Pressable onPress={togglePause} style={styles.hudIcon} accessibilityRole="button" accessibilityLabel="Pause">
            <Image source={runnerArt.ui.pause} style={styles.hudGlyph} />
          </Pressable>
          <View>
            <Text style={[styles.hudScore, { color: theme.text }, font(theme, 'h2')]}>{run.score}</Text>
            <Text style={[styles.hudMeta, { color: theme.textTertiary }]}>SCORE</Text>
          </View>
          <View style={styles.pips}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={[styles.pip, { backgroundColor: index < run.lives ? theme.primary : theme.border }]} />
            ))}
          </View>
          <View style={styles.hudPace}>
            <Text style={[styles.hudMeta, { color: theme.accentInk }, font(theme, 'semibold')]}>
              {`${((run.speed || INITIAL_SPEED) / INITIAL_SPEED).toFixed(1)}x`}
            </Text>
            {run.streak > 1 ? (
              <Text style={[styles.hudMeta, { color: theme.primary }, font(theme, 'semibold')]}>{`combo ${run.streak}`}</Text>
            ) : null}
          </View>
          <Pressable onPress={toggleMute} style={styles.hudIcon} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
            <Image source={muted ? runnerArt.ui.audioOff : runnerArt.ui.audioOn} style={styles.hudGlyph} />
          </Pressable>
        </View>
      </View>

      {isMulti && otherPlayers.length > 0 ? (
        <View style={[styles.opponents, { top: insets.top + 74 }]} pointerEvents="none">
          {otherPlayers.map((player) => (
            <View key={player.user_id} style={[styles.opponent, { backgroundColor: theme.glassFill, borderColor: theme.glassBorder }]}>
              <Text style={[styles.opponentName, { color: theme.text }]} numberOfLines={1}>{(player.full_name || 'Player').split(' ')[0]}</Text>
              <Text style={[styles.opponentScore, { color: theme.primary }]}>{player.finished ? 'done' : player.score}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {floater ? <View style={[styles.floaterWrap, { top: laneY(run.lane) - 130 }]} pointerEvents="none"><Floater key={floater.id} text={floater.text} color={theme.primary} /></View> : null}
      {toast ? (
        <View style={[styles.toast, { top: insets.top + 78, backgroundColor: theme.surface, borderColor: theme.accent }]} pointerEvents="none">
          <Image source={runnerArt.items.chip} style={styles.chipIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.toastTitle, { color: theme.text }, font(theme, 'semibold')]}>{toast.title}</Text>
            <Text style={[styles.toastLine, { color: theme.textSecondary }]}>{toast.line}</Text>
          </View>
        </View>
      ) : null}
      {milestone ? (
        <View style={[styles.milestone, { backgroundColor: theme.yellowTint }]} pointerEvents="none">
          <Image source={runnerArt.ui.star} style={styles.tipIcon} />
          <Text style={[styles.milestoneText, { color: theme.yellowInk }, font(theme, 'h3')]}>{milestone} points</Text>
        </View>
      ) : null}

      <View style={[styles.controls, { bottom: Math.max(insets.bottom, 10) }]}>
        <Control icon={runnerArt.ui.left} label="Lane left" onPress={() => press({ lane: -1 })} />
        <Control icon={runnerArt.ui.down} label="Duck" onPress={() => press({ duck: true })} />
        <Control icon={runnerArt.ui.up} label="Jump" onPress={() => press({ jump: true })} primary />
        <Control icon={runnerArt.ui.right} label="Lane right" onPress={() => press({ lane: 1 })} />
      </View>

      {paused ? (
        <View style={[styles.pauseScrim, { backgroundColor: theme.overlay }]}>
          <View style={[styles.pauseCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }, font(theme, 'h1')]}>Paused</Text>
            <PixelButton label="Resume" onPress={togglePause} icon={runnerArt.ui.play} />
            <View style={{ height: 10 }} />
            <PixelButton label={muted ? 'Unmute' : 'Mute'} onPress={toggleMute} variant="secondary" icon={muted ? runnerArt.ui.audioOff : runnerArt.ui.audioOn} />
            <View style={{ height: 10 }} />
            <PixelButton label="Quit" onPress={quit} variant="secondary" icon={runnerArt.ui.home} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Control({ icon, label, onPress, primary }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: primary ? theme.primary : theme.glassFill, borderColor: primary ? theme.primary : theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Image source={icon} style={[styles.controlIcon, primary && styles.controlIconOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: '#F7FBFD' },
  startScroll: { paddingHorizontal: 24, alignItems: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' },
  overScroll: { paddingHorizontal: 24, alignItems: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },
  backSpacer: { height: 44, alignSelf: 'flex-start' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  iconGlyph: { width: 22, height: 22 },
  heroSprite: { width: 120, height: 150, marginTop: 8 },
  title: { fontSize: 36, color: '#0B1B3A', marginTop: 4 },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 16 },
  tipCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 14, gap: 12, marginBottom: 16 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipIcon: { width: 22, height: 22 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  bestPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  bestText: { fontSize: 14 },
  pixelPress: { width: '100%', maxWidth: 420 },
  pixelBtn: { minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  pixelBtnImage: { borderRadius: 12 },
  pixelIcon: { width: 20, height: 20 },
  pixelIconOn: { tintColor: '#fff' },
  hudPace: { alignItems: 'flex-end', minWidth: 54 },
  pixelLabel: { fontSize: 16, letterSpacing: 0.3 },
  muteLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, minHeight: 44, paddingHorizontal: 8 },
  muteText: { fontSize: 14 },
  span: { position: 'absolute', top: 0, bottom: 0 },
  moon: { position: 'absolute', top: 24, width: 64, height: 64 },
  groundWrap: { position: 'absolute', left: 0, right: 0, height: 150 },
  horizon: { position: 'absolute', left: 0, right: 0, top: 16, height: 3, backgroundColor: '#3BB8C4' },
  laneGuide: { position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4 },
  playerSprite: { width: SPRITE_W, height: SPRITE_H },
  shadow: {
    position: 'absolute', alignSelf: 'center', width: 46, height: 10, borderRadius: 8, backgroundColor: 'rgba(11,27,58,0.18)',
  },
  ghost: { position: 'absolute', width: 70, alignItems: 'center', opacity: 0.55 },
  ghostName: { fontSize: 10, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 6, paddingHorizontal: 4, marginBottom: 2 },
  ghostSprite: { width: 58, height: 80 },
  hud: { position: 'absolute', left: 14, right: 14 },
  hudCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  hudIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hudGlyph: { width: 22, height: 22 },
  hudScore: { fontSize: 22, lineHeight: 24 },
  hudMeta: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  pips: { flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center' },
  pip: { width: 12, height: 12, borderRadius: 6 },
  opponents: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opponent: { flexDirection: 'row', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  opponentName: { fontSize: 11, fontWeight: '700', maxWidth: 72 },
  opponentScore: { fontSize: 11, fontWeight: '800' },
  floaterWrap: { position: 'absolute', left: PLAYER_X, width: 120 },
  floater: { fontSize: 18, fontWeight: '800' },
  toast: {
    position: 'absolute', left: 16, right: 16, borderRadius: 14, borderWidth: 1, padding: 10,
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  toastTitle: { fontSize: 14 },
  toastLine: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  milestone: {
    position: 'absolute', alignSelf: 'center', top: '38%', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  milestoneText: { fontSize: 16 },
  controls: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  control: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  controlIcon: { width: 26, height: 26 },
  controlIconOn: { tintColor: '#fff' },
  pauseScrim: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pauseCard: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 22 },
  overKicker: { letterSpacing: 3, fontSize: 13, marginTop: 4 },
  rankText: { marginTop: 6, fontSize: 15 },
  scoreHuge: { fontSize: 72, lineHeight: 78, marginTop: 4 },
  scoreCaption: { letterSpacing: 3, fontSize: 12, marginBottom: 8 },
  bestLine: { fontSize: 15, marginBottom: 6 },
  factCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 16, marginVertical: 12 },
  factKicker: { fontSize: 11, letterSpacing: 1.4, marginBottom: 6 },
  factTitle: { fontSize: 20, marginBottom: 6 },
  factBody: { fontSize: 14, lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipIcon: { width: 18, height: 18 },
  chipLabel: { fontSize: 12 },
  board: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 16 },
  boardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  boardRank: { width: 22, fontSize: 14 },
  boardName: { flex: 1, fontSize: 14 },
  boardScore: { fontSize: 14 },
});
