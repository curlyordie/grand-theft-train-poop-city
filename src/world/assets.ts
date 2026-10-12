import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import civilianUrl from '../assets/civilian.glb?url';
import humanUrl from '../assets/resident.glb?url';
import bossUrl from '../assets/boss.glb?url';
import carUrl from '../assets/car.glb?url';
import brickUrl from '../assets/brick.jpg?url';
import bumpUrl from '../assets/brick-bump.jpg?url';
import groundUrl from '../assets/ground.jpg?url';
import environmentUrl from '../assets/environment.hdr?url';
let human:GLTF,car:GLTF,civilian:GLTF,boss:GLTF;

export let brick:THREE.Texture,bump:THREE.Texture,ground:THREE.Texture,environment:THREE.DataTexture;
export async function loadAssets(){
 const loader=new GLTFLoader(),textures=new THREE.TextureLoader();
 [human,car,civilian,brick,bump,ground,environment,boss]=await Promise.all([loader.loadAsync(humanUrl),loader.loadAsync(carUrl),loader.loadAsync(civilianUrl),textures.loadAsync(brickUrl),textures.loadAsync(bumpUrl),textures.loadAsync(groundUrl),new RGBELoader().loadAsync(environmentUrl),loader.loadAsync(bossUrl)]);
 brick.colorSpace=ground.colorSpace=THREE.SRGBColorSpace;
 for(const texture of [brick,bump,ground]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;}
 environment.mapping=THREE.EquirectangularReflectionMapping;

}
export function humanModel(index=0,rab=false,official=false){
 const useCivilian=!rab&&!official&&index%3!==0;
 const root=new THREE.Group(),body=clone(rab?boss.scene:useCivilian?civilian.scene:human.scene) as THREE.Group;root.add(body);
 // Resident mesh is authored in centimetres under a 0.01 conversion node.
 // Skinned bounds before the first renderer skeleton update are not valid for sizing.
 body.scale.setScalar(rab?.95:useCivilian?1.06:1.02);body.position.y=.015;
 // Native front faces +Z; the game's character convention faces -Z.
 body.rotation.y=rab?Math.PI:0;
 body.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=object.receiveShadow=true;object.frustumCulled=true;if(object instanceof THREE.SkinnedMesh){object.geometry.computeBoundingSphere();object.boundingSphere=object.geometry.boundingSphere!.clone();object.boundingSphere.radius*=1.8;}object.material=(object.material as THREE.MeshStandardMaterial).clone();const mat=object.material as THREE.MeshStandardMaterial;mat.roughness=.82;mat.color.set(rab?'#ffffff':official?'#b8ad84':['#c7ba9c','#a9b6bd','#b6a485','#bfba9b'][index%4]);if(object.name==='vanguard_visor')object.visible=false;
}});
 const mixer=new THREE.AnimationMixer(body);
 const walk=useCivilian?null:mixer.clipAction((rab?boss:human).animations.find(a=>a.name==='Walk')!);
 const idle=mixer.clipAction(useCivilian?civilian.animations.find(a=>a.name==='SambaDance')!:(rab?boss:human).animations.find(a=>a.name==='Idle')!);
 walk?.play();idle.play();if(useCivilian){idle.time=.1;idle.paused=true;}mixer.update(0);body.updateMatrixWorld(true);
 const bone=(name:string)=>body.getObjectByName(name)??body.getObjectByName(name.replace('mixamorig','mixamorig:'));
 const left=bone('mixamorigLeftUpLeg'),right=bone('mixamorigRightUpLeg');const leftPose=left?.quaternion.clone(),rightPose=right?.quaternion.clone();let strideTime=0;
 let seated=false;const originalPose=new Map<THREE.Object3D,THREE.Quaternion>();
 const poseDriving=(driving:boolean,open=false)=>{
  if(driving===seated)return;
  if(!driving){originalPose.forEach((q,b)=>b.quaternion.copy(q));originalPose.clear();seated=false;return;}
  seated=true;root.updateMatrixWorld(true);
  const axis=new THREE.Vector3(1,0,0).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
  const bend=(name:string,angle:number)=>{const joint=bone(name);if(!joint?.parent)return;originalPose.set(joint,joint.quaternion.clone());const world=joint.getWorldQuaternion(new THREE.Quaternion()),parent=joint.parent.getWorldQuaternion(new THREE.Quaternion());world.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));joint.quaternion.copy(parent.invert().multiply(world));root.updateMatrixWorld(true);};
  for(const side of ['Left','Right']){bend(`mixamorig${side}UpLeg`,open?1:1.25);bend(`mixamorig${side}Leg`,open?-.95:-1.2);bend(`mixamorig${side}Arm`,.8);}
 };
 const arms=[new THREE.Group(),new THREE.Group()],legs=[new THREE.Group(),new THREE.Group()],torso=new THREE.Group();
 // Preserve attachment/pose interfaces. The imported skeleton provides the walking animation.
 for(let i=0;i<2;i++){arms[i].position.set((i?1:-1)*.29,1.35,0);root.add(arms[i]);root.add(legs[i]);}root.add(torso);
 root.userData.poseDriving=poseDriving;
 return {root,arms,legs,torso,hips:torso,poseDriving,animate:(dt:number,speed:number)=>{poseDriving(false);if(walk){const moving=speed>.2;walk.enabled=moving;idle.enabled=!moving;walk.timeScale=Math.min(2.2,speed/1.6);mixer.update(dt);}else{strideTime+=dt*speed*2;const stride=Math.sin(strideTime)*Math.min(.5,speed*.13);if(left&&leftPose)left.quaternion.copy(leftPose).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),stride));if(right&&rightPose)right.quaternion.copy(rightPose).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-stride));}}};
}
export function importedCar(colour:string,width:number,length:number){
 const root=new THREE.Group();const mesh=car.scene.getObjectByName('ToyCar')!;
 const model=mesh.clone(true);model.updateMatrixWorld(true);
 // Extract only the car, excluding the showcase's surrounding fabric and cameras.
 model.traverse(o=>{if(o instanceof THREE.Mesh){const old=o.material as THREE.MeshPhysicalMaterial;const mat=old.clone();mat.transmission=0;mat.clearcoat=.65;mat.clearcoatRoughness=.27;mat.roughness=Math.max(.28,mat.roughness);mat.color.multiply(new THREE.Color(colour));o.material=mat;o.castShadow=o.receiveShadow=true;}});
 model.updateMatrixWorld(true);
 const bound=new THREE.Box3().setFromObject(model),size=bound.getSize(new THREE.Vector3());
 model.scale.multiply(new THREE.Vector3(width/size.x,1.45/size.y,length/size.z));model.updateMatrixWorld(true);
 const fitted=new THREE.Box3().setFromObject(model),centre=fitted.getCenter(new THREE.Vector3());model.position.set(-centre.x,-fitted.min.y,-centre.z);root.add(model);
 return {root,wheels:[] as THREE.Mesh[]};
}
