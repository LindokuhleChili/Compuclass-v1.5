import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { authService } from '../services/authService';
import { classService } from '../services/classService';
import { filterByClassScope } from '../utils/classScope';
import { gamificationService } from '../services/gamificationservice';
import {
  ACTIVITY_SCREENS, WINDOWS_SCREEN, chooseContinueLearning, latestActivityScreen,
} from '../utils/continueLearning';
import { useTheme } from '../context/ThemeContext';
import { Icon } from '../components/ui/Icon';
import { GameArt } from '../components/ui/art';
import {
  Page, Heading, Body, Card, Glass, Badge, Button, IconTile, SectionHeader, Skeleton, Mark, useLayout, font,
} from '../components/ui/kit';

const PASS_SCORE = 70;

const TIPS = [
  { title: 'Open your clipboard history', body: 'Press Win + V to see the last things you copied and paste any of them again.' },
  { title: 'The CPU runs every instruction', body: 'More cores help when several programs need the processor at the same time.' },
  { title: 'RAM is temporary', body: 'Closing apps frees memory immediately. It is not where files are stored.' },
  { title: 'Match the power supply', body: 'A supply that is too weak can shut the PC down or damage parts.' },
];

const QUICK = [
  { icon: 'book', label: 'Materials', screen: 'Materials', tone: 'blue' },
  { icon: 'monitor', label: 'PC Lab', screen: 'PC Lab', tone: 'teal' },
  { icon: 'cpu', label: 'PC Assembly', screen: 'PC Assembly', tone: 'blue' },
  { icon: 'windows', label: 'Windows 11', screen: 'Windows 11', tone: 'teal' },
  { icon: 'quiz', label: 'Quiz', screen: 'Quiz', tone: 'blue' },
  { icon: 'trophy', label: 'Leaderboard', screen: 'Leaderboard', tone: 'teal' },
  { icon: 'wrench', label: 'Troubleshooting', screen: 'Troubleshoot', tone: 'blue' },
  { icon: 'bot', label: 'CompuBot', screen: 'Chatbot', tone: 'teal' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const { laptop } = useLayout();
  const [user, setUser] = useState(null);
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolledClass, setEnrolledClass] = useState(null);
  const [stats, setStats] = useState({ passed: 0, points: 0, streak: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [continueTarget, setContinueTarget] = useState(null);
  const tip = TIPS[new Date().getDate() % TIPS.length];

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const u = await authService.getCurrentUser();
      setUser(u);
      const gamify = await gamificationService.getMyStats();

      const { data: classStudents } = await supabase
        .from('class_students').select('class_id, classes(name)').eq('student_id', u.id).limit(1);
      setEnrolledClass(classStudents?.length > 0 ? classStudents[0].classes?.name || null : null);
      const classIds = classStudents?.map((cs) => cs.class_id) || [];

      let assignedQuizIds = [];
      if (classIds.length > 0) {
        const { data: assignments } = await supabase.from('quiz_assignments').select('quiz_id').in('class_id', classIds);
        assignedQuizIds = assignments?.map((a) => a.quiz_id) || [];
      }

      const { data: allAttempts } = await supabase
        .from('quiz_attempts').select('quiz_id, score, completed_at').eq('user_id', u.id)
        .order('completed_at', { ascending: false });

      const attemptedIds = new Set(allAttempts?.map((a) => a.quiz_id) || []);
      const pendingIds = assignedQuizIds.filter((id) => !attemptedIds.has(id));
      let pending = [];
      if (pendingIds.length > 0) {
        const { data: pendingData } = await supabase.from('quizzes').select('*').in('id', pendingIds).limit(3);
        pending = pendingData || [];
      }
      setPendingQuizzes(pending);

      const passed = allAttempts?.filter((a) => a.score >= PASS_SCORE).length || 0;
      let streak = gamify?.current_streak || 0;
      if (!streak && allAttempts?.length) {
        const days = [...new Set(allAttempts.map((a) => new Date(a.completed_at).toDateString()))];
        const today = new Date();
        streak = 0;
        for (let i = 0; i < days.length; i += 1) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (days.includes(d.toDateString())) streak += 1;
          else break;
        }
      }
      setStats({ passed, points: gamify?.xp || 0, streak });

      const scope = await classService.classScopeForCurrentUser();
      const { data: announcementsData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3);
      setAnnouncements(filterByClassScope(announcementsData || [], scope));

      let materials = [];
      try {
        const { data: folderRows } = await supabase.from('folders').select('id, name, created_at, class_id').order('created_at', { ascending: false });
        materials = filterByClassScope(folderRows || [], scope).map((folder) => ({
          id: folder.id,
          title: folder.name,
          created_at: folder.created_at,
          read: false,
        }));
      } catch { materials = []; }

      const events = [];
      const latestAttempt = allAttempts?.[0]?.completed_at;
      if (latestAttempt) events.push({ screen: 'Quiz', at: latestAttempt });
      try {
        const { data: sessions } = await supabase
          .from('windows_simulation_sessions')
          .select('session_start, session_end')
          .eq('user_id', u.id)
          .order('session_start', { ascending: false })
          .limit(1);
        const session = Array.isArray(sessions) ? sessions[0] : null;
        if (session?.session_start) events.push({ screen: WINDOWS_SCREEN, at: session.session_end || session.session_start });
      } catch { /* no simulator history */ }
      try {
        const raw = await AsyncStorage.getItem('progress_updated_at');
        const meta = raw ? JSON.parse(raw) : {};
        Object.entries(ACTIVITY_SCREENS).forEach(([key, screen]) => {
          if (meta?.[key]) events.push({ screen, at: meta[key] });
        });
      } catch { /* local progress times are optional */ }

      setContinueTarget(chooseContinueLearning({
        pendingQuizzes: pending,
        materials,
        lastScreen: latestActivityScreen(events),
        now: new Date(),
      }));
    } catch {
      setContinueTarget((current) => current || chooseContinueLearning({ now: new Date() }));
    }
    finally { setLoading(false); }
  };

  const displayName = user?.user_metadata?.full_name || user?.profile?.full_name || '';
  const firstName = displayName.split(' ')[0];
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const hero = (
    <View style={[styles.hero, { borderColor: theme.border }]}>
      <View style={styles.heroBlob} />
      <View style={styles.heroMark}><Mark size={laptop ? 220 : 120} /></View>
      <Glass strong radius={laptop ? 24 : 20} style={[styles.heroPanel, laptop && { width: 480, right: undefined }]}>
        <Text style={[{ fontSize: 12, lineHeight: 16, color: theme.textSecondary, marginBottom: 4 }, font(theme, 'semibold')]}>Continue learning</Text>
        {loading && !continueTarget ? (
          <Skeleton height={28} width="70%" />
        ) : (
          <Text testID="continue-title" style={[{ fontSize: laptop ? 22 : 17, lineHeight: laptop ? 30 : 24, color: theme.text }, font(theme, 'h2')]} numberOfLines={2}>
            {continueTarget?.title || 'Choose a lesson'}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={[styles.track, { backgroundColor: theme.borderLight }]}>
              <View style={[styles.fill, { width: continueTarget ? '16%' : '0%', backgroundColor: continueTarget?.kind === 'windows' ? theme.accent : theme.primary }]} />
            </View>
            <Text style={[{ fontSize: 12, lineHeight: 16, color: theme.textSecondary, marginTop: 6 }, font(theme, 'body')]}>
              {continueTarget?.detail || 'Loading your next step'}
            </Text>
          </View>
          <Button
            label="Resume"
            onPress={() => {
              if (!continueTarget?.screen) return;
              navigation.navigate(continueTarget.screen, continueTarget.params);
            }}
            disabled={!continueTarget?.screen}
            fit
            style={{ height: 44, minHeight: 44 }}
          />
        </View>
      </Glass>
    </View>
  );

  const statRow = (
    <Card style={styles.stats}>
      <View style={[styles.stat, styles.streak, { backgroundColor: theme.yellowTint }]}>
        <Icon name="flame" size={20} color={theme.yellowInk} tone={theme.iconToneYellow} />
        <Text style={[styles.num, font(theme, 'display'), { color: theme.text }]}>{loading ? '–' : `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`}</Text>
        <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Learning streak</Text>
      </View>
      <View style={[styles.stat, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
        <Icon name="check" size={20} color={theme.success} tone="transparent" />
        <Text style={[styles.num, font(theme, 'display'), { color: theme.text }]}>{loading ? '–' : stats.passed}</Text>
        <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Quizzes passed</Text>
      </View>
      <View style={[styles.stat, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
        <Icon name="trophy" size={20} color={theme.primary} />
        <Text style={[styles.num, font(theme, 'display'), { color: theme.text }]}>{loading ? '–' : stats.points.toLocaleString()}</Text>
        <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Points</Text>
      </View>
    </Card>
  );

  const pending = (
    <View style={{ marginBottom: 40 }}>
      <SectionHeader title="Pending quizzes" action="View all" onAction={() => navigation.navigate('Quiz')} />
      {loading ? (
        <Card style={{ padding: 16, gap: 12 }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
        </Card>
      ) : pendingQuizzes.length === 0 ? (
        <Card style={{ padding: 20 }}>
          <Text style={[{ color: theme.text, marginBottom: 4 }, font(theme, 'semibold')]}>{enrolledClass ? 'All caught up' : 'No class yet'}</Text>
          <Body variant="small">{enrolledClass ? 'No pending quizzes right now.' : 'Join a class to see quizzes from your lecturer.'}</Body>
          {!enrolledClass && (
            <Pressable onPress={() => navigation.navigate('JoinClass')} accessibilityRole="button" accessibilityLabel="Join a class" style={styles.textLink}>
              <Text style={[{ color: theme.primary, fontSize: 14 }, font(theme, 'semibold')]}>Join a class</Text>
            </Pressable>
          )}
        </Card>
      ) : (
        <Card>
          {pendingQuizzes.map((q, i) => (
            <Pressable key={q.id} onPress={() => navigation.navigate('Quiz', { quizId: q.id })} accessibilityRole="button" accessibilityLabel={`Open ${q.title}`} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.borderLight }]}>
              <IconTile name="quiz" tone="blue" />
              <View style={{ flex: 1 }}>
                <Text style={[{ color: theme.text }, font(theme, 'h3')]} numberOfLines={1}>{q.title}</Text>
                <Body variant="small">Pass mark {q.passing_score || 70}%</Body>
              </View>
              <Badge label="To do" kind="yellowStrong" />
            </Pressable>
          ))}
        </Card>
      )}
    </View>
  );

  const tipCard = (
    <View style={[styles.tip, { backgroundColor: theme.yellowWash, borderColor: '#F3E7A6' }]}>
      <View style={[styles.tipBar, { backgroundColor: theme.yellow }]} />
      <IconTile name="bulb" tone="yellow" />
      <View style={{ flex: 1 }}>
        <Text style={[{ fontSize: 12, color: theme.textTertiary, marginBottom: 4 }, font(theme, 'semibold')]}>Tip of the day</Text>
        <Text style={[{ color: theme.text, marginBottom: 4 }, font(theme, 'h3')]}>{tip.title}</Text>
        <Body variant="small">{tip.body}</Body>
      </View>
    </View>
  );

  const quick = (
    <View style={{ marginBottom: 40 }}>
      <SectionHeader title="Quick access" />
      <View style={[styles.quick, laptop && styles.quickLaptop]}>
        {QUICK.map((item) => (
          <Pressable key={item.screen} onPress={() => navigation.navigate(item.screen)} accessibilityRole="button" accessibilityLabel={item.label} style={[styles.quickItem, { borderColor: theme.border, backgroundColor: theme.surface }, laptop && styles.quickItemLaptop]}>
            <IconTile name={item.icon} tone={item.tone} size={laptop ? 44 : 40} />
            <Text style={[{ fontSize: 14, color: theme.text }, font(theme, 'semibold')]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const games = (
    <View style={{ marginBottom: 40 }}>
      <SectionHeader title="Play and learn" />
      <View style={[styles.games, laptop && { flexDirection: 'row' }]}>
        {[
          { route: 'GameRunnerLobby', title: 'CompuRunner', desc: 'Dodge hardware faults and keep running.', art: 'runner' },
          { route: 'CircuitMazeTopic', title: 'Circuit Maze', desc: 'Route the signal to the right component.', art: 'maze' },
        ].map((g) => (
          <Card key={g.route} style={[styles.game, laptop && { flex: 1 }]}>
            <View style={[styles.gameArt, { backgroundColor: theme.secondary, borderBottomColor: theme.border }]}>
              <GameArt kind={g.art} />
            </View>
            <View style={styles.gameInfo}>
              <View style={{ flex: 1 }}>
                <Text style={[{ color: theme.text }, font(theme, 'h3')]}>{g.title}</Text>
                <Body variant="small">{g.desc}</Body>
              </View>
              <Button label="Play" icon="play" fit onPress={() => navigation.navigate(g.route)} style={{ height: 44, minHeight: 44 }} />
            </View>
          </Card>
        ))}
      </View>
    </View>
  );

  const news = (
    <View style={{ marginBottom: 40 }}>
      <SectionHeader title="Announcements" />
      {announcements.length === 0 ? (
        <Card style={{ padding: 20 }}><Body variant="small">No announcements yet.</Body></Card>
      ) : (
        <Card>
          {announcements.map((a, i) => (
            <View key={a.id} style={[styles.row, { alignItems: 'flex-start' }, i > 0 && { borderTopWidth: 1, borderTopColor: theme.borderLight }]}>
              <IconTile name={i === 0 ? 'bell' : 'trophy'} tone={i === 0 ? 'blue' : 'teal'} />
              <View style={{ flex: 1 }}>
                <Text style={[{ color: theme.text }, font(theme, 'h3')]}>{a.title}</Text>
                {a.body ? <Body variant="small">{a.body}</Body> : null}
                <Text style={[{ fontSize: 12, color: theme.textTertiary, marginTop: 4 }, font(theme, 'body')]}>{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </View>
  );

  return (
    <Page>
      <View style={{ marginBottom: 24, marginTop: 8 }}>
        <Text style={[{ fontSize: 14, color: theme.textSecondary }, font(theme, 'semibold')]}>{dateLabel}</Text>
        <Heading level={1}>{loading && !firstName ? 'Good day' : `${getGreeting()}${firstName ? `, ${firstName}` : ''}`}</Heading>
        {enrolledClass ? <Body variant="small" style={{ marginTop: 4 }}>{enrolledClass}</Body> : null}
      </View>
      {laptop ? (
        <View style={{ flexDirection: 'row', gap: 40, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>{hero}{statRow}{quick}{games}</View>
          <View style={{ width: 340 }}>{pending}{tipCard}{news}</View>
        </View>
      ) : (
        <View>
          {hero}{statRow}{pending}{tipCard}{quick}{games}{news}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { height: 268, borderRadius: 24, overflow: 'hidden', borderWidth: 1, marginBottom: 24, backgroundColor: '#E7F2FB' },
  heroBlob: { position: 'absolute', right: -40, top: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(10,102,255,0.28)' },
  heroMark: { position: 'absolute', right: 8, top: 8 },
  heroPanel: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: 16 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  stats: { flexDirection: 'row', marginBottom: 40, overflow: 'hidden' },
  stat: { flex: 1, paddingVertical: 16, paddingHorizontal: 16 },
  streak: { borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  num: { fontSize: 26, lineHeight: 32, marginTop: 4 },
  statLabel: { fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, minHeight: 72 },
  textLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  tip: { flexDirection: 'row', gap: 16, padding: 20, borderWidth: 1, borderRadius: 16, marginBottom: 40, overflow: 'hidden' },
  tipBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickLaptop: { gap: 12 },
  quickItem: { width: '48%', flexGrow: 1, minHeight: 60, borderRadius: 16, borderWidth: 1, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickItemLaptop: { width: '22%', flexDirection: 'column', alignItems: 'flex-start', padding: 16, gap: 16, minHeight: 112 },
  games: { gap: 16 },
  game: { overflow: 'hidden' },
  gameArt: { height: 112, borderBottomWidth: 1 },
  gameInfo: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
});
