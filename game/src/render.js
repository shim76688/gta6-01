// Neon Harbor — everything you see: the city, the cars, the people, the HUD,
// the minimap and the menus. One file, one job: turn game state into a picture.

import { WORLD, PALETTE, TUNING, GAME_TITLE, CITY_NAME } from './config.js';

// Zoom the world a little so the player, cars and streets read at a glance.
export const ZOOM = 1.25;

export function cameraFor(state, viewW, viewH) {
  const p = state.player;
  const focus = p.car || p;
  // When driving, look ahead of the car: the player sits off-centre and
  // the pursuit behind stays in frame.
  let fx = focus.x;
  let fy = focus.y;
  if (p.car) {
    fx += Math.cos(p.car.angle) * 170;
    fy += Math.sin(p.car.angle) * 170;
  }
  let cx = fx - viewW / 2;
  let cy = fy - viewH / 2;
  cx = Math.max(0, Math.min(WORLD.size - viewW, cx));
  cy = Math.max(0, Math.min(WORLD.size - viewH, cy));
  const shake = p.shake || 0;
  if (shake > 0.2) {
    cx += (Math.random() - 0.5) * shake;
    cy += (Math.random() - 0.5) * shake;
  }
  return { x: cx, y: cy, w: viewW, h: viewH };
}

function drawRoads(ctx, cam, city) {
  const half = WORLD.roadWidth / 2;
  ctx.fillStyle = PALETTE.road;
  for (const p of city.lines) {
    ctx.fillRect(p - half - cam.x, -cam.y, WORLD.roadWidth, WORLD.size);
    ctx.fillRect(-cam.x, p - half - cam.y, WORLD.size, WORLD.roadWidth);
  }
  // Centre dashes.
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  ctx.beginPath();
  for (const p of city.lines) {
    ctx.moveTo(p - cam.x, -cam.y);
    ctx.lineTo(p - cam.x, WORLD.size - cam.y);
    ctx.moveTo(-cam.x, p - cam.y);
    ctx.lineTo(WORLD.size - cam.x, p - cam.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Sidewalks: pale strips hugging each road.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const p of city.lines) {
    ctx.fillRect(p - half - 12 - cam.x, -cam.y, 10, WORLD.size);
    ctx.fillRect(p + half + 2 - cam.x, -cam.y, 10, WORLD.size);
    ctx.fillRect(-cam.x, p - half - 12 - cam.y, WORLD.size, 10);
    ctx.fillRect(-cam.x, p + half + 2 - cam.y, WORLD.size, 10);
  }
}

function drawBeach(ctx, cam, time) {
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(-cam.x, WORLD.beachTop - cam.y, WORLD.size, WORLD.waterTop - WORLD.beachTop);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(-cam.x, WORLD.waterTop - cam.y, WORLD.size, WORLD.size - WORLD.waterTop);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let i = 0; i < 10; i++) {
    const y = WORLD.waterTop + 14 + i * 16 + Math.sin(time * 1.4 + i * 1.7) * 3;
    ctx.fillRect(-cam.x, y - cam.y, WORLD.size, 3);
  }
  ctx.fillStyle = '#fff8dc';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('NEON HARBOR BEACH', 120 - cam.x, WORLD.beachTop + 34 - cam.y);
}

