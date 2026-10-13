# Grand Theft Train: Poop City

A retrowave crime sandbox with imported 3D characters, photographed materials, dusk/neon lighting, free electronic music and recorded game audio, set in fictional Sundarpur. This expansion continues the existing Vite, TypeScript, Three.js and Rapier game, preserving Rab McTavish, his ginger hair and green-and-white Celtic-style hoops, Buckfast, driving, menus and saving.

## Play the single-file edition

Download the repository-root `Grand-Theft-Train-Poop-City.html` using GitHub’s **Download raw file** button, or open `dist/Grand-Theft-Train-Poop-City.html` after building in desktop Chrome. The HTML embeds all code, styles and Rapier WebAssembly. No server, installation, external assets or Internet connection is needed to play. File-origin storage and pointer lock can be restricted by enterprise browser policies; keeping the file at the same location helps preserve local saves.

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
| 1 / 2 / 3 / 4 / 5 | Unarmed / Knife / Hammer / handgun / shotgun, if owned |
| Mouse wheel | Cycle through owned weapons |
| Tab | Weapon inventory; close and resume with Tab or Back to Streets |
| B | Consume stored Buckfast when injured |
| H | Controls screen |
| Escape | Release mouse capture and pause |

The first click on an uncaptured viewport captures the mouse without firing. Left-click attacks after capture. Stop below 11 km/h before exiting. Exit searches both sides and the ends of a vehicle for a clear capsule position. Movement/attack keys are cleared at menu transitions.

## City repair and visual update

City batches normalize indexed/non-indexed geometry and retain originals until all merges succeed, preventing invisible walls. The central district now has irregular clusters of brick-and-sheet shacks, lean-tos, varied roof heights, bent panels, narrower dirt lanes and broken paving. Each shack has a matching rotated solid collision hull. Imported skinned resident meshes replace the primitive people; hatchbacks, sedans, SUVs and police cars use a detailed imported car mesh sized to their collision hulls. World-scale procedural weathering, rubbish bags, scattered litter/rubble, drains, brown runoff puddles and small pavement messes give streets a dirtier appearance. Dressing stays on pavement and small debris has no collision.

There are 28 parked playable vehicles plus five traffic vehicles, and 237 weapon/ammunition pickups with starter firearms close to Rab. Existing pickup IDs remain stable for saved games. Vehicles use horizontal swept collision hulls that exclude ground, occupants and low paving from impact detection; rotation uses the same filter. They slide tangentially along obstructions, stop into a wall and report a crash only for a genuine impact. Vehicle models interpolate physics frames; traffic brakes without repeatedly reversing into obstacles. Crash damage begins above 12 m/s and is capped at 18 health per impact with a 1.5-second cooldown. Aim/held fire continuously rotates Rab to the camera direction. R gives clear reload/full-magazine/no-reserve feedback, and selecting the same weapon preserves an ongoing reload.

## Expanded world and population

- **432 × 432 metres**, with visible boundary walls at ±215 metres: over four times the usable area of the original district.
- The Old City has been rebuilt as an irregular shanty settlement; mission and road-network locations remain accessible. Connected roads extend into Downtown, the Industrial District, Residential neighbourhoods and the Outskirts.
- Downtown has taller blocks and an elevated flyover landmark. Industry has warehouses, chimneys, freight containers and service roads. Residential areas have lower houses and courtyards; the Outskirts have dhabas, trees, dirt tracks and open space.
- Original shops, balconies, market stalls, parked scenery, electrical wires and the freight railway remain. Substantial buildings and props have Rapier collision; ordinary roads remain unobstructed by invisible boundaries.
- Civilians, a shopkeeper/contact, hostile guards, foot police and vehicle drivers have imported models and procedural behaviour. At most 22 nearby foot NPCs are active. Distant actors are hidden with disabled collision.
- Foot NPCs use pavement routes, short pauses, obstruction sidesteps, greetings, fear, fleeing, fighting, investigation/search and incapacitation. E talks to the nearest living NPC. Combat produces nearby reactions and witnessed crimes.

## Combat, inventory and pickups

New games begin **unarmed**, with no firearms or reserve ammunition. Exploration unlocks equipment through visible ground pickups. There are knives, hammers, handguns, shotguns, bullet boxes and shell boxes in multiple districts.

| Weapon | Damage | Range | Magazine | Reload |
| --- | --- | --- | --- | --- |
| Fists | 12 | 1.85 m | — | — |
| Knife | 28 | 2.5 m | — | — |
| Hammer | 23 | 2.3 m | — | — |
| Handgun | 24 before falloff | 65 m | 12 bullets | 1.4 s |
| Shotgun | 6 × 11 before falloff | 35 m | 6 shells | 2.1 s |

