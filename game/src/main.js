// Neon Harbor — the game loop: input, state, and the update order.
// One file, one job: wire the modules together and run the frame.

import { WORLD, TUNING, LANDMARKS, GAME_TITLE } from './config.js';
import { Rng } from './random.js';
import { buildCity } from './city.js';
import { makeCar, spawnTraffic, spawnParked, updateTraffic, updatePolice, updatePlayerCar, separateCars } from './vehicles.js';
import { makePlayer, spawnPedestrians, updatePlayerOnFoot, updatePedestrians, updateBullets, updateParticles, addParticles } from './people.js';
import { createMissions } from './missions.js';
import { SoundBank } from './audio.js';
import { drawFrame, cameraFor, ZOOM } from './render.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const city = buildCity(seed);
const rng = new Rng(seed * 7919 + 13);
const sound = new SoundBank();

const state = {
  mode: 'menu',
  time: 0,
  cash: 0,
  wanted: 0,
  heat: 0,
  alarm: 0,
  shootCooldown: 0,
  bullets: [],
  particles: [],
  cars: [],
  peds: [],
  player: makePlayer(600, 620),
  city,
  landmarks: LANDMARKS,
  sound,
  missions: null,
  menuButtons: [],
  muted: false,
  demoDrive: false,
};
state.missions = createMissions(state);
state.cars = [...spawnTraffic(city, rng, TUNING.maxTraffic), ...spawnParked(city, rng, 8)];
state.peds = spawnPedestrians(city, rng, TUNING.maxPeds);

const input = {
  up: false, down: false, left: false, right: false,
  run: false, handbrake: false, shoot: false,
  aimX: undefined, aimY: undefined,
};

function worldAim(clientX, clientY) {
  const cam = cameraFor(state, canvas.width, canvas.height);
  // The world is drawn zoomed about the screen centre, so un-zoom the click.
  return {
    x: cam.x + canvas.width / 2 + (clientX - canvas.width / 2) / ZOOM,
    y: cam.y + canvas.height / 2 + (clientY - canvas.height / 2) / ZOOM,
  };
}

function startGame() {
  const save = state.missions.load();
  state.cash = 0;
  state.player.health = TUNING.playerMaxHealth;
  state.player.ammo = 24;
  state.player.x = 600;
  state.player.y = 620;
  state.player.onFoot = true;
  state.player.car = null;
  state.wanted = 0;
  state.heat = 0;
  if (save && save.missionIndex > 0 && save.missionIndex < 3) {
    state.cash = save.cash || 0;
    state.missions.start(save.missionIndex);
  } else {
    state.missions.start(0);
  }
  state.mode = 'playing';
  sound.init();
  sound.music(true);
}

function respawnFreeRoam() {
  const p = state.player;
  p.health = TUNING.playerMaxHealth;
  p.x = 2600;
  p.y = 2580;
  p.onFoot = true;
  p.car = null;
  state.wanted = 0;
  state.heat = 0;
  state.mode = 'playing';
}

