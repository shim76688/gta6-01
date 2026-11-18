// Neon Harbor — the story: three missions, the wanted level, police response, and saves.
// One file, one job: what the player is supposed to do, and what the law does about it.

import { MISSIONS, TUNING, SAVE_KEY, WORLD } from './config.js';
import { makeCar } from './vehicles.js';
import { roadLines } from './city.js';
import { Rng } from './random.js';

const WANTED_FOR = { steal: 1, hit: 1, shoot: 1, kill: 2, ram: 1 };

export function createMissions(state) {
  const m = {
    index: 0,
    stage: 0,
    holdTime: 0,
    done: false,
    wantedTimer: 0,
    policeTimer: 0,
    policeFireTimer: 0,
    bustedTimer: 0,
    crimeTimer: 0,
    message: '',
    messageTime: 0,

    current() {
      return MISSIONS[this.index] || null;
    },
    currentStage() {
      const mission = this.current();
      return mission ? mission.stages[this.stage] : null;
    },
    objectiveText() {
      if (this.done) return 'All jobs done — Neon Harbor is yours. Free roam.';
      const stage = this.currentStage();
      if (!stage) return '';
      const mission = this.current();
      return mission.title + ' — ' + stage.text;
    },
    marker() {
      const stage = this.currentStage();
      return stage ? { x: stage.x, y: stage.y, label: stage.label } : null;
    },
    showMessage(text, seconds = 4) {
      this.message = text;
      this.messageTime = seconds;
    },
    start(index) {
      this.index = index;
      this.stage = 0;
      this.holdTime = 0;
      this.done = false;
      const mission = MISSIONS[index];
      if (!mission) { this.done = true; return; }
      state.wanted = mission.startWanted || 0;
      state.heat = state.wanted > 0 ? 100 : 0;
      this.showMessage(mission.title + ' — ' + mission.briefing, 6);
      state.sound.jingle();
    },
    crime(kind) {
      const add = WANTED_FOR[kind] || 1;
      state.wanted = Math.min(5, state.wanted + add);
      state.heat = 100;
      this.crimeTimer = 0;
      state.alarm = Math.max(state.alarm, 1.5);
    },
    advanceStage() {
      const mission = this.current();
      this.stage += 1;
      this.holdTime = 0;
      if (this.stage >= mission.stages.length) {
        state.cash += mission.reward;
        this.showMessage('JOB DONE — $' + mission.reward + ' banked. Cash: $' + state.cash, 5);
        state.sound.jingle();
        this.save();
        if (this.index + 1 >= MISSIONS.length) {
          this.done = true;
          state.mode = 'victory';
          state.sound.jingle();
        } else {
          this.start(this.index + 1);
        }
      } else {
        state.sound.pickup();
      }
    },
    // E on foot at a pickup marker grabs the package; E anywhere else does nothing here.
    tryInteract() {
      const stage = this.currentStage();
      if (!stage || stage.kind !== 'pickup') return false;
      const p = state.player;
      if (p.onFoot && Math.hypot(p.x - stage.x, p.y - stage.y) < TUNING.pickupRadius + 20) {
        this.showMessage('Package secured. Get it to the garage.', 3);
        this.advanceStage();
        return true;
      }
      return false;
    },
    update(dt) {
      if (this.messageTime > 0) this.messageTime -= dt;
      if (state.mode !== 'playing') return;
      this.crimeTimer += dt;
      // Wanted cools off when the player keeps their nose clean.
      if (state.wanted > 0 && this.crimeTimer > TUNING.wantedDecay) {
        this.wantedTimer += dt;
        if (this.wantedTimer > 8) {
          this.wantedTimer = 0;
          state.wanted -= 1;
          this.showMessage('The heat is dying down…', 2);
        }
      } else {
        this.wantedTimer = 0;
      }
      this.updatePolice(dt);
      this.updateStage(dt);
    },
    updateStage(dt) {
      const stage = this.currentStage();
      if (!stage) return;
      const p = state.player;
      const dist = Math.hypot(p.x - stage.x, p.y - stage.y);
      if (stage.kind === 'goto' || stage.kind === 'deliver' || stage.kind === 'escape') {
        if (dist < TUNING.markerRadius) {
          if (stage.kind === 'escape') state.wanted = 0;
          this.advanceStage();
        }
      } else if (stage.kind === 'hold') {
        if (dist < TUNING.markerRadius) {
          this.holdTime += dt;
          if (this.holdTime >= TUNING.holdSeconds) {
            state.wanted = Math.min(5, 4);
            state.heat = 100;
            this.showMessage('Vault cracked — $2,000 in the bag. RUN.', 4);
            this.advanceStage();
          }
        } else {
          this.holdTime = Math.max(0, this.holdTime - dt * 2);
        }
      }
      // Busted: a police car sits on the player on foot while wanted.
      if (p.onFoot && state.wanted > 0) {
        let touching = false;
        for (const car of state.cars) {
          if (car.driver === 'police' && !car.dead && Math.hypot(car.x - p.x, car.y - p.y) < 34) { touching = true; break; }
        }
        this.bustedTimer = touching ? this.bustedTimer + dt : 0;
        if (this.bustedTimer > 1.2) {
          state.mode = 'busted';
          state.sound.crash();
        }
      } else {
        this.bustedTimer = 0;
      }
    },
    updatePolice(dt) {
      const want = Math.min(state.wanted, TUNING.maxPolice);
      const police = state.cars.filter((c) => c.driver === 'police' && !c.dead);
      this.policeTimer -= dt;
      if (police.length < want && this.policeTimer <= 0) {
        this.policeTimer = TUNING.policeSpawnGap;
        const rng = new Rng((Math.random() * 1e9) | 0);
        const lines = roadLines();
        const p = state.player;
        let sx = 0;
        let sy = 0;
        for (let tries = 0; tries < 12; tries++) {
          const vertical = rng.chance(0.5);
          const line = rng.pick(lines);
          const along = rng.range(120, WORLD.size - 120);
          sx = vertical ? line : along;
          sy = vertical ? along : line;
          if (Math.hypot(sx - p.x, sy - p.y) > 420) break;
        }
        state.cars.push(makeCar({ x: sx, y: sy, angle: 0, color: '#22262e', kind: 'police', driver: 'police' }));
        state.sound.siren(true);
      }
      // Despawn police that fell far behind once the heat is gone.
      if (state.wanted === 0) {
        for (const car of state.cars) {
          if (car.driver === 'police' && Math.hypot(car.x - state.player.x, car.y - state.player.y) > 1200) car.dead = true;
        }
        state.sound.siren(false);
      }
      // At 3+ stars the police open fire.
      if (state.wanted >= 3 && police.length > 0) {
        this.policeFireTimer -= dt;
        if (this.policeFireTimer <= 0) {
          this.policeFireTimer = 1.4;
          const near = police.reduce((a, b) => (Math.hypot(a.x - state.player.x, a.y - state.player.y) < Math.hypot(b.x - state.player.x, b.y - state.player.y) ? a : b));
          const d = Math.hypot(near.x - state.player.x, near.y - state.player.y);
          if (d < 520) {
            const a = Math.atan2(state.player.y - near.y, state.player.x - near.x) + (Math.random() - 0.5) * 0.2;
            state.bullets.push({
              x: near.x, y: near.y,
              vx: Math.cos(a) * TUNING.bulletSpeed * 0.8,
              vy: Math.sin(a) * TUNING.bulletSpeed * 0.8,
              life: TUNING.bulletLife, from: 'police',
            });
            state.sound.shot();
          }
        }
      }
    },
    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ missionIndex: this.done ? MISSIONS.length : this.index, cash: state.cash }));
      } catch (e) { /* saves are a bonus, never a crash */ }
    },
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    },
  };
  return m;
}
