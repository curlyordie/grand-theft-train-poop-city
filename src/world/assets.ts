import * as THREE from 'three';
import { loadSurfaceMaps } from './surfaces';
import { loadAudioAssets } from '../systems/audio-assets';
import { loadPropAssets } from './prop-assets';
import { CharacterMotion,loadMotions,type MotionOptions } from './motion';
import { loadWeaponAssets } from './weapon-assets';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import civilianUrl from '../assets/remy.glb?url';
import kurtaUrl from '../assets/kurta.glb?url';
import citysideUrl from '../assets/cityside.glb?url';
import citysideUnriggedUrl from '../assets/cityside-unrigged.glb?url';
import humanUrl from '../assets/resident.glb?url';
import bossUrl from '../assets/boss.glb?url';
import carUrl from '../assets/car.glb?url';
import environmentUrl from '../assets/pretville-street.hdr?url';
export type CivilianKind='remy'|'kurta'|'cityside'|'cityside-unrigged';
let human:GLTF,car:GLTF,civilian:GLTF,boss:GLTF;
const additions={} as Record<Exclude<CivilianKind,'remy'>,GLTF>;
export let environment:THREE.DataTexture;
export async function loadAssets(){
 const loader=new GLTFLoader(),textures=new THREE.TextureLoader();
 [human,car,civilian,environment,boss]=await Promise.all([loader.loadAsync(humanUrl),loader.loadAsync(carUrl),loader.loadAsync(civilianUrl),new RGBELoader().loadAsync(environmentUrl),loader.loadAsync(bossUrl),loadSurfaceMaps(textures),loadWeaponAssets(loader),loadMotions(),loadPropAssets(loader),loadAudioAssets(),
  Promise.all([loader.loadAsync(kurtaUrl),loader.loadAsync(citysideUrl),loader.loadAsync(citysideUnriggedUrl)]).then(([kurta,cityside,unrigged])=>Object.assign(additions,{kurta,cityside,'cityside-unrigged':unrigged}))]);
 environment.mapping=THREE.EquirectangularReflectionMapping;
}