function drawBuildings(ctx, cam, city) {
  for (const b of city.buildings) {
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    if (sx > cam.w + 60 || sy > cam.h + 60 || sx + b.w < -60 || sy + b.h < -60) continue;
    const h = b.height;
    // Fake 3D: a dark side face, then the roof on top, shifted up-left.
    ctx.fillStyle = PALETTE.buildingSide;
    ctx.fillRect(sx + 4, sy + 4, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(sx - h * 0.35, sy - h * 0.5, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - h * 0.35, sy - h * 0.5, b.w, b.h);
    if (b.kind === 'tower') {
      ctx.fillStyle = 'rgba(255,255,220,0.75)';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(sx - h * 0.35 + 8 + (i % 3) * (b.w / 3.4), sy - h * 0.5 + 8 + Math.floor(i / 3) * (b.h / 3), 7, 7);
      }
    }
  }
  for (const park of city.parks) {
    const sx = park.x - cam.x;
    const sy = park.y - cam.y;
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(sx, sy, park.w, park.h);
    ctx.fillStyle = '#4d7a35';
    for (let i = 0; i < park.trees; i++) {
      const tx = sx + 24 + ((i * 67) % (park.w - 40));
      const ty = sy + 24 + ((i * 43) % (park.h - 40));
      ctx.beginPath();
      ctx.arc(tx, ty, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCarShape(ctx, car, cam) {
  const sx = car.x - cam.x;
  const sy = car.y - cam.y;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);
  const len = car.kind === 'truck' ? 46 : 38;
  const wid = car.kind === 'truck' ? 22 : 19;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-len / 2 + 3, -wid / 2 + 3, len, wid);
  ctx.fillStyle = car.color;
  ctx.fillRect(-len / 2, -wid / 2, len, wid);
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  ctx.fillRect(-len / 2 + 7, -wid / 2 + 3, 10, wid - 6);
  ctx.fillRect(len / 2 - 14, -wid / 2 + 3, 8, wid - 6);
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 2, 2, 5);
  ctx.fillRect(len / 2 - 2, wid / 2 - 7, 2, 5);
  if (car.driver === 'police') {
    const flash = Math.floor(car.siren * 3) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d6bff';
    ctx.fillRect(-4, -wid / 2 - 2, 8, 5);
    ctx.fillStyle = flash ? '#2d6bff' : '#ff2d2d';
    ctx.fillRect(-4, wid / 2 - 3, 8, 5);
    ctx.fillStyle = PALETTE.policeTrim;
    ctx.fillRect(-len / 2 + 2, -wid / 2, 4, wid);
  }
  if (car.color === '#f2c230') {
    ctx.fillStyle = '#222';
    for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 7, -wid / 2 + 1, 5, 3);
  }
  ctx.restore();
}

function drawPlayerShape(ctx, player, cam) {
  const sx = player.x - cam.x;
  const sy = player.y - cam.y;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(player.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(2, 3, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b64c';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22262e';
  ctx.fillRect(6, -3, 14, 6);
  ctx.fillStyle = '#d94040';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPedShape(ctx, ped, cam) {
  const sx = ped.x - cam.x;
  const sy = ped.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(sx + 1, sy + 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawMarker(ctx, marker, cam, time) {
  if (!marker) return;
  const sx = marker.x - cam.x;
  const sy = marker.y - cam.y;
  const pulse = 1 + Math.sin(time * 4) * 0.12;
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sx, sy, TUNING.markerRadius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,211,77,0.18)';
  ctx.beginPath();
  ctx.arc(sx, sy, TUNING.markerRadius * pulse, 0, Math.PI * 2);
  ctx.fill();
  // A beam of light so the marker reads from far away.
  ctx.fillStyle = 'rgba(255,211,77,0.25)';
  ctx.fillRect(sx - 3, sy - 320, 6, 320);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(marker.label, sx, sy - TUNING.markerRadius - 12);
  ctx.textAlign = 'left';
}

function drawMinimap(ctx, state, city, viewW, viewH) {
  const size = 178;
  const ox = viewW - size - 14;
  const oy = viewH - size - 14;
  const scale = size / WORLD.size;
  ctx.fillStyle = 'rgba(10,14,22,0.78)';
  ctx.fillRect(ox - 6, oy - 6, size + 12, size + 12);
  ctx.strokeStyle = '#e8d44d';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 6, oy - 6, size + 12, size + 12);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(ox, oy + WORLD.waterTop * scale, size, size - WORLD.waterTop * scale);
  ctx.strokeStyle = '#9aa0b0';
  ctx.lineWidth = 1.5;
  for (const p of city.lines) {
    ctx.beginPath();
    ctx.moveTo(ox + p * scale, oy);
    ctx.lineTo(ox + p * scale, oy + size);
    ctx.moveTo(ox, oy + p * scale);
    ctx.lineTo(ox + size, oy + p * scale);
    ctx.stroke();
  }
  const marker = state.missions.marker();
  if (marker) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(ox + marker.x * scale, oy + marker.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const car of state.cars) {
    if (car.dead) continue;
    ctx.fillStyle = car.driver === 'police' ? '#ff4040' : '#c8c8c8';
    ctx.fillRect(ox + car.x * scale - 1.5, oy + car.y * scale - 1.5, 3, 3);
  }
  const p = state.player;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ox + p.x * scale, oy + p.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ox + p.x * scale, oy + p.y * scale, 6.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHud(ctx, state, viewW, viewH) {
  const p = state.player;
  // Cash and health, top left.
  ctx.fillStyle = 'rgba(10,14,22,0.72)';
  ctx.fillRect(12, 12, 250, 64);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('$' + state.cash.toLocaleString('en-US'), 24, 42);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 52, 180, 12);
  ctx.fillStyle = p.health > 30 ? '#7dff8a' : '#ff5040';
  ctx.fillRect(24, 52, 180 * Math.max(0, p.health / TUNING.playerMaxHealth), 12);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText('HP', 210, 62);
  // Wanted stars, top right.
  ctx.fillStyle = 'rgba(10,14,22,0.72)';
  ctx.fillRect(viewW - 190, 12, 178, 44);
  ctx.font = '26px sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < state.wanted ? '#ffd34d' : '#555a66';
    ctx.fillText('★', viewW - 178 + i * 34, 44);
  }
  // Mission objective, top centre.
  const objective = state.missions.objectiveText();
  ctx.font = 'bold 16px sans-serif';
  const ow = ctx.measureText(objective).width + 28;
  ctx.fillStyle = 'rgba(10,14,22,0.72)';
  ctx.fillRect((viewW - ow) / 2, 12, ow, 34);
  ctx.fillStyle = '#ffd34d';
  ctx.textAlign = 'center';
  ctx.fillText(objective, viewW / 2, 35);
  ctx.textAlign = 'left';
  // Speed and controls, bottom left.
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(10,14,22,0.72)';
    ctx.fillRect(12, viewH - 76, 190, 62);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.24) + ' mph', 24, viewH - 42);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#c8c8c8';
    ctx.fillText('W/S drive · Space handbrake · E exit', 24, viewH - 22);
  } else {
    ctx.fillStyle = 'rgba(10,14,22,0.6)';
    ctx.fillRect(12, viewH - 52, 330, 38);
    ctx.fillStyle = '#c8c8c8';
    ctx.font = '13px sans-serif';
    ctx.fillText('WASD move · Shift run · Mouse aim · Click shoot · E enter car', 22, viewH - 28);
  }
  // Ammo, bottom centre-right.
  if (p.onFoot) {
    ctx.fillStyle = 'rgba(10,14,22,0.72)';
    ctx.fillRect(viewW - 330, viewH - 52, 120, 38);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('AMMO ' + p.ammo, viewW - 318, viewH - 28);
  }
  // Mission message banner, below the cash box and the objective bar.
  if (state.missions.messageTime > 0) {
    ctx.font = 'bold 17px sans-serif';
    const mw = ctx.measureText(state.missions.message).width + 32;
    ctx.fillStyle = 'rgba(20,26,40,0.85)';
    ctx.fillRect((viewW - mw) / 2, 102, mw, 36);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(state.missions.message, viewW / 2, 126);
    ctx.textAlign = 'left';
  }
  // Hold progress ring.
  const stage = state.missions.currentStage();
  if (stage && stage.kind === 'hold' && state.missions.holdTime > 0) {
    const frac = state.missions.holdTime / TUNING.holdSeconds;
    ctx.fillStyle = 'rgba(10,14,22,0.72)';
    ctx.fillRect(viewW / 2 - 130, viewH - 120, 260, 26);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(viewW / 2 - 122, viewH - 112, 244 * frac, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING THE VAULT…', viewW / 2, viewH - 96);
    ctx.textAlign = 'left';
  }
}

