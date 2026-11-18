[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/shim76688/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/shim76688/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# NEON HARBOR

An open-world crime game in the spirit of GTA 6, built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Everything is original: the city of Neon Harbor, its people, its cars, its story.

## The game

Jace "Vex" Marlowe owes the Harbor Crew three jobs. Explore a sun-soaked coastal city on foot and by car, steal cars, outrun the Harbor PD as your wanted level climbs, and pull off the Harbor Vault.

- **Open world** — a 3200×3200 city: a road grid, traffic, pedestrians, parks, and a beach.
- **Drive anything** — steal any car on the street (the law notices), with arcade handling and a handbrake slide.
- **Wanted level** — crimes raise your stars; police chase, ram, and at 3+ stars open fire. Lay low and the heat dies down. Get caught on foot and you are BUSTED.
- **Missions and a story** — three jobs (The Pickup, Hot Pursuit, The Harbor Vault) with objectives, a gold marker, and a cash reward after each.
- **HUD and minimap** — cash, health, ammo, speed, wanted stars, mission objective, and a live minimap.
- **Sound** — engine hum, sirens, gunshots and a bassline, all synthesized with WebAudio. No audio files.
- **Save** — progress saves after every job; continue from the menu.

## Controls

- **On foot:** WASD move, Shift run, mouse aim, click shoot, E enter a car.
- **Driving:** W/S accelerate and brake, A/D steer, Space handbrake, E get out.
- **P** pause, **M** mute, **Enter** start / continue.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only — `game/index.html` and its modules, no build step, no network requests.

## Layout

- `game/src/config.js` — tuning, palette, world layout, story script
- `game/src/random.js` — seeded RNG
- `game/src/city.js` — the map: roads, blocks, buildings, parks, beach
- `game/src/vehicles.js` — car physics, traffic AI, police AI
- `game/src/people.js` — the player on foot, pedestrians, bullets
- `game/src/missions.js` — the story, wanted level, police response, saves
- `game/src/audio.js` — synthesized WebAudio sounds
- `game/src/render.js` — camera, world, HUD, minimap, menus
- `game/src/shots.js` — demo staging for screenshots
- `game/src/main.js` — the game loop

## License

MIT — see [LICENSE](LICENSE).
