import { Asset } from 'expo-asset';
import { runnerSfx } from '../assets/runner/art';

function clipUri(mod) {
  if (!mod) return null;
  if (typeof mod === 'string') return mod;
  if (typeof mod === 'object' && typeof mod.uri === 'string') return mod.uri;
  try {
    const asset = Asset.fromModule(mod);
    return asset?.localUri || asset?.uri || null;
  } catch {
    return null;
  }
}

// Web playback uses the platform Audio element. A native build without a
// media module stays silent rather than pulling in another dependency.
export function createRunnerAudio() {
  let muted = false;
  const live = new Set();

  function stopAll() {
    live.forEach((audio) => {
      try { audio.pause(); } catch { /* already stopped */ }
    });
    live.clear();
  }

  function play(name) {
    if (muted) return;
    const uri = clipUri(runnerSfx[name]);
    if (!uri || typeof Audio === 'undefined') return;
    try {
      const audio = new Audio(uri);
      audio.volume = name === 'hit' || name === 'over' ? 0.7 : 0.55;
      live.add(audio);
      audio.onended = () => live.delete(audio);
      const pending = audio.play();
      if (pending && typeof pending.catch === 'function') pending.catch(() => live.delete(audio));
    } catch { /* autoplay or a missing decoder */ }
  }

  return {
    play,
    stopAll,
    setMuted(next) {
      muted = Boolean(next);
      if (muted) stopAll();
    },
    toggleMuted() {
      muted = !muted;
      if (muted) stopAll();
      return muted;
    },
    isMuted() { return muted; },
  };
}
