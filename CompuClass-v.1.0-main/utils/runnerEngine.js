// Pure rules for CompuRunner. The screen draws this and plays sounds.
// Units: x is pixels from the left, y is pixels above the ground line.
// One plane: jump the ground hazards, duck the overhead ones.

export const PLAYER_X_RATIO = 0.22;
export const CLEAR_GAP = 200;

export function playerCenterFor(viewWidth) {
  return Math.round((viewWidth || 800) * PLAYER_X_RATIO);
}

export function playerXFor(viewWidth) {
  return playerCenterFor(viewWidth) - 18;
}

export const PLAYER_X = playerXFor(800);

export function playfieldBox(screenW, screenH) {
  const sw = Math.max(1, screenW || 1280);
  const sh = Math.max(1, screenH || 720);
  let width = sw;
  let height = Math.round(width * 9 / 16);
  if (height > sh) {
    height = sh;
    width = Math.round(height * 16 / 9);
  }
  return { width, height, groundY: Math.round(height * 0.8) };
}

export function runnerDisplayName(name, score, index = 0) {
  const clean = String(name || '').trim();
  if (clean && clean.toLowerCase() !== 'player') return clean;
  const n = Math.abs(Math.round(Number(score) || 0));
  const tag = String(((n * 17) + (index + 1) * 91) % 9000 + 1000);
  return `Player #${tag}`;
}
export const INITIAL_SPEED = 260;
export const MAX_SPEED = 640;
export const SPEED_RAMP_DISTANCE = 14000;
export const JUMP_MS = 560;
export const JUMP_APEX = 108;
export const DUCK_MS = 460;
export const HURT_MS = 280;
export const INVINCIBLE_MS = 1100;
export const COMBO_WINDOW_MS = 1600;
export const MAX_MULTIPLIER = 4;
export const START_LIVES = 3;

const RUN_HIT = { y0: 10, y1: 72, w: 36 };
const DUCK_HIT = { y0: 0, y1: 30, w: 52 };

// Virus and circuit sit on the floor (jump them). Firewall hangs overhead (duck it).
const HITBOX = {
  virus: { y0: 0, y1: 44, w: 48, group: 'obstacle', air: false },
  firewall: { y0: 80, y1: 156, w: 64, group: 'obstacle', air: true },
  circuit: { y0: 0, y1: 70, w: 56, group: 'obstacle', air: false },
  coin: { y0: 18, y1: 70, w: 36, group: 'pickup', points: 10 },
  gem: { y0: 22, y1: 74, w: 34, group: 'pickup', points: 25 },
  chip: { y0: 16, y1: 78, w: 40, group: 'pickup', points: 40 },
};

export const MILESTONES = [200, 500, 1000, 2000, 4000];

export const HARDWARE_FACTS = [
  {
    id: 'cpu',
    title: 'CPU',
    line: 'The CPU carries out a program one instruction at a time.',
    body: 'The central processing unit follows the program step by step. Cache on the chip keeps the next bits of data close, so the core spends less time waiting.',
  },
  {
    id: 'ram',
    title: 'RAM',
    line: 'RAM holds the work that is open right now.',
    body: 'Random access memory is fast and temporary. Switch the power off and that working copy is gone. Files you want to keep live on a drive, not in RAM.',
  },
  {
    id: 'gpu',
    title: 'GPU',
    line: 'A GPU runs thousands of small tasks side by side.',
    body: 'A graphics processor is built for parallel work. That is why it draws frames, and why some of the same chips also train models.',
  },
  {
    id: 'ssd',
    title: 'SSD',
    line: 'An SSD stores files in flash chips, with no spinning disk.',
    body: 'A solid-state drive has no platter to spin up, so a computer fitted with one starts and opens files faster than the same machine with a hard drive.',
  },
  {
    id: 'board',
    title: 'Motherboard',
    line: 'The motherboard is the main circuit board.',
    body: 'Buses on the motherboard connect the CPU, memory, storage, and cards. If a part is not seated in the right slot, the rest of the machine cannot talk to it.',
  },
  {
    id: 'psu',
    title: 'Power supply',
    line: 'The power supply feeds the chips a steady voltage.',
    body: 'A power supply turns wall current into the low voltages the parts expect. When it is too weak for the load, the PC shuts off instead of running slowly.',
  },
  {
    id: 'bus',
    title: 'Bus',
    line: 'A bus is the shared path data travels on.',
    body: 'Parts share a bus the way lanes share a road. A wider, faster bus moves more data each second between the CPU, memory, and devices.',
  },
  {
    id: 'heat',
    title: 'Cooling',
    line: 'Chips turn some electricity into heat.',
    body: 'A heatsink and fan move that heat into the air. If the CPU gets too hot it slows itself down, which is why a dusty fan makes a computer feel sluggish.',
  },
];

