// Neon Harbor — people: the player on foot, pedestrians, and bullets.
// One file, one job: everything that walks, runs, or gets shot.

import { WORLD, TUNING } from './config.js';
import { resolveBuildingCollision } from './city.js';

export function makePlayer(x, y) {
  return {
    x, y,
    angle: 0,
    health: TUNING.playerMaxHealth,
    ammo: 24,
    onFoot: true,
    car: null,
    shake: 0,
    invulnerable: 0,
    running: false,
  };
}

export function makePedestrian(x, y, rng) {
  return {
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(28, 62),
    color: rng.pick(['#e8e8e8', '#d9a066', '#7fb8d9', '#c96f8e', '#9a8ac0', '#e0c060']),
    panic: 0,
    target: null,
    dead: false,
  };
}

export function spawnPedestrians(city, rng, count) {
  const peds = [];
  void city; // Pedestrians stick to the sidewalks beside the roads, not to buildings.
  for (let i = 0; i < count; i++) {
    // Pedestrians stroll the sidewalks beside the roads.
    const vertical = rng.chance(0.5);
    const line = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000][rng.int(0, 7)];
    const along = rng.range(120, WORLD.size - 120);
    const off = rng.chance(0.5) ? 62 : -62;
    peds.push(makePedestrian(
      vertical ? line + off : along,
      vertical ? along : line + off,
      rng,
    ));
  }
  return peds;
}

// Move the player on foot: WASD/arrows, Shift to run, mouse to aim, click to shoot.
export function updatePlayerOnFoot(player, input, dt, city, state) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const len = Math.hypot(mx, my);
  const speed = input.run ? TUNING.runSpeed : TUNING.walkSpeed;
  if (len > 0) {
    player.x += (mx / len) * speed * dt;
    player.y += (my / len) * speed * dt;
  }
  player.running = !!input.run && !!(mx || my);
  player.x = Math.max(20, Math.min(WORLD.size - 20, player.x));
  player.y = Math.max(20, Math.min(WORLD.size - 20, player.y));
  resolveBuildingCollision(player, TUNING.playerRadius, city.buildings);
  // Aim at the mouse (screen space converted by the caller into world space).
  if (input.aimX !== undefined && input.aimY !== undefined) {
    player.angle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
  }
  if (input.shoot && player.ammo > 0 && state.shootCooldown <= 0) {
    state.shootCooldown = 0.22;
    player.ammo -= 1;
    state.bullets.push({
      x: player.x + Math.cos(player.angle) * 20,
      y: player.y + Math.sin(player.angle) * 20,
      vx: Math.cos(player.angle) * TUNING.bulletSpeed,
      vy: Math.sin(player.angle) * TUNING.bulletSpeed,
      life: TUNING.bulletLife,
      from: 'player',
    });
    state.sound.shot();
    player.shake = Math.max(player.shake, 2);
  }
}

// Pedestrians wander the sidewalks and scatter when shots ring out.
export function updatePedestrians(peds, dt, city, state) {
  for (const ped of peds) {
    if (ped.dead) continue;
    if (state.alarm > 0) ped.panic = Math.max(ped.panic, 2);
    if (ped.panic > 0) {
      ped.panic -= dt;
      const dx = ped.x - state.player.x;
      const dy = ped.y - state.player.y;
      const d = Math.hypot(dx, dy) || 1;
      ped.x += (dx / d) * 150 * dt;
      ped.y += (dy / d) * 150 * dt;
    } else {
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (Math.random() < dt * 0.12) ped.angle += (Math.random() - 0.5) * 2.4;
    }
    ped.x = Math.max(20, Math.min(WORLD.size - 20, ped.x));
    ped.y = Math.max(20, Math.min(WORLD.size - 20, ped.y));
    resolveBuildingCollision(ped, 10, city.buildings);
  }
}

// Bullets fly, hit buildings, cars and people, and spark particles on impact.
export function updateBullets(state, dt, city) {
  const kept = [];
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (b.x < 0 || b.y < 0 || b.x > WORLD.size || b.y > WORLD.size) continue;
    let hit = false;
    // Buildings stop bullets.
    for (const bd of city.buildings) {
      if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h) { hit = true; break; }
    }
    if (!hit) {
      // Cars take a hit.
      for (const car of state.cars) {
        if (car.dead) continue;
        if (Math.hypot(b.x - car.x, b.y - car.y) < 20) {
          hit = true;
          car.hp = (car.hp ?? 3) - 1;
          if (car.hp <= 0 && car.driver === 'police') {
            car.dead = true;
            state.sound.crash();
            addParticles(state, car.x, car.y, '#ff9040', 14);
          }
          break;
        }
      }
    }
    if (!hit && b.from !== 'player') {
      // Police bullets can wound the player.
      const p = state.player;
      if (Math.hypot(b.x - p.x, b.y - p.y) < TUNING.playerRadius + 2) {
        hit = true;
        if (p.invulnerable <= 0) {
          p.health -= 9;
          p.invulnerable = 0.5;
          p.shake = Math.max(p.shake, 5);
          addParticles(state, p.x, p.y, '#d94040', 8);
        }
      }
    }
    if (!hit) {
      // The player's bullets can hit pedestrians — and the law notices.
      if (b.from === 'player') {
        for (const ped of state.peds) {
          if (ped.dead) continue;
          if (Math.hypot(b.x - ped.x, b.y - ped.y) < 12) {
            hit = true;
            ped.dead = true;
            addParticles(state, ped.x, ped.y, '#d94040', 10);
            state.alarm = 2;
            state.missions.crime('shoot');
            break;
          }
        }
      }
    }
    if (hit) addParticles(state, b.x, b.y, '#ffd34d', 4);
    else kept.push(b);
  }
  state.bullets = kept;
}

export function addParticles(state, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 160;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, color });
  }
}

export function updateParticles(state, dt) {
  state.particles = state.particles.filter((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2 * dt;
    p.vy *= 1 - 2 * dt;
    p.life -= dt;
    return p.life > 0;
  });
}
