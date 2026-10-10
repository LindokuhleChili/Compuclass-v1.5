import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { TYPE, bulletise, topicTone } from './mazeTheme';
import { TOPIC_STATE } from '../services/circuitMazeProgress';

const TEXT = '#0B1B3A';
const MUTED = '#44526F';
const TRACK = '#E6EDF4';

/**
 * TopicCard
 * Props:
 *   topic    { id, label, icon, color, desc }
 *   progress { levelsCleared, total, ratio, state }  — from topicProgress()
 *   locked   boolean, plus lockHint text (no topic gating exists yet; the
 *            state is here so gating can be switched on without a redesign)
 *   width    resolved column width
 *   onPress  () => void
 */
function TopicCard({ topic, progress, locked = false, lockHint, width, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;
  const tone = topicTone(topic.id);

  const animate = (toScale, toGlow) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(glow,  { toValue: toGlow, duration: 140, useNativeDriver: true }),
    ]).start();
  };

  const { levelsCleared, total, ratio, state } = progress;
  const done       = state === TOPIC_STATE.COMPLETED;
  const started    = state === TOPIC_STATE.IN_PROGRESS;
  const accent     = locked ? MUTED : tone.ink;

  const a11yLabel = locked
    ? `${topic.label}, locked. ${lockHint || 'Not yet available'}`
    : done
      ? `${topic.label}, completed. All ${total} levels cleared`
      : `${topic.label}. ${started ? `Level ${levelsCleared} of ${total} cleared` : 'Not started'}`;

  return (
    <Animated.View style={[{ width, transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={locked ? undefined : onPress}
        onPressIn={locked ? undefined : () => animate(0.97, 1)}
        onPressOut={locked ? undefined : () => animate(1, 0)}
        activeOpacity={1}
        disabled={locked}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={locked ? undefined : 'Opens this topic'}
        accessibilityState={{ disabled: locked, selected: started }}
      >
        <View style={[s.shell, locked && s.shellLocked]}>
          <Animated.View
            pointerEvents="none"
            style={[s.pressGlow, { backgroundColor: tone.wash, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }) }]}
          />
          <View style={[s.card, { backgroundColor: '#FFFFFF', borderColor: locked ? '#E6EDF4' : tone.wash }]}>
            <View style={s.topRow}>
              <View style={[s.iconWrap, { backgroundColor: locked ? '#EAF0F6' : tone.wash }]}>
                <Ionicons name={locked ? 'lock-closed' : topic.icon} size={20} color={accent} />
              </View>
              {done && (
                <View style={[s.badge, { borderColor: tone.wash, backgroundColor: tone.wash }]}>
                  <Ionicons name="checkmark" size={11} color={tone.ink} />
                </View>
              )}
            </View>

            <Text style={[s.title, locked && s.titleLocked]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {topic.label}
            </Text>

            <Text style={s.desc} numberOfLines={2} maxFontSizeMultiplier={1.2}>
              {locked ? (lockHint || 'Locked') : bulletise(topic.desc)}
            </Text>

            <View style={s.footer}>
              {done ? (
                <Text style={[s.meta, { color: accent }]} maxFontSizeMultiplier={1.2}>Completed</Text>
              ) : (
                <Text style={[s.meta, { color: MUTED }]} maxFontSizeMultiplier={1.2}>
                  Level {levelsCleared} / {total}
                </Text>
              )}
              <ProgressBar
                ratio={locked ? 0 : ratio}
                color={locked ? MUTED : tone.ink}
                track={TRACK}
                segments={total}
                height={5}
                style={s.bar}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  shell: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0B1B3A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  shellLocked: { opacity: 0.55 },
  pressGlow:   { ...StyleSheet.absoluteFillObject, zIndex: 2, borderRadius: 18 },
  card:        { borderRadius: 18, borderWidth: 1, padding: 14, gap: 7, minHeight: 152, justifyContent: 'flex-start' },
  topRow:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconWrap:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge:       { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title:       { ...TYPE.cardTitle, color: TEXT },
  titleLocked: { color: MUTED },
  desc:        { ...TYPE.cardDesc, color: MUTED },
  footer:      { marginTop: 'auto', gap: 6, paddingTop: 4 },
  meta:        TYPE.meta,
  bar:         { width: '100%' },
});

export default React.memo(TopicCard);
