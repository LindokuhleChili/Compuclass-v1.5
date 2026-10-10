import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DashboardScreen from '../DashboardScreen';
import { supabase } from '../../config/supabase';
import { authService } from '../../services/authService';
import { classService } from '../../services/classService';
import { gamificationService } from '../../services/gamificationservice';
import { LEARN_SUGGESTIONS } from '../../utils/continueLearning';
import { ThemeProvider } from '../../context/ThemeContext';

jest.mock('../../config/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../../services/authService', () => ({ authService: { getCurrentUser: jest.fn() } }));
jest.mock('../../services/classService', () => ({ classService: { classScopeForCurrentUser: jest.fn() } }));
jest.mock('../../services/gamificationservice', () => ({ gamificationService: { getMyStats: jest.fn() } }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb) => require('react').useEffect(cb, [cb]),
}));

const rows = {};

function chain(data) {
  const result = Promise.resolve({ data, error: null });
  const api = {
    select: () => api,
    eq: () => api,
    in: () => api,
    order: () => api,
    limit: () => api,
    then: result.then.bind(result),
    catch: result.catch.bind(result),
  };
  return api;
}

const renderDash = (navigation) => render(<DashboardScreen navigation={navigation} />, { wrapper: ThemeProvider });

describe('Dashboard continue learning', () => {
  beforeEach(async () => {
    Object.keys(rows).forEach((key) => delete rows[key]);
    rows.class_students = [];
    rows.quiz_attempts = [];
    rows.announcements = [];
    rows.folders = [];
    rows.windows_simulation_sessions = [];
    rows.quizzes = [];
    authService.getCurrentUser.mockResolvedValue({ id: 'student-1', user_metadata: { full_name: 'Ada Learner' } });
    gamificationService.getMyStats.mockResolvedValue({ xp: 0, current_streak: 0 });
    classService.classScopeForCurrentUser.mockResolvedValue({ ready: true, userId: 'student-1', enrolledClassIds: [], teachingClassIds: [] });
    supabase.from.mockImplementation((table) => chain(rows[table] || []));
    await AsyncStorage.clear();
  });

  it('does not open the Windows simulator when nothing is pending', async () => {
    const navigation = { navigate: jest.fn() };
    const { getByText, getByTestId, queryByText } = renderDash(navigation);
    await waitFor(() => expect(queryByText('Loading your next step')).toBeNull());
    const title = getByTestId('continue-title').props.children;
    const suggestion = LEARN_SUGGESTIONS.find((item) => item.title === title);
    expect(suggestion).toBeTruthy();
    expect(title).not.toBe('Windows 11 lab');
    fireEvent.press(getByText('Resume'));
    expect(navigation.navigate).toHaveBeenCalledWith(suggestion.screen, undefined);
  });

  it('resumes the next pending quiz', async () => {
    rows.class_students = [{ class_id: 'c1', classes: { name: 'Lab' } }];
    rows.quiz_assignments = [{ quiz_id: 'q1' }];
    rows.quizzes = [{ id: 'q1', title: 'Hardware check', passing_score: 80 }];
    const navigation = { navigate: jest.fn() };
    const { getByText, getAllByText } = renderDash(navigation);
    await waitFor(() => expect(getAllByText('Hardware check').length).toBeGreaterThan(0));
    expect(getAllByText('Pass mark 80%').length).toBeGreaterThan(0);
    fireEvent.press(getByText('Resume'));
    expect(navigation.navigate).toHaveBeenCalledWith('Quiz', { quizId: 'q1' });
  });

  it('opens the newest unread module before a Windows session', async () => {
    rows.folders = [
      { id: 'old', name: 'Networks', created_at: '2026-01-01T00:00:00.000Z', class_id: null },
      { id: 'new', name: 'Storage', created_at: '2026-08-01T00:00:00.000Z', class_id: null },
    ];
    rows.windows_simulation_sessions = [{ session_start: '2026-10-01T00:00:00.000Z', session_end: '2026-10-01T00:10:00.000Z' }];
    const navigation = { navigate: jest.fn() };
    const { getByText, queryByText } = renderDash(navigation);
    await waitFor(() => expect(getByText('Storage')).toBeTruthy());
    expect(queryByText('Windows 11 lab')).toBeNull();
    expect(getByText('Unread module')).toBeTruthy();
    fireEvent.press(getByText('Resume'));
    expect(navigation.navigate).toHaveBeenCalledWith('Materials', { folderId: 'new', folderName: 'Storage' });
  });

  it('opens the Windows lab only after the learner actually used it', async () => {
    rows.windows_simulation_sessions = [{ session_start: '2026-10-08T00:00:00.000Z' }];
    const navigation = { navigate: jest.fn() };
    const { getByText } = renderDash(navigation);
    await waitFor(() => expect(getByText('Windows 11 lab')).toBeTruthy());
    fireEvent.press(getByText('Resume'));
    expect(navigation.navigate).toHaveBeenCalledWith('Windows 11', undefined);
  });
});