export function humanModel(index=0,rab=false,official=false,kind:CivilianKind='remy'){
 const useCivilian=!rab&&!official;
 const character=rab?boss:useCivilian?(kind==='remy'?civilian:additions[kind]):human;
 const root=new THREE.Group(),body=clone(character.scene) as THREE.Group;root.add(body);
 // Resident mesh is authored in centimetres under a 0.01 conversion node.
 // Skinned bounds before the first renderer skeleton update are not valid for sizing.
 // Remy is authored at 3.78m; match The Boss at approximately 1.895m.
 body.scale.setScalar(rab?.95:useCivilian?(kind==='remy'?.50075:kind==='cityside'?1.895/1.7:1):1.02);body.position.y=.015;
 // Native front faces +Z; the game's character convention faces -Z.
 body.rotation.y=rab||useCivilian?Math.PI:0;
 body.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=object.receiveShadow=true;object.frustumCulled=true;if(object instanceof THREE.SkinnedMesh){object.geometry.computeBoundingSphere();object.boundingSphere=object.geometry.boundingSphere!.clone();object.boundingSphere.radius*=1.8;}object.material=(object.material as THREE.MeshStandardMaterial).clone();const mat=object.material as THREE.MeshStandardMaterial;mat.roughness=.82;mat.color.set(official?'#b8ad84':'#ffffff');if(object.name==='vanguard_visor')object.visible=false;
}});
 const native=character.animations.map(clip=>{if(kind==='cityside'&&!rab&&!official){const mapped=clip.clone();mapped.name=clip.name==='Running'?'jog':clip.name==='Walking'?'walk':clip.name;return mapped;}return clip;});
 const motion=new CharacterMotion(body,rab?'boss':official?'police':kind,native);
 body.updateMatrixWorld(true);
 const bone=(name:string)=>body.getObjectByName(name)??body.getObjectByName(name.replace('mixamorig','mixamorig:'));
 let seated=false;const originalPose=new Map<THREE.Object3D,THREE.Quaternion>();
 const poseDriving=(driving:boolean,open=false)=>{
  if(driving===seated)return;
  if(!driving){motion.leaveDrive();originalPose.forEach((q,b)=>b.quaternion.copy(q));originalPose.clear();seated=false;return;}
  seated=true;
  if(!official){motion.drive(0);return;}
  root.updateMatrixWorld(true);
  const axis=new THREE.Vector3(1,0,0).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
  const bend=(name:string,angle:number)=>{const joint=bone(name);if(!joint?.parent)return;originalPose.set(joint,joint.quaternion.clone());const world=joint.getWorldQuaternion(new THREE.Quaternion()),parent=joint.parent.getWorldQuaternion(new THREE.Quaternion());world.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));joint.quaternion.copy(parent.invert().multiply(world));root.updateMatrixWorld(true);};
  for(const side of ['Left','Right']){bend(`mixamorig${side}UpLeg`,open?1:1.25);bend(`mixamorig${side}Leg`,open?-.95:-1.2);bend(`mixamorig${side}Arm`,.8);}
 };
 const arms=[new THREE.Group(),new THREE.Group()],legs=[new THREE.Group(),new THREE.Group()],torso=new THREE.Group();
 // Preserve attachment/pose interfaces. The imported skeleton provides the walking animation.
 for(let i=0;i<2;i++){arms[i].position.set((i?1:-1)*.29,1.35,0);root.add(arms[i]);root.add(legs[i]);}root.add(torso);
 const poseCombat=(firearm:boolean,aiming:boolean,attack:number,reloading:boolean,heldWeapon=false)=>{
  if(seated)return;
  const strength=firearm?1:attack;

  root.updateMatrixWorld(true);
  const facing=root.getWorldQuaternion(new THREE.Quaternion());
  const point=(object:THREE.Object3D)=>object.getWorldPosition(new THREE.Vector3());
  const direct=(joint:THREE.Object3D|undefined,end:THREE.Object3D|undefined,direction:THREE.Vector3,weight=1)=>{
   if(!joint?.parent||!end)return;
   const current=point(end).sub(point(joint)).normalize();
   const delta=new THREE.Quaternion().setFromUnitVectors(current,direction.normalize().applyQuaternion(facing));
   const local=joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(delta.multiply(joint.getWorldQuaternion(new THREE.Quaternion())));
   joint.quaternion.slerp(local,weight);root.updateMatrixWorld(true);
  };
  if(!motion.capturedAction&&strength>0)for(const side of firearm?['Right','Left']:['Right']){
   const arm=bone(`mixamorig${side}Arm`),forearm=bone(`mixamorig${side}ForeArm`),hand=bone(`mixamorig${side}Hand`);
   const lateral=side==='Right'?.12:-.12;
   direct(arm,forearm,new THREE.Vector3(lateral,reloading?-.55:aiming?-.08:-.3,-1),strength);
   direct(forearm,hand,new THREE.Vector3(side==='Right'?-.05:.18,reloading?.65:aiming?.02:-.08,-1),strength);
  }
  // Move the existing weapon attachment to the imported hand, rather than a dummy shoulder.
  const hand=bone('mixamorigRightHand');
  if(hand&&(firearm||heldWeapon)){arms[1].position.copy(root.worldToLocal(point(hand))).add(new THREE.Vector3(0,.53,.08));arms[1].rotation.set(0,0,0);}
 };
 const animateDriving=(dt:number,open=false)=>{poseDriving(true,open);if(!official)motion.drive(dt);};
 const fitDriving=(min:THREE.Vector3,max:THREE.Vector3,scale:number,seat:THREE.Vector3)=>{
  root.updateMatrixWorld(true);const bounds=new THREE.Box3();
  for(const name of ['Head','Hips','LeftHand','RightHand','LeftFoot','RightFoot','LeftShoulder','RightShoulder']){
   const joint=bone(`mixamorig${name}`);if(joint)bounds.expandByPoint(root.worldToLocal(joint.getWorldPosition(new THREE.Vector3())));
  }
  bounds.min.add(new THREE.Vector3(-.10,-.07,-.14));bounds.max.add(new THREE.Vector3(.10,rab?.4:official?.3:.24,.14));
  const extent=bounds.getSize(new THREE.Vector3()),space=max.clone().sub(min);
  const fitted=Math.min(scale,space.x/extent.x,space.y/extent.y,space.z/extent.z);
  const position=seat.clone();for(const axis of ['x','y','z'] as const)position[axis]=THREE.MathUtils.clamp(position[axis],min[axis]-bounds.min[axis]*fitted,max[axis]-bounds.max[axis]*fitted);
  root.userData.driverBounds={min:bounds.min.clone().multiplyScalar(fitted).add(position).toArray(),max:bounds.max.clone().multiplyScalar(fitted).add(position).toArray(),limits:[min.toArray(),max.toArray()]};
  return{scale:fitted,position};
 };
 root.userData.poseDriving=poseDriving;root.userData.animateDriving=animateDriving;root.userData.fitDriving=fitDriving;root.userData.motion=motion;root.userData.asset=rab?'The Boss':official?'Soldier':kind==='remy'?'Remy':kind==='kurta'?'Kurta':kind==='cityside'?'Cityside Smile':'Cityside Smile (clown walk)';root.userData.civilianKind=kind;
 return {root,arms,legs,torso,hips:torso,motion,poseDriving,animateDriving,fitDriving,poseCombat,playMotion:(name:string,duration?:number,priority=2)=>motion.play(name,duration,priority),animate:(dt:number,speed:number,options:MotionOptions={})=>{poseDriving(false);motion.update(dt,speed,options);}};

}
export function importedCar(colour:string,width:number,length:number){
 const root=new THREE.Group();const mesh=car.scene.getObjectByName('ToyCar')!;
 const model=new THREE.Group();model.rotation.y=Math.PI;model.add(mesh.clone(true));model.updateMatrixWorld(true);
 // Extract only the car, excluding the showcase's surrounding fabric and cameras.
 model.traverse(o=>{if(o instanceof THREE.Mesh){const old=o.material as THREE.MeshPhysicalMaterial;const mat=old.clone();mat.transmission=0;mat.clearcoat=.65;mat.clearcoatRoughness=.27;mat.roughness=Math.max(.28,mat.roughness);mat.color.multiply(new THREE.Color(colour));o.material=mat;o.castShadow=o.receiveShadow=true;}});
 model.updateMatrixWorld(true);
 const bound=new THREE.Box3().setFromObject(model),size=bound.getSize(new THREE.Vector3());
 model.scale.multiply(new THREE.Vector3(width/size.x,1.45/size.y,length/size.z));model.updateMatrixWorld(true);
 const fitted=new THREE.Box3().setFromObject(model),centre=fitted.getCenter(new THREE.Vector3());model.position.set(-centre.x,-fitted.min.y,-centre.z);root.add(model);
 return {root,wheels:[] as THREE.Mesh[]};
}