const FACT_BY_ID = Object.fromEntries(HARDWARE_FACTS.map((fact) => [fact.id, fact]));

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function difficultyForDistance(distance) {
  return clamp(distance / SPEED_RAMP_DISTANCE, 0, 1);
}

export function speedForDistance(distance) {
  const t = difficultyForDistance(distance);
  return INITIAL_SPEED + (MAX_SPEED - INITIAL_SPEED) * t;
}

export function spawnIntervalMs(difficulty) {
  return Math.round(1280 - clamp(difficulty, 0, 1) * 620);
}

export function distancePoints(distance) {
  return Math.floor(Math.max(0, distance) / 18);
}

export function jumpHeight(elapsedMs) {
  if (elapsedMs <= 0 || elapsedMs >= JUMP_MS) return 0;
  return Math.sin((elapsedMs / JUMP_MS) * Math.PI) * JUMP_APEX;
}

export function comboMultiplier(streak) {
  if (streak <= 1) return 1;
  return Math.min(MAX_MULTIPLIER, 1 + (streak - 1) * 0.5);
}

export function scorePickup({ points, streak, lastPickupAt, now }) {
  const chained = now - lastPickupAt <= COMBO_WINDOW_MS;
  const nextStreak = chained ? streak + 1 : 1;
  const multiplier = comboMultiplier(nextStreak);
  return {
    gained: Math.round(points * multiplier),
    streak: nextStreak,
    multiplier,
    lastPickupAt: now,
  };
}

export function obstacleWeights(difficulty) {
  const circuit = clamp(difficulty, 0, 1) * 0.46;
  const rest = 1 - circuit;
  return { virus: rest * 0.56, firewall: rest * 0.44, circuit };
}

export function pickWeighted(weights, rng) {
  let roll = rng() * Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const entries = Object.entries(weights);
  for (let i = 0; i < entries.length; i += 1) {
    roll -= entries[i][1];
    if (roll <= 0) return entries[i][0];
  }
  return entries[entries.length - 1][0];
}

export function playerHitbox(pose, jumpH) {
  if (pose === 'duck') return DUCK_HIT;
  const lift = pose === 'jump' ? jumpH : 0;
  return { y0: RUN_HIT.y0 + lift, y1: RUN_HIT.y1 + lift, w: RUN_HIT.w };
}

export function entitySpec(kind) {
  return HITBOX[kind];
}

export function overlapsPlayer(state, entity) {
  const player = playerHitbox(state.pose, state.jumpH || 0);
  const box = HITBOX[entity.kind];
  if (!box) return false;
  const px = playerXFor(state.viewWidth);
  const xOverlap = px < entity.x + box.w && px + player.w > entity.x;
  const yOverlap = player.y0 < box.y1 && player.y1 > box.y0;
  return xOverlap && yOverlap;
}

export function runnerFrame(pose, elapsedMs) {
  if (pose === 'jump') return 'jump';
  if (pose === 'duck') return 'duck';
  if (pose === 'hurt') return 'hurt';
  return Math.floor(elapsedMs / 110) % 2 === 0 ? 'run1' : 'run2';
}

export function keyAction(key) {
  const name = String(key || '').toLowerCase();
  if (name === ' ' || name === 'spacebar' || name === 'arrowup' || name === 'w') return 'jump';
  if (name === 'arrowdown' || name === 's') return 'duck';
  if (name === 'p' || name === 'escape') return 'pause';
  if (name === 'm') return 'mute';
  if (name === 'enter' || name === 'r') return 'confirm';
  return null;
}

export function factById(id) {
  return FACT_BY_ID[id] || null;
}

