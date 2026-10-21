import { lecturerService } from '../lecturerService';
import { supabase } from '../../config/supabase';

jest.mock('../aiService', () => ({ aiService: {} }));
jest.mock('../../config/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}));

function quizzesQuery(result) {
  return {
    select: () => ({
      eq: () => ({ order: async () => result }),
    }),
  };
}

describe('lecturer quiz reads', () => {
  beforeEach(() => {
    supabase.from.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('lists quizzes even when question rows are counted separately', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'quizzes') {
        return quizzesQuery({ data: [{ id: 'quiz-1', title: 'CPU' }], error: null });
      }
      return {
        select: () => ({
          in: async () => ({ data: [{ quiz_id: 'quiz-1' }, { quiz_id: 'quiz-1' }], error: null }),
        }),
      };
    });

    const quizzes = await lecturerService.getQuizzes('folder-1');
    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].question_count).toBe(2);
    expect(quizzes[0].quiz_questions).toHaveLength(2);
    expect(supabase.from).toHaveBeenCalledWith('quizzes');
    expect(supabase.from).toHaveBeenCalledWith('quiz_questions');
  });

  it('surfaces a quiz list failure instead of pretending the folder is empty', async () => {
    supabase.from.mockImplementation(() => quizzesQuery({ data: null, error: { message: 'permission denied' } }));
    await expect(lecturerService.getQuizzes('folder-1')).rejects.toEqual({ message: 'permission denied' });
  });

  it('attaches student names to quiz attempts', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'quiz_attempts') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [{ id: 'attempt-1', user_id: 'student-1', score: 80, completed_at: '2026-10-01' }],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          in: async () => ({ data: [{ id: 'student-1', full_name: 'Ada Lovelace' }], error: null }),
        }),
      };
    });

    const results = await lecturerService.getQuizResults('quiz-1');
    expect(results[0]).toMatchObject({ score: 80, full_name: 'Ada Lovelace' });
  });
});
