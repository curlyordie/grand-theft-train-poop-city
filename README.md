# Grand Theft Train: Poop City

An original low-poly third-person crime sandbox set in fictional Sundarpur. This expansion continues the existing Vite, TypeScript, Three.js and Rapier game, preserving Rab McTavish, his ginger hair and green-and-white Celtic-style hoops, Buckfast, driving, menus and saving.

## Play the single-file edition

Open `dist/Grand-Theft-Train-Poop-City.html` in desktop Chrome. The HTML embeds all code, styles and Rapier WebAssembly. No server, installation, external assets or Internet connection is needed to play. File-origin storage and pointer lock can be restricted by enterprise browser policies; keeping the file at the same location helps preserve local saves.

Regenerate it from source:

```bash
npm ci
npm run build:html
```

## Develop and run

Node.js 22.12+ or 24 is required for development (tested with 24.19.0). A modern desktop browser with WebGL and keyboard/mouse is required for play.

```bash
npm ci
npm run dev
```

Open the address printed by Vite. **Click the street to capture the mouse.** Look continuously without holding a button. Escape releases capture and pauses. Capture errors are shown explicitly; there is no click-and-drag camera fallback. New Game and Resume also request capture during the user interaction.

```bash
npm run build
npm run preview
npm test
```

Cloud installations use `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` because the home directory is read-only. Work in the existing checkout; each cloud task is already isolated, so an additional Git worktree is unnecessary.

## Controls

| Control | Action |
| --- | --- |
| WASD | Camera-relative movement / acceleration, braking, reverse and steering |
| Mouse | Continuous look after capture |
| Shift | Sprint |
| Space | Jump on foot / handbrake while driving |
| E | Contextual interaction, weapon/ammunition/Buckfast pickup, vehicle entry or safe exit |
| Left click | Punch, swing the equipped melee weapon, or fire |
| Right click | Shoulder-camera aiming with a firearm |
| R | Reload the equipped firearm from its matching reserve |
| 1 / 2 / 3 / 4 / 5 | Unarmed / bat / pipe / handgun / shotgun, if owned |
| Mouse wheel | Cycle through owned weapons |
| Tab | Weapon inventory; close and resume with Tab or Back to Streets |
| B | Consume stored Buckfast when injured |
| H | Controls screen |
| Escape | Release mouse capture and pause |

The first click on an uncaptured viewport captures the mouse without firing. Left-click attacks after capture. Stop below 11 km/h before exiting. Exit searches both sides and the ends of a vehicle for a clear capsule position. Movement/attack keys are cleared at menu transitions.

## Expanded world and population

- **432 × 432 metres**, with visible boundary walls at ±215 metres: over four times the usable area of the original district.
- The original Old City remains intact. Connected roads extend into Downtown, the Industrial District, Residential neighbourhoods and the Outskirts.
- Downtown has taller blocks and an elevated flyover landmark. Industry has warehouses, chimneys, freight containers and service roads. Residential areas have lower houses and courtyards; the Outskirts have dhabas, trees, dirt tracks and open space.
- Original shops, balconies, market stalls, parked scenery, electrical wires and the freight railway remain. Substantial buildings and props have Rapier collision; ordinary roads remain unobstructed by invisible boundaries.
- Civilians, a shopkeeper/contact, hostile guards, foot police and vehicle drivers have procedural models and behaviour. At most 22 nearby foot NPCs are active. Distant actors are hidden with disabled collision.
- Foot NPCs use pavement routes, short pauses, obstruction sidesteps, greetings, fear, fleeing, fighting, investigation/search and incapacitation. E talks to the nearest living NPC. Combat produces nearby reactions and witnessed crimes.

## Combat, inventory and pickups

New games begin **unarmed**, with no firearms or reserve ammunition. Exploration unlocks equipment through visible ground pickups. There are bats, industrial pipes, handguns, rare shotguns, bullet boxes and shell boxes in multiple districts.

| Weapon | Damage | Range | Magazine | Reload |
| --- | --- | --- | --- | --- |
| Fists | 12 | 1.85 m | — | — |
| Baseball bat | 28 | 2.5 m | — | — |
| Metal pipe | 23 | 2.3 m | — | — |
| Handgun | 24 before falloff | 65 m | 12 bullets | 1.4 s |
| Shotgun | 6 × 11 before falloff | 35 m | 6 shells | 2.1 s |

Melee validates direction, reach, cooldown and wall visibility, and chooses one target. Firearms use camera sight and a separate muzzle ray, so an exposed camera cannot shoot through a wall in front of Rab. Shotgun pellets have bounded spread and distance falloff. Empty magazines do not fire; reloading transfers matching reserve ammunition. Switching weapons cancels reload without spending reserve ammunition prematurely. Seated traffic and police drivers have separate damageable collider proxies; vehicle hulls shield lower shots.

Valid damage creates short-lived red low-poly particles at the hit point. There are 96 pooled particles and 10 pooled tracers, with gravity and lifetime cleanup. Player damage also produces a screen-edge flash. Incapacitated NPCs stop acting and disable their collider.

The six original Buckfast bottles remain. Each heals up to 35 points; at full health it is stored for B. A collected bottle disappears, does not immediately respawn, and is saved. Health is capped at 100. Death respawns Rab and applies a communicated ₹50 penalty.

## Vehicles and traffic

Eight playable classes have different silhouettes, acceleration, speed, braking, steering, mass configuration and collision dimensions:

