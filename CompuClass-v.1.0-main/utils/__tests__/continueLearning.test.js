import {
  ACTIVITY_SCREENS,
  LEARN_SUGGESTIONS,
  WINDOWS_SCREEN,
  chooseContinueLearning,
  latestActivityScreen,
} from '../continueLearning';

const quiz = { id: 'q1', title: 'Hardware check', passing_score: 80 };
const older = { id: 'f1', title: 'Networks', created_at: '2026-01-01T00:00:00.000Z', read: false };
const newer = { id: 'f2', title: 'Storage', created_at: '2026-06-01T00:00:00.000Z', read: false };
const readRecent = { id: 'f3', name: 'Already read', created_at: '2026-08-01T00:00:00.000Z', read: true };

describe('chooseContinueLearning', () => {
  it('opens the next pending quiz ahead of materials and the simulator', () => {
    const target = chooseContinueLearning({
      pendingQuizzes: [quiz],
      materials: [newer],
      lastScreen: WINDOWS_SCREEN,
      now: new Date('2026-10-09T12:00:00.000Z'),
    });
    expect(target).toMatchObject({
      kind: 'quiz',
      title: 'Hardware check',
      detail: 'Pass mark 80%',
      screen: 'Quiz',
      params: { quizId: 'q1' },
    });
  });

  it('uses the newest unread material when nothing is pending', () => {
    const target = chooseContinueLearning({
      pendingQuizzes: [],
      materials: [older, newer, readRecent],
      lastScreen: WINDOWS_SCREEN,
    });
    expect(target).toMatchObject({
      kind: 'material',
      title: 'Storage',
      detail: 'Unread module',
      screen: 'Materials',
      params: { folderId: 'f2', folderName: 'Storage' },
    });
  });

  it('falls back to the most recent module when every module has been read', () => {
    const target = chooseContinueLearning({
      materials: [
        { id: 'a', title: 'Old notes', created_at: '2026-01-02T00:00:00.000Z', read: true },
        readRecent,
      ],
    });
    expect(target.title).toBe('Already read');
    expect(target.detail).toBe('Most recent module');
    expect(target.screen).not.toBe(WINDOWS_SCREEN);
  });

  it('opens the Windows lab only when that was the latest activity and nothing else is waiting', () => {
    const target = chooseContinueLearning({ lastScreen: WINDOWS_SCREEN, now: new Date('2026-10-09T00:00:00.000Z') });
    expect(target).toMatchObject({ kind: 'windows', screen: WINDOWS_SCREEN, title: 'Windows 11 lab' });
  });

  it('never uses the simulator as the default when it was not the last activity', () => {
    const target = chooseContinueLearning({
      lastScreen: 'PC Assembly',
      now: new Date('2026-10-09T00:00:00.000Z'),
    });
    expect(target.kind).toBe('suggestion');
    expect(target.screen).not.toBe(WINDOWS_SCREEN);
  });

  it('rotates learn topics by day and never lands on the simulator', () => {
    const screens = new Set();
    for (let day = 0; day < LEARN_SUGGESTIONS.length * 2; day += 1) {
      const target = chooseContinueLearning({ now: new Date(Date.UTC(2026, 0, 1 + day)) });
      screens.add(target.screen);
      expect(target.kind).toBe('suggestion');
      expect(target.screen).not.toBe(WINDOWS_SCREEN);
      expect(LEARN_SUGGESTIONS.map((item) => item.screen)).toContain(target.screen);
    }
    expect(screens.size).toBe(LEARN_SUGGESTIONS.length);
    expect(screens.has('Materials')).toBe(true);
    expect(screens.has('PC Assembly')).toBe(true);
    expect(screens.has('Troubleshoot')).toBe(true);
  });
});

describe('latestActivityScreen', () => {
  it('keeps the newest real activity, including a Windows session', () => {
    expect(latestActivityScreen([
      { screen: 'Quiz', at: '2026-10-01T00:00:00.000Z' },
      { screen: WINDOWS_SCREEN, at: '2026-10-08T00:00:00.000Z' },
      { screen: ACTIVITY_SCREENS.pc_assembly, at: '2026-09-01T00:00:00.000Z' },
    ])).toBe(WINDOWS_SCREEN);
  });

  it('ignores a Windows session that is older than another lab', () => {
    expect(latestActivityScreen([
      { screen: WINDOWS_SCREEN, at: '2026-09-01T00:00:00.000Z' },
      { screen: 'Troubleshoot', at: '2026-10-02T00:00:00.000Z' },
      { screen: 'Quiz', at: 'not-a-date' },
    ])).toBe('Troubleshoot');
  });

  it('returns null when nothing has a time', () => {
    expect(latestActivityScreen([])).toBeNull();
    expect(latestActivityScreen([{ screen: WINDOWS_SCREEN }])).toBeNull();
  });
});
