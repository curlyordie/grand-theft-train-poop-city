import * as THREE from 'three';
import { Vehicle } from './vehicles';
import { Physics } from './physics';
import { Fleet } from './fleet';
import { VEHICLE_TYPES, type VehicleKind } from '../world/vehicle-data';
import { personModel } from '../world/people';

export class Traffic {
  routes:{vehicle:Vehicle;path:THREE.Vector3[];index:number;wait:number;progress:number}[]=[];
  constructor(scene:THREE.Scene,private physics:Physics,fleet:Fleet){
    const loops=[[-144,-96,[-48,48]],[-48,0,[-96,-48]],[0,48,[48,96]],[96,144,[-96,-48]],[-96,-48,[144,192]]];
    const types:VehicleKind[]=['sedan','rickshaw','motorcycle','van','pickup'];
    loops.forEach(([left,right,zValues],i)=>{
      const [top,bottom]=zValues as number[], x0=left as number,x1=right as number;
      const path=[new THREE.Vector3(x0+2.5,0,top+2.5),new THREE.Vector3(x1-2.5,0,top+2.5),new THREE.Vector3(x1-2.5,0,bottom-2.5),new THREE.Vector3(x0+2.5,0,bottom-2.5)];
      const vehicle=new Vehicle(scene,physics,VEHICLE_TYPES[types[i]],path[0],`traffic-${i}`);vehicle.ai=vehicle.driver=true;vehicle.yaw=-Math.PI/2;fleet.vehicles.push(vehicle);
      const driver=personModel(60+i);driver.root.scale.setScalar(.65);driver.root.position.set(0,.25,.15);vehicle.model.root.add(driver.root);vehicle.enableDriver(driver.root);
      this.routes.push({vehicle,path,index:1,wait:0,progress:0});
    });
  }
  reset(){this.routes.forEach(r=>{r.vehicle.ai=r.vehicle.driver=true;if(r.vehicle.driverModel){r.vehicle.driverModel.rotation.z=0;r.vehicle.enableDriver(r.vehicle.driverModel);}r.vehicle.yaw=-Math.PI/2;r.index=1;r.wait=0;r.progress=0;});}
  update(dt:number,player:THREE.Vector3,danger:boolean){
    for(const route of this.routes){
      const v=route.vehicle;if(!v.ai)continue;
      const active=v.position.distanceTo(player)<145;v.model.root.visible=active;v.collider.setEnabled(active);if(!active)continue;
      const target=route.path[route.index], delta=target.clone().sub(v.position).setY(0), distance=delta.length();
      if(distance<4){route.index=(route.index+1)%route.path.length;route.wait=.5;}
      route.wait=Math.max(0,route.wait-dt);
      const heading=Math.atan2(-delta.x,-delta.z), angle=Math.atan2(Math.sin(heading-v.yaw),Math.cos(heading-v.yaw));
      const forward=new THREE.Vector3(-Math.sin(v.yaw),0,-Math.cos(v.yaw));const origin=v.position.clone();origin.y=.8;
      const obstacle=this.physics.lineDistance(origin,forward,Math.max(5,Math.abs(v.speed)*.9),v.body);
      const limit=Math.abs(angle)>.35?4:danger&&v.position.distanceTo(player)<20?3:11;
      const controls={down:(key:string)=>key==='KeyW'?route.wait<=0&&obstacle>v.definition.halfLength+2&&v.speed<limit:key==='KeyS'?obstacle<v.definition.halfLength+2||v.speed>limit+1:key==='KeyA'?angle>.05:key==='KeyD'?angle<-.05:false};
      v.update(dt,controls,()=>{route.wait=1;});route.progress+=Math.abs(v.speed)*dt;
    }
  }
}
