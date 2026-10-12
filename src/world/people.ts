import * as THREE from 'three';
import { humanModel } from './assets';
import { box, ellipsoid, limb } from './models';
import { compact } from './compact';

export function personModel(index: number, police = false) {
  return humanModel(index,false,police);
}
function legacyPersonModel(index:number,police=false){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = ['#bc8c63', '#93674b', '#d2ab81', '#a57855'][index % 4];
  const shirt = police ? '#af9869' : ['#d3995c', '#8dabc0', '#ad5f56', '#d4c99d', '#737fa3', '#6e9c83'][index % 6];
  box(body, [.5, .6, .29], [0, 1.15, 0], shirt);
  ellipsoid(body, [.36, .43, .34], [0, 1.7, 0], skin);
  box(body, [.38, .1, .34], [0, 1.94, .01], police ? '#af9869' : '#373631');
  for (const x of [-.085, .085]) box(body, [.035, .035, .012], [x, 1.76, -.168], '#302b24');
  box(body, [.075, .07, .05], [0, 1.67, -.175], skin);
  if (police) { box(body, [.1, .1, .02], [-.14, 1.35, -.155], '#e4c371'); box(body, [.3, .03, .14], [0, 1.88, -.2], '#aa9567'); }
  compact(body);
  const arms: THREE.Group[] = [], legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .33, 1.4, 0); root.add(arm);
    box(arm, [.16, .25, .2], [0, -.13, 0], shirt); limb(arm, [.14, .34, .17], [0, -.4, 0], skin); compact(arm); arms.push(arm);
    const leg = new THREE.Group(); leg.position.set(side * .13, .84, 0); root.add(leg);
    limb(leg, [.2, .65, .24], [0, -.32, 0], police ? '#a18b60' : '#4a4c45');
    box(leg, [.21, .14, .33], [0, -.75, -.04], '#3f4139'); compact(leg); legs.push(leg);
  }
  return { root, arms, legs };
}
