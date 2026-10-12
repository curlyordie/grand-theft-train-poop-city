import * as THREE from 'three';
import { NPCSystem, type NPC } from './npcs';
import { Fleet } from './fleet';
import { Physics, RAPIER } from './physics';
import { Vehicle } from './vehicles';
import { VEHICLE_TYPES } from '../world/vehicle-data';
import { personModel } from '../world/people';
import { roadRoute } from '../world/road-route';

export class Police {
  level=0;unseen=0;time=0;lastCrime=-100;lastKnown=new THREE.Vector3();seen=false; patrols:Vehicle[]=[];
  routes = new Map<Vehicle, { points: THREE.Vector3[]; refresh: number; goal: THREE.Vector3 }>();
  officers = new Map<Vehicle, NPC>();
  constructor(private scene:THREE.Scene,private physics:Physics,private fleet:Fleet,private npcs:NPCSystem,private notify:(message:string)=>void){}
  reset(){this.routes.clear();this.level=0;this.unseen=0;this.seen=false;this.lastCrime=-100;this.patrols.forEach(v=>{v.ai=v.driver=false;v.speed=0;});}
  crime(position:THREE.Vector3,severity:number,force=false){
    if(!force&&!this.npcs.witnesses(position))return;
    this.level=Math.min(3,this.level+severity);this.lastCrime=this.time;this.unseen=0;this.lastKnown.copy(position);this.notify(`WANTED · ${this.level} / 3 · WITNESSES ALERTED`);
  }
  spawn(player:THREE.Vector3){
    const candidates=[new THREE.Vector3(Math.round(player.x/48)*48+2.5,0,Math.round(player.z/48)*48+50),new THREE.Vector3(Math.round(player.x/48)*48-50,0,Math.round(player.z/48)*48+2.5),new THREE.Vector3(Math.round(player.x/48)*48+50,0,Math.round(player.z/48)*48-2.5),new THREE.Vector3(Math.round(player.x/48)*48-2.5,0,Math.round(player.z/48)*48-50)];
    const existing=this.patrols.find(v=>!v.ai&&!v.occupied);
    const car=existing??new Vehicle(this.scene,this.physics,VEHICLE_TYPES.police,new THREE.Vector3(-180+this.patrols.length*6,0,192),`patrol-${this.patrols.length}`);
    if(!existing){this.patrols.push(car);this.fleet.vehicles.push(car);const driver=personModel(99,true);driver.root.scale.setScalar(.65);driver.root.position.y=.25;car.model.root.add(driver.root);car.driverModel=driver.root;}
    const position=candidates.find(p=>Math.abs(p.x)<205&&Math.abs(p.z)<205&&p.distanceTo(player)>40&&!this.physics.blocked(p.clone().setY(.66),new THREE.Quaternion(),new RAPIER.Cuboid(.96,.57,2.1),car.collider));
    if(!position)return;
    const p=position.clone();p.y=.66;car.body.setTranslation(p,true);car.body.setNextKinematicTranslation(p);car.position.copy(p);car.yaw=Math.atan2(player.x-p.x,player.z-p.z)+Math.PI;car.ai=car.driver=true;car.speed=0;
    if(car.driverModel){car.driverModel.rotation.z=0;car.enableDriver(car.driverModel,90);}
    const officerPosition=p.clone().add(new THREE.Vector3(2.1,0,0));officerPosition.y=.82;
    const idle=this.officers.get(car);
    if(idle){if(!idle.active||idle.health<=0||idle.position.distanceTo(player)>35){idle.spawn.copy(officerPosition);idle.reset();}}else this.officers.set(car,this.npcs.addPolice(officerPosition));
    this.notify('POLICE DISPATCHED · BREAK LINE OF SIGHT');
  }
  update(dt:number,player:THREE.Vector3){
    this.time+=dt; if(!this.level)return;
    const required=this.level===3?3:this.level===2?2:1;
    if(this.patrols.filter(v=>v.ai).length<required)this.spawn(player);
    this.seen=this.npcs.npcs.some(n=>n.role==='police'&&n.active&&n.health>0&&n.canSee(player,45));
    for(const car of this.patrols){
      if(!car.ai)continue;
      const from=car.position.clone().add(new THREE.Vector3(0,.8,0)),d=player.clone().add(new THREE.Vector3(0,.3,0)).sub(from),length=d.length();
      const hit=this.physics.world.castRay(new RAPIER.Ray(from,d.clone().normalize()),length,true,undefined,undefined,undefined,car.body);
      if(length<60&&(!hit||hit.collider.handle===this.npcs.targetCollider?.handle||hit.timeOfImpact>=length-.1))this.seen=true;
    }
    if(this.seen){this.lastKnown.copy(player);this.unseen=0;}else this.unseen+=dt;
    if(this.unseen>12&&this.time-this.lastCrime>12){this.level--;this.unseen=0;if(!this.level){this.notify('HEAT LOST · BACK TO BAD DECISIONS');this.patrols.forEach(v=>{v.ai=false;v.speed=0;});}}
    for(const car of this.patrols){
      if(!car.ai)continue;
      let route=this.routes.get(car);
      if(!route || this.time>route.refresh && route.goal.distanceTo(this.lastKnown)>18){route={points:roadRoute(car.position,this.lastKnown),refresh:this.time+3,goal:this.lastKnown.clone()};this.routes.set(car,route);}
      while(route.points.length>1&&route.points[0].distanceTo(car.position.clone().setY(0))<4)route.points.shift();
      const target=route.points[0]??this.lastKnown;
      const delta=target.clone().sub(car.position).setY(0),distance=delta.length(),heading=Math.atan2(-delta.x,-delta.z),angle=Math.atan2(Math.sin(heading-car.yaw),Math.cos(heading-car.yaw));
      const forward=new THREE.Vector3(-Math.sin(car.yaw),0,-Math.cos(car.yaw)),origin=car.position.clone().setY(.8);
      const clear=this.physics.lineDistance(origin,forward,Math.max(5,Math.abs(car.speed)*.5),car.body);
      const investigateStop=this.level===1&&car.position.distanceTo(player)<14;
      const limit=this.level===1?8:Math.abs(angle)>.4?6:distance<12?4:21+this.level*2;
      const controls={down:(key:string)=>key==='KeyW'?!investigateStop&&distance>4&&car.speed<limit&&clear>3:key==='KeyS'?car.speed>.3&&(investigateStop||distance<4||clear<3||car.speed>limit+1):key==='Space'?investigateStop||distance<4||clear<3:key==='KeyA'?angle>.06:key==='KeyD'?angle<-.06:false};
      car.update(dt,controls,()=>{});
    }
  }
}