function drawMenu(ctx, state, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,10,18,0.55)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText(GAME_TITLE, viewW / 2, viewH / 2 - 150);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('An open-world crime story in ' + CITY_NAME, viewW / 2, viewH / 2 - 108);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#d8d8d8';
  ctx.fillText('Jace "Vex" Marlowe owes the Harbor Crew three jobs. Steal cars, dodge the law,', viewW / 2, viewH / 2 - 66);
  ctx.fillText('and pull off the Harbor Vault — or end up face-down on the beach.', viewW / 2, viewH / 2 - 40);
  const save = state.missions.load();
  const buttons = [];
  const by = viewH / 2 + 10;
  buttons.push({ label: save ? 'CONTINUE — MISSION ' + (save.missionIndex + 1) : 'NEW GAME', x: viewW / 2 - 170, y: by, w: 340, h: 52, action: 'start' });
  buttons.push({ label: 'HOW TO PLAY', x: viewW / 2 - 170, y: by + 66, w: 340, h: 52, action: 'help' });
  for (const b of buttons) {
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#1a1a22';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(b.label, viewW / 2, b.y + 34);
  }
  ctx.fillStyle = '#b8b8b8';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD move / drive · E enter & steal cars · Mouse aim, click to shoot · P pause · M mute', viewW / 2, by + 150);
  ctx.textAlign = 'left';
  state.menuButtons = buttons;
}