- Shanti 800 hatchback.
- Sundar family sedan, with a longer body and trunk.
- Monsoon SUV, with larger wheels and a raised cabin.
- Chalo three-wheel auto-rickshaw with an open canopy.
- Bijli two-wheel motorcycle with frame, forks and handlebars.
- Mazdoor pickup with an open bed.
- Parcel Pending delivery van with a box cargo compartment.
- Sundarpur police sedan with contrasting panels and a light bar.

Rab is placed in a seated/riding pose during driving. The player replaces an NPC driver when taking a stopped traffic vehicle; occupancy prevents simultaneous player control of multiple vehicles. Collisions produce feedback and can injure the player or struck pedestrians. Cars use a flat-ground kinematic arcade controller, so small collisions cannot launch them through rigid-body impulses.

Five traffic vehicles follow road loops, slow for corners/obstacles and react to nearby danger. They activate within a bounded distance and stop when blocked. Police use the same vehicle controller with routes based on the actual road intersections.

## Missions and police

The old build's checkpoint was only a save interaction and distance-based hint, not a mission controller. This version has explicit mission state, real objective conditions, markers and one-time rewards:

1. **A Fresh Start:** enter the gold checkpoint at Rab's rooms. Completion is automatic by horizontal distance, on foot or in a vehicle. Reward: ₹150.
2. **The Missing Motor:** press E at the rooms for the job, retrieve the blue family sedan, and stop that specific car in the marked delivery area. Its retrieval marker follows the actual car if it was moved during free roam. Reward: ₹350.
3. **Absolutely Nothing to Worry About:** start with Dev at the industrial entrance, collect the parcel in the freight yard, lose police attention, then return the parcel. Reward: ₹600.

Job states include not started, active, objective completed, completed and failed. Rewards cannot repeat. Death fails an active retrieval/delivery job; E at the rooms or Restart from Checkpoint retries it. Restart resets the active job's unstable objective and vehicle state. Free roam remains available throughout.

Witnessed attacks, gunfire, vehicle theft and driver attacks raise wanted level up to three. Level one investigates and keeps a stopping distance; levels two and three pursue more aggressively, with additional crews. Dispatch positions are at least 40 metres away on clear roads. Police only update the last known position when an officer or patrol has line of sight. Search uses that recorded location. Twelve sustained unseen seconds reduce a wanted level, so hiding behind buildings or creating distance works. Patrols and their foot officers are reused rather than accumulating new crews after every incident.

## Saving

Browser-local saves retain cash, bottles, collected health/weapon/ammunition pickup IDs, owned weapons, loaded/reserve ammunition and completed missions. Existing foundation saves remain readable. Volume and sensitivity settings are also retained. Continue restores Rab at the street checkpoint at full health, resets vehicle physics and police, and makes an unfinished job available again; it does not restore unstable moving bodies or a mid-chase state. New Game resets gameplay progress.

## Testing

```bash
npm test
npm test -- --grep standalone
```

Playwright runs the real WebGL game with one worker. Tests use keyboard/mouse inputs and read-only development diagnostics, not teleport commands or invented mission completions. Coverage includes pointer lock, movement/jump/camera collision, menus, NPC movement/dialogue, melee and gun damage, wall blocking, inventory ownership, both ammo types, reloads, incapacitation, driver hitboxes, all eight vehicle classes, traffic movement, five districts, all three missions, police search/escape, rewards and persistence.

Cloud tests use `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation. Tests retain traces/screenshots on failure in ignored `test-results/`. The standalone suite rebuilds its HTML automatically. Managed cloud Chrome blocks file URLs, so that suite may supply the exact embedded HTML from memory at an allowed origin, with network offline. This checks offline gameplay without overriding browser policy, but does not verify file navigation on that managed machine.

## Performance and current limitations

Static geometry is batched by map cell with shared vertex-colour materials and culled by distance. Detail signs, NPCs and traffic have distance limits. Character/vehicle rigid parts are merged while preserving animated joints. Pixel ratio is capped and software WebGL disables shadows automatically; hardware rendering uses a bounded shadow map. Gameplay uses fixed 60 Hz steps with frame catch-up capped.

This remains a stylised arcade game: animation, character/vehicle models and synthesised audio are procedural placeholders. There is no recorded dialogue, radio soundtrack, multiplayer, gamepad/touch support, crouch/block/dodge system, vehicle suspension, destructible building interiors or advanced traffic navigation. The train and flyover deck are scenery, not additional drivable systems. Seated driver hitboxes approximate characters rather than matching every visible polygon. Dense collisions may require reversing, changing direction or leaving a vehicle; police/traffic AI uses lightweight road routing rather than a full navigation mesh. Browser-local saving depends on storage permissions. Software-rendered cloud checks do not establish performance on every desktop GPU.

Vite's bundle-size advisory is expected because Three.js and Rapier's embedded WebAssembly are shipped together. No external assets or credentials are required at runtime.

## Architecture and assets

`src/game.ts` coordinates the loop. `src/systems/` contains input, camera, player, fleet/vehicles, traffic, NPCs, police, missions, combat, inventory, pickups/loot, effects, audio, saving and UI. `src/world/` contains modular city generation, road routes, original character/vehicle/weapon models and rigid-part batching. `scripts/build-standalone.mjs` embeds the built bundle and styles into one HTML file.

All geometry, signs, jokes and dialogue are original. Rab's shirt uses green-and-white hoops without official crests or sponsor graphics. No sampled music, commercial character assets or copied franchise content are bundled. Three.js and Vite are MIT-licensed; Rapier is Apache-2.0-licensed. Dependency licence notices remain with their packages and bundle.