function nearestCar(maxDist) {
  const p = state.player;
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function enterOrExitCar() {
  const p = state.player;
  if (!p.onFoot) {
    // Get out: step aside from the car and leave it parked.
    const car = p.car;
    car.driver = 'parked';
    car.speed = 0;
    p.x = car.x - Math.sin(car.angle) * 34;
    p.y = car.y + Math.cos(car.angle) * 34;
    p.car = null;
    p.onFoot = true;
    return;
  }
  const car = nearestCar(52);
  if (!car) {
    state.missions.tryInteract();
    return;
  }
  if (car.driver === 'traffic') {
    state.missions.crime('steal');
    state.missions.showMessage('Car stolen — the law is coming.', 3);
  } else if (car.driver === 'police') {
    state.missions.crime('steal');
    state.missions.showMessage('You stole a cop car. Bold.', 3);
  }
  car.driver = 'player';
  p.car = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  sound.engine(true, 0);
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'handbrake',
};

window.addEventListener('keydown', (e) => {
  sound.init();
  if (e.code === 'Space') e.preventDefault();
  const mapped = KEYMAP[e.code];
  if (mapped) input[mapped] = true;
  if (e.code === 'KeyE' && !e.repeat) {
    if (state.mode === 'playing') enterOrExitCar();
  }
  if (e.code === 'KeyP' && !e.repeat) {
    if (state.mode === 'playing') { state.mode = 'paused'; sound.music(false); }
    else if (state.mode === 'paused') { state.mode = 'playing'; sound.music(true); }
  }
  if (e.code === 'KeyM' && !e.repeat) {
    state.muted = !state.muted;
    sound.setMuted(state.muted);
  }
  if (e.code === 'Enter' && !e.repeat) {
    if (state.mode === 'menu') startGame();
    else if (state.mode === 'help') state.mode = 'menu';
    else if (state.mode === 'dead' || state.mode === 'busted' || state.mode === 'victory') respawnFreeRoam();
  }
});

window.addEventListener('keyup', (e) => {
  const mapped = KEYMAP[e.code];
  if (mapped) input[mapped] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const aim = worldAim(e.clientX, e.clientY);
  input.aimX = aim.x;
  input.aimY = aim.y;
});

canvas.addEventListener('mousedown', (e) => {
  sound.init();
  if (state.mode === 'menu') {
    const b = state.menuButtons.find((btn) => e.clientX >= btn.x && e.clientX <= btn.x + btn.w && e.clientY >= btn.y && e.clientY <= btn.y + btn.h);
    if (b && b.action === 'start') startGame();
    if (b && b.action === 'help') state.mode = 'help';
    return;
  }
  if (state.mode === 'help') { state.mode = 'menu'; return; }
  if (state.mode === 'playing') input.shoot = true;
});

window.addEventListener('mouseup', () => { input.shoot = false; });

function update(dt) {
  state.time += dt;
  if (state.alarm > 0) state.alarm -= dt;
  if (state.shootCooldown > 0) state.shootCooldown -= dt;
  const p = state.player;
  if (p.shake > 0) p.shake = Math.max(0, p.shake - dt * 22);
  if (p.invulnerable > 0) p.invulnerable -= dt;
  if (state.mode !== 'playing') return;

  state.missions.update(dt);

  // Demo shots drive themselves so the cover shows a chase at speed, not a parked car.
  if (state.demoDrive && p.car) input.up = true;

  if (p.onFoot) {
    updatePlayerOnFoot(p, input, dt, city, state);
  } else if (p.car) {
    updatePlayerCar(p.car, input, dt, city);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    if (p.car.crashed) {
      p.car.crashed = false;
      sound.crash();
      addParticles(state, p.car.x, p.car.y, '#ff9040', 10);
      p.shake = Math.max(p.shake, 7);
    }
    // Running over pedestrians is a crime the whole street sees.
    for (const ped of state.peds) {
      if (ped.dead) continue;
      if (Math.abs(p.car.speed) > 60 && Math.hypot(ped.x - p.car.x, ped.y - p.car.y) < 24) {
        ped.dead = true;
        addParticles(state, ped.x, ped.y, '#d94040', 10);
        state.missions.crime('hit');
        sound.crash();
      }
    }
  }

  updateTraffic(state.cars, city, dt, state.cars);
  updatePolice(state.cars, p, dt, city);
  separateCars(state.cars);
  state.cars = state.cars.filter((c) => !c.dead || c.driver === 'player');
  updatePedestrians(state.peds, dt, city, state);
  updateBullets(state, dt, city);
  updateParticles(state, dt);

  // Slow recovery when the heat is off.
  if (state.wanted === 0 && p.health < TUNING.playerMaxHealth) {
    p.health = Math.min(TUNING.playerMaxHealth, p.health + TUNING.healthRegen * dt);
  }
  if (p.health <= 0) {
    state.mode = 'dead';
    sound.crash();
    sound.music(false);
  }

  const driving = !p.onFoot && p.car;
  sound.engine(!!driving, driving ? Math.abs(p.car.speed) / TUNING.carMaxSpeed : 0);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawFrame(ctx, state, city, canvas.width, canvas.height);
  document.getElementById('status').textContent =
    GAME_TITLE + ': ' + state.missions.objectiveText() + ' Cash $' + state.cash + ', wanted ' + state.wanted + ' stars.';
  requestAnimationFrame(frame);
}

if (shot) applyShot(state, shot);
window.__neonHarbor = state;
requestAnimationFrame(frame);
