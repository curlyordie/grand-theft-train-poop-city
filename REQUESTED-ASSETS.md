# Applied user assets

The Boss is the player; all civilians and civilian drivers use Remy, scaled to match The Boss. Police retain Soldier.

Remy uses the user-supplied `Remy_Face_Texture_Final.png` from `Remy_Face_Texture_Final_Package.zip` in the Bodymat diffuse slot. Its original 2048 × 2048 UV layout is retained and encoded as high-quality WebP inside the GLB. All other embedded maps, mesh/UV data, skeletons and animation data are preserved.

## Additional Meshy civilians

The user confirmed three separate additions. The original 43 residents, their IDs and Remy models are preserved; 12 residents are added, four of each new type:

| Added type | Uploaded model | Animation profile |
|---|---|---|
| Kurta | Meshy_AI_T_Pose_Kurta_Model_1013081339_texture_fbx.zip | Fitted weighted skeleton and existing locomotion/actions |
| Cityside Smile | Meshy_AI_Cityside_Smile_All_Animations.glb | Supplied skeleton, existing locomotion/actions; exclusive Cow Milking |
| Cityside Smile (clown walk) | Meshy_AI_Cityside_Smile_1013091356_texture.glb | Fitted weighted skeleton; Scary Clown Walk, Start Walking and Stopping |

The two unrigged models are skinned to fitted versions of the uploaded Cityside skeleton. They use detailed approximately 64K-triangle display meshes and retain their supplied 2K textures. Heights match The Boss at approximately 1.895m. New motion clips are retargeted to each skeleton; the existing Boss/Remy action clips remain exact.

Talking On Phone and Texting And Walking occur at independently random intervals for NPCs of every type. Phone calls and Cow Milking stop walking for the authored clip duration; texting continues along the walking route. Actions finish normally, resume locomotion, and yield to danger, damage or interaction. Cow Milking is available only to the originally rigged Cityside model. The final Cityside model exclusively uses all three Scary Clown walking clips.

Standing React Death Forward replaces the earlier Death From The Front request. It plays once and holds the final pose for all civilian types, police, The Boss and vehicle drivers. Dead NPC colliders are disabled; resets restore the living rig. The Boss respawns after the clip finishes using the existing cash penalty. Enclosed driver animations stay fitted to their vehicle cabin.

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

## Street dressing

All 14 cosmetic uploads are applied: manholes, cameras, utility boxes, air conditioning units, concrete barriers, hydrants, trash bags, trash cans, shopfront boxes, shutters, fences, covered cars, tyres and wheel rims. Utility boxes, barriers and hydrants block vehicles without injuring the player. Fences and covered cars block both walking and driving and retain ordinary crash feedback. Covers and small litter are visual, avoiding new invisible pavement impacts. Starter-car clearance is preserved.
