import * as THREE from 'three';
import { Vehicle } from './vehicles';
import { Physics, RAPIER } from './physics';
import { Player } from './player';
import { Input } from './input';
import { VEHICLE_TYPES, type VehicleKind } from '../world/vehicle-data';
import {ROAD_CENTRES,SPAWN} from '../world/city';

export class Fleet {
  vehicles:Vehicle[]=[]; active:Vehicle;
  constructor(scene:THREE.Scene,physics:Physics){
    const placements:[VehicleKind,number,number,string][]=[['hatchback',1.8,12,'hatchback'],['sedan',50,18,'mission-sedan'],['suv',-2.3,-18,'suv'],['rickshaw',2.4,30,'rickshaw'],['motorcycle',-2.3,36,'motorcycle'],['pickup',98,-35,'pickup'],['van',146,-112,'van'],['police',-50,20,'police']];
    placements.forEach(([kind,x,z,id])=>this.vehicles.push(new Vehicle(scene,physics,VEHICLE_TYPES[kind],new THREE.Vector3(x,0,z),id)));
    const extra:VehicleKind[]=['sedan','hatchback','pickup','suv','van','motorcycle','rickshaw'];
    physics.step();
    for(let i=0;i<20;i++){
      const vehicle=new Vehicle(scene,physics,VEHICLE_TYPES[extra[i%extra.length]],new THREE.Vector3(204,0,204),`parked-${8+i}`);
      let parked=false;
      for(let attempt=0;attempt<240;attempt++){
        const vertical=Math.random()<.5,road=ROAD_CENTRES[Math.floor(Math.random()*ROAD_CENTRES.length)],along=-190+Math.random()*380;
        if(ROAD_CENTRES.some(c=>Math.abs(c-along)<vehicle.definition.halfLength+4.5))continue;
        const side=Math.random()<.5?-1:1,offset=side*(Math.abs(road)>=96?3.4:2.3);
        const position=new THREE.Vector3(vertical?road+offset:along,vehicle.definition.halfHeight+.06,vertical?along:road+offset);
        if(position.distanceTo(SPAWN)<25)continue;
        const yaw=vertical?(side>0?0:Math.PI):(side>0?Math.PI/2:-Math.PI/2),rotation=new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,yaw);
        const shape=new RAPIER.Cuboid(vehicle.definition.halfWidth+.18,vehicle.definition.halfHeight+.02,vehicle.definition.halfLength+.25);
        if(physics.blocked(position,rotation,shape,vehicle.collider))continue;
        vehicle.spawn.copy(position);vehicle.spawnYaw=yaw;vehicle.reset();parked=true;break;
      }
      if(!parked)throw new Error(`No clear street parking for ${vehicle.id}`);
      this.vehicles.push(vehicle);physics.step();
    }
    this.active=this.vehicles[0];
  }
  reset(){this.vehicles.forEach(v=>v.reset());this.active=this.vehicles[0];}
  nearest(player:Player){return this.vehicles.filter(v=>v.canEnter(player)).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position))[0];}
  enter(player:Player){const vehicle=this.nearest(player);if(!vehicle||!vehicle.enter(player))return false;this.active=vehicle;return true;}
  update(dt:number,input:Input,onCollision:(impact:number,collider?:RAPIER.Collider)=>void){if(this.active.occupied)this.active.update(dt,input,onCollision);}
  updateDriverDeaths(dt:number){this.vehicles.forEach(vehicle=>vehicle.updateDriverDeath(dt));}
  sync(){this.vehicles.forEach(v=>v.sync());}
}
