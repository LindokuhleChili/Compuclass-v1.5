import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StageArt } from '../components/ui/art';
import {
  ColourField, Glass, Heading, Body, Button, Mark, Wordmark, IconTile, useLayout, font,
} from '../components/ui/kit';

const SLIDES = [
  {
    title: 'Understand the machine in front of you',
    body: 'Short, visual lessons take you from the parts inside a PC to Windows 11 and everyday troubleshooting.',
    icon: 'cpu',
    chip: 'Processor',
    detail: 'Reads and runs every instruction',
  },
  {
    title: 'Practice by playing',
    body: 'CompuRunner and Circuit Maze turn what you just learned into quick rounds you can finish in a break.',
    icon: 'gamepad',
    chip: 'Circuit Maze',
    detail: 'Level 4 cleared, +120 points',
  },
  {
    title: 'Climb the leaderboard',
    body: 'Earn points from quizzes and games, compare with classmates, and keep your streak going.',
    icon: 'trophy',
    chip: 'You are 7th this week',
    detail: '160 points behind 6th place',
  },
];

export default function OnboardingScreen({ onComplete, onCreateAccount }) {
  const { theme } = useTheme();
  const { laptop } = useLayout();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  const next = () => {
    if (!last) {
      setIndex((n) => n + 1);
      return;
    }
    if (onCreateAccount) onCreateAccount();
    else onComplete?.();
  };

  const stage = (
    <View style={[styles.stage, laptop && styles.stageLaptop, { borderColor: theme.border }]}>
      <View style={styles.glow} />
      <StageArt index={index} />
      <Glass radius={18} strong style={[styles.chip, laptop && styles.chipLaptop]}>
        <IconTile name={slide.icon} tone="yellow" />
        <View style={{ flexShrink: 1 }}>
          <Text style={[{ fontSize: 14, color: theme.text }, font(theme, 'semibold')]}>{slide.chip}</Text>
          <Text style={[{ fontSize: 12, lineHeight: 16, color: theme.textSecondary }, font(theme, 'body')]}>{slide.detail}</Text>
        </View>
      </Glass>
    </View>
  );

  const copy = (
    <View style={[styles.copy, laptop && styles.copyLaptop]}>
      <Heading level="display" style={styles.title}>{slide.title}</Heading>
      <Body style={{ maxWidth: 420 }}>{slide.body}</Body>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{ width: i === index ? 28 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? theme.primary : '#C5D3E2' }} />
        ))}
      </View>
      <View style={[styles.cta, laptop && styles.ctaLaptop]}>
        {last ? (
          <>
            <Button label="Create account" onPress={() => (onCreateAccount ? onCreateAccount() : onComplete?.())} />
            <Button label="I already have an account" variant="secondary" onPress={onComplete} />
          </>
        ) : (
          <Button label="Next" onPress={next} />
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ColourField />
      <View style={[styles.frame, laptop && styles.frameLaptop]}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <Mark size={44} />
            <Wordmark />
          </View>
          {!last ? (
            <Pressable onPress={onComplete} accessibilityRole="button" accessibilityLabel="Skip" style={styles.skip}>
              <Text style={[{ color: theme.primary, fontSize: 14 }, font(theme, 'semibold')]}>Skip</Text>
            </Pressable>
          ) : <View style={{ width: 44 }} />}
        </View>
        {laptop ? (
          <>
            {copy}
            {stage}
          </>
        ) : (
          <>
            {stage}
            {copy}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, zIndex: 1 },
  frameLaptop: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 1360, width: '100%', alignSelf: 'center', paddingHorizontal: 56, paddingVertical: 40, columnGap: 80 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, width: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  skip: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  stage: { height: 380, marginTop: 16, marginBottom: 24, borderRadius: 28, overflow: 'hidden', borderWidth: 1, backgroundColor: '#E7F3F8' },
  stageLaptop: { flex: 1, minWidth: 360, height: undefined, minHeight: 560, marginTop: 24, marginBottom: 0, borderRadius: 36 },
  glow: { position: 'absolute', left: -40, bottom: -60, width: 260, height: 220, borderRadius: 140, backgroundColor: 'rgba(255,230,128,0.55)' },
  chip: { position: 'absolute', left: 20, bottom: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  chipLaptop: { right: undefined, maxWidth: 360, left: 32, bottom: 32, paddingVertical: 16, paddingHorizontal: 20 },
  copy: { flex: 1 },
  copyLaptop: { width: 440, flex: undefined, alignSelf: 'center', paddingBottom: 48 },
  title: { marginBottom: 12 },
  dots: { flexDirection: 'row', gap: 8, marginVertical: 24 },
  cta: { marginTop: 'auto', gap: 8 },
  ctaLaptop: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 0, gap: 12 },
});
