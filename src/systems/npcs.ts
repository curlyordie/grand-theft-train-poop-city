import * as THREE from 'three';
import { Physics, RAPIER } from './physics';
import { personModel } from '../world/people';

export type NPCState = 'wander' | 'idle' | 'flee' | 'fight' | 'pursue' | 'search' | 'incapacitated';
export type NPCRole = 'civilian' | 'shopkeeper' | 'hostile' | 'police';
export class NPC {
  model: ReturnType<typeof personModel>;
  body: RAPIER.RigidBody; collider: RAPIER.Collider; controller: RAPIER.KinematicCharacterController;
  position = new THREE.Vector3(); spawn: THREE.Vector3;
  state: NPCState = 'wander'; health: number; active = false; index = 0; timer = 0; attackTimer = 0; stuck = 0; animation = 0;
  lastKnown = new THREE.Vector3();
  hurt = 0;
  sidestep = 0;
  targetCollider?: RAPIER.Collider;
  constructor(public id: number, public role: NPCRole, public path: THREE.Vector3[], scene: THREE.Scene, private physics: Physics) {
    this.spawn = path[0].clone(); this.position.copy(this.spawn); this.model = personModel(id, role === 'police'); scene.add(this.model.root);
    this.health = role === 'police' ? 90 : role === 'hostile' ? 70 : 55;
    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.spawn.x, .82, this.spawn.z));
    this.collider = physics.world.createCollider(RAPIER.ColliderDesc.capsule(.5, .27), this.body);
    this.controller = physics.world.createCharacterController(.02); this.controller.enableSnapToGround(.2);
  }
  reset() {
    this.health = this.role === 'police' ? 90 : this.role === 'hostile' ? 70 : 55;
    this.state = 'wander'; this.timer = 0; this.index = 0;
    const p = this.spawn.clone(); p.y = .82; this.body.setTranslation(p, true); this.body.setNextKinematicTranslation(p);
    this.model.root.rotation.z = 0; this.sync();
  }
  setActive(active: boolean) { this.active = active; this.model.root.visible = active; this.collider.setEnabled(active && this.health > 0); }
  sync() { const p = this.body.translation(); this.position.set(p.x, p.y, p.z); this.model.root.position.set(p.x, p.y - .78, p.z); }
  canSee(target: THREE.Vector3, range = 38) {
    const from = this.position.clone().add(new THREE.Vector3(0, .7, 0)), to = target.clone().add(new THREE.Vector3(0, .5, 0));
    const d = to.sub(from), length = d.length();
    if (length >= range) return false;
    const hit = this.physics.world.castRay(new RAPIER.Ray(from, d.normalize()), length, true, undefined, undefined, undefined, this.body);
    return !hit || hit.collider.handle === this.targetCollider?.handle || hit.timeOfImpact >= length - .1;
  }
  damage(amount: number, threat: THREE.Vector3) {
    if (this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount); this.lastKnown.copy(threat); this.timer = 8; this.hurt = .25;
    this.state = this.health === 0 ? 'incapacitated' : this.role === 'hostile' || this.role === 'police' || this.id % 7 === 0 ? 'fight' : 'flee';
    if (!this.health) { this.collider.setEnabled(false); this.model.root.rotation.z = Math.PI / 2; }
    return true;
  }
  update(dt: number, player: THREE.Vector3, armed: boolean, wanted: number, onAttack: (amount: number, npc: NPC) => void) {
    if (!this.active || this.health <= 0) return;
    this.attackTimer -= dt; this.timer -= dt; this.hurt = Math.max(0, this.hurt - dt); this.sidestep = Math.max(0, this.sidestep - dt);
    const distance = this.position.distanceTo(player);
    if (this.role === 'police' && wanted > 0) {
      if (this.canSee(player, 50)) { this.lastKnown.copy(player); this.state = 'pursue'; this.timer = 5; }
      else if (this.state === 'pursue' || this.state === 'search') this.state = 'search';
    } else if (this.role === 'police' && wanted === 0) this.state = 'wander';
    if (this.role === 'hostile' && distance < 10 && this.canSee(player, 12)) { this.state = 'fight'; this.lastKnown.copy(player); }
    if (armed && distance < 7 && this.role === 'civilian' && this.state === 'wander') { this.state = 'flee'; this.timer = 5; this.lastKnown.copy(player); }
    if (this.timer <= 0 && (this.state === 'idle' || this.state === 'flee' || this.state === 'search')) this.state = 'wander';
    let target = this.path[this.index], speed = 1.15 + this.id % 3 * .22;
    if (this.state === 'idle') speed = 0;
    if (this.state === 'flee') { target = this.position.clone().add(this.position.clone().sub(this.lastKnown).setY(0).normalize().multiplyScalar(10)); speed = 4; }
    if (this.state === 'fight' || this.state === 'pursue') {
      target = this.canSee(player, 45) ? player : this.lastKnown; speed = this.role === 'police' && wanted === 1 ? 2 : 4;
      if (this.role === 'police' && wanted === 1 && distance < 8) speed = 0;
      if (distance < 1.9 && this.canSee(player, 3)) {
        speed = 0;
        if (this.attackTimer <= 0 && (this.role !== 'police' || wanted >= 2)) { this.attackTimer = 1.2; onAttack(this.role === 'police' ? 10 : 8, this); this.model.arms[0].rotation.x = 1.2; }
      }
    }
    if (this.state === 'search') target = this.lastKnown;
    const delta = target.clone().sub(this.position).setY(0);
    if (this.sidestep > 0) delta.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.id % 2 ? Math.PI / 2 : -Math.PI / 2);
    if (this.hurt > 0) speed = 0;
    this.model.root.rotation.x = this.hurt * .8;
    if (delta.length() < .8 && this.state === 'wander') { this.index = (this.index + 1) % this.path.length; if (this.id % 3 === 0) { this.state = 'idle'; this.timer = 1.5; } }
    delta.normalize().multiplyScalar(speed * dt); delta.y = -2 * dt;
    this.controller.computeColliderMovement(this.collider, delta);
    const movement = this.controller.computedMovement(), p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x + movement.x, y: p.y + movement.y, z: p.z + movement.z });
    const progress = Math.hypot(movement.x, movement.z);
    this.stuck = speed > 0 && progress < dt * .2 ? this.stuck + dt : 0;
    if (this.stuck > 1.5) { this.index = (this.index + 1) % this.path.length; this.stuck = 0; this.sidestep = 1; if (this.state === 'flee') this.lastKnown.add(new THREE.Vector3(3, 0, -3)); }
    if (progress > .001) this.model.root.rotation.y = Math.atan2(-movement.x, -movement.z);
    this.animation += dt * speed * 2; const stride = Math.sin(this.animation) * .4;
    this.model.legs[0].rotation.x = stride; this.model.legs[1].rotation.x = -stride;
    this.model.arms[0].rotation.x = THREE.MathUtils.lerp(this.model.arms[0].rotation.x, -stride, .2); this.model.arms[1].rotation.x = stride;
  }
}
export class NPCSystem {
  npcs: NPC[] = []; time = 0;
  targetCollider?: RAPIER.Collider;
  constructor(private scene: THREE.Scene, private physics: Physics) {
    const lanes = [[7, 3], [-5.5, 22], [7, -35], [-41, 11], [55, 14], [-89, -30], [-137, -80], [103, -70], [151, -165], [7, 113], [-41, 163], [103, 145], [7, -160], [55, -130]];
    lanes.forEach(([x, z], lane) => {
      for (let j = 0; j < 3; j++) {
        const id = this.npcs.length;
        const start = z + j * 7;
        const path = [new THREE.Vector3(x, .82, start), new THREE.Vector3(x, .82, start + 12), new THREE.Vector3(x - .6, .82, start + 2)];
        this.npcs.push(new NPC(id, lane === 1 && j === 0 ? 'shopkeeper' : lane === 8 && j === 0 ? 'hostile' : 'civilian', path, scene, physics));
      }
    });
    this.npcs.push(new NPC(this.npcs.length,'shopkeeper',[new THREE.Vector3(103,.82,-7),new THREE.Vector3(103,.82,-5.5)],scene,physics));
  }
  reset() { this.npcs.forEach(n => n.reset()); }
  addPolice(position: THREE.Vector3) { const npc = new NPC(this.npcs.length, 'police', [position.clone(), position.clone().add(new THREE.Vector3(0, 0, 8))], this.scene, this.physics); this.npcs.push(npc); return npc; }
  nearest(position: THREE.Vector3) { return this.npcs.filter(n => n.active && n.health > 0 && n.position.distanceTo(position) < 2.4).sort((a,b)=>a.position.distanceToSquared(position)-b.position.distanceToSquared(position))[0]; }
  interact(npc: NPC, armed: boolean) {
    if (armed && npc.role !== 'police') { npc.state = 'flee'; npc.timer = 7; return '“Put that away. My insurance is theoretical.”'; }
    npc.state = 'idle'; npc.timer = 2;
    return ['“The roadworks are temporary. Since 2009.”', '“Rooms upstairs. Regrets are complimentary.”', '“Nice shirt. Try not to get it confiscated.”', '“Traffic remains, regrettably, traffic.”'][npc.id % 4];
  }
  alert(position: THREE.Vector3) { this.npcs.forEach(n => { if (n.active && n.health > 0 && n.role !== 'police' && n.position.distanceTo(position) < 20 && n.canSee(position, 22)) { n.state = n.role === 'hostile' || n.state === 'fight' ? 'fight' : 'flee'; n.timer = 8; n.lastKnown.copy(position); } }); }
  witnesses(position: THREE.Vector3) { return this.npcs.some(n => n.active && n.health > 0 && n.canSee(position, 40)); }
  update(dt: number, position: THREE.Vector3, armed: boolean, wanted: number, onAttack: (amount: number, npc: NPC) => void) {
    this.time += dt;
    const nearby = this.npcs.filter(n => n.position.distanceTo(position) < 120).sort((a, b) => Number(b.role === 'police') - Number(a.role === 'police') || a.position.distanceToSquared(position) - b.position.distanceToSquared(position)).slice(0, 22);
    const active = new Set(nearby);
    this.npcs.forEach(n => { n.targetCollider = this.targetCollider; n.setActive(active.has(n)); n.update(dt, position, armed, wanted, onAttack); });
  }
  sync() { this.npcs.forEach(n => n.sync()); }
}
