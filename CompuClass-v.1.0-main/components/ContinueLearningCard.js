import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { TYPE, topicTone } from './mazeTheme';

const TEXT = '#0B1B3A';
const MUTED = '#44526F';

/**
 * ContinueLearningCard
 * Rendered only when there is real progress to continue — the caller decides,
 * via continueTarget(), so this never invents a topic or a level.
 *
 * Props:
 *   topic          { id, label, icon, color }
 *   levelsCleared  levels already finished
 *   total          levels in the topic
 *   levelLabel     name of the stage they are up to, e.g. "DEEP CACHE"
 *   questionsDone  real answered-question count, or 0 to hide the line
 *   onPress        () => void
 */
function ContinueLearningCard({ topic, levelsCleared, total, levelLabel, questionsDone = 0, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const tone = topicTone(topic.id);

  const ratio   = total > 0 ? levelsCleared / total : 0;
  const percent = Math.round(ratio * 100);
  const nextLevel = Math.min(levelsCleared + 1, total);

  return (
    <Animated.View style={[s.wrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => press(0.985)}
        onPressOut={() => press(1)}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`Continue learning ${topic.label}, level ${nextLevel} of ${total}, ${percent} percent complete`}
        accessibilityHint="Resumes this topic"
      >
        <View style={[s.card, { backgroundColor: '#FFFFFF', borderColor: tone.wash }]}>
          <View style={s.headRow}>
            <Ionicons name="flash" size={13} color={tone.ink} />
            <Text style={[s.eyebrow, { color: tone.ink }]} maxFontSizeMultiplier={1.3}>CONTINUE LEARNING</Text>
          </View>

          <View style={s.body}>
            <View style={s.bodyText}>
              <Text style={s.topicName} numberOfLines={1} maxFontSizeMultiplier={1.3}>{topic.label}</Text>
              <Text style={s.levelLine} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                Level {nextLevel} of {total}{levelLabel ? `  •  ${levelLabel}` : ''}
              </Text>
              {questionsDone > 0 && (
                <Text style={s.questions} maxFontSizeMultiplier={1.2}>{questionsDone} questions answered</Text>
              )}
            </View>
            <View style={[s.iconBubble, { backgroundColor: tone.wash }]}>
              <Ionicons name={topic.icon} size={22} color={tone.ink} />
            </View>
          </View>

          <View style={s.progressRow}>
            <ProgressBar ratio={ratio} color={tone.ink} track="#E6EDF4" height={7} style={s.bar} />
            <Text style={[s.percent, { color: tone.ink }]} maxFontSizeMultiplier={1.2}>{percent}%</Text>
          </View>

          <View style={[s.cta, { backgroundColor: tone.accent }]}>
            <Text style={[s.ctaText, { color: tone.onAccent }]} maxFontSizeMultiplier={1.2}>CONTINUE</Text>
            <Ionicons name="arrow-forward" size={14} color={tone.onAccent} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap:        { borderRadius: 20, shadowColor: '#0B1B3A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  card:        { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  headRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow:     { ...TYPE.sectionLabel },
  body:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bodyText:    { flex: 1, gap: 2 },
  topicName:   { fontSize: 19, fontWeight: '900', color: TEXT, letterSpacing: 0.2 },
  levelLine:   { fontSize: 13, fontWeight: '600', color: MUTED },
  questions:   { fontSize: 12, fontWeight: '500', color: MUTED, marginTop: 2 },
  iconBubble:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar:         { flex: 1 },
  percent:     { fontSize: 12, fontWeight: '900', minWidth: 38, textAlign: 'right' },
  cta:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, minHeight: 48, height: 48, maxWidth: 400, width: '100%', alignSelf: 'center' },
  ctaText:     { fontSize: 15, fontWeight: '700' },
});

export default React.memo(ContinueLearningCard);
