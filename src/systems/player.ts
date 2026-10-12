import * as THREE from 'three';
import { Input } from './input';
import { Physics, RAPIER } from './physics';
import { rabModel } from '../world/models';
import { SPAWN } from '../world/city';

export class Player {
  model = rabModel();
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  velocity = new THREE.Vector3();
  grounded = false;
  driving = false;
  animationTime = 0;
  position = new THREE.Vector3();
  constructor(scene: THREE.Scene, private physics: Physics) {
    scene.add(this.model.root);
    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(SPAWN.x, SPAWN.y, SPAWN.z));
    this.collider = physics.world.createCollider(RAPIER.ColliderDesc.capsule(.5, .3).setFriction(0), this.body);
    this.controller = physics.world.createCharacterController(.02);
    this.controller.enableAutostep(.3, .2, false); this.controller.enableSnapToGround(.25);
    this.sync();
  }
  reset(position = SPAWN) {
    this.body.setTranslation(position, true); this.body.setNextKinematicTranslation(position);
    this.velocity.set(0, 0, 0); this.driving = false; this.collider.setEnabled(true); this.model.root.visible = true; this.sync();
  }
  update(dt: number, input: Input, yaw: number) {
    if (this.driving) { input.take('Space'); return; }
    const x = Number(input.down('KeyD')) - Number(input.down('KeyA'));
    const z = Number(input.down('KeyS')) - Number(input.down('KeyW'));
    const direction = new THREE.Vector3(x, 0, z).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    const speed = input.down('ShiftLeft') || input.down('ShiftRight') ? 8.5 : 4.5;
    const smoothing = 1 - Math.exp(-14 * dt);
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, direction.x * speed, smoothing);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, direction.z * speed, smoothing);
    if (input.take('Space') && this.grounded) { this.velocity.y = 8; this.grounded = false; }
    this.velocity.y = Math.max(-25, this.velocity.y - 22 * dt);
    this.controller.computeColliderMovement(this.collider, this.velocity.clone().multiplyScalar(dt));
    const movement = this.controller.computedMovement(), p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x + movement.x, y: p.y + movement.y, z: p.z + movement.z });
    this.grounded = this.controller.computedGrounded();
    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0;
    if (direction.lengthSq() > .1) {
      const target = Math.atan2(-direction.x, -direction.z);
      this.model.root.rotation.y += Math.atan2(Math.sin(target - this.model.root.rotation.y), Math.cos(target - this.model.root.rotation.y)) * smoothing;
    }
    const moving = Math.hypot(this.velocity.x, this.velocity.z);
    this.animationTime += dt * moving * 2.1;
    const stride = this.grounded ? Math.sin(this.animationTime) * Math.min(.65, moving * .09) : .15;
    this.model.arms[0].rotation.x = stride; this.model.arms[1].rotation.x = -stride;
    this.model.legs[0].rotation.x = -stride; this.model.legs[1].rotation.x = stride;
    this.model.torso.rotation.z = this.grounded ? Math.sin(this.animationTime / 2) * moving * .002 : .04;
  }
  sync() {
    const p = this.body.translation(); this.position.set(p.x, p.y, p.z);
    this.model.root.position.set(p.x, p.y - .8, p.z);
  }
}
