import {
  COMBO_WINDOW_MS,
  HARDWARE_FACTS,
  INITIAL_SPEED,
  JUMP_APEX,
  JUMP_MS,
  MAX_SPEED,
  PLAYER_X,
  SPEED_RAMP_DISTANCE,
  START_LIVES,
  comboMultiplier,
  createRun,
  difficultyForDistance,
  distancePoints,
  factForRun,
  jumpHeight,
  keyAction,
  overlapsPlayer,
  planSpawn,
  playfieldBox,
  playerCenterFor,
  playerXFor,
  runnerDisplayName,
  runnerFrame,
  scorePickup,
  spawnIntervalMs,
  speedForDistance,
  tick,
  waveIsFair,
} from '../runnerEngine';

const zero = () => 0;

function virusAt(x) {
  return { id: 1, kind: 'virus', group: 'obstacle', x, resolved: false, points: 0, factId: null };
}

describe('runner pace', () => {
  it('starts at the base speed and caps after a long run', () => {
    expect(speedForDistance(0)).toBe(INITIAL_SPEED);
    expect(speedForDistance(SPEED_RAMP_DISTANCE)).toBe(MAX_SPEED);
    expect(speedForDistance(SPEED_RAMP_DISTANCE * 4)).toBe(MAX_SPEED);
    expect(speedForDistance(4000)).toBeGreaterThan(INITIAL_SPEED);
    expect(speedForDistance(4000)).toBeLessThan(speedForDistance(8000));
  });

  it('tightens the spawn gap as difficulty rises', () => {
    expect(spawnIntervalMs(0)).toBeGreaterThan(spawnIntervalMs(1));
    expect(spawnIntervalMs(difficultyForDistance(0))).toBe(spawnIntervalMs(0));
  });

  it('turns distance into a whole-number score', () => {
    expect(distancePoints(0)).toBe(0);
    expect(distancePoints(18)).toBe(1);
    expect(distancePoints(17.9)).toBe(0);
    expect(distancePoints(-10)).toBe(0);
  });
});

describe('jump and duck', () => {
  const runner = { pose: 'run', jumpH: 0, viewWidth: 800 };

  it('raises the runner on a curve and lands again', () => {
    expect(jumpHeight(0)).toBe(0);
    expect(jumpHeight(JUMP_MS / 2)).toBeCloseTo(JUMP_APEX, 5);
    expect(jumpHeight(JUMP_MS)).toBe(0);
    expect(jumpHeight(-5)).toBe(0);
  });

  it('lets a jump clear a ground hazard and a duck pass a firewall', () => {
    const virus = virusAt(PLAYER_X);
    const firewall = { ...virus, kind: 'firewall' };
    const circuit = { ...virus, kind: 'circuit' };
    expect(overlapsPlayer(runner, virus)).toBe(true);
    expect(overlapsPlayer({ ...runner, pose: 'duck' }, virus)).toBe(true);
    expect(overlapsPlayer({ ...runner, pose: 'jump', jumpH: JUMP_APEX }, virus)).toBe(false);

    expect(overlapsPlayer(runner, firewall)).toBe(false);
    expect(overlapsPlayer({ ...runner, pose: 'jump', jumpH: JUMP_APEX }, firewall)).toBe(true);
    expect(overlapsPlayer({ ...runner, pose: 'duck' }, firewall)).toBe(false);

    expect(overlapsPlayer(runner, circuit)).toBe(true);
    expect(overlapsPlayer({ ...runner, pose: 'duck' }, circuit)).toBe(true);
    expect(overlapsPlayer({ ...runner, pose: 'jump', jumpH: JUMP_APEX }, circuit)).toBe(false);
  });

  it('anchors the runner at 22 percent of the playfield', () => {
    expect(playerCenterFor(1000)).toBe(220);
    expect(playerCenterFor(800) / 800).toBeCloseTo(0.22, 5);
    const box = playfieldBox(1600, 900);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
    expect(box.groundY).toBe(Math.round(box.height * 0.8));
    const tall = playfieldBox(800, 2000);
    expect(tall.height).toBeLessThanOrEqual(2000);
    expect(tall.width / tall.height).toBeCloseTo(16 / 9, 2);
  });

  it('cycles the run poses and holds jump, duck, and hurt', () => {
    expect(runnerFrame('run', 0)).toBe('run1');
    expect(runnerFrame('run', 110)).toBe('run2');
    expect(runnerFrame('jump', 110)).toBe('jump');
    expect(runnerFrame('duck', 0)).toBe('duck');
    expect(runnerFrame('hurt', 0)).toBe('hurt');
  });
});

