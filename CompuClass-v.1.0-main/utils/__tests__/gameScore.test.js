import { runnerScoreValue, saveRunnerScore } from '../gameScore';

function clientWith(handlers) {
  return {
    from(table) {
      if (table !== 'game_scores') throw new Error(`unexpected table ${table}`);
      return handlers;
    },
  };
}

describe('runner scores', () => {
  it('rounds to an integer and rejects a score that is not a number', () => {
    expect(runnerScoreValue(10.6)).toBe(11);
    expect(runnerScoreValue(0)).toBe(0);
    expect(runnerScoreValue(-1)).toBeNull();
    expect(runnerScoreValue('fast')).toBeNull();
    expect(runnerScoreValue(5_000_000)).toBe(1_000_000);
  });

  it('upserts the best score on user_id', async () => {
    const upsert = jest.fn(async () => ({ error: null }));
    const saved = await saveRunnerScore(clientWith({ upsert }), 'user-1', 18.2);
    expect(saved).toEqual({ saved: true, score: 18, mode: 'upsert' });
    expect(upsert).toHaveBeenCalledWith({ user_id: 'user-1', score: 18 }, { onConflict: 'user_id' });
  });

  it('updates an existing row when the table has no unique user_id', async () => {
    const update = jest.fn(async () => ({ error: null }));
    const insert = jest.fn();
    const saved = await saveRunnerScore(clientWith({
      upsert: async () => ({ error: { code: '42P10', message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification' } }),
      select: () => ({ eq: async () => ({ data: [{ user_id: 'user-1' }], error: null }) }),
      update: () => ({ eq: update }),
      insert,
    }), 'user-1', 40);
    expect(saved).toMatchObject({ saved: true, score: 40, mode: 'update' });
    expect(update).toHaveBeenCalledWith('user_id', 'user-1');
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts when the conflict target is missing and the player has no row', async () => {
    const insert = jest.fn(async () => ({ error: null }));
    const saved = await saveRunnerScore(clientWith({
      upsert: async () => ({ error: { code: '42P10', message: 'no unique' } }),
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
      insert,
    }), 'user-2', 7);
    expect(saved.mode).toBe('insert');
    expect(insert).toHaveBeenCalledWith({ user_id: 'user-2', score: 7 });
  });

  it('does not write a second row when the upsert fails for another reason', async () => {
    const insert = jest.fn();
    const saved = await saveRunnerScore(clientWith({
      upsert: async () => ({ error: { code: '42501', message: 'permission denied' } }),
      insert,
    }), 'user-1', 9);
    expect(saved.saved).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});