export function factForRun(chipIds, rng) {
  const known = (chipIds || []).map((id) => FACT_BY_ID[id]).filter(Boolean);
  const pool = known.length ? known : HARDWARE_FACTS;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index];
}

function makeEntity(id, kind, x, factId) {
  const spec = HITBOX[kind];
  return {
    id,
    kind,
    group: spec.group,
    x,
    factId: factId || null,
    points: spec.points || 0,
    resolved: false,
  };
}

function clearSpawnX(existing, x) {
  let next = x;
  for (let guard = 0; guard < 6; guard += 1) {
    const blocked = existing.some((entity) => (
      entity.group === 'obstacle' && Math.abs(entity.x - next) < CLEAR_GAP
    ));
    if (!blocked) return next;
    next += CLEAR_GAP;
  }
  return next;
}

export function planSpawn(state, rng) {
  const difficulty = difficultyForDistance(state.distance);
  const viewWidth = state.viewWidth || 800;
  const baseX = clearSpawnX(state.entities || [], viewWidth + 40);
  let nextId = state.nextId || 1;
  const takeId = () => {
    const id = nextId;
    nextId += 1;
    return id;
  };
  const entities = [];
  if (rng() < 0.36) {
    const kindRoll = rng();
    if (kindRoll < 0.18) {
      const fact = HARDWARE_FACTS[Math.floor(rng() * HARDWARE_FACTS.length)];
      entities.push(makeEntity(takeId(), 'chip', baseX, fact.id));
    } else if (kindRoll < 0.42) {
      entities.push(makeEntity(takeId(), 'gem', baseX));
    } else {
      const count = rng() < 0.6 ? 3 : 1;
      for (let i = 0; i < count; i += 1) {
        entities.push(makeEntity(takeId(), 'coin', baseX + i * 86));
      }
    }
  } else {
    const firstKind = pickWeighted(obstacleWeights(difficulty), rng);
    entities.push(makeEntity(takeId(), firstKind, baseX));
    if (rng() < 0.28 + difficulty * 0.2) {
      let secondKind = firstKind === 'firewall' ? 'virus' : 'firewall';
      if (rng() < 0.35) secondKind = 'circuit';
      if (secondKind === 'circuit' && firstKind === 'circuit') secondKind = 'virus';
      entities.push(makeEntity(takeId(), secondKind, baseX + CLEAR_GAP + 40));
    }
  }
  return { entities, nextId };
}

export function waveIsFair(entities) {
  const obstacles = (entities || []).filter((entity) => entity.group === 'obstacle');
  const circuits = obstacles.filter((entity) => entity.kind === 'circuit');
  if (circuits.length > 1) return false;
  for (let i = 0; i < obstacles.length; i += 1) {
    for (let j = i + 1; j < obstacles.length; j += 1) {
      const a = HITBOX[obstacles[i].kind];
      const b = HITBOX[obstacles[j].kind];
      if (!a || !b || a.air === b.air) continue;
      if (Math.abs(obstacles[i].x - obstacles[j].x) < CLEAR_GAP) return false;
    }
  }
  return true;
}

export function createRun(viewWidth = 800) {
  return {
    phase: 'playing',
    paused: false,
    viewWidth,
    elapsed: 0,
    distance: 0,
    pickupScore: 0,
    score: 0,
    coinCount: 0,
    lives: START_LIVES,
    lane: 1,
    pose: 'run',
    jumpT: 0,
    jumpH: 0,
    duckT: 0,
    hurtT: 0,
    streak: 0,
    bestStreak: 0,
    multiplier: 1,
    lastPickupAt: -100000,
    invincibleUntil: 0,
    entities: [],
    nextSpawnAt: 520,
    nextId: 1,
    chips: [],
    milestonesHit: [],
  };
}

function advancePose(state, dtMs) {
  if (state.pose === 'jump') {
    state.jumpT += dtMs;
    state.jumpH = jumpHeight(state.jumpT);
    if (state.jumpT >= JUMP_MS) {
      state.pose = 'run';
      state.jumpT = 0;
      state.jumpH = 0;
    }
  } else if (state.pose === 'duck') {
    state.duckT += dtMs;
    if (state.duckT >= DUCK_MS) {
      state.pose = 'run';
      state.duckT = 0;
    }
  } else if (state.pose === 'hurt') {
    state.hurtT += dtMs;
    if (state.hurtT >= HURT_MS) {
      state.pose = 'run';
      state.hurtT = 0;
    }
  } else {
    state.jumpH = 0;
  }
}

