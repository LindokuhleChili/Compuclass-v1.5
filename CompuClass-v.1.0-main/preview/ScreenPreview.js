import React, { useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../config/supabase';
import { authService } from '../services/authService';
import { lecturerService } from '../services/lecturerService';
import LecturerDashboardScreen from '../screens/LecturerDashboardScreen';
import ClassManagementScreen from '../screens/ClassManagementScreen';
import ClassDetailScreen from '../screens/ClassDetailScreen';
import StudentProgressScreen from '../screens/StudentProgressScreen';
import QuizCreationScreen from '../screens/QuizCreationScreen';
import QuizDetailScreen from '../screens/QuizDetailScreen';
import ContentUploadScreen from '../screens/ContentUploadScreen';
import FolderContentScreen from '../screens/FolderContentScreen';
import QuizScreen from '../screens/QuizScreen';

// Local screenshot and design check. It stays off unless the web bundle was
// built with EXPO_PUBLIC_SCREEN_PREVIEW=1 and the URL has ?preview=.
// The data below is dummy and never comes from Supabase.

export function isScreenPreview() {
  return process.env.EXPO_PUBLIC_SCREEN_PREVIEW === '1'
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('preview');
}

const NOW = '2026-10-12T09:00:00.000Z';

const CLASSES = [
  { id: 'class-ict', name: 'ICT Grade 11', description: 'Hardware, software, and networks', student_count: 28, join_code: 'AB23CD', created_at: '2026-02-02T08:00:00.000Z' },
  { id: 'class-net', name: 'Networking 101', description: 'OSI model and IP addresses', student_count: 16, join_code: 'K7PQ2M', created_at: '2026-03-11T08:00:00.000Z' },
];

const FOLDERS = [
  { id: 'folder-hw', name: 'Hardware notes', description: 'CPU, RAM, storage, and the motherboard' },
  { id: 'folder-quiz', name: 'Quiz bank', description: 'Practice questions for the term' },
];

const STUDENTS = [
  { id: 'student-1', full_name: 'Thandi Nkosi', email: 'thandi@example.com' },
  { id: 'student-2', full_name: 'Liam Jacobs', email: 'liam@example.com' },
  { id: 'student-3', full_name: 'Aisha Patel', email: 'aisha@example.com' },
];

const QUIZZES = [
  { id: 'quiz-cpu', title: 'CPU and memory', description: 'How the processor uses RAM', passing_score: 70, created_at: NOW, question_count: 2, quiz_questions: [{}, {}] },
  { id: 'quiz-net', title: 'Networking basics', description: 'Addresses, switches, and the OSI model', passing_score: 60, created_at: NOW, question_count: 1, quiz_questions: [{}] },
];

const QUESTIONS = [
  { id: 'q1', quiz_id: 'quiz-cpu', question: 'Which part stores the data the CPU is using right now?', options: ['RAM', 'Power supply', 'GPU', 'Hard drive'], correct_answer: 'RAM', order_index: 0, time_limit_seconds: 30, difficulty: 'easy' },
  { id: 'q2', quiz_id: 'quiz-cpu', question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Core Program Utility', 'Control Power Unit'], correct_answer: 'Central Processing Unit', order_index: 1, time_limit_seconds: null, difficulty: 'medium' },
];

function query(rows) {
  const state = { rows: rows.slice() };
  const builder = {
    select() { return builder; },
    eq(column, value) {
      state.rows = state.rows.filter((row) => row[column] === value);
      return builder;
    },
    in(column, values) {
      state.rows = state.rows.filter((row) => values.includes(row[column]));
      return builder;
    },
    order() { return builder; },
    single() {
      return Promise.resolve({ data: state.rows[0] || null, error: state.rows[0] ? null : { message: 'not found' } });
    },
    insert() { return Promise.resolve({ error: null }); },
    then(resolve, reject) {
      return Promise.resolve({ data: state.rows, error: null }).then(resolve, reject);
    },
  };
  return builder;
}

const TABLES = {
  class_students: [{ class_id: 'class-ict', student_id: 'student-1' }],
  quiz_assignments: [
    { quiz_id: 'quiz-cpu', class_id: 'class-ict' },
    { quiz_id: 'quiz-net', class_id: 'class-ict' },
  ],
  quizzes: QUIZZES,
  quiz_attempts: [
    { id: 'attempt-1', quiz_id: 'quiz-net', user_id: 'student-1', score: 80, completed_at: NOW },
    { id: 'attempt-2', quiz_id: 'quiz-cpu', user_id: 'student-2', score: 90, completed_at: NOW, quizzes: { title: 'CPU and memory' } },
    { id: 'attempt-3', quiz_id: 'quiz-cpu', user_id: 'student-3', score: 45, completed_at: '2026-10-02T09:00:00.000Z', quizzes: { title: 'CPU and memory' } },
  ],
  quiz_questions: QUESTIONS,
  profiles: STUDENTS.map((student) => ({ id: student.id, full_name: student.full_name })),
  documents: [
    { id: 'doc-1', title: 'Motherboard diagram', file_name: 'motherboard.pdf', file_type: 'application/pdf', file_size: 240000, created_at: NOW, file_url: 'lecturer/motherboard.pdf', folder_id: 'folder-hw' },
  ],
  announcements: [],
};

let installed = false;

export function installPreviewData() {
  if (installed) return;
  installed = true;
  authService.getCurrentUser = async () => ({
    id: 'student-1',
    profile: { role: 'student', full_name: 'Thandi Nkosi' },
  });
  supabase.from = (table) => query(TABLES[table] || []);
  supabase.rpc = async (name) => {
    if (name === 'get_quiz_questions_for_attempt') {
      return {
        data: QUESTIONS.map(({ correct_answer, ...question }) => question),
        error: null,
      };
    }
    if (name === 'submit_quiz_attempt') {
      return {
        data: {
          score: 50,
          passed: false,
          correct_count: 1,
          total_questions: 2,
          xp_earned: 15,
          xp_attempt_value: 15,
          xp_previous_best: 0,
          is_personal_best: true,
          max_combo: 1,
          current_streak: 3,
          leveled_up: false,
          new_level: 2,
          new_badges: [],
          review: [
            { question_id: 'q1', question: QUESTIONS[0].question, selected_answer: 'RAM', is_correct: true, correct_answer: 'RAM' },
            { question_id: 'q2', question: QUESTIONS[1].question, selected_answer: 'Computer Personal Unit', is_correct: false, correct_answer: 'Central Processing Unit' },
          ],
        },
        error: null,
      };
    }
    return { data: [], error: null };
  };

  lecturerService.getFolders = async () => FOLDERS;
  lecturerService.getClasses = async () => CLASSES;
  lecturerService.getStudents = async () => STUDENTS;
  lecturerService.getDocuments = async () => TABLES.documents;
  lecturerService.getQuizzes = async () => QUIZZES;
  lecturerService.getClassDetail = async () => ({
    class: CLASSES[0],
    students: [
      { id: 'student-1', full_name: 'Thandi Nkosi', joined_at: '2026-02-03T08:00:00.000Z' },
      { id: 'student-2', full_name: 'Liam Jacobs', joined_at: '2026-02-04T08:00:00.000Z' },
    ],
  });
  lecturerService.getStudentProgress = async () => ({
    'student-1': { quizzesCompleted: 1, averageScore: 80, materialsViewed: 4, lastActivity: '12 Oct 2026' },
    'student-2': { quizzesCompleted: 2, averageScore: 90, materialsViewed: 6, lastActivity: '11 Oct 2026' },
    'student-3': { quizzesCompleted: 0, averageScore: 0, materialsViewed: 1, lastActivity: 'Never' },
  });
  lecturerService.getStudentDetail = async (studentId) => ({
    student: STUDENTS.find((student) => student.id === studentId),
    quizAttempts: TABLES.quiz_attempts.filter((attempt) => attempt.user_id === studentId),
  });
  lecturerService.getQuizDetail = async () => ({
    id: 'quiz-cpu',
    title: 'CPU and memory',
    passing_score: 70,
    quiz_questions: QUESTIONS,
  });
  lecturerService.getQuizResults = async () => ([
    { id: 'attempt-2', user_id: 'student-2', full_name: 'Liam Jacobs', score: 90, completed_at: NOW },
    { id: 'attempt-3', user_id: 'student-3', full_name: 'Aisha Patel', score: 45, completed_at: '2026-10-02T09:00:00.000Z' },
  ]);
}

const FOLDER = FOLDERS[0];

export function ScreenPreview() {
  installPreviewData();
  const initial = new URLSearchParams(window.location.search).get('preview') || 'lecturer';
  const [screen, setScreen] = useState(initial);
  const [params, setParams] = useState(initial === 'quiz-play' ? { quizId: 'quiz-cpu' } : {});
  const navigation = {
    navigate(name, next) {
      if (name === 'Quiz' && next?.quizId) {
        setParams(next);
        setScreen('quiz-play');
        return;
      }
      if (name === 'QuizDetail') {
        setParams(next || {});
        setScreen('quiz-detail');
        return;
      }
      if (name === 'ClassDetail') {
        setParams(next || { classId: 'class-ict' });
        setScreen('class');
        return;
      }
      const map = {
        StudentProgress: 'progress',
        ClassManagement: 'classes',
        ContentUpload: 'upload',
        QuizCreation: 'quiz-create',
        FolderContent: 'folder',
        Quiz: 'quizzes',
        LecturerDashboard: 'lecturer',
      };
      setScreen(map[name] || 'lecturer');
    },
    goBack() { setScreen('lecturer'); },
    canGoBack() { return false; },
    getState() { return { routeNames: ['Lecturer'] }; },
  };
  const route = { params: { ...params, folderId: 'folder-quiz', folder: FOLDER, classId: params.classId || 'class-ict', quizId: params.quizId || 'quiz-cpu' } };

  let body = null;
  if (screen === 'classes') body = <ClassManagementScreen navigation={navigation} />;
  else if (screen === 'class') body = <ClassDetailScreen navigation={navigation} route={route} />;
  else if (screen === 'progress') body = <StudentProgressScreen navigation={navigation} />;
  else if (screen === 'quiz-create') body = <QuizCreationScreen navigation={navigation} route={route} />;
  else if (screen === 'quiz-detail') body = <QuizDetailScreen navigation={navigation} route={route} />;
  else if (screen === 'upload') body = <ContentUploadScreen navigation={navigation} route={route} />;
  else if (screen === 'folder') body = <FolderContentScreen navigation={navigation} route={route} />;
  else if (screen === 'quizzes') body = <QuizScreen navigation={navigation} route={{ params: {} }} />;
  else if (screen === 'quiz-play') body = <QuizScreen navigation={navigation} route={{ params: { quizId: 'quiz-cpu' } }} />;
  else body = <LecturerDashboardScreen navigation={navigation} />;

  return (
    <NavigationContainer>
      <PreviewStack.Navigator screenOptions={{ headerShown: false }}>
        <PreviewStack.Screen name="PreviewHost">{() => <View style={{ flex: 1 }}>{body}</View>}</PreviewStack.Screen>
      </PreviewStack.Navigator>
    </NavigationContainer>
  );
}

const PreviewStack = createStackNavigator();
