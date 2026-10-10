import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, FlatList, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { gameRunnerService } from '../services/gameRunnerService';
import { authService } from '../services/authService';
import { getErrorMessage } from '../utils/errorMessages';
import { useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';
import { font } from '../components/ui/kit';

export default function GameRunnerLobbyScreen({ navigation }) {
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const [mode, setMode] = useState(null); // null | 'host' | 'join'
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myId, setMyId] = useState(null);
  const channelRef = useRef(null);
  const launchedRef = useRef(false);

  const teardownChannel = () => {
    if (!channelRef.current) return;
    gameRunnerService.unsubscribe(channelRef.current);
    channelRef.current = null;
  };

  useEffect(() => {
    authService.getCurrentUser().then(u => setMyId(u?.id));
    return teardownChannel;
  }, []);

  const refreshPlayers = async (roomId) => {
    const p = await gameRunnerService.getRoomPlayers(roomId);
    setPlayers(p);
  };

  const handleHost = async () => {
    setLoading(true); setError('');
    const r = await gameRunnerService.createRoom();
    if (!r) { setError('Could not create room. Try again.'); setLoading(false); return; }
    setRoom(r);
    setMode('host');
    await refreshPlayers(r.id);
    channelRef.current = gameRunnerService.subscribeToRoom(
      r.id,
      () => refreshPlayers(r.id),
      (updated) => { if (updated.status === 'playing') launchGame(r.id); }
    );
    setLoading(false);
  };

  const handleJoin = async () => {
    if (joinCode.length < 4) { setError('Enter a valid room code.'); return; }
    setLoading(true); setError('');
    try {
      const r = await gameRunnerService.joinRoom(joinCode);
      setRoom(r);
      setMode('join');
      await refreshPlayers(r.id);
      channelRef.current = gameRunnerService.subscribeToRoom(
        r.id,
        () => refreshPlayers(r.id),
        (updated) => { if (updated.status === 'playing') launchGame(r.id); }
      );
    } catch (e) {
      setError(getErrorMessage(e, { context: 'GameRunnerLobby', fallback: 'Room not found.' }));
    }
    setLoading(false);
  };

  const handleStart = async () => {
    if (!room) return;
    setError('');
    try {
      await gameRunnerService.startRoom(room.id);
      launchGame(room.id);
    } catch (e) {
      setError(getErrorMessage(e, { context: 'GameRunnerLobby', fallback: 'Could not start the game. Try again.' }));
    }
  };

  const launchGame = (roomId) => {
    if (launchedRef.current) return;
    launchedRef.current = true;
    // Deferred: this can be called from inside the room channel's own
    // realtime dispatch (the 'playing' status update). Tearing the channel
    // down synchronously from within its own message handler crashes the
    // realtime client, so we let that dispatch finish unwinding first.
    setTimeout(() => {
      teardownChannel();
      navigation.navigate('Game', { roomId, multiplayer: true });
    }, 0);
  };

  const isHost = room && players[0]?.user_id === myId;

  const glassBack = [s.backBtn, { backgroundColor: theme.glassFill, borderColor: theme.glassBorder }];

  if (mode === 'host' || mode === 'join') {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => { teardownChannel(); setMode(null); setRoom(null); }} style={glassBack} accessibilityRole="button" accessibilityLabel="Back to lobby">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }, font(theme, 'h2')]}>Waiting room</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.column}>
          <View style={[s.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.codeLabel, { color: theme.textTertiary }, font(theme, 'semibold')]}>Room code</Text>
            <Text style={[s.codeValue, { color: theme.primary }, font(theme, 'display')]}>{room?.code}</Text>
            <Text style={[s.codeHint, { color: theme.textSecondary }, font(theme, 'body')]}>Share this code with classmates</Text>
          </View>

          <Text style={[s.sectionLabel, { color: theme.textTertiary }, font(theme, 'semibold')]}>Players ({players.length})</Text>
          <FlatList
            data={players}
            keyExtractor={p => p.id}
            style={s.playerList}
            renderItem={({ item, index }) => (
              <View style={[s.playerRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.playerAvatar, { backgroundColor: index === 0 ? theme.secondary : theme.tint }]}>
                  <Text style={[s.playerInitial, { color: index === 0 ? theme.accentInk : theme.primaryInk }, font(theme, 'h2')]}>{(item.full_name || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={[s.playerName, { color: theme.text }, font(theme, 'semibold')]}>{item.full_name || 'Player'}</Text>
                {index === 0 && (
                  <Text style={[s.hostBadge, { color: theme.yellowInk, backgroundColor: theme.yellowTint }, font(theme, 'semibold')]}>Host</Text>
                )}
              </View>
            )}
          />

          {isHost && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: theme.primary }, players.length < 2 && s.startBtnDisabled]}
              onPress={handleStart}
              disabled={players.length < 2}
              accessibilityRole="button"
              accessibilityLabel={players.length < 2 ? 'Waiting for players' : 'Start race'}
            >
              <Text style={[s.actionBtnText, font(theme, 'semibold')]}>
                {players.length < 2 ? 'Waiting for players...' : 'Start race'}
              </Text>
            </TouchableOpacity>
          )}
          {!isHost && (
            <View style={s.waitingWrap}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[s.waitingText, { color: theme.textSecondary }, font(theme, 'body')]}>Waiting for host to start...</Text>
            </View>
          )}
          {error ? <Text style={[s.errorText, { color: theme.error }]}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          {shellBack ? <View style={{ width: 44 }} /> : (
            <TouchableOpacity onPress={() => leaveScreen(navigation)} style={glassBack} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </TouchableOpacity>
          )}
          <Text style={[s.headerTitle, { color: theme.text }, font(theme, 'h2')]}>CompuRunner</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.heroWrap}>
          <View style={[s.heroMark, { backgroundColor: theme.tint }]}>
            <Ionicons name="game-controller" size={32} color={theme.primary} />
          </View>
          <Text style={[s.heroTitle, { color: theme.text }, font(theme, 'h1')]}>CompuRunner</Text>
          <Text style={[s.heroSub, { color: theme.textSecondary }, font(theme, 'body')]}>Dodge obstacles, collect PC components{'\n'}and race classmates to the finish!</Text>
        </View>

        <View style={s.modesWrap}>
          <TouchableOpacity
            style={[s.modeCard, { backgroundColor: theme.tint, borderColor: theme.border }]}
            onPress={() => navigation.navigate('Game')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Solo Run"
          >
            <Ionicons name="person" size={28} color={theme.primary} />
            <Text style={[s.modeTitle, { color: theme.text }, font(theme, 'h3')]}>Solo Run</Text>
            <Text style={[s.modeDesc, { color: theme.textSecondary }, font(theme, 'body')]}>Practice alone, chase{'\n'}your high score</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeCard, { backgroundColor: theme.secondary, borderColor: theme.border }]}
            onPress={handleHost}
            activeOpacity={0.85}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Host Race"
          >
            <Ionicons name="people" size={28} color={theme.accentInk} />
            <Text style={[s.modeTitle, { color: theme.text }, font(theme, 'h3')]}>Host Race</Text>
            <Text style={[s.modeDesc, { color: theme.textSecondary }, font(theme, 'body')]}>Create a room and invite{'\n'}classmates with a code</Text>
          </TouchableOpacity>
        </View>

        <View style={s.joinWrap}>
          <Text style={[s.joinLabel, { color: theme.textTertiary }, font(theme, 'semibold')]}>Join with code</Text>
          <View style={s.joinRow}>
            <TextInput
              style={[s.joinInput, { backgroundColor: theme.surface, borderColor: theme.inputBorder, color: theme.text }, font(theme, 'h2')]}
              value={joinCode}
              onChangeText={t => setJoinCode(t.toUpperCase())}
              placeholder="XXXXXX"
              placeholderTextColor={theme.textTertiary}
              maxLength={6}
              autoCapitalize="characters"
              accessibilityLabel="Room code"
            />
            <TouchableOpacity
              style={[s.joinBtn, { backgroundColor: theme.primary }]}
              onPress={handleJoin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Join"
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[s.joinBtnText, font(theme, 'semibold')]}>Join</Text>}
            </TouchableOpacity>
          </View>
          {error ? <Text style={[s.errorText, { color: theme.error }]}>{error}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 48 },
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8, paddingHorizontal: 20, width: '100%', maxWidth: 720, alignSelf: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, color: '#0B1B3A' },
  heroWrap: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  heroMark: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 28, marginBottom: 8 },
  heroSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modesWrap: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20 },
  modeCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 18, alignItems: 'center', minHeight: 148 },
  modeTitle: { fontSize: 16, marginTop: 10, marginBottom: 4 },
  modeDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  joinLabel: { fontSize: 14, marginBottom: 8 },
  joinWrap: { marginBottom: 24, width: '100%', maxWidth: 400, alignSelf: 'center', paddingHorizontal: 20 },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  joinInput: { flex: 1, borderRadius: 14, paddingHorizontal: 16, minHeight: 48, height: 48, fontSize: 18, letterSpacing: 4, borderWidth: 1 },
  joinBtn: { height: 48, minWidth: 88, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { fontSize: 15, color: '#fff' },
  errorText: { fontSize: 13, marginTop: 8 },
  codeBox: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  codeLabel: { fontSize: 13, marginBottom: 6 },
  codeValue: { fontSize: 36, letterSpacing: 8, marginBottom: 4 },
  codeHint: { fontSize: 13 },
  sectionLabel: { fontSize: 14, marginBottom: 10 },
  playerList: { flex: 1, marginBottom: 16 },
  playerRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1 },
  playerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  playerInitial: { fontSize: 16 },
  playerName: { flex: 1, fontSize: 15 },
  hostBadge: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  actionBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16, width: '100%', maxWidth: 400, alignSelf: 'center' },
  startBtnDisabled: { opacity: 0.45 },
  actionBtnText: { fontSize: 15, color: '#fff' },
  waitingWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 16, minHeight: 48 },
  waitingText: { fontSize: 14 },
});