Melee validates direction, reach, cooldown and wall visibility, and chooses one target. Firearms use camera sight and a separate muzzle ray, so an exposed camera cannot shoot through a wall in front of Rab. Shotgun pellets have bounded spread and distance falloff. Empty magazines do not fire; reloading transfers matching reserve ammunition. Switching weapons cancels reload without spending reserve ammunition prematurely. Seated traffic and police drivers have separate damageable collider proxies; vehicle hulls shield lower shots.

Valid damage creates short-lived red low-poly particles at the hit point. There are 96 pooled particles and 10 pooled tracers, with gravity and lifetime cleanup. Player damage also produces a screen-edge flash. Incapacitated NPCs stop acting and disable their collider.

The six original Buckfast bottles remain. Each heals up to 35 points; at full health it is stored for B. A collected bottle disappears, does not immediately respawn, and is saved. Health is capped at 100. Death respawns Rab and applies a communicated ₹50 penalty.

## Vehicles and traffic

Eight playable classes have different silhouettes, acceleration, speed, braking, steering, mass configuration and collision dimensions:

- Shanti 800 hatchback.
- Sundar family sedan, with a longer collision hull and resized imported body.
- Monsoon SUV, with a larger collision hull and resized imported body.
- Chalo three-wheel auto-rickshaw with an open canopy.
- Bijli two-wheel motorcycle with frame, forks and handlebars.
- Mazdoor pickup with an open bed.
- Parcel Pending delivery van with a box cargo compartment.
- Sundarpur police sedan with contrasting panels and a light bar.

Rab is placed in a seated/riding pose during driving. The player replaces an NPC driver when taking a stopped traffic vehicle; occupancy prevents simultaneous player control of multiple vehicles. Collisions produce feedback and can injure the player or struck pedestrians. Cars use flat-ground kinematic swept hulls. Ordinary ground contact and visual pavement crossings do not generate crash events. This is arcade driving with no wheel suspension.

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

