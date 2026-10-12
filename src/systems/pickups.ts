import * as THREE from 'three';
import { box, cylinder, sign } from '../world/models';

const LOCATIONS = [[7.8, 21], [-9.1, -27], [24, 28], [61, -24], [-24, 65], [71, 70]];
export class Pickups {
  items: { id: number; root: THREE.Group; position: THREE.Vector3; collected: boolean }[] = [];
  time = 0;
  constructor(scene: THREE.Scene) {
    LOCATIONS.forEach(([x, z], id) => {
      const root = new THREE.Group(); root.position.set(x, .3, z); scene.add(root);
      cylinder(root, .085, .12, .48, [0, .33, 0], '#593821');
      cylinder(root, .04, .055, .16, [0, .64, 0], '#604523'); cylinder(root, .044, .044, .045, [0, .74, 0], '#c2a064');
      box(root, [.19, .22, .13], [0, .34, -.055], '#efdfb3');
      sign(root, 'BUCKFAST', .19, .09, [0, .36, -.125], '#efdfb3', '#633c24', 50);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.4, .018, 4, 24), new THREE.MeshBasicMaterial({ color: '#eccc79' })); ring.rotation.x = Math.PI / 2; ring.position.y = -.15; root.add(ring);
      this.items.push({ id, root, position: new THREE.Vector3(x, 0, z), collected: false });
    });
  }
  restore(collected: number[]) { this.items.forEach(item => { item.collected = collected.includes(item.id); item.root.visible = !item.collected; }); }
  nearest(position: THREE.Vector3) { return this.items.find(i => !i.collected && Math.hypot(i.position.x - position.x, i.position.z - position.z) < 1.8); }
  collect(id: number) { const item = this.items[id]; if (!item || item.collected) return false; item.collected = true; item.root.visible = false; return true; }
  update(dt: number) { this.time += dt; this.items.forEach(i => { if (!i.collected) { i.root.position.y = .3 + Math.sin(this.time * 2 + i.id) * .07; i.root.rotation.y += dt * .45; } }); }
  get collected() { return this.items.filter(i => i.collected).map(i => i.id); }
}
