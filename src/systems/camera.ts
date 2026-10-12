import * as THREE from 'three';
import { Input } from './input';
import { Physics, RAPIER } from './physics';

export class FollowCamera {
  yaw = .12;
  pitch = .3;
  sensitivity = 1;
  target = new THREE.Vector3();
  wasAiming = false;
  lookIdle = 0;
  constructor(public camera: THREE.PerspectiveCamera, private physics: Physics) {}
  reset(position: THREE.Vector3) { this.yaw = .12; this.pitch = .3; this.target.copy(position).y += .7; this.camera.position.copy(position).add(new THREE.Vector3(1, 3.8, 9)); }
  update(dt: number, input: Input, position: THREE.Vector3, driving: boolean, body: RAPIER.RigidBody, vehicleYaw: number, aiming = false, drivingHeight = 1.15) {
    this.lookIdle = Math.abs(input.mouseX) + Math.abs(input.mouseY) > 0 ? 0 : this.lookIdle + dt;
    this.yaw -= input.mouseX * .0024 * this.sensitivity;
    if (aiming && !this.wasAiming) this.pitch = Math.min(this.pitch, .1);
    this.wasAiming = aiming;
    this.pitch = THREE.MathUtils.clamp(this.pitch + input.mouseY * .0024 * this.sensitivity, -.18, 1.04);
    if (driving && this.lookIdle > 2 && !input.down('KeyC')) {
      this.yaw += Math.atan2(Math.sin(vehicleYaw - this.yaw), Math.cos(vehicleYaw - this.yaw)) * (1 - Math.exp(-dt * 1.5));
    }
    input.mouseX = input.mouseY = 0;
    const desiredTarget = position.clone(); desiredTarget.y += driving ? drivingHeight : aiming ? .95 : .7;
    if (aiming) desiredTarget.add(new THREE.Vector3(Math.cos(this.yaw) * .5, 0, -Math.sin(this.yaw) * .5));
    this.target.lerp(desiredTarget, 1 - Math.exp(-dt * 12));
    const radius = driving ? 10 : aiming ? 4.5 : 7;
    const direction = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    // A bundle of rays gives the camera a small collision volume, including near-plane clearance.
    const side = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let distance = radius;
    for (const offset of [-.22, 0, .22]) {
      const origin = this.target.clone().addScaledVector(side, offset);
      distance = Math.min(distance, this.physics.lineDistance(origin, direction, radius, body) - .3);
    }
    const desired = this.target.clone().addScaledVector(direction, Math.max(.55, distance));
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 14));
    // Clamp after smoothing: smoothing alone can leave a camera inside a wall during a sharp orbit.
    const actual = this.camera.position.clone().sub(this.target), length = actual.length();
    const clear = this.physics.lineDistance(this.target, actual.normalize(), length, body) - .25;
    if (clear < length) this.camera.position.copy(this.target).addScaledVector(actual, Math.max(.5, clear));
    this.camera.lookAt(this.target);
  }
}
