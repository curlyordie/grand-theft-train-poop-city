# Game audio bank

All 25 Ogg files are bundled in the offline HTML. There is no streaming, subscription, external audio request or placeholder oscillator in the game audio system. Source recordings and licence notices are tracked in `src/assets/audio/`; `sources.json` records pinned upstream revisions, original hashes and processing changes.

The two free electronic recordings are **The Comeback** from Godot's audio demo (MIT) and **level_music** by Christian Fernando Perucchi from the Godot TPS demo (CC BY 3.0). Exploration and cruising use the first; combat and police heat bring in the second with smooth crossfades. Movement and speed open the music filter and adjust energy. The music ducks briefly under gunfire and crashes. Audio loops use the Web Audio clock and continue independently of rendering speed.

| Asset | Credit | Licence | Source |
|---|---|---|---|
| music-retro | Godot Engine contributors | MIT | [Original](https://github.com/godotengine/godot-demo-projects/blob/b761b4cd5718a7118f2c95eb55f181d0a5f004f1/audio/bpm_sync/the_comeback2.ogg) |
| music-action | Christian Fernando Perucchi | CC-BY-3.0 | [Original](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/level/level_music.ogg) |
| pistol | Juan Linietsky and Fernando Miguel Calabró | CC-BY-3.0 | [Original](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/player/audio/shoot.wav) |
| shotgun | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/shotgun/primary2.ogg) |
| reload-pistol | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/pistol/reload.ogg) |
| reload-rifle | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/rifle/reload2.ogg) |
| empty | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/pistol/notify.ogg) |
| knife-swing | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/sword/primary2.ogg) |
| strike | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/thwack2.ogg) |
| punch | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/thwack.ogg) |
| hammer | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/thud2.ogg) |
| metal-hit | Red Eclipse Team / Q009 | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/weapons/tink.ogg) |
| engine | Kenney | CC0-1.0 | [Original](https://github.com/KenneyNL/Starter-Kit-Racing/blob/2f2e5f2646dda89cb21d4e8539bab60c6e955dc8/audio/engine.ogg) |
| engine-bike | Kenney | CC0-1.0 | [Original](https://github.com/KenneyNL/Starter-Kit-Racing/blob/2f2e5f2646dda89cb21d4e8539bab60c6e955dc8/audio/engine-motorcycle.ogg) |
| crash | Kenney | CC0-1.0 | [Original](https://github.com/KenneyNL/Starter-Kit-Racing/blob/2f2e5f2646dda89cb21d4e8539bab60c6e955dc8/audio/impact.ogg) |
| skid | Landeplage / Kenney | CC0-1.0 | [Original](https://github.com/KenneyNL/Starter-Kit-Racing/blob/2f2e5f2646dda89cb21d4e8539bab60c6e955dc8/audio/skid.ogg) |
| footstep | Juan Linietsky and Fernando Miguel Calabró | CC-BY-3.0 | [Original](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/player/audio/step.wav) |
| land | Juan Linietsky and Fernando Miguel Calabró | CC-BY-3.0 | [Original](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/player/audio/land.wav) |
| door | Juan Linietsky and Fernando Miguel Calabró | CC-BY-3.0 | [Original](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/door/open_close.wav) |
| coins | artisticdude | CC-BY-3.0 | [Original](https://github.com/flareteam/flare-game/blob/af6eee6d339ac98011864bfe89da837fe7769c28/mods/fantasycore/soundfx/inventory/inventory_coins.ogg) |
| pickup | artisticdude | CC-BY-3.0 | [Original](https://github.com/flareteam/flare-game/blob/af6eee6d339ac98011864bfe89da837fe7769c28/mods/fantasycore/soundfx/inventory/inventory_metal.ogg) |
| ammo | Michel Baradari | CC-BY-3.0 | [Original](https://github.com/flareteam/flare-game/blob/af6eee6d339ac98011864bfe89da837fe7769c28/mods/fantasycore/soundfx/inventory/inventory_object.ogg) |
| bottle | Stephan | CC0-1.0 | [Original](https://github.com/flareteam/flare-game/blob/af6eee6d339ac98011864bfe89da837fe7769c28/mods/fantasycore/soundfx/inventory/inventory_potion.ogg) |
| cash-bell | Godot Engine contributors | MIT | [Original](https://github.com/godotengine/godot-demo-projects/blob/b761b4cd5718a7118f2c95eb55f181d0a5f004f1/audio/audio_effects/sfx/Ding.wav) |
| ambience | Red Eclipse Team | CC-BY-SA-4.0 | [Original](https://github.com/redeclipse/sounds/blob/f7ec71456335a57fc5fba136d5d9a7e0b2ae009f/ambience/distant_cars.ogg) |

## Gameplay mapping

- Handgun and shotgun-slot firing: separate sampled reports, slight shot variation and music ducking.
- Reload: pistol magazine handling or rifle handling, fitted to the actual reload time; switching weapon cancels the sound. Empty magazines click.
- Knife/Hammer: swing sound; contact triggers flesh/metal impact appropriate to the equipped weapon. Punches and bullet impacts use separate samples and spatial stereo positioning.
- Cars and motorcycles: separate engine loops. Throttle changes engine level and rev pitch; speed drives simulated automatic gear changes. Handbraking or sharp fast steering brings in recorded tyre skid. Vehicle collisions trigger an impact sized to impact speed; flat ground and pavements do not trigger crash sounds.
- Vehicle entry/exit: door movement sound.
- Weapon, ammunition and bottle pickups: separate handling sounds.
- Mission money rewards: coin rattle plus delayed cash-register-style bell (the cha-ching). This is tied to the cash increment, not every HUD refresh.
- Walking/landing: footfall and landing recordings. Streets have quiet distant-car ambience.
- Pause/menu: music fades out and effect voices stop. Resume reuses the same loop nodes. Master and soundtrack volume are saved separately; music can be muted while keeping game effects.

Adaptations: Ogg Vorbis compression, 44.1 kHz resampling, peak limiting, mono effects for stereo positioning, timing/pitch changes and mixing in-game. Red Eclipse effect adaptations remain under **CC BY-SA 4.0**; the licence text and credits accompany those files. Godot TPS and relevant Flare effect adaptations retain **CC BY 3.0** attribution. Music is not taken from Red Eclipse's restricted theme/EG tracks.

The scene remains an arcade driving sandbox. Engine RPM/gear audio approximates a drivetrain; this update does not add wheel suspension or a full vehicle physics simulator.
