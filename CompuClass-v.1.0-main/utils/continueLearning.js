// Picks the dashboard "Continue learning" card. Windows 11 is never the
// fallback: it is used only when that lab is the learner's latest activity
// and there is nothing more specific to resume.

export const LEARN_SUGGESTIONS = [
  { title: 'Learning materials', detail: 'Open a module from your lecturer.', screen: 'Materials' },
  { title: 'PC Assembly', detail: 'Place the next part in the case.', screen: 'PC Assembly' },
  { title: 'Troubleshooting lab', detail: 'Work the next diagnosis.', screen: 'Troubleshoot' },
  { title: 'PC Lab', detail: 'Identify the parts inside a computer.', screen: 'PC Lab' },
  { title: 'Circuit Maze', detail: 'Route the signal through the next topic.', screen: 'CircuitMazeTopic' },
  { title: 'CompuBot', detail: 'Ask about a part, a fault, or a quiz.', screen: 'Chatbot' },
];

export const WINDOWS_SCREEN = 'Windows 11';

// Local progress keys (see progressService) mapped to the screen they belong to.
export const ACTIVITY_SCREENS = {
  pc_assembly: 'PC Assembly',
  pc_lab: 'PC Lab',
  'circuitMazeProgress:v1': 'CircuitMazeTopic',
  compurunner: 'Game',
  compubot_chat_history: 'Chatbot',
  troubleshooting_lab: 'Troubleshoot',
};

function timeOf(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function dayIndex(now) {
  const date = now instanceof Date ? now : new Date(now || Date.now());
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor(utc / 86400000);
}

function byNewest(a, b) {
  return (timeOf(b.created_at || b.updated_at) || 0) - (timeOf(a.created_at || a.updated_at) || 0);
}

export function latestActivityScreen(events) {
  let best = null;
  (events || []).forEach((event) => {
    if (!event?.screen) return;
    const at = timeOf(event.at);
    if (at == null) return;
    if (!best || at > best.at) best = { screen: event.screen, at };
  });
  return best ? best.screen : null;
}

function materialTarget(material) {
  const title = material.title || material.name || 'Learning material';
  const unread = material.read !== true;
  return {
    kind: 'material',
    title,
    detail: unread ? 'Unread module' : 'Most recent module',
    screen: 'Materials',
    params: material.id ? { folderId: material.id, folderName: title } : undefined,
  };
}

function suggestionTarget(now) {
  const topic = LEARN_SUGGESTIONS[dayIndex(now) % LEARN_SUGGESTIONS.length];
  return {
    kind: 'suggestion',
    title: topic.title,
    detail: topic.detail,
    screen: topic.screen,
    params: undefined,
  };
}

export function chooseContinueLearning({
  pendingQuizzes = [],
  materials = [],
  lastScreen = null,
  now = new Date(),
} = {}) {
  const quiz = (pendingQuizzes || []).find((item) => item && (item.id || item.title));
  if (quiz) {
    return {
      kind: 'quiz',
      title: quiz.title || 'Pending quiz',
      detail: `Pass mark ${quiz.passing_score || 70}%`,
      screen: 'Quiz',
      params: quiz.id ? { quizId: quiz.id } : undefined,
    };
  }

  const list = (materials || []).filter((item) => item && (item.title || item.name || item.id));
  const unread = list.filter((item) => item.read !== true);
  const pool = (unread.length ? unread : list).slice().sort(byNewest);
  if (pool.length) return materialTarget(pool[0]);

  if (lastScreen === WINDOWS_SCREEN) {
    return {
      kind: 'windows',
      title: 'Windows 11 lab',
      detail: 'Pick up the simulator where you left it',
      screen: WINDOWS_SCREEN,
      params: undefined,
    };
  }

  return suggestionTarget(now);
}
