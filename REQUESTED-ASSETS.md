# Applied user assets

The Boss is the player; all civilians and civilian drivers use Remy, scaled to match The Boss. Police retain Soldier.

| Surface or slot | Applied source |
|---|---|
| Roads | Asphalt 02, 2K |
| Pavements | Worn Asphalt, 2K |
| Metal roofs/panels | Worn Corrugated Iron, 2K |
| Lampposts | Rusty Metal 04, 2K |
| Alleyways and bare ground | Leaf Scattered Gravel, 2K |
| Building walls (stone slot) | Damaged Plaster, 2K |
| Environment lighting | Pretville Street, 2K EXR converted to HDR |
| Handgun | Service Pistol, 2K |
| Shotgun slot | Bolt Action Rifle 7.62, 1K (existing shotgun gameplay) |
| Knife (former bat slot) | Machete, 2K |
| Hammer (former pole slot) | Ornate War Hammer, 2K |

The user confirmed mapping the machete to Knife and war hammer to Hammer. Internal old melee IDs remain compatible with existing saves. The imported car body is rotated to face its driving direction; vehicle physics and collision dimensions are unchanged. All finished assets are embedded in the standalone HTML.

## Uploaded action clips

| Trigger | Uploaded clip |
|---|---|
| Backward movement/run | Slow Jog Backwards |
| Knife/Hammer attack | Double Dagger Stab |
| Reload | Reloading |
| Unarmed attack | Punching (1), replacing the first Punching |
| Walk | Strut Walking |
| Jump | Jump |
| Start movement | First Start Walking |
| Civilian sees armed player nearby | Second Start Walking, then Jogging |
| Jog/run | Jogging |
| Shotgun-slot shot | Firing Rifle |
| Running turn | Change Direction |
| Run stopping | Run To Stop |
| Armed walk | Walk With Rifle |
| Loot/ammo pickup | Grabbing Ammo |
| Landing after jump/fall | Jump Down |
| Shotgun-slot turn | Rifle Turn |
| Side movement | Strafing |
| Driving | Driving, fitted to cabin bounds |

The motion bank includes 18 action mappings per imported character. Body motion is blended, with translation controlled by physics and gun/melee timing controlled by gameplay. Police retain their native Soldier animation clips. Vehicle driver fit uses animated joint bounds plus head/hand/foot clearance.
