import * as THREE from 'three';
import { Physics, RAPIER } from './physics';
import { Player } from './player';
import { NPCSystem, type NPC } from './npcs';
import { Inventory } from './inventory';
import { Input } from './input';
import { Effects } from './effects';
import { AudioSystem } from './audio';
import { weaponModel } from '../world/weapons';
import { Fleet } from './fleet';

export class Combat {
  reloadSound?:AudioBufferSourceNode;reloadWeapon='';cooldown=0; animation=0; hits=0; attacks=0; shots=0; equipped=''; held?:THREE.Group; sightWeapon?:THREE.Group; sightEquipped='';previousYaw=0;turnDelay=0;
  constructor(private physics:Physics,private player:Player,private npcs:NPCSystem,public inventory:Inventory,private effects:Effects,private audio:AudioSystem,private crime:(position:THREE.Vector3,severity:number,force?:boolean)=>void,private notify:(message:string)=>void,private fleet:Fleet){}
  visual(){if(this.equipped===this.inventory.equipped)return;this.equipped=this.inventory.equipped;this.held?.removeFromParent();this.held=weaponModel(this.inventory.equipped);this.held.position.set(0,-.53,-.12);this.held.rotation.x=this.inventory.weapon.type==='firearm'?Math.PI/2:-.5;this.player.model.arms[1].add(this.held);this.animation=0;}
  hit(npc:NPC,damage:number,point:THREE.Vector3,direction:THREE.Vector3){if(npc.damage(damage,this.player.position)){this.hits++;this.effects.blood(point,direction,damage>22);this.audio.play(this.inventory.equipped==='pipe'?'hammer':this.inventory.equipped==='fists'?'punch':'strike',{position:point,pitch:.94+Math.random()*.1});this.npcs.alert(this.player.position);this.crime(this.player.position,npc.role==='police'?3:1);}}
  update(dt:number,input:Input,camera:THREE.PerspectiveCamera,yaw:number){
    const sighting = input.aiming && !this.player.driving && this.inventory.weapon.type === 'firearm';
    if (this.sightEquipped !== this.inventory.equipped) {
      this.sightWeapon?.removeFromParent();
      this.sightWeapon = weaponModel(this.inventory.equipped);
      this.sightWeapon.position.set(0, -.10, -.28);
      this.sightWeapon.scale.setScalar(this.inventory.equipped==='handgun'?1:.65);
      camera.add(this.sightWeapon);
      if (!camera.parent) this.player.model.root.parent?.add(camera);
      this.sightEquipped = this.inventory.equipped;
    }
    if (this.sightWeapon) this.sightWeapon.visible = sighting;
    this.cooldown=Math.max(0,this.cooldown-dt);this.animation=Math.max(0,this.animation-dt);this.visual();
    if(this.reloadSound&&(!this.inventory.reloading||this.reloadWeapon!==this.inventory.equipped)){this.reloadSound.stop();this.reloadSound=undefined;}
    if(this.inventory.update(dt))this.audio.play('metal',{volume:.25});
    if(input.take('KeyR')) {
      if(this.inventory.reload()) {this.player.model.playMotion('reload',this.inventory.weapon.reload,3);this.reloadWeapon=this.inventory.equipped;this.reloadSound=this.audio.play(this.inventory.equipped==='handgun'?'reloadPistol':'reloadRifle',{duration:this.inventory.weapon.reload,volume:.75});this.notify('RELOADING…');}
      else if(this.inventory.weapon.type==='firearm'&&!this.inventory.reloading)this.notify(this.inventory.magazine===this.inventory.weapon.magazine?'MAGAZINE FULL':'NO RESERVE AMMUNITION · FIND AN AMMO BOX');
    }
    if(!this.player.driving&&(input.aiming||input.fireDown||this.animation>0))this.player.model.root.rotation.y=yaw;
    if(this.animation>0){this.player.model.arms[1].rotation.x=Math.sin(this.animation*Math.PI/.3)*1.5;this.player.model.torso.rotation.y=Math.sin(this.animation*Math.PI/.3)*.15;}
    else this.player.model.torso.rotation.y=0;
    if(input.aiming&&this.inventory.weapon.type==='firearm')this.player.model.arms[1].rotation.x=1.2;
    if(this.held&&this.inventory.weapon.type==='firearm')this.held.rotation.x=-this.player.model.arms[1].rotation.x;
    if(!this.player.driving)this.player.model.poseCombat(this.inventory.weapon.type==='firearm',input.aiming,Math.sin(this.animation*Math.PI/.3),this.inventory.reloading>0,this.inventory.weapon.type==='melee');
    if(this.held&&this.inventory.weapon.type==='firearm')this.held.rotation.x=0;
    this.turnDelay=Math.max(0,this.turnDelay-dt);
    if(!this.player.driving&&this.inventory.equipped==='shotgun'&&Math.abs(Math.atan2(Math.sin(yaw-this.previousYaw),Math.cos(yaw-this.previousYaw)))>.06&&this.turnDelay===0){this.player.model.playMotion('armed_turn',.5,1);this.turnDelay=.6;}
    this.previousYaw=yaw;
    if(this.sightWeapon){const reload=this.inventory.reloading>0?Math.sin((1-this.inventory.reloading/this.inventory.weapon.reload)*Math.PI):0;this.sightWeapon.rotation.x=reload*.55;this.sightWeapon.rotation.z=reload*.25;this.sightWeapon.position.z=-.28+Math.max(0,this.cooldown)*.035;}
    const trigger=input.firePressed||(input.fireDown&&this.inventory.weapon.type==='firearm');input.firePressed=false;
    if(!trigger||this.player.driving||this.cooldown>0||this.inventory.reloading>0)return;
    const w=this.inventory.weapon;
    if(!this.inventory.fire()){this.cooldown=.3;this.audio.play('empty',{volume:.5});this.notify('MAGAZINE EMPTY · R TO RELOAD');return;}
    this.cooldown=w.interval;this.animation=.3;this.attacks++;this.player.model.root.rotation.y=yaw;
    if(w.type==='unarmed')this.player.model.playMotion('punch',w.interval,3);
    else if(w.type==='melee')this.player.model.playMotion('melee',w.interval,3);
    else if(w.id==='shotgun')this.player.model.playMotion('fire',Math.min(.7,w.interval),3);
    const origin=this.player.position.clone().add(new THREE.Vector3(0,.45,0));
    if(w.type!=='firearm'){
      this.audio.play('knife',{volume:w.id==='fists'?.18:.5,pitch:w.id==='pipe'?.75:1});const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
      const candidates=this.npcs.npcs.filter(n=>n.active&&n.health>0).map(n=>({npc:n,d:n.position.clone().sub(this.player.position).setY(0)})).filter(c=>c.d.length()<w.range&&c.d.clone().normalize().dot(forward)>.55).sort((a,b)=>a.d.lengthSq()-b.d.lengthSq());
      const candidate=candidates[0];if(candidate){const to=candidate.npc.position.clone().add(new THREE.Vector3(0,.5,0)), delta=to.clone().sub(origin);if(this.physics.lineDistance(origin,delta.clone().normalize(),delta.length(),this.player.body)>=delta.length()-.5)this.hit(candidate.npc,w.damage,to,forward);}
      return;
    }
    this.shots++;this.audio.play(w.id==='shotgun'?'shotgun':'pistol',{volume:1,pitch:.96+Math.random()*.08});this.crime(this.player.position,1);this.npcs.alert(this.player.position);
    const direction=camera.getWorldDirection(new THREE.Vector3());
    const sight=this.physics.world.castRay(new RAPIER.Ray(camera.position,direction),w.range+10,true,undefined,undefined,undefined,this.player.body);
    const aim=camera.position.clone().addScaledVector(direction,sight?.timeOfImpact??w.range);
    const base=aim.sub(origin).normalize();
    for(let pellet=0;pellet<(w.id==='shotgun'?6:1);pellet++){
      const rayDirection=base.clone();if(w.id==='shotgun')rayDirection.add(new THREE.Vector3((Math.random()-.5)*.07,(Math.random()-.5)*.05,(Math.random()-.5)*.07)).normalize();
      const hit=this.physics.world.castRay(new RAPIER.Ray(origin,rayDirection),w.range,true,undefined,undefined,undefined,this.player.body);
      const end=origin.clone().addScaledVector(rayDirection,hit?.timeOfImpact??w.range);if(pellet===0){this.effects.tracer(origin,end);if(hit&&!this.npcs.npcs.some(n=>n.collider.handle===hit.collider.handle))this.audio.play('metal',{position:end,volume:.35,delay:Math.min(.12,hit.timeOfImpact/340)});}
      if(hit){const damage=w.damage*(1-.35*Math.min(hit.timeOfImpact/w.range,1));const npc=this.npcs.npcs.find(n=>n.collider.handle===hit.collider.handle&&n.active&&n.health>0);if(npc)this.hit(npc,damage,end,rayDirection);else{const vehicle=this.fleet.vehicles.find(v=>v.driver&&v.driverCollider?.handle===hit.collider.handle);if(vehicle?.damageDriver(damage)){this.hits++;this.effects.blood(end,rayDirection);this.npcs.alert(this.player.position);this.crime(this.player.position,vehicle.definition.kind==='police'?3:1,true);}}}
    }
  }
}