Cloud tests use `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation. Tests retain traces/screenshots on failure in ignored `test-results/`. The standalone suite rebuilds its HTML automatically. Managed cloud Chrome blocks file URLs, so that suite streams the exact embedded HTML over loopback, then runs gameplay with the network offline. This checks offline gameplay without overriding browser policy, but does not verify file navigation on that managed machine.

## Performance and current limitations

Pause, inventory and in-game settings keep the last rendered view instead of repeatedly redrawing the city. Resizing refreshes that view; resuming restores normal rendering. Main-menu background animation is capped at 30 frames per second on hardware GPUs and 3 on software graphics to keep menu controls responsive.

Static geometry is batched by map cell with shared vertex-colour materials and culled by distance. Detail signs, NPCs and traffic have distance limits. Character/vehicle rigid parts are merged while preserving animated joints. Pixel ratio is capped and software WebGL disables shadows automatically; hardware rendering uses a bounded shadow map. Gameplay uses fixed 60 Hz steps with frame catch-up capped at 250 ms. Imported actor meshes use conservative bounds for frustum culling, and distant ground loot is hidden. Software WebGL uses lower resolution; hardware rendering retains full resolution, environment reflections and shadows.

This remains a stylised arcade game: Some vehicle classes remain procedural. The hatchback/sedan/SUV/police body shares one imported car asset; there is no full vehicle suspension or per-wheel animation for that mesh. The Boss and Remy use uploaded Mixamo action clips; weapon grips do not have full finger IK. There is no recorded dialogue, radio soundtrack, multiplayer, gamepad/touch support, crouch/block/dodge system, vehicle suspension, destructible building interiors or advanced traffic navigation. The train and flyover deck are scenery, not additional drivable systems. Seated driver hitboxes approximate characters rather than matching every visible polygon. Dense collisions may require reversing, changing direction or leaving a vehicle; police/traffic AI uses lightweight road routing rather than a full navigation mesh. Browser-local saving depends on storage permissions. Software-rendered cloud checks do not establish performance on every desktop GPU.

Vite's bundle-size advisory is expected because Three.js and Rapier's embedded WebAssembly are shipped together. No external assets or credentials are required at runtime.

## Architecture and assets

`src/game.ts` coordinates the loop. `src/systems/` contains input, camera, player, fleet/vehicles, traffic, NPCs, police, missions, combat, inventory, pickups/loot, effects, audio, saving and UI. `src/world/` contains modular city generation, road routes, original character/vehicle/weapon models and rigid-part batching. `scripts/build-standalone.mjs` embeds the built bundle and styles into one HTML file.

City architecture, street dressing, signs, jokes and dialogue are created by this project. Imported character, car and surface assets are credited in ASSET-LICENSES.md. Recorded game audio is attributed in AUDIO-SOURCES.md. Three.js and Vite are MIT-licensed; Rapier is Apache-2.0-licensed. Dependency licence notices remain with their packages and bundle.

## Embedded art

The offline HTML is approximately 104 MB because characters, cars, 14 street prop models, PBR surface maps, weapons, action clips and HDR lighting are embedded. No asset network requests are required. First startup decodes these assets. See [ASSET-LICENSES.md](ASSET-LICENSES.md) for model, texture and lighting attribution. Hardware GPU performance remains unverified by the software-rendered cloud checks.

### Choosing free replacement textures

The original Three.js brick/bump/ground maps are retained as unused references; roads now use Poly Haven Asphalt 02, pavements Worn Asphalt, and corrugated metal Worn Corrugated Iron, from the user’s 2K uploads; the lighting HDR is now the user's Poly Haven Pretville Street. See `ASSET-LICENSES.md` for exact sources and attribution.

For better ground, weathered brick, rubble and rusty corrugated metal, choose assets from [Poly Haven](https://polyhaven.com/textures) or [ambientCG](https://ambientcg.com/). Both publish CC0 assets, free for commercial games without required attribution. Send the asset-page links and which surfaces they should replace. Prefer 1K or 2K JPG colour/albedo maps plus normal and roughness maps to keep the standalone HTML download manageable. Maps need material-specific tiling and colour-space settings; copying a full texture pack into the project alone does not apply it.

Right-click with a firearm now switches to a close sight view with a narrower field of view and a camera-mounted weapon. The player body is hidden while aiming so it cannot cover the crosshair; releasing right-click returns to third person.

The player now uses the user-supplied Mixamo **The Boss** model with embedded textures and the uploaded action animations. All civilians, including civilian drivers, now use the user-supplied Mixamo **Remy** model with embedded textures and the uploaded action animations; police retain Soldier. See `REQUESTED-ASSETS.md` for all applied selections.

The Boss has stronger walking arm swing and real skeleton poses for firearm holding, aiming/reloading and melee punches. Weapon attachment follows his imported hand. Uploaded action clips supply movement, attacks, reloading and driving.

Roads, pavements, roofs, lampposts, alleyways and building walls use the user-selected 2K colour, OpenGL normal and roughness maps. Lampposts also use a metalness map. The texture changes affect appearance; surface geometry and physics are unchanged.

Remy’s authored 3.78m height is fitted to approximately 1.895m in-game, matching The Boss, including civilian drivers.

Knife and Hammer replace the previous melee weapon names and meshes, using Machete and Ornate War Hammer. Handgun uses Service Pistol; the existing Shotgun slot uses the supplied Bolt Action Rifle mesh. Cars now face their driving direction. See `REQUESTED-ASSETS.md` for the complete applied mapping.

### Uploaded action animation

The Boss and Remy use the uploaded Mixamo clips for walking, starts, jogging, backward jogging, strafing, turns, stopping, jumping/landing, punches, melee stabs, reloads, pickups, rifle movement/fire and driving. Civilian weapon reactions play the second Start Walking clip before jogging away. Driving animation is fitted to the cabin using joint bounds and clearance for the mesh. Uploaded motion is retargeted to each skeleton, blended between actions and stored as compressed data; physical movement remains controlled by Rapier. See `REQUESTED-ASSETS.md` for the exact mapping. Closed-vehicle driver sizing is adjusted throughout the driving clip, including NPC drivers.

### Uploaded street props

The 14 uploaded street models dress building fronts, alleys and road shoulders. Repeated props use instanced meshes with the original photographic materials. Utility boxes, barriers and hydrants are solid with no player damage on vehicle impact. Fences and covered cars are solid with normal crash feedback. Flush manholes and loose litter do not create driving collisions. See `ASSET-LICENSES.md` for source links and processing details.

## Retrowave edition and recorded audio

Sundarpur now has a purple dusk sky, striped sunset, cyan/pink shopfront neon, local neon lighting on hardware GPUs, and a CRT/neon interface. Existing user-selected PBR models, materials, buildings and collision rules are retained. Decorative neon does not add obstacles.

Two free licensed electronic tracks respond to movement, cruising, combat and police heat through filtering, gain changes and crossfades. A 25-file audio bank supplies gunshots, magazine/rifle reloads, blade swings and hits, punches, bullet impacts, car/motorcycle engines, tyre skids, crashes, doors, pickups, footsteps, landings, street ambience and a money reward cha-ching. Engine pitch and level follow speed, throttle and approximate automatic gears. Music dips beneath important effects.

Settings contains separate **Master Volume** and **Synthwave Soundtrack** sliders. A soundtrack value of zero preserves effect playback. Browser autoplay rules mean audio starts from New Game, Continue or Resume. Pausing fades music and stops effect voices. Everything is embedded in the one HTML and works offline. See [AUDIO-SOURCES.md](AUDIO-SOURCES.md) for source links and licensing.
