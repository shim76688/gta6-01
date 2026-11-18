// Neon Harbor — cars: player driving physics, traffic that follows the roads,
// and police that hunt the player. One file, one job: everything with four wheels.

import { WORLD, PALETTE, TUNING } from './config.js';
import { Rng } from './random.js';
import { roadLines, isOnRoad, circleHitsBuildings, resolveBuildingCollision } from './city.js';

let carId = 0;

export function makeCar(opts) {
  return {
    id: ++carId,
    x: opts.x,
    y: opts.y,
    angle: opts.angle || 0,
    speed: 0,
    color: opts.color || '#d94040',
    kind: opts.kind || 'sedan',
    driver: opts.driver || 'traffic',
    route: opts.route || null,
    routeIndex: 0,
    stuck: 0,
    siren: 0,
    dead: false,
  };
}

function randomRoadPoint(rng) {
  const lines = roadLines();
  const vertical = rng.chance(0.5);
  const line = rng.pick(lines);
  const along = rng.range(120, WORLD.size - 120);
  return vertical ? { x: line, y: along } : { x: along, y: line };
}

export function spawnTraffic(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng);
    const vertical = rng.chance(0.5);
    const car = makeCar({
      x: p.x,
      y: p.y,
      angle: vertical ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI),
      color: rng.chance(0.12) ? PALETTE.taxi : rng.pick(PALETTE.carColors),
      kind: rng.chance(0.1) ? 'truck' : 'sedan',
      driver: 'traffic',
    });
    car.route = [randomRoadPoint(rng), randomRoadPoint(rng), randomRoadPoint(rng)];
    cars.push(car);
  }
  return cars;
}

export function spawnParked(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng);
    const lines = roadLines();
    const nearVertical = Math.abs(p.x - lines.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a))) < 10;
    cars.push(makeCar({
      x: p.x + (nearVertical ? 34 : 0),
      y: p.y + (nearVertical ? 0 : 34),
      angle: nearVertical ? Math.PI / 2 : 0,
      color: rng.pick(PALETTE.carColors),
      kind: 'sedan',
      driver: 'parked',
    }));
  }
  return cars;
}

function steerToward(car, tx, ty, dt, maxTurn) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-maxTurn * dt, Math.min(maxTurn * dt, diff));
  car.angle += turn;
  return Math.abs(diff);
}

// Traffic follows its route of road points, braking for the car ahead.
export function updateTraffic(cars, city, dt, allCars) {
  for (const car of cars) {
    if (car.driver !== 'traffic' || car.dead) continue;
    const target = car.route[car.routeIndex];
    if (!target) continue;
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    if (dx * dx + dy * dy < 900) {
      car.routeIndex = (car.routeIndex + 1) % car.route.length;
      continue;
    }
    // Brake when another car is close ahead.
    let blocked = false;
    for (const other of allCars) {
      if (other === car || other.dead) continue;
      const ox = other.x - car.x;
      const oy = other.y - car.y;
      const dist = Math.hypot(ox, oy);
      if (dist < 70 && Math.cos(car.angle) * ox + Math.sin(car.angle) * oy > 0) { blocked = true; break; }
    }
    const wantSpeed = blocked ? 0 : TUNING.trafficSpeed;
    car.speed += Math.max(-260 * dt, Math.min(200 * dt, wantSpeed - car.speed));
    steerToward(car, target.x, target.y, dt, 2.2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (!isOnRoad(car.x, car.y)) {
      // Nudged off the asphalt: steer back toward the nearest road.
      const lines = roadLines();
      const nearX = lines.reduce((a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a));
      const nearY = lines.reduce((a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a));
      if (Math.abs(nearX - car.x) < Math.abs(nearY - car.y)) car.angle += (Math.atan2(0, nearX - car.x) - car.angle) * dt * 2;
      else car.angle += (Math.atan2(nearY - car.y, 0) - car.angle) * dt * 2;
    }
    if (circleHitsBuildings(car.x, car.y, 16, city.buildings)) {
      car.speed *= 0.4;
      car.angle += Math.PI * 0.5 * dt;
    }
  }
}

// Police chase the player: steer at them, ram them, and flash the light bar.
export function updatePolice(cars, player, dt, city) {
  for (const car of cars) {
    if (car.driver !== 'police' || car.dead) continue;
    car.siren += dt;
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const diff = steerToward(car, player.x, player.y, dt, 3.0);
    const wantSpeed = dist > 260 ? TUNING.policeSpeed : TUNING.policeSpeed * 0.75;
    car.speed += Math.max(-TUNING.policeAccel * dt, Math.min(TUNING.policeAccel * dt, wantSpeed - car.speed));
    if (diff > 2.4) car.speed *= 0.92;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (circleHitsBuildings(car.x, car.y, 16, city.buildings)) {
      car.speed *= 0.5;
      car.angle += 0.9 * dt;
    }
    // Ram the player's car: a shove and a speed cut, but on a cooldown —
    // three cruisers ramming every frame would pin the player forever.
    if (player.car && dist < 44) {
      car.ramCooldown = (car.ramCooldown || 0) - dt;
      if (car.ramCooldown <= 0) {
        car.ramCooldown = 0.5;
        player.car.speed *= 0.94;
        player.shake = Math.max(player.shake || 0, 5);
      }
    }
  }
}

// Player car physics: arcade handling with a handbrake slide.
export function updatePlayerCar(car, input, dt, city) {
  const forward = Math.cos(car.angle);
  const right = Math.sin(car.angle);
  const along = input.x * forward + input.y * right;
  if (input.up) car.speed += TUNING.carAccel * dt;
  if (input.down) car.speed -= (car.speed > 0 ? TUNING.carBrake : TUNING.carAccel * 0.6) * dt;
  if (!input.up && !input.down) car.speed -= Math.sign(car.speed) * 140 * dt;
  if (Math.abs(car.speed) < 4 && !input.up && !input.down) car.speed = 0;
  car.speed = Math.max(-TUNING.carMaxReverse, Math.min(TUNING.carMaxSpeed, car.speed));
  const grip = input.handbrake ? 0.55 : 1;
  const turnRate = TUNING.carTurn * (input.handbrake ? TUNING.handbrakeTurn / TUNING.carTurn : 1) * Math.min(1, Math.abs(car.speed) / 140);
  if (input.left) car.angle -= turnRate * dt * Math.sign(car.speed || 1) * grip;
  if (input.right) car.angle += turnRate * dt * Math.sign(car.speed || 1) * grip;
  if (input.handbrake) car.speed *= 1 - 0.7 * dt;
  const before = { x: car.x, y: car.y };
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(30, Math.min(WORLD.size - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD.size - 30, car.y));
  if (circleHitsBuildings(car.x, car.y, 17, city.buildings)) {
    car.x = before.x;
    car.y = before.y;
    if (Math.abs(car.speed) > 240) car.crashed = true;
    car.speed *= -0.25;
  }
  return along;
}

// Keep cars from overlapping: push pairs apart. Position only — speed is
// the ram's job, not this function's: damping speed here every frame pinned
// any car three cruisers touched to a standstill.
export function separateCars(cars) {
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 38) {
        const push = (38 - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}
