// Neon Harbor — tuning, palette, world layout and the story script.
// One file, one job: every number the rest of the game tunes against.

export const GAME_TITLE = 'NEON HARBOR';
export const CITY_NAME = 'Neon Harbor';
export const SAVE_KEY = 'neon-harbor-save-v1';

export const WORLD = {
  size: 3200,
  roadEvery: 400,
  roadFirst: 200,
  roadWidth: 96,
  beachTop: 3048,
  waterTop: 3130,
};

export const PALETTE = {
  grass: '#7fae5a',
  park: '#6da34e',
  sand: '#e8d39a',
  water: '#2f7fb8',
  waterDeep: '#256b9e',
  road: '#3c3f4a',
  roadLine: '#e8d44d',
  sidewalk: '#b9b3a4',
  curb: '#8f887a',
  buildingRoof: ['#e07856', '#4fa8a0', '#e8b64c', '#c96f8e', '#7d9b6a', '#8a6fb8', '#d98a4b', '#5b8bc0'],
  buildingSide: '#2e2a33',
  carColors: ['#d94040', '#e8b64c', '#4f8fd0', '#e8e8e8', '#4fae62', '#8a5fc0', '#e07856', '#3fb8b0'],
  policeBody: '#22262e',
  policeTrim: '#e8e8e8',
  taxi: '#f2c230',
};

export const TUNING = {
  walkSpeed: 170,
  runSpeed: 250,
  playerRadius: 13,
  carAccel: 420,
  carBrake: 700,
  carMaxSpeed: 520,
  carMaxReverse: 180,
  carTurn: 2.6,
  handbrakeTurn: 4.2,
  trafficSpeed: 150,
  policeSpeed: 560,
  policeAccel: 520,
  bulletSpeed: 900,
  bulletLife: 0.9,
  playerMaxHealth: 100,
  healthRegen: 4,
  wantedDecay: 6,
  policeSpawnGap: 3.5,
  maxPolice: 6,
  maxTraffic: 16,
  maxPeds: 26,
  pickupRadius: 46,
  markerRadius: 60,
  holdSeconds: 8,
};

// The story: Jace "Vex" Marlowe, a getaway driver who owes the Harbor Crew.
export const MISSIONS = [
  {
    id: 'pickup',
    title: 'MISSION 1 — THE PICKUP',
    briefing: 'The Crew needs a package moved. Drive to the docks, grab it on foot, bring it to the garage.',
    reward: 500,
    stages: [
      { kind: 'goto', x: 3000, y: 2200, label: 'DOCKS', text: 'Drive to the docks' },
      { kind: 'pickup', x: 3000, y: 2200, label: 'PACKAGE', text: 'Get out and grab the package (E)' },
      { kind: 'deliver', x: 600, y: 600, label: 'GARAGE', text: 'Deliver the package to the garage' },
    ],
  },
  {
    id: 'getaway',
    title: 'MISSION 2 — HOT PURSUIT',
    briefing: 'The job went loud. The whole Harbor PD is on you. Lose them — reach the safehouse with 3 stars on your tail.',
    reward: 800,
    startWanted: 3,
    stages: [
      { kind: 'escape', x: 2600, y: 2600, label: 'SAFEHOUSE', text: 'Reach the safehouse — do not get caught' },
    ],
  },
  {
    id: 'vault',
    title: 'MISSION 3 — THE HARBOR VAULT',
    briefing: 'One last job. Hit the Harbor Bank, hold the vault for the crew, then vanish. The city will come for you.',
    reward: 2000,
    stages: [
      { kind: 'goto', x: 1800, y: 1400, label: 'BANK', text: 'Drive to the Harbor Bank' },
      { kind: 'hold', x: 1800, y: 1400, label: 'VAULT', text: 'Hold the vault — stay inside the ring' },
      { kind: 'escape', x: 2600, y: 2600, label: 'SAFEHOUSE', text: 'Escape to the safehouse with the cash' },
    ],
  },
];

export const LANDMARKS = {
  garage: { x: 600, y: 600, label: 'GARAGE' },
  bank: { x: 1800, y: 1400, label: 'HARBOR BANK' },
  safehouse: { x: 2600, y: 2600, label: 'SAFEHOUSE' },
  docks: { x: 3000, y: 2200, label: 'DOCKS' },
};
