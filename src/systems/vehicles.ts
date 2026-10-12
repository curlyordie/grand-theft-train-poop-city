import * as THREE from 'three';
import { Input } from './input';
import { Physics, RAPIER } from './physics';
import { Player } from './player';
import { vehicleModel } from '../world/vehicle-models';
import { VEHICLE_TYPES, type VehicleDefinition } from '../world/vehicle-data';

export const CAR_SPAWN = new THREE.Vector3(1.8, .61, 12);
export class Vehicle {
  model: ReturnType<typeof vehicleModel>;
  ai = false;
  driver = false;
  driverModel?: THREE.Group;
  driverCollider?: RAPIER.Collider;
  driverHealth = 55;
  private occupantCollider?: RAPIER.Collider;
  lastExitAttemptSpeed = -1;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  position = new THREE.Vector3();
  previousPosition = new THREE.Vector3();
  previousYaw = 0;
  speed = 0;
  yaw = 0;
  occupied = false;
  collisionCooldown = 0;
  crashes = 0;
  lastImpactCollider?: RAPIER.Collider;
  distanceDriven = 0;
  constructor(scene: THREE.Scene, private physics: Physics, public definition: VehicleDefinition = VEHICLE_TYPES.hatchback, public spawn = CAR_SPAWN.clone(), public id = 'hatchback') {
    this.model = vehicleModel(definition);
    scene.add(this.model.root);
    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, definition.halfHeight + .06, spawn.z));
    this.collider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(definition.halfWidth, definition.halfHeight, definition.halfLength).setMass(definition.mass), this.body);
    this.controller = physics.world.createCharacterController(.025); this.controller.setSlideEnabled(true);
    this.controller.enableSnapToGround(.15); this.sync();this.previousPosition.copy(this.position);
  }
  reset() {
    this.speed = this.yaw = this.distanceDriven = 0; this.occupied = false; this.occupantCollider = undefined;
    const position = this.spawn.clone(); position.y = this.definition.halfHeight + .06;
    this.body.setTranslation(position, true); this.body.setNextKinematicTranslation(position);
    this.previousPosition.copy(position);this.previousYaw=0;this.crashes=0;this.lastImpactCollider=undefined;this.collisionCooldown=0;
    this.body.setRotation(new THREE.Quaternion(), true); this.body.setNextKinematicRotation(new THREE.Quaternion()); this.sync();
  }
  canEnter(player: Player) { return !this.occupied && player.position.distanceTo(this.position) < this.definition.halfLength + 1.9 && player.grounded && Math.abs(this.speed) < 3; }
  enableDriver(model: THREE.Group, health = 55) {
    model.userData.poseDriving?.(true,this.definition.kind==='motorcycle'||this.definition.kind==='rickshaw');
    this.driverModel = model; this.driverHealth = health; this.driver = true; model.visible = true;
    this.driverCollider ??= this.physics.world.createCollider(RAPIER.ColliderDesc.capsule(.22,.18).setTranslation(0,.54,.15),this.body);
    this.driverCollider.setEnabled(true);
  }
  damageDriver(amount: number) {
    if (!this.driver || this.driverHealth <= 0) return false;
    this.driverHealth = Math.max(0,this.driverHealth-amount);
    if (this.driverHealth === 0) { this.ai=this.driver=false;this.speed=0;this.driverCollider?.setEnabled(false);if(this.driverModel)this.driverModel.rotation.z=.8; }
    return true;
  }
  enter(player: Player) {
    if (!this.canEnter(player)) return false;
    this.occupied = player.driving = true; this.ai = this.driver = false;
    this.occupantCollider = player.collider;
    if (this.driverModel) this.driverModel.visible = false;
    this.driverCollider?.setEnabled(false);
    player.velocity.set(0, 0, 0); player.collider.setEnabled(false); player.model.root.visible = false; return true;
  }
  exit(player: Player) {
    this.lastExitAttemptSpeed = Math.abs(this.speed);
    if (Math.abs(this.speed) > 3) return 'Stop the car before getting out.';
    for (const offset of [[this.definition.halfWidth + 1.25, 0], [-this.definition.halfWidth - 1.25, 0], [0, this.definition.halfLength + 1.3], [0, -this.definition.halfLength - 1.3], [2.7, 2.4], [-2.7, 2.4]]) {
      const target = new THREE.Vector3(offset[0], 0, offset[1]).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw).add(this.position);
      target.y = .84;
      if (!this.physics.blocked(target, new THREE.Quaternion(), new RAPIER.Capsule(.5, .33), player.collider)) {
        this.occupied = false; this.occupantCollider = undefined; this.speed = 0; player.reset(target); return '';
      }
    }
    return 'Both doors are blocked. Move to an open stretch of road.';
  }
  update(dt: number, input: Pick<Input, 'down'>, onCollision: (impact: number, collider?:RAPIER.Collider) => void) {
    this.previousPosition.copy(this.position);this.previousYaw=this.yaw;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    if (!this.occupied && !this.ai) return;
    const solid=(c:RAPIER.Collider)=>{
      if(c.handle===this.physics.ground.handle||c.parent()?.handle===this.body.handle||c.handle===this.occupantCollider?.handle)return false;
      const shape=c.shape;
      return !(shape instanceof RAPIER.Cuboid && c.translation().y+shape.halfExtents.y<.35);
    };
    const accelerating = input.down('KeyW'), braking = input.down('KeyS');
    const handbrake = input.down('Space');
    if (accelerating) this.speed += (this.speed < -.3 ? this.definition.brake : this.definition.acceleration) * dt;
    else if (braking) this.speed -= (this.speed > .3 ? this.definition.brake : this.definition.acceleration * .6) * dt;
    else this.speed *= Math.exp(-.62 * dt);
    if (handbrake) this.speed *= Math.exp(-4.5 * dt);
    this.speed = THREE.MathUtils.clamp(this.speed, -9, this.definition.topSpeed);
    if (Math.abs(this.speed) < .08 && !accelerating && !braking) this.speed = 0;
    const steering = Number(input.down('KeyA')) - Number(input.down('KeyD'));
    const response = Math.min(Math.abs(this.speed) / 4, 1) * (this.definition.steering - Math.min(Math.abs(this.speed) / 30, .75));
    const nextYaw = this.yaw + steering * response * Math.sign(this.speed) * dt * (handbrake ? 1.3 : 1);
    const rotation = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, nextYaw);
    if (this.physics.world.intersectionWithShape(this.position,rotation,new RAPIER.Cuboid(this.definition.halfWidth,this.definition.halfHeight-.03,this.definition.halfLength),undefined,undefined,this.collider,this.body,solid)===null) this.yaw = nextYaw;
    this.body.setRotation(new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw), true);
    // Cars stay on the road plane. A horizontal swept hull detects actual obstacles,
    // rather than treating a character controller's ground correction as a crash.
    const desired = new THREE.Vector3(-Math.sin(this.yaw)*this.speed*dt,0,-Math.cos(this.yaw)*this.speed*dt);
    const p=this.body.translation(),distance=desired.length(),rotationNow=this.body.rotation();
    const hit=distance>.0001?this.physics.world.castShape(p,rotationNow,desired,this.collider.shape,.012,1,false,undefined,undefined,this.collider,this.body,solid):null;
    const movement=desired.clone();
    if(hit){
      const normal=new THREE.Vector3(hit.normal2.x,hit.normal2.y,hit.normal2.z).applyQuaternion(new THREE.Quaternion().copy(hit.collider.rotation() as THREE.Quaternion));
      normal.y=0;normal.normalize();if(normal.dot(desired)>0)normal.negate();
      const approach=Math.max(0,-desired.clone().normalize().dot(normal));
      const fraction=Math.max(0,Math.min(1,hit.time_of_impact-.012/Math.max(distance,.012)));
      movement.multiplyScalar(fraction);
      // Keep tangential travel along a wall instead of repeatedly bouncing/reversing.
      const remaining=desired.clone().multiplyScalar(1-fraction);remaining.addScaledVector(normal,-Math.min(0,remaining.dot(normal)));
      if(remaining.lengthSq()>.000001){const from=new THREE.Vector3(p.x,p.y,p.z).add(movement);const slide=this.physics.world.castShape(from,rotationNow,remaining,this.collider.shape,.008,1,false,undefined,undefined,this.collider,this.body,solid);movement.addScaledVector(remaining,slide?Math.max(0,slide.time_of_impact-.01):1);}
      if(approach>.3){
        const impact=Math.abs(this.speed)*approach;this.speed*=1-approach;this.lastImpactCollider=hit.collider;
        if(impact>3&&this.collisionCooldown===0){this.crashes++;onCollision(impact,hit.collider);this.collisionCooldown=1.5;}
      }
    }
    this.distanceDriven+=movement.length();
    this.body.setNextKinematicTranslation({x:p.x+movement.x,y:this.definition.halfHeight+.04,z:p.z+movement.z});
    this.model.wheels.forEach(w => w.rotation.x += this.speed * dt / .33);
    if(this.driver&&this.driverModel){
      const kind=this.definition.kind,open=kind==='motorcycle'||kind==='rickshaw';
      this.driverModel.userData.animateDriving?.(dt,open);
      if(kind!=='motorcycle'){
        const height=kind==='van'?2.2:kind==='rickshaw'?1.7:kind==='pickup'?1.9:1.38;
        const fit=this.driverModel.userData.fitDriving?.(new THREE.Vector3(-this.definition.halfWidth+.1,.07,-this.definition.halfLength+.2),new THREE.Vector3(this.definition.halfWidth-.1,height,this.definition.halfLength-.2),.65,new THREE.Vector3(.32,.18,.1));
        if(fit){this.driverModel.scale.setScalar(fit.scale);this.driverModel.position.copy(fit.position);}
      }
    }
  }
  render(alpha:number) {
    if(!this.occupied&&!this.ai)return;
    this.model.root.position.lerpVectors(this.previousPosition,this.position,alpha);
    this.model.root.position.y-=this.definition.halfHeight+.03;
    const delta=Math.atan2(Math.sin(this.yaw-this.previousYaw),Math.cos(this.yaw-this.previousYaw));
    this.model.root.rotation.y=this.previousYaw+delta*alpha;
  }
  sync() {
    const p = this.body.translation(); this.position.set(p.x, p.y, p.z);
    this.model.root.position.set(p.x, p.y - this.definition.halfHeight - .03, p.z); this.model.root.rotation.y = this.yaw;
    if (this.definition.kind === 'motorcycle') this.model.root.rotation.z = Math.sin(this.yaw) * Math.min(Math.abs(this.speed) * .003, .1);
    this.driverCollider?.setEnabled(this.driver && this.driverHealth>0 && this.collider.isEnabled());
    if(this.driverModel)this.driverModel.visible=this.driver||this.driverHealth===0;
  }
}
