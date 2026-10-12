import * as THREE from 'three';
import { weaponModel } from '../world/weapons';
import { box } from '../world/models';
import { Inventory, WEAPONS, type WeaponId, type AmmoType } from './inventory';

const LOCATIONS: { kind: WeaponId | AmmoType; x: number; z: number }[] = [
  {kind:'bat',x:7.7,z:25}, {kind:'handgun',x:-5.8,z:40}, {kind:'bullets',x:-7.7,z:34},
  {kind:'pipe',x:103,z:-20}, {kind:'shotgun',x:151,z:-134}, {kind:'shells',x:151,z:-130},
  {kind:'bat',x:-89,z:62}, {kind:'handgun',x:-137,z:-26}, {kind:'bullets',x:55,z:72}, {kind:'pipe',x:7,z:125},
  {kind:'shotgun',x:-41,z:161}, {kind:'shells',x:-41,z:157},
];
// Keep old item IDs stable for existing saves; append street caches.
for(const x of [-144,-96,-48,0,48,96,144])for(const z of [-65,65,115]){
  const n=(LOCATIONS.length-12)/2;const kind:WeaponId=['bat','pipe','handgun','shotgun'][n%4] as WeaponId;
  LOCATIONS.push({kind,x:x-5.3,z});
  LOCATIONS.push({kind:n%4===3?'shells':'bullets',x:x-5.3,z:z+2});
}
export class Loot {
  items = LOCATIONS.map((data, id) => ({...data, id, taken:false, root: new THREE.Group(), position:new THREE.Vector3(data.x,0,data.z)}));
  constructor(scene: THREE.Scene) {
    this.items.forEach(item => {
      item.root.position.set(item.x,.15,item.z); scene.add(item.root);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.04,12),new THREE.MeshBasicMaterial({color:'#c6b06b'}));item.root.add(pad);
      if (item.kind === 'bullets' || item.kind === 'shells') { box(item.root,[.45,.25,.3],[0,.13,0],item.kind === 'bullets' ? '#738052' : '#ad7250'); box(item.root,[.05,.26,.31],[0,.13,0],'#e1cd9e'); }
      else { const model = weaponModel(item.kind); model.rotation.x = Math.PI/2; model.rotation.z = .4; model.position.y = .13; item.root.add(model); }
    });
  }
  nearest(position:THREE.Vector3) {return this.items.filter(i=>!i.taken && Math.hypot(i.x-position.x,i.z-position.z)<2.6).sort((a,b)=>a.position.distanceToSquared(position)-b.position.distanceToSquared(position))[0];}
  getName(kind:WeaponId|AmmoType){return kind==='bullets'?'Handgun ammunition':kind==='shells'?'Shotgun shells':WEAPONS.find(w=>w.id===kind)!.name;}
  collect(id:number,inventory:Inventory){const item=this.items[id];if(!item||item.taken)return '';item.taken=true;item.root.visible=false;if(item.kind==='bullets'||item.kind==='shells')inventory.reserve[item.kind]+=item.kind==='bullets'?24:12;else inventory.acquire(item.kind);return this.getName(item.kind);}
  restore(ids:number[]=[]){this.items.forEach(i=>{i.taken=ids.includes(i.id);i.root.visible=!i.taken;});}
  get collected(){return this.items.filter(i=>i.taken).map(i=>i.id);}
}
