import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lecturerService } from '../services/lecturerService';
import { getErrorMessage } from '../utils/errorMessages';
import { appTheme, useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';
import { formatShortDate, normalizeOptions, passingMark, summarizeQuizAttempts } from '../utils/quizFlow';

const BLUE = appTheme.primary; const RED = appTheme.error; const GREEN = appTheme.success;
const WHITE = appTheme.surface; const BG = appTheme.background; const TEXT = appTheme.text; const MUTED = appTheme.textSecondary; const BORDER = appTheme.border;

export default function QuizDetailScreen({ navigation, route }) {
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const { quizId } = route.params;
  const [quiz, setQuiz] = useState(null);
  const [status, setStatus] = useState('loading');
  const [results, setResults] = useState([]);
  const [resultsNote, setResultsNote] = useState('');
  const loadQuizRef = useRef(() => {});

  useEffect(() => { loadQuizRef.current(); }, []);

  const loadQuiz = async () => {
    setStatus('loading');
    try {
      const data = await lecturerService.getQuizDetail(quizId);
      setQuiz(data);
      setStatus('ready');
      try {
        const rows = await lecturerService.getQuizResults(quizId);
        setResults(rows);
        setResultsNote('');
      } catch (error) {
        console.error('Quiz results error:', error);
        setResults([]);
        setResultsNote('Results could not be loaded. Student scores stay on the progress screen when this quiz is shared.');
      }
    } catch (error) {
      setStatus('error');
      Alert.alert('Error', getErrorMessage(error, { context: 'QuizDetail' }));
    }
  };
  loadQuizRef.current = loadQuiz;

  const handleDeleteQuiz = () => {
    Alert.alert('Delete Quiz', 'Are you sure you want to delete this quiz?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await lecturerService.deleteQuiz(quizId); navigation.goBack(); Alert.alert('Success', 'Quiz deleted'); }
        catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'QuizDetail' })); }
      }},
    ]);
  };

  if (status === 'error') return (
    <View style={[styles.centered, { backgroundColor: theme.background }]} accessibilityRole="alert">
      <Text style={[styles.quizTitle, { color: theme.text }]}>Could not load this quiz</Text>
      <TouchableOpacity onPress={loadQuiz} style={[styles.deleteBtn, { backgroundColor: theme.primary, marginTop: 16, width: undefined, paddingHorizontal: 18 }]} accessibilityRole="button" accessibilityLabel="Try again">
        <Text style={{ color: WHITE, fontWeight: '800' }}>Try again</Text>
      </TouchableOpacity>
    </View>
  );

  if (!quiz) return (
    <View style={[styles.centered, { backgroundColor: theme.background }]} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.loadingText}>Loading quiz...</Text>
    </View>
  );

  const summary = summarizeQuizAttempts(results);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {shellBack ? <View style={styles.backBtn} /> : (
          <TouchableOpacity onPress={() => leaveScreen(navigation)} style={[styles.backBtn, { backgroundColor: theme.tint }]} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: TEXT }]} accessibilityRole="header">Quiz Details</Text>
        <TouchableOpacity onPress={handleDeleteQuiz} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel="Delete quiz">
          <Ionicons name="trash" size={18} color={RED} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.quizHeaderCard}>
          <View style={styles.quizIconWrap}>
            <Ionicons name="document-text" size={28} color={BLUE} />
          </View>
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="help-circle" size={14} color={BLUE} />
              <Text style={styles.metaText}>{quiz.quiz_questions?.length || 0} Questions</Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: GREEN + '15' }]}>
              <Ionicons name="checkmark-circle" size={14} color={GREEN} />
              <Text style={[styles.metaText, { color: GREEN }]}>{passingMark(quiz)}% to pass</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Results</Text>
        <View style={styles.questionCard}>
          {resultsNote ? <Text style={styles.optionText}>{resultsNote}</Text> : summary.count === 0 ? (
            <Text style={styles.optionText}>No attempts yet. Share this quiz with a class so students can take it.</Text>
          ) : (
            <>
              <Text style={styles.questionText}>{summary.count} attempt{summary.count === 1 ? '' : 's'} · average {summary.average}% · best {summary.best}%</Text>
              {results.slice(0, 8).map((attempt) => (
                <View key={attempt.id || `${attempt.user_id}-${attempt.completed_at}`} style={styles.optionItem}>
                  <Text style={[styles.optionText, { color: TEXT }]}>{attempt.full_name || 'Student'}</Text>
                  <Text style={[styles.optionText, { color: Number(attempt.score) >= passingMark(quiz) ? GREEN : RED, flex: 0 }]}>{attempt.score}%</Text>
                  {formatShortDate(attempt.completed_at) ? <Text style={styles.optionText}>{formatShortDate(attempt.completed_at)}</Text> : null}
                </View>
              ))}
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>Questions</Text>

        {quiz.quiz_questions?.length ? null : (
          <Text style={[styles.optionText, { marginBottom: 12 }]}>This quiz has no questions yet.</Text>
        )}

        {quiz.quiz_questions?.map((question, index) => (
          <View key={question.id || index} style={styles.questionCard}>
            <View style={styles.questionNumRow}>
              <View style={styles.questionNumBadge}>
                <Text style={styles.questionNumText}>Q{index + 1}</Text>
              </View>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
            <View style={styles.optionsWrap}>
              {normalizeOptions(question.options).map((option, optIndex) => {
                const isCorrect = question.correct_answer === option;
                return (
                  <View key={optIndex} style={[styles.optionItem, isCorrect && styles.optionCorrect]}>
                    <View style={[styles.optionLetter, isCorrect && { backgroundColor: '#E3F5EA' }]}>
                      <Text style={[styles.optionLetterText, isCorrect && { color: '#17743F' }]}>
                        {String.fromCharCode(65 + optIndex)}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, isCorrect && styles.optionTextCorrect]}>{option}</Text>
                    {isCorrect && <Ionicons name="checkmark-circle" size={18} color={GREEN} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: MUTED, fontSize: 14, marginTop: 12, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, gap: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDF4FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
  deleteBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: RED + '20', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 16 },
  quizHeaderCard: { backgroundColor: WHITE, borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  quizIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#EDF4FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quizTitle: { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 14, textAlign: 'center' },
  metaRow: { flexDirection: 'row', gap: 10 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: BLUE + '15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, gap: 5 },
  metaText: { fontSize: 13, color: BLUE, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: MUTED, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  questionCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  questionNumRow: { marginBottom: 10 },
  questionNumBadge: { backgroundColor: BLUE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  questionNumText: { fontSize: 11, fontWeight: '900', color: WHITE, letterSpacing: 0.5 },
  questionText: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 14, lineHeight: 22 },
  optionsWrap: { gap: 8 },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: BORDER, backgroundColor: BG, gap: 10 },
  optionCorrect: { borderColor: GREEN, backgroundColor: GREEN + '10' },
  optionLetter: { width: 30, height: 30, borderRadius: 8, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: 13, fontWeight: '900', color: TEXT },
  optionText: { fontSize: 13, color: MUTED, flex: 1, fontWeight: '500' },
  optionTextCorrect: { color: GREEN, fontWeight: '700' },
});