function drawHelp(ctx, state, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,10,18,0.82)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('HOW TO PLAY', viewW / 2, 120);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  const lines = [
    'ON FOOT — WASD to move, Shift to run, mouse to aim, click to shoot.',
    'DRIVING — W/S to accelerate and brake, A/D to steer, Space to handbrake.',
    'STEAL A CAR — walk up to any car and press E. Parked cars are free;',
    'stealing one with a driver earns you a wanted star.',
    'WANTED — crimes raise your stars. Police chase, ram and, at 3 stars, shoot.',
    'Lay low and the heat dies down. Get caught on foot and you are BUSTED.',
    'MISSIONS — follow the gold marker. Three jobs, then the Harbor Vault.',
    'SAVE — progress saves after every job. Your cash stays with you.',
    '',
    'Press Enter or click anywhere to go back.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, viewW / 2, 180 + i * 30));
  ctx.textAlign = 'left';
}

function drawEndScreen(ctx, state, viewW, viewH, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,18,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, viewW / 2, viewH / 2 - 60);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, viewW / 2, viewH / 2 - 8 + i * 32));
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press Enter to keep playing — free roam', viewW / 2, viewH / 2 + 110);
  ctx.textAlign = 'left';
}

export function drawFrame(ctx, state, city, viewW, viewH) {
  const cam = cameraFor(state, viewW, viewH);
  // Sky-grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, viewW, viewH);
  // Zoom about the screen centre: the player stays centred, the streets read bigger.
  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-viewW / 2, -viewH / 2);
  drawRoads(ctx, cam, city);
  drawBeach(ctx, cam, state.time);
  drawBuildings(ctx, cam, city);
  // Landmark pins.
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const key of Object.keys(state.landmarks)) {
    const lm = state.landmarks[key];
    const sx = lm.x - cam.x;
    const sy = lm.y - cam.y;
    ctx.fillStyle = 'rgba(10,14,22,0.75)';
    ctx.beginPath();
    ctx.arc(sx, sy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.fillText(lm.label[0], sx, sy + 5);
  }
  ctx.textAlign = 'left';
  drawMarker(ctx, state.missions.marker(), cam, state.time);
  // Cars, people, bullets, particles — in world order.
  for (const car of state.cars) {
    if (!car.dead) drawCarShape(ctx, car, cam);
  }
  for (const ped of state.peds) {
    if (!ped.dead) drawPedShape(ctx, ped, cam);
  }
  const p = state.player;
  if (p.onFoot) drawPlayerShape(ctx, p, cam);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 3;
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - cam.x - b.vx * 0.012, b.y - cam.y - b.vy * 0.012);
    ctx.lineTo(b.x - cam.x, b.y - cam.y);
    ctx.stroke();
  }
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x - cam.x, pt.y - cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Off-screen objective arrow.
  const marker = state.missions.marker();
  if (marker && state.mode === 'playing') {
    const mx = marker.x - cam.x;
    const my = marker.y - cam.y;
    if (mx < 0 || my < 0 || mx > viewW || my > viewH) {
      const cx = Math.max(60, Math.min(viewW - 60, mx));
      const cy = Math.max(90, Math.min(viewH - 90, my));
      const a = Math.atan2(my - viewH / 2, mx - viewW / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd34d';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(Math.hypot(marker.x - p.x, marker.y - p.y) / 10) * 10 + 'm', cx, cy + 30);
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
  if (state.mode === 'playing' || state.mode === 'paused') {
    drawHud(ctx, state, viewW, viewH);
    drawMinimap(ctx, state, city, viewW, viewH);
  }
  if (state.mode === 'paused') {
    ctx.fillStyle = 'rgba(8,10,18,0.6)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', viewW / 2, viewH / 2);
    ctx.font = '18px sans-serif';
    ctx.fillText('Press P to resume', viewW / 2, viewH / 2 + 40);
    ctx.textAlign = 'left';
  }
  if (state.mode === 'menu') drawMenu(ctx, state, viewW, viewH);
  if (state.mode === 'help') drawHelp(ctx, state, viewW, viewH);
  if (state.mode === 'dead') {
    drawEndScreen(ctx, state, viewW, viewH, 'WASTED', ['Jace went down in ' + CITY_NAME + '.', 'Cash kept: $' + state.cash.toLocaleString('en-US')], '#ff5040');
  }
  if (state.mode === 'busted') {
    drawEndScreen(ctx, state, viewW, viewH, 'BUSTED', ['Harbor PD finally caught up with Jace.', 'Cash kept: $' + state.cash.toLocaleString('en-US')], '#4f8fd0');
  }
  if (state.mode === 'victory') {
    drawEndScreen(ctx, state, viewW, viewH, 'THE HARBOR IS YOURS', ['All three jobs done. The vault money is yours.', 'Final take: $' + state.cash.toLocaleString('en-US')], '#ffd34d');
  }
}
