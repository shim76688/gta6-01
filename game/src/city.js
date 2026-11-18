// Neon Harbor — the city itself: roads, blocks, buildings, parks and the beach.
// One file, one job: build the map once from a seed, and answer "what is here?" queries.

import { WORLD, PALETTE } from './config.js';
import { Rng } from './random.js';

// Road centre lines run every 400 px, first at 200: 200, 600, 1000, ... 3000.
export function roadLines() {
  const lines = [];
  for (let p = WORLD.roadFirst; p < WORLD.size; p += WORLD.roadEvery) lines.push(p);
  return lines;
}

export function isOnRoad(x, y) {
  const half = WORLD.roadWidth / 2;
  for (const p of roadLines()) {
    if (Math.abs(x - p) < half || Math.abs(y - p) < half) return true;
  }
  return false;
}

export function nearestRoadPoint(x, y) {
  const lines = roadLines();
  let bx = lines[0];
  let by = lines[0];
  for (const p of lines) {
    if (Math.abs(p - x) < Math.abs(bx - x)) bx = p;
    if (Math.abs(p - y) < Math.abs(by - y)) by = p;
  }
  // Snap to the closer of the two axes so the point sits on a road.
  if (Math.abs(bx - x) < Math.abs(by - y)) return { x: bx, y };
  return { x, y: by };
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function circleHitsBuildings(x, y, radius, buildings) {
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps; returns true when a push happened.
export function resolveBuildingCollision(p, radius, buildings) {
  let hit = false;
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
    let dx = p.x - cx;
    let dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 < 0.001) {
      // Centre inside the rect: push out along the smallest penetration axis.
      const left = p.x - b.x;
      const right = b.x + b.w - p.x;
      const top = p.y - b.y;
      const bottom = b.y + b.h - p.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) p.x = b.x - radius;
      else if (m === right) p.x = b.x + b.w + radius;
      else if (m === top) p.y = b.y - radius;
      else p.y = b.y + b.h + radius;
      continue;
    }
    const d = Math.sqrt(d2);
    dx /= d;
    dy /= d;
    p.x = cx + dx * radius;
    p.y = cy + dy * radius;
  }
  return hit;
}

export function buildCity(seed) {
  const rng = new Rng(seed);
  const lines = roadLines();
  const buildings = [];
  const parks = [];
  const half = WORLD.roadWidth / 2;
  const margin = 26;

  // Blocks sit between neighbouring road lines. A few become parks; the rest hold buildings.
  for (let i = 0; i < lines.length - 1; i++) {
    for (let j = 0; j < lines.length - 1; j++) {
      const bx = lines[i] + half + margin;
      const by = lines[j] + half + margin;
      const bw = WORLD.roadEvery - WORLD.roadWidth - margin * 2;
      const bh = WORLD.roadEvery - WORLD.roadWidth - margin * 2;
      // The bottom row of blocks is the beach, not buildings.
      if (by + bh > WORLD.beachTop - 40) continue;
      if (rng.chance(0.14)) {
        parks.push({ x: bx, y: by, w: bw, h: bh, trees: rng.int(4, 9) });
        continue;
      }
      const cols = rng.chance(0.5) ? 2 : 1;
      const rows = rng.chance(0.5) ? 2 : 1;
      const gap = 14;
      const cw = (bw - gap * (cols - 1)) / cols;
      const ch = (bh - gap * (rows - 1)) / rows;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const w = cw * rng.range(0.72, 0.96);
          const h = ch * rng.range(0.72, 0.96);
          const x = bx + c * (cw + gap) + (cw - w) / 2;
          const y = by + r * (ch + gap) + (ch - h) / 2;
          buildings.push({
            x, y, w, h,
            color: rng.pick(PALETTE.buildingRoof),
            height: rng.int(8, 42),
            kind: rng.chance(0.12) ? 'tower' : 'block',
          });
        }
      }
    }
  }

  return { lines, buildings, parks, seed };
}
