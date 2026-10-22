// Compu Runner writes one best score per person. The score column is an
// integer. Upsert needs a unique user_id; the security migration does not
// add that key when the live table already has duplicate rows, and Postgres
// then rejects ON CONFLICT with 42P10. This falls back to update-or-insert.

const MISSING_CONFLICT = /no unique|exclusion constraint|on conflict/i;

export function runnerScoreValue(score) {
  const value = Number(score);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value), 1_000_000);
}

function missingConflictTarget(error) {
  if (!error) return false;
  if (error.code === '42P10') return true;
  return MISSING_CONFLICT.test(String(error.message || ''));
}

export async function saveRunnerScore(client, userId, score) {
  const value = runnerScoreValue(score);
  if (!client || !userId || value == null) return { saved: false, score: value };
  const row = { user_id: userId, score: value };
  const upserted = await client.from('game_scores').upsert(row, { onConflict: 'user_id' });
  if (!upserted?.error) return { saved: true, score: value, mode: 'upsert' };
  if (!missingConflictTarget(upserted.error)) return { saved: false, score: value, error: upserted.error };

  const existing = await client.from('game_scores').select('user_id').eq('user_id', userId);
  if (existing?.error) return { saved: false, score: value, error: existing.error };
  if ((existing.data || []).length > 0) {
    const updated = await client.from('game_scores').update({ score: value }).eq('user_id', userId);
    if (updated?.error) return { saved: false, score: value, error: updated.error };
    return { saved: true, score: value, mode: 'update' };
  }
  const inserted = await client.from('game_scores').insert(row);
  if (inserted?.error) return { saved: false, score: value, error: inserted.error };
  return { saved: true, score: value, mode: 'insert' };
}
