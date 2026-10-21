import {
  advanceQuiz,
  bestScoresByQuiz,
  classAverageScore,
  normalizeOptions,
  passingMark,
  prepareQuestionsForSave,
  questionCount,
  summarizeQuizAttempts,
  uniqueIds,
} from '../quizFlow';

describe('quiz authoring', () => {
  it('keeps two filled options and drops blanks without moving the correct answer', () => {
    const prepared = prepareQuestionsForSave([
      { question: ' What is RAM? ', options: ['Memory', '', 'Disk', ''], correctAnswer: 0, difficulty: 'easy' },
    ]);
    expect(prepared.ok).toBe(true);
    expect(prepared.questions[0]).toMatchObject({
      question: 'What is RAM?',
      options: ['Memory', 'Disk'],
      correctAnswer: 0,
      difficulty: 'easy',
    });
  });

  it('repoints the correct answer when blank options before it are removed', () => {
    const prepared = prepareQuestionsForSave([
      { question: 'CPU?', options: ['', 'Chip', 'Cable'], correctAnswer: 1 },
    ]);
    expect(prepared.questions[0].options).toEqual(['Chip', 'Cable']);
    expect(prepared.questions[0].correctAnswer).toBe(0);
  });

  it('rejects a blank question, a single option, and a correct answer that was left blank', () => {
    expect(prepareQuestionsForSave([])).toMatchObject({ ok: false });
    expect(prepareQuestionsForSave([{ question: '  ', options: ['A', 'B'], correctAnswer: 0 }]).message).toMatch(/needs text/);
    expect(prepareQuestionsForSave([{ question: 'Q', options: ['Only one', ''], correctAnswer: 0 }]).message).toMatch(/at least two/);
    expect(prepareQuestionsForSave([{ question: 'Q', options: ['A', 'B'], correctAnswer: 3 }]).message).toMatch(/isn't blank/);
  });
});

describe('quiz taking', () => {
  const questions = [
    { id: 'q1', time_limit_seconds: 20 },
    { id: 'q2', time_limit_seconds: null },
  ];

  it('moves to the next question and records the time left', () => {
    const step = advanceQuiz({ questions, index: 0, answers: [], selected: 'RAM', timeLeft: 12 });
    expect(step).toEqual({
      status: 'next',
      index: 1,
      answers: [{ question_id: 'q1', selected_answer: 'RAM', time_remaining_seconds: 12 }],
    });
  });

  it('submits once on the last question and does not invent a timer', () => {
    const step = advanceQuiz({
      questions,
      index: 1,
      answers: [{ question_id: 'q1', selected_answer: 'RAM', time_remaining_seconds: 12 }],
      selected: null,
      timeLeft: 0,
    });
    expect(step.status).toBe('submit');
    expect(step.answers).toHaveLength(2);
    expect(step.answers[1]).toEqual({
      question_id: 'q2',
      selected_answer: null,
      time_remaining_seconds: null,
    });
  });

  it('does nothing when the question list is empty', () => {
    expect(advanceQuiz({ questions: [], index: 0, answers: [], selected: 'A', timeLeft: 1 }).status).toBe('idle');
  });

  it('reads option labels from strings, JSON text, and objects', () => {
    expect(normalizeOptions([' RAM ', '', 'CPU'])).toEqual(['RAM', 'CPU']);
    expect(normalizeOptions('["A","B"]')).toEqual(['A', 'B']);
    expect(normalizeOptions([{ text: 'Chip' }, { label: 'Cable' }, { option: 'Port' }])).toEqual(['Chip', 'Cable', 'Port']);
    expect(normalizeOptions('not-json')).toEqual(['not-json']);
    expect(normalizeOptions(null)).toEqual([]);
  });

  it('keeps the best score per quiz and a 70 pass mark when none is stored', () => {
    expect(bestScoresByQuiz([
      { quiz_id: 'a', score: 40 },
      { quiz_id: 'a', score: 80 },
      { quiz_id: 'b', score: 'nope' },
      { quiz_id: 'b', score: 55 },
    ])).toEqual({ a: 80, b: 55 });
    expect(passingMark({ passing_score: 60 })).toBe(60);
    expect(passingMark({})).toBe(70);
    expect(questionCount({ question_count: 4, quiz_questions: [{}, {}] })).toBe(4);
    expect(uniqueIds(['a', 'a', null, 'b'])).toEqual(['a', 'b']);
  });
});

describe('lecturer results', () => {
  it('averages only students who have finished a quiz', () => {
    expect(classAverageScore({
      one: { quizzesCompleted: 2, averageScore: 80 },
      two: { quizzesCompleted: 0, averageScore: 0 },
      three: { quizzesCompleted: 1, averageScore: 60 },
    })).toBe(70);
    expect(classAverageScore({})).toBeNull();
  });

  it('summarises attempt scores for one quiz', () => {
    expect(summarizeQuizAttempts([
      { score: 40 },
      { score: 90 },
      { score: null },
    ])).toEqual({ count: 2, average: 65, best: 90 });
    expect(summarizeQuizAttempts([])).toEqual({ count: 0, average: null, best: null });
  });
});
