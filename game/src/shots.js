// Neon Harbor — demo staging for screenshots: put the game into a scene worth showing.
// One file, one job: given a shot name, arrange the player, the police and the mission.

import { TUNING } from './config.js';
import { makeCar } from './vehicles.js';

function policeBehind(state, x, y, count, gap) {
  for (let i = 0; i < count; i++) {
    state.cars.push(makeCar({
      x: x - (i + 1) * gap,
      y: y + (i % 2 === 0 ? 26 : -26),
      angle: 0,
      color: '#22262e',
      kind: 'police',
      driver: 'police',
    }));
    state.cars[state.cars.length - 1].speed = 300;
  }
}

export function applyShot(state, name) {
  const p = state.player;
  if (name === 'start') {
    state.mode = 'menu';
    p.x = 1400;
    p.y = 1400;
    return;
  }
  if (name === 'chase') {
    // Cover shot: a getaway in progress — wanted 3, police on the tail,
    // the minimap, the mission objective and the HUD all in frame.
    state.missions.start(1);
    const car = makeCar({ x: 600, y: 1400, angle: 0, color: '#d94040', kind: 'sport', driver: 'player' });
    car.speed = 380;
    state.cars.push(car);
    p.car = car;
    p.onFoot = false;
    p.x = car.x;
    p.y = car.y;
    policeBehind(state, car.x, car.y, 3, 160);
    state.wanted = 3;
    state.heat = 100;
    state.demoDrive = true;
    state.mode = 'playing';
    return;
  }
  if (name === 'foot') {
    // On foot downtown: pedestrians, traffic, one star, the docks job on the HUD.
    state.missions.start(0);
    p.x = 1400;
    p.y = 1400;
    p.onFoot = true;
    p.car = null;
    state.wanted = 1;
    state.heat = 100;
    state.mode = 'playing';
    return;
  }
  if (name === 'vault') {
    // The Harbor Vault job mid-hold: the vault ring, four stars, police closing in.
    state.missions.start(2);
    state.missions.stage = 1;
    state.missions.holdTime = TUNING.holdSeconds * 0.25;
    p.x = 1800;
    p.y = 1420;
    p.onFoot = true;
    p.car = null;
    state.wanted = 4;
    state.heat = 100;
    // Police start far enough west that they close in during the shot
    // without sitting on the player long enough to bust them.
    policeBehind(state, 1450, 1400, 2, 110);
    state.mode = 'playing';
    return;
  }
  state.mode = 'menu';
}
