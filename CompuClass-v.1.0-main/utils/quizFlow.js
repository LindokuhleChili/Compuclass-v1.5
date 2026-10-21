// Pure quiz helpers shared by lecturer authoring and student attempts.
// Kept free of Supabase and React so scoring and validation can be tested
// without a screen render.

export function passingMark(quiz) {
  const score = Number(quiz?.passing_score);
  return Number.isFinite(score) ? score : 70;
}

export function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

// quiz_questions.options is jsonb. Live rows have been stored as a string
// array, a JSON string, or objects with a text/label field. Students submit
// the visible label, which is what submit_quiz_attempt compares.
export function normalizeOptions(options) {
  let list = options;
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((option) => {
    if (typeof option === 'string') return option.trim();
    if (option && typeof option === 'object') {
      const label = option.text ?? option.label ?? option.option ?? option.value;
      return label == null ? '' : String(label).trim();
    }
    return option == null ? '' : String(option).trim();
  }).filter((label) => label.length > 0);
}

export function questionCount(quiz) {
  if (Number.isInteger(quiz?.question_count)) return quiz.question_count;
  if (Array.isArray(quiz?.quiz_questions)) return quiz.quiz_questions.length;
  return 0;
}

// Drop blank options and point correctAnswer at the kept list. A question
// needs two filled options and a correct one that is not blank.
export function prepareQuestionsForSave(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { ok: false, message: 'Please add at least one question.' };
  }
  const cleaned = [];
  for (let i = 0; i < questions.length; i += 1) {
    const source = questions[i] || {};
    const question = String(source.question || '').trim();
    const label = `Question ${i + 1}`;
    if (!question) return { ok: false, message: `${label} needs text.` };
    const raw = Array.isArray(source.options) ? source.options : [];
    const options = [];
    let correctAnswer = null;
    raw.forEach((option, index) => {
      const text = String(option || '').trim();
      if (!text) return;
      if (index === source.correctAnswer) correctAnswer = options.length;
      options.push(text);
    });
    if (options.length < 2) return { ok: false, message: `${label} needs at least two answer options.` };
    if (correctAnswer == null) return { ok: false, message: `${label}: mark a correct answer that isn't blank.` };
    cleaned.push({
      ...source,
      question,
      options,
      correctAnswer,
    });
  }
  return { ok: true, questions: cleaned };
}

export function advanceQuiz({ questions, index, answers, selected, timeLeft }) {
  const list = Array.isArray(questions) ? questions : [];
  const current = list[index];
  if (!current) return { status: 'idle', answers: answers || [], index };
  const nextAnswers = [...(Array.isArray(answers) ? answers : []), {
    question_id: current.id,
    selected_answer: selected ?? null,
    time_remaining_seconds: current.time_limit_seconds ? timeLeft : null,
  }];
  if (index + 1 < list.length) {
    return { status: 'next', answers: nextAnswers, index: index + 1 };
  }
  return { status: 'submit', answers: nextAnswers, index };
}

function numericScore(value) {
  if (value == null || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

export function bestScoresByQuiz(attempts) {
  const best = {};
  (Array.isArray(attempts) ? attempts : []).forEach((attempt) => {
    if (!attempt?.quiz_id) return;
    const score = numericScore(attempt.score);
    if (score == null) return;
    const previous = best[attempt.quiz_id];
    if (previous == null || score > previous) best[attempt.quiz_id] = score;
  });
  return best;
}

export function summarizeQuizAttempts(attempts) {
  const rows = (Array.isArray(attempts) ? attempts : []).filter((attempt) => numericScore(attempt?.score) != null);
  if (rows.length === 0) return { count: 0, average: null, best: null };
  const scores = rows.map((attempt) => numericScore(attempt.score));
  const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  return { count: rows.length, average, best: Math.max(...scores) };
}

// Students who have not taken a quiz are left out. Counting them as 0%
// makes a class of one finisher and many new students look like it is failing.
export function classAverageScore(progressData) {
  const scored = Object.values(progressData || {}).filter((row) => (row?.quizzesCompleted || 0) > 0);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, row) => sum + (Number(row.averageScore) || 0), 0);
  return Math.round(total / scored.length);
}

export function uniqueIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}