function applyInput(state, input, events) {
  if (!input) return;
  if (input.jump && state.pose !== 'jump' && state.pose !== 'duck') {
    state.pose = 'jump';
    state.jumpT = 0;
    state.jumpH = 0;
    events.push({ type: 'jump' });
  } else if (input.duck && state.pose !== 'jump' && state.pose !== 'duck') {
    state.pose = 'duck';
    state.duckT = 0;
    events.push({ type: 'duck' });
  }
}

export function tick(prev, dtMs, input = {}, rng = Math.random) {
  if (!prev || prev.phase !== 'playing' || prev.paused) {
    return { state: prev, events: [] };
  }
  const dt = clamp(dtMs, 0, 50);
  const state = {
    ...prev,
    entities: prev.entities.map((entity) => ({ ...entity })),
    chips: prev.chips.slice(),
    milestonesHit: prev.milestonesHit.slice(),
  };
  const events = [];
  applyInput(state, input, events);
  state.elapsed += dt;
  advancePose(state, dt);

  const speed = speedForDistance(state.distance);
  state.speed = speed;
  state.distance += speed * (dt / 1000);

  const kept = [];
  for (const entity of state.entities) {
    entity.x -= speed * (dt / 1000);
    const spec = HITBOX[entity.kind];
    if (entity.x + (spec ? spec.w : 0) < -40) continue;
    if (!entity.resolved && overlapsPlayer(state, entity)) {
      entity.resolved = true;
      if (entity.group === 'obstacle') {
        if (state.elapsed < state.invincibleUntil) {
          kept.push(entity);
          continue;
        }
        state.lives -= 1;
        state.streak = 0;
        state.multiplier = 1;
        state.pose = 'hurt';
        state.hurtT = 0;
        state.jumpT = 0;
        state.jumpH = 0;
        state.invincibleUntil = state.elapsed + INVINCIBLE_MS;
        events.push({ type: 'hit', kind: entity.kind, lives: state.lives });
        if (state.lives <= 0) {
          state.phase = 'dead';
          events.push({ type: 'dead', score: state.score });
        }
        continue;
      }
      const award = scorePickup({
        points: entity.points,
        streak: state.streak,
        lastPickupAt: state.lastPickupAt,
        now: state.elapsed,
      });
      state.pickupScore += award.gained;
      state.streak = award.streak;
      state.multiplier = award.multiplier;
      state.lastPickupAt = award.lastPickupAt;
      if (entity.kind === 'coin') state.coinCount += 1;
      if (award.streak > state.bestStreak) state.bestStreak = award.streak;
      if (entity.kind === 'chip' && entity.factId && !state.chips.includes(entity.factId)) {
        state.chips = state.chips.concat(entity.factId);
      }
      const fact = entity.factId ? FACT_BY_ID[entity.factId] : null;
      events.push({
        type: 'collect',
        kind: entity.kind,
        points: award.gained,
        streak: award.streak,
        multiplier: award.multiplier,
        factId: entity.factId,
        title: fact ? fact.title : null,
        line: fact ? fact.line : null,
      });
      continue;
    }
    kept.push(entity);
  }
  state.entities = kept;

  const previousScore = state.score;
  state.score = state.pickupScore + distancePoints(state.distance);
  if (state.phase === 'playing') {
    MILESTONES.forEach((mark) => {
      if (previousScore < mark && state.score >= mark && !state.milestonesHit.includes(mark)) {
        state.milestonesHit = state.milestonesHit.concat(mark);
        events.push({ type: 'milestone', score: mark });
      }
    });
    if (state.elapsed >= state.nextSpawnAt) {
      const spawned = planSpawn(state, rng);
      state.entities = state.entities.concat(spawned.entities);
      state.nextId = spawned.nextId;
      state.nextSpawnAt = state.elapsed + spawnIntervalMs(difficultyForDistance(state.distance));
      events.push({ type: 'spawn', count: spawned.entities.length });
    }
  }
  if (state.phase === 'dead') {
    events.forEach((event) => {
      if (event.type === 'dead') event.score = state.score;
    });
  }
  return { state, events };
}
