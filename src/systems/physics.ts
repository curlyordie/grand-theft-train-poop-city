import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class Physics {
  world: RAPIER.World;
  ground: RAPIER.Collider;
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -22, z: 0 });
    this.ground = this.fixedBox(new THREE.Vector3(0, -.5, 0), new THREE.Vector3(216, .5, 216));
  }
  fixedBox(position: THREE.Vector3, half: THREE.Vector3) {
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(position.x, position.y, position.z));
  }
  blocked(position: THREE.Vector3, rotation: RAPIER.Rotation, shape: RAPIER.Shape, exclude: RAPIER.Collider) {
    return this.world.intersectionWithShape(position, rotation, shape, undefined, undefined, exclude, exclude.parent() ?? undefined,
      c => c.handle !== this.ground.handle) !== null;
  }
  lineDistance(from: THREE.Vector3, direction: THREE.Vector3, distance: number, exclude?: RAPIER.RigidBody) {
    const hit = this.world.castRay(new RAPIER.Ray(from, direction), distance, true, undefined, undefined, undefined, exclude);
    return hit ? hit.timeOfImpact : distance;
  }
  step() { this.world.timestep = 1 / 60; this.world.step(); }
}
export { RAPIER };
