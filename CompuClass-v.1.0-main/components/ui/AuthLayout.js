import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
  ColourField, Glass, Heading, Body, Logo, Mark, IconTile, useLayout, font,
} from './kit';

const BULLETS = [
  { icon: 'book', tone: 'blue', text: 'Lessons from hardware to Windows 11' },
  { icon: 'quiz', tone: 'teal', text: 'Quizzes that show what to revise' },
  { icon: 'trophy', tone: 'neutral', text: 'Games and a class leaderboard' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { theme } = useTheme();
  const { laptop } = useLayout();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ColourField />
      <ScrollView contentContainerStyle={[styles.scroll, laptop && styles.scrollLaptop]} keyboardShouldPersistTaps="handled">
        {laptop ? (
          <View style={[styles.aside, { borderColor: theme.border }]}>
            <View style={styles.asideGlow} />
            <Mark size={420} />
            <Glass radius={28} strong style={styles.asideCard}>
              <Text style={[{ fontSize: 36, lineHeight: 42, letterSpacing: -0.6, color: theme.text, marginBottom: 24 }, font(theme, 'display')]}>
                Learn how computers work, one step at a time.
              </Text>
              <View style={{ gap: 16 }}>
                {BULLETS.map((b) => (
                  <View key={b.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <IconTile name={b.icon} tone={b.tone} />
                    <Text style={[{ flex: 1, fontSize: 16, lineHeight: 24, color: theme.text }, font(theme, 'semibold')]}>{b.text}</Text>
                  </View>
                ))}
              </View>
            </Glass>
          </View>
        ) : null}
        <View style={styles.formCol}>
          <View style={styles.formIn}>
            <Logo size={96} />
            <Heading level={1} style={{ marginTop: 16, marginBottom: 8 }}>{title}</Heading>
            <Body style={{ marginBottom: 32 }}>{subtitle}</Body>
            {children}
            {footer}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function AuthLink({ prefix, label, onPress }) {
  const { theme } = useTheme();
  return (
    <View style={styles.linkRow}>
      <Text style={[{ fontSize: 14, color: theme.textSecondary }, font(theme, 'body')]}>{prefix}</Text>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.linkHit}>
        <Text style={[{ color: theme.primary, fontSize: 14 }, font(theme, 'semibold')]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, zIndex: 1 },
  scrollLaptop: { flexDirection: 'row', gap: 24, padding: 24, minHeight: '100%' },
  aside: {
    flex: 1.1, borderRadius: 36, overflow: 'hidden', borderWidth: 1, minHeight: 640,
    backgroundColor: '#E7F3F8', justifyContent: 'flex-end', padding: 56,
  },
  asideGlow: { position: 'absolute', left: -60, bottom: -80, width: 420, height: 320, borderRadius: 200, backgroundColor: 'rgba(255,230,128,0.55)' },
  asideCard: { padding: 32, maxWidth: 480 },
  formCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  formIn: { width: '100%', maxWidth: 400, alignItems: 'flex-start' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', marginTop: 24, flexWrap: 'wrap' },
  linkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
