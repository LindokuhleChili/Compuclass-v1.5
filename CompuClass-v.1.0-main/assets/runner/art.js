// Static requires so Metro can bundle only the files the runner draws.

export const runnerArt = {
  player: {
    run1: require('./player/run1.png'),
    run2: require('./player/run2.png'),
    jump: require('./player/jump.png'),
    duck: require('./player/duck.png'),
    hurt: require('./player/hurt.png'),
    idle: require('./player/idle.png'),
  },
  ghost: {
    run1: require('./ghost/run1.png'),
    run2: require('./ghost/run2.png'),
  },
  items: {
    coin: require('./items/coin.png'),
    gem: require('./items/gem.png'),
    chip: require('./obstacles/chip.png'),
  },
  obstacles: {
    virus: require('./obstacles/virus.png'),
    firewall: require('./obstacles/firewall.png'),
    circuit: require('./obstacles/circuit.png'),
  },
  bg: {
    cloud1: require('./bg/cloud1.png'),
    cloud3: require('./bg/cloud3.png'),
    cloud5: require('./bg/cloud5.png'),
    moon: require('./bg/moon_full.png'),
    starTiny: require('./bg/star_tiny.png'),
    starSmall: require('./bg/star_small.png'),
    satellite: require('./bg/satellite_A.png'),
    meteor: require('./bg/meteor_small.png'),
  },
  ground: require('./ground/strip.png'),
  ui: {
    primary: require('./ui/button-primary.png'),
    secondary: require('./ui/button-secondary.png'),
    pause: require('./ui/pause.png'),
    audioOn: require('./ui/audioOn.png'),
    audioOff: require('./ui/audioOff.png'),
    trophy: require('./ui/trophy.png'),
    home: require('./ui/home.png'),
    back: require('./ui/return.png'),
    star: require('./ui/star.png'),
    up: require('./ui/arrowUp.png'),
    down: require('./ui/arrowDown.png'),
    left: require('./ui/arrowLeft.png'),
    right: require('./ui/arrowRight.png'),
    solo: require('./ui/singleplayer.png'),
    multi: require('./ui/multiplayer.png'),
    play: require('./ui/forward.png'),
  },
};

export const runnerSfx = {
  jump: require('./sfx/jump.mp3'),
  duck: require('./sfx/duck.mp3'),
  coin: require('./sfx/coin.mp3'),
  chip: require('./sfx/chip.mp3'),
  hit: require('./sfx/hit.mp3'),
  over: require('./sfx/over.mp3'),
  click: require('./sfx/click.mp3'),
};
