import * as THREE from 'three';
import { Physics } from '../systems/physics';
import { propAssets,type PropKind } from './prop-assets';
import { ROAD_CENTRES,type BuildingAnchor } from './city';

export class StreetProps{
 counts:Partial<Record<PropKind,number>>={};
 obstacles:{kind:PropKind;position:number[];half:number[];yaw:number;safe:boolean}[]=[];
 root=new THREE.Group();
 private placements=new Map<string,{kind:PropKind;matrices:THREE.Matrix4[]}>();
 constructor(scene:THREE.Scene,private physics:Physics,anchors:BuildingAnchor[]){
  scene.add(this.root);
  const safeStart=(x:number,z:number)=>Math.abs(x)<18&&z>-42&&z<49;
  const wallPoint=(a:BuildingAnchor,x:number,y:number,extra:number)=>new THREE.Vector3(x,y,a.front*(a.depth/2+extra)).applyAxisAngle(THREE.Object3D.DEFAULT_UP,a.yaw).add(new THREE.Vector3(a.x,0,a.z));
  anchors.forEach((a,i)=>{
   const facing=a.yaw+(a.front<0?Math.PI:0);
   if(i%3===0)this.add('camera',wallPoint(a,a.width*.32,Math.min(3.1,a.height-.5),.32),facing);
   if(i%4===1&&a.height>3)this.add('aircon',wallPoint(a,-a.width*.28,Math.min(3.8,a.height-1),.2),facing);
   if(i%4===2)this.add('shutter',wallPoint(a,a.width*.22,.75,.09),facing,.85);
   if(i%3===0)this.add('box',wallPoint(a,a.width*.34,.08,.65),facing+.2,1.15);
   const roadside=wallPoint(a,-a.width*.3,.06,.85);
   if(i%3===1){this.add('trashbag',roadside,facing+.3,.9);this.add('trashbag',roadside.clone().add(new THREE.Vector3(.35,0,.15)),facing,1.05);}
   if(i%6===0)this.add('trashcan',wallPoint(a,a.width*.35,.05,.7),facing);
   const box=wallPoint(a,-a.width*.38,.05,.28);
   if(i%8===2&&!safeStart(box.x,box.z))this.add('utility',box,facing,1,true,true);
   if(i%13===4){const point=new THREE.Vector3(a.width/2+.9,.04,0).applyAxisAngle(THREE.Object3D.DEFAULT_UP,a.yaw).add(new THREE.Vector3(a.x,0,a.z));if(!safeStart(point.x,point.z))this.add('fence',point,a.yaw+Math.PI/2,.78,true);}
  });
  for(const road of ROAD_CENTRES)for(const z of [-174,-118,-62,62,118,174]){
   // Flush covers remain visual so straight driving has no new terrain impacts.
   this.add('manhole',new THREE.Vector3(road+.65,.058,z+8),.3);
   const side=(Math.round(road/48)+z)%2===0?1:-1;
   const shoulder=Math.abs(road)<96?5.1:8.1;
   const x=road+side*shoulder;
   if(!safeStart(x,z)){
    this.add('coveredcar',new THREE.Vector3(x,.03,z),side<0?Math.PI:0,1,true);
    this.add('tyre',new THREE.Vector3(x+side*.7,.04,z+3.2),.35);
    this.add('rim',new THREE.Vector3(x+side*1.1,.04,z+3.65),-.4,1.3);
   }
   const pavement=road+side*7.7;
   if(!safeStart(pavement,z+9))this.add('hydrant',new THREE.Vector3(pavement,.07,z+9),side>0?Math.PI/2:-Math.PI/2,1,true,true);
   if(z===-118||z===118){const point=new THREE.Vector3(road+side*(shoulder+1.5),.05,z+13);this.add('barrier',point,Math.PI/2,1,true,true);}
   this.add('trashcan',new THREE.Vector3(road-side*8.0,.04,z+5),.3);
  }
  // The crossing streets also receive abandoned cars and wheel debris.
  for(const road of ROAD_CENTRES)for(const x of [-145,-65,65,145]){
   const z=road+(Math.abs(road)<96?5.1:8.1);
   if(!safeStart(x,z)){this.add('coveredcar',new THREE.Vector3(x,.03,z),Math.PI/2,1,true);this.add('tyre',new THREE.Vector3(x+3,.04,z+.6),Math.PI/2);this.add('rim',new THREE.Vector3(x+3.4,.04,z+.7),.7,1.2);}
  }
  for(const {kind,matrices}of this.placements.values())for(const source of propAssets.get(kind)!.meshes){
   const mesh=new THREE.InstancedMesh(source.geometry,source.material,matrices.length);matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();this.root.add(mesh);
  }
 }
 update(position:THREE.Vector3){
  for(const mesh of this.root.children as THREE.InstancedMesh[]){
   const bound=mesh.boundingSphere!;mesh.visible=bound.center.distanceTo(position)<100+bound.radius;
  }
 }
 private add(kind:PropKind,position:THREE.Vector3,yaw=0,scale=1,solid=false,safe=false){
  const asset=propAssets.get(kind)!;const rotation=new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,yaw);
  const matrix=new THREE.Matrix4().compose(position,rotation,new THREE.Vector3(scale,scale,scale));
  const key=`${kind}|${Math.floor(position.x/48)},${Math.floor(position.z/48)}`;
  if(!this.placements.has(key))this.placements.set(key,{kind,matrices:[]});this.placements.get(key)!.matrices.push(matrix);this.counts[kind]=(this.counts[kind]??0)+1;
  if(solid){
   const half=asset.size.clone().multiplyScalar(scale*.5).max(new THREE.Vector3(.07,.1,.06));
   const centre=position.clone().add(new THREE.Vector3(0,half.y,0));
   const collider=this.physics.fixedBox(centre,half);collider.setRotation(rotation);if(safe)this.physics.safeObstacles.add(collider.handle);
   this.obstacles.push({kind,position:centre.toArray(),half:half.toArray(),yaw,safe});
  }
 }
}
