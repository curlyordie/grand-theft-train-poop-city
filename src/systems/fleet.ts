import * as THREE from 'three';
import { Vehicle } from './vehicles';
import { Physics, RAPIER } from './physics';
import { Player } from './player';
import { Input } from './input';
import { VEHICLE_TYPES, type VehicleKind } from '../world/vehicle-data';

export class Fleet {
  vehicles:Vehicle[]=[]; active:Vehicle;
  constructor(scene:THREE.Scene,physics:Physics){
    const placements:[VehicleKind,number,number,string][]=[['hatchback',1.8,12,'hatchback'],['sedan',50,18,'mission-sedan'],['suv',-2.3,-18,'suv'],['rickshaw',2.4,30,'rickshaw'],['motorcycle',-2.3,36,'motorcycle'],['pickup',98,-35,'pickup'],['van',146,-112,'van'],['police',-50,20,'police']];
    const extra:VehicleKind[]=['sedan','hatchback','pickup','suv','van','motorcycle','rickshaw'];
    for(const x of [-144,-96,-48,0,48,96,144])for(const z of [-65,65,115]){
      if(x===0&&z===65)continue;
      placements.push([extra[placements.length%extra.length],x+2.4,z,`parked-${placements.length}`]);
    }
    placements.forEach(([kind,x,z,id])=>this.vehicles.push(new Vehicle(scene,physics,VEHICLE_TYPES[kind],new THREE.Vector3(x,0,z),id)));
    this.active=this.vehicles[0];
  }
  reset(){this.vehicles.forEach(v=>v.reset());this.active=this.vehicles[0];}
  nearest(player:Player){return this.vehicles.filter(v=>v.canEnter(player)).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position))[0];}
  enter(player:Player){const vehicle=this.nearest(player);if(!vehicle||!vehicle.enter(player))return false;this.active=vehicle;return true;}
  update(dt:number,input:Input,onCollision:(impact:number,collider?:RAPIER.Collider)=>void){if(this.active.occupied)this.active.update(dt,input,onCollision);}
  updateDriverDeaths(dt:number){this.vehicles.forEach(vehicle=>vehicle.updateDriverDeath(dt));}
  sync(){this.vehicles.forEach(v=>v.sync());}
}