describe('collectibles and facts', () => {
  it('builds a combo inside the window and resets after it', () => {
    const first = scorePickup({ points: 10, streak: 0, lastPickupAt: 0, now: 1000 });
    expect(first).toMatchObject({ gained: 10, streak: 1, multiplier: 1 });
    const second = scorePickup({ points: 10, streak: first.streak, lastPickupAt: first.lastPickupAt, now: 1000 + COMBO_WINDOW_MS });
    expect(second.streak).toBe(2);
    expect(second.multiplier).toBe(1.5);
    expect(second.gained).toBe(15);
    const late = scorePickup({ points: 10, streak: 4, lastPickupAt: 0, now: COMBO_WINDOW_MS + 1 });
    expect(late.streak).toBe(1);
    expect(late.multiplier).toBe(1);
  });

  it('caps the combo multiplier', () => {
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(7)).toBe(4);
    expect(comboMultiplier(20)).toBe(4);
  });

  it('prefers a fact for a chip the runner actually collected', () => {
    expect(factForRun(['ram'], zero).id).toBe('ram');
    expect(factForRun(['ram', 'ssd'], () => 0.99).id).toBe('ssd');
    const fallback = factForRun([], zero);
    expect(HARDWARE_FACTS.map((fact) => fact.id)).toContain(fallback.id);
  });
});

describe('keyboard', () => {
  it('maps space and arrow up to jump', () => {
    expect(keyAction(' ')).toBe('jump');
    expect(keyAction('ArrowUp')).toBe('jump');
    expect(keyAction('arrowdown')).toBe('duck');
    expect(keyAction('arrowleft')).toBeNull();
    expect(keyAction('p')).toBe('pause');
    expect(keyAction('m')).toBe('mute');
    expect(keyAction('Enter')).toBe('confirm');
    expect(keyAction('q')).toBeNull();
  });
});

describe('the run loop', () => {
  function quietRun() {
    const run = createRun(900);
    run.nextSpawnAt = 1e12;
    return run;
  }

  it('jumps, moves the world, and adds distance score', () => {
    const started = quietRun();
    const result = tick(started, 16, { jump: true, lane: 1 }, zero);
    expect(result.events.map((event) => event.type)).toContain('jump');
    expect(result.state.pose).toBe('jump');
    expect(result.state.lane).toBe(1);
    expect(result.state.distance).toBeGreaterThan(0);
    expect(result.state.score).toBe(distancePoints(result.state.distance));
  });

  it('does not advance a paused run', () => {
    const paused = quietRun();
    paused.paused = true;
    const result = tick(paused, 40, { jump: true }, zero);
    expect(result.state).toBe(paused);
    expect(result.events).toEqual([]);
    expect(result.state.distance).toBe(0);
  });

  it('collects coins one after another as a combo', () => {
    let state = quietRun();
    const streaks = [];
    for (let i = 0; i < 3; i += 1) {
      state = {
        ...state,
        entities: [{
          id: i, kind: 'coin', group: 'pickup', x: playerXFor(state.viewWidth), points: 10, factId: null, resolved: false,
        }],
      };
      const result = tick(state, 16, {}, zero);
      state = result.state;
      streaks.push(result.events.find((event) => event.type === 'collect').streak);
    }
    expect(streaks).toEqual([1, 2, 3]);
    expect(state.pickupScore).toBe(10 + 15 + 20);
    expect(state.bestStreak).toBe(3);
  });

  it('ends the run on the third hit and ignores hits while invincible', () => {
    let state = quietRun();
    const smack = () => {
      state = { ...state, entities: [virusAt(playerXFor(state.viewWidth))] };
      const result = tick(state, 0, {}, zero);
      state = result.state;
      return result;
    };
    expect(smack().state.lives).toBe(START_LIVES - 1);
    const blocked = smack();
    expect(blocked.state.lives).toBe(START_LIVES - 1);
    expect(blocked.events.some((event) => event.type === 'hit')).toBe(false);
    state = { ...state, elapsed: state.invincibleUntil, entities: [] };
    expect(smack().state.lives).toBe(START_LIVES - 2);
    state = { ...state, elapsed: state.invincibleUntil, entities: [] };
    const last = smack();
    expect(last.state.lives).toBe(0);
    expect(last.state.phase).toBe('dead');
    expect(last.events.some((event) => event.type === 'dead')).toBe(true);
    const after = tick(last.state, 30, { jump: true }, zero);
    expect(after.state).toBe(last.state);
  });

  it('names a blank leaderboard row and keeps real names', () => {
    expect(runnerDisplayName('Lutho Student', 200, 0)).toBe('Lutho Student');
    expect(runnerDisplayName('Player', 2063, 0)).toMatch(/^Player #\d{4}$/);
    expect(runnerDisplayName('', 10, 1)).not.toBe(runnerDisplayName('Player', 10, 0));
  });

  it('leaves a way through every obstacle wave', () => {
    for (let i = 0; i < 240; i += 1) {
      const run = createRun(800);
      run.distance = i * 80;
      const wave = planSpawn(run, Math.random);
      expect(waveIsFair(wave.entities)).toBe(true);
      expect(wave.nextId).toBe(run.nextId + wave.entities.length);
    }
  });
});
