import * as THREE from 'three';
import { box, cylinder } from './models';
import { compact } from './compact';
import type { WeaponId } from '../systems/inventory';

export function weaponModel(id: WeaponId) {
  const group = new THREE.Group();
  if (id === 'bat' || id === 'pipe') {
    cylinder(group, id === 'bat' ? .055 : .035, .025, 1.1, [0, -.05, 0], id === 'bat' ? '#aa7d43' : '#9baba4');
    cylinder(group, .035, .035, .25, [0, -.5, 0], '#464c40');
  }
  if (id === 'handgun') {
    box(group, [.1, .12, .34], [0, 0, -.15], '#545e57'); box(group, [.08, .21, .11], [0, -.14, -.015], '#41453e');
    box(group, [.04, .04, .025], [0, .08, -.24], '#a5b2a0');
  }
  if (id === 'shotgun') {
    box(group, [.11, .12, .44], [0, 0, .16], '#8f6842');
    cylinder(group, .045, .045, .85, [0, .025, -.45], '#58615a').rotation.x = Math.PI / 2;
    box(group, [.14, .1, .29], [0, -.07, -.34], '#9d7947');
  }
  compact(group); return group;
}
