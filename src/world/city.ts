import * as THREE from 'three';
import { box, cylinder, sign, material } from './models';
import { Physics } from '../systems/physics';

export const ROAD_CENTRES = [-192, -144, -96, -48, 0, 48, 96, 144, 192];
export const BLOCK_CENTRES = [-168, -120, -72, -24, 24, 72, 120, 168];
export const WORLD_SIZE = 432;
export function districtAt(x: number, z: number) {
  return x > 96 && z < 0 ? 'Industrial District' : x < -96 && z < 96 ? 'Downtown' : z > 96 ? 'Outskirts' : z < -96 ? 'Residential' : 'Old City';
}
export const SPAWN = new THREE.Vector3(4.9, .84, 15);
export const SAFEHOUSE = new THREE.Vector3(8.8, 0, 31);
const colours = ['#ba7959', '#ddc098', '#7d9a92', '#cc955b', '#aaba97', '#bd7468', '#75909e'];
const shops = ['NIMBU & CO. • FRESH JUICE', 'CHAI, ACTUALLY', 'SUNDAR STORES', 'SECOND CHANCE MOTORS', 'FIX IT TOMORROW', 'PATEL ELECTRICALS', 'ROOMS • NO QUESTIONS', 'THE DAILY DOSA'];
export class City {
  root = new THREE.Group();
  constructor(scene: THREE.Scene, private physics: Physics) {
    scene.add(this.root);
    box(this.root, [WORLD_SIZE, .12, WORLD_SIZE], [0, -.06, 0], '#b2a178');
    for (const a of ROAD_CENTRES) {
      box(this.root, [12, .018, 428], [a, .01, 0], '#565d58');
      box(this.root, [428, .018, 12], [0, .014, a], '#565d58');
      for (const side of [-1, 1]) {
        box(this.root, [2.5, .12, 428], [a + side * 7.25, .045, 0], '#c6b698');
        box(this.root, [428, .12, 2.5], [0, .045, a + side * 7.25], '#c6b698');
      }
      for (let p = -210; p < 216; p += 6) {
        if (ROAD_CENTRES.some(v => Math.abs(v - p) < 8)) continue;
        box(this.root, [.12, .015, 2.5], [a, .03, p], '#dfcfa0');
        box(this.root, [2.5, .015, .12], [p, .035, a], '#dfcfa0');
      }
    }
    let index = 64;
    // Outer districts retain the original Old City rather than scaling its geometry.
    for (const x of BLOCK_CENTRES) for (const z of BLOCK_CENTRES) {
      if (Math.abs(x) < 96 && Math.abs(z) < 96) continue;
      const district = districtAt(x, z);
      if (district === 'Industrial District') {
        this.warehouse(x - 8, z, index++, physics);
        for (let n = 0; n < 3; n++) {
          box(this.root, [5, 2.8, 2.5], [x + 10, 1.4, z - 10 + n * 4], n % 2 ? '#7b8a78' : '#ae754b');
          physics.fixedBox(new THREE.Vector3(x + 10, 1.4, z - 10 + n * 4), new THREE.Vector3(2.5, 1.4, 1.25));
        }
      } else if (district === 'Outskirts') {
        this.building(x - 10, z + 7, 11, 8, 5, -Math.PI / 2, index++, physics);
        sign(this.root, 'LAST CHANCE DHABA', 5, .8, [x - 14.1, 3.7, z + 7], '#7c633f').rotation.y = -Math.PI / 2;
        box(this.root, [5, .02, 32], [x + 5, .1, z], '#bc9f6d');
        for (const dz of [-13, 0, 13]) this.tree(x + 10, z + dz, 1.4);
      } else {
        for (const side of [-1, 1]) for (const offset of [-7, 7]) {
          const height = district === 'Downtown' ? 17 + index % 3 * 4 : 5 + index % 2 * 3;
          this.building(x + side * 10, z + offset, 11, 8, height, side === -1 ? -Math.PI / 2 : Math.PI / 2, index++, physics);
        }
        this.tree(x, z);
      }
    }
    for (const [x, z, text] of [[-96, -48, 'DOWNTOWN'], [96, -48, 'FREIGHT & INDUSTRY'], [0, 96, 'OUTSKIRTS'], [0, -96, 'RESIDENTIAL']] as const) {
      sign(this.root, text, 7, 1.1, [x + 8, 4.3, z], '#385a50').rotation.y = -Math.PI / 2;
      cylinder(this.root, .08, .08, 4, [x + 8, 2, z], '#52594b');
    }
    // Downtown flyover landmark follows a road, with all supports outside the carriageway.
    box(this.root, [12, .55, 132], [-144, 6, 0], '#8c8c78');
    physics.fixedBox(new THREE.Vector3(-144,6,0),new THREE.Vector3(6,.275,66));
    for (const x of [-150.5, -137.5]) for (const z of [-60, -30, 0, 30, 60]) {
      box(this.root, [.9, 6, .9], [x, 3, z], '#9d9b84');
      physics.fixedBox(new THREE.Vector3(x, 3, z), new THREE.Vector3(.45, 3, .45));
    }
    // Pavement crossings: leave the ordinary roads free of collision geometry.
    for (const x of [-48, 0, 48]) for (const z of [-48, 0, 48]) {
      for (let i = 0; i < 7; i++) {
        box(this.root, [.7, .016, 2.2], [x - 4.5 + i * 1.4, .04, z + 8.5], '#e2d7b4');
        box(this.root, [2.2, .016, .7], [x + 8.5, .04, z - 4.5 + i * 1.4], '#e2d7b4');
      }
    }
    index = 0;
    for (const x of [-72, -24, 24, 72]) for (const z of [-72, -24, 24, 72]) {
      for (const side of [-1, 1]) for (const offset of [-7, 7]) {
        const h = x < 0 ? 11 + index % 4 * 2.8 : 7 + index % 3 * 2.5;
        this.building(x + side * 10, z + offset, 11, 8, h, side === -1 ? -Math.PI / 2 : Math.PI / 2, index++, physics);
      }
      // A courtyard with a shade tree, accessed through gaps between buildings.
      this.tree(x, z, 1.2);
    }
    // A characteristic bazaar running along the central road.
    for (const z of [-34, -19, 26, 38, 60]) this.stall(-7.5, z, z % 3 === 0 ? '#b65b3f' : '#d6a54c');
    for (const z of [-37, -12, 23, 39, 66]) this.lamp(7.9, z);
    for (const z of [-36, -10, 26, 58]) this.lamp(-8, z);
    for (const z of [11, 32, -18]) this.scooter(-7.2, z);
    this.rickshaw(55.5, 42);
    this.gateway(0, -44);
    this.railway();
    // Overhead utility cables and poles along the old-city promenade.
    for (const side of [-1, 1]) for (let z = -78; z < 80; z += 20) {
      const x = side * 8.4;
      cylinder(this.root, .08, .12, 7, [x, 3.5, z], '#635849');
      box(this.root, [1.2, .09, .09], [x, 6.7, z], '#3e453f');
      for (const o of [-.4, .4]) {
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x + o, 6.7, z), new THREE.Vector3(x + o, 5.2, z + 10), new THREE.Vector3(x + o, 6.7, z + 20));
        const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(14)), new THREE.LineBasicMaterial({ color: '#343c39' })); this.root.add(cable);
      }
    }
    // Soft map edges are visible: walls rather than invisible road obstacles.
    for (const side of [-1, 1]) {
      box(this.root, [432, 1.8, .7], [0, .9, side * 215], '#a18567');
      box(this.root, [.7, 1.8, 432], [side * 215, .9, 0], '#a18567');
      physics.fixedBox(new THREE.Vector3(0, .9, side * 215), new THREE.Vector3(216, .9, .35));
      physics.fixedBox(new THREE.Vector3(side * 215, .9, 0), new THREE.Vector3(.35, .9, 216));
    }
    // Original mountains frame the city skyline.
    for (let i = 0; i < 22; i++) {
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(24 + i % 4 * 7, 18 + i % 3 * 13, 4), material('#a59f86'));
      const angle = i / 22 * Math.PI * 2; mountain.position.set(Math.cos(angle) * 315, 3, Math.sin(angle) * 315); mountain.rotation.y = i; this.root.add(mountain);
    }
  }
  warehouse(x: number, z: number, i: number, physics: Physics) {
    const g = new THREE.Group(); g.position.set(x, 0, z); this.root.add(g);
    box(g, [14, 7, 27], [0, 3.5, 0], i % 2 ? '#918a72' : '#ab8164');
    box(g, [14.5, .4, 27.5], [0, 7.2, 0], '#5f7066');
    for (let dz = -10; dz < 12; dz += 5) box(g, [.04, 3.8, 2.9], [-7.04, 2.3, dz], '#525e56');
    sign(g, 'FREIGHT • NOTHING TO DECLARE', 11, 1, [0, 5.8, 13.6], '#485d50', '#efe2bd', 30);
    cylinder(g, .8, .95, 12, [3, 6, -8], '#7e7865');
    physics.fixedBox(new THREE.Vector3(x, 3.5, z), new THREE.Vector3(7, 3.5, 13.5));
  }
  building(x: number, z: number, w: number, d: number, h: number, angle: number, i: number, physics: Physics) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = angle; this.root.add(g);
    box(g, [w, h, d], [0, h / 2, 0], colours[i % colours.length]);
    box(g, [w + .25, .28, d + .3], [0, h, 0], '#e5d2ad');
    box(g, [w + .05, .7, d + .04], [0, .35, 0], '#88755f');
    for (let y = 4.3; y < h - 1; y += 2.7) for (const bx of [-3.7, 0, 3.7]) {
      box(g, [1.15, 1.55, .08], [bx, y, d / 2 + .05], '#3b5352');
      box(g, [1.28, .12, .18], [bx, y + .8, d / 2 + .1], '#ebd6b1');
      box(g, [.08, 1.5, .1], [bx, y, d / 2 + .12], '#b4a582');
      box(g, [1.9, .14, .8], [bx, y - .7, d / 2 + .4], '#a38d70');
      for (const dx of [-.8, -.4, 0, .4, .8]) box(g, [.045, .65, .045], [bx + dx, y - .3, d / 2 + .75], '#526259');
      box(g, [1.8, .045, .045], [bx, y + .03, d / 2 + .75], '#526259');
    }
    const shopColour = ['#33796f', '#944c3f', '#a17f2e', '#355b68'][i % 4];
    sign(g, shops[i % shops.length], w - .5, .85, [0, 2.95, d / 2 + .13], shopColour, '#fff1cf', 31);
    for (const bx of [-3.45, 0, 3.45]) {
      box(g, [3.06, 2.1, .09], [bx, 1.35, d / 2 + .05], i % 4 === 0 ? '#46564c' : '#718174');
      for (let y = .5; y < 2.3; y += .23) box(g, [2.98, .026, .04], [bx, y, d / 2 + .12], '#b0ad90');
    }
    for (let a = 0; a < 12; a++) {
      const awning = box(g, [(w + .1) / 12, .06, 1.2], [-w / 2 + w / 24 + a * w / 12, 2.47, d / 2 + .55], a % 2 ? '#efe1b3' : shopColour);
      awning.rotation.x = .15;
    }
    cylinder(g, .63, .64, 1.2, [2.7, h + .7, -1.7], '#44514b');
    box(g, [.65, .45, .55], [-2.7, h + .23, 1.8], '#c4bea4');
    if (i % 3 === 0) {
      for (let t = 0; t < 4; t++) box(g, [.44, .72, .03], [-2 + t * .7, 5.2, d / 2 + 1.1], ['#c97448', '#dfd4b0', '#54857c', '#86789c'][t]);
    }
    physics.fixedBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(d / 2, h / 2, w / 2));
    if (i === 32) sign(g, 'NO REFUNDS ON LIFE CHOICES', w - .6, .5, [0, 3.65, d / 2 + .14], '#243e3c', '#ead5ad', 28);
  }
  stall(x: number, z: number, colour: string) {
    const g = new THREE.Group(); g.position.set(x, 0, z); this.root.add(g);
    box(g, [1.6, .8, 1.9], [0, .45, 0], '#80664b'); box(g, [1.8, .13, 2.1], [0, .9, 0], '#d9b17a');
    for (const a of [-.8, .8]) for (const b of [-.9, .9]) cylinder(g, .025, .025, 2.3, [a, 1.2, b], '#7d7460');
    box(g, [2.05, .12, 2.35], [0, 2.4, 0], colour);
    for (let i = 0; i < 12; i++) cylinder(g, .11, .14, .18, [-.58 + i % 4 * .36, 1.05, -.65 + Math.floor(i / 4) * .46], i % 2 ? '#dba537' : '#839446');
    sign(g, 'CHAI • ₹10', 1.5, .43, [0, 1.75, 1.19], '#7a4b35');
    this.physics.fixedBox(new THREE.Vector3(x, .6, z), new THREE.Vector3(.85, .6, 1));
  }
  tree(x: number, z: number, scale = 1) {
    cylinder(this.root, .14, .24, 3 * scale, [x, 1.5 * scale, z], '#6e6650');
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry((1.5 - i * .18) * scale, 0), material(i % 2 ? '#7a9062' : '#627b54'));
      leaf.position.set(x + (i - 1) * .6, (3.4 + i * .5) * scale, z); leaf.castShadow = true; this.root.add(leaf);
    }
    box(this.root, [2.6 * scale, .35, 2.6 * scale], [x, .17, z], '#bcab88');
    this.physics.fixedBox(new THREE.Vector3(x, 1.5 * scale, z), new THREE.Vector3(.22, 1.5 * scale, .22));
  }
  lamp(x: number, z: number) {
    cylinder(this.root, .07, .11, 5.2, [x, 2.6, z], '#475951');
    box(this.root, [.75, .09, .09], [x - .3 * Math.sign(x), 5.15, z], '#475951');
    box(this.root, [.6, .13, .24], [x - .6 * Math.sign(x), 5.12, z], '#e5c887');
  }
  scooter(x: number, z: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = .4; this.root.add(g);
    for (const dz of [-.58, .58]) { const m = cylinder(g, .24, .24, .15, [0, .26, dz], '#293c35', 10); m.rotation.z = Math.PI / 2; }
    box(g, [.45, .27, .9], [0, .47, .12], '#779f9c'); box(g, [.4, .13, .64], [0, .73, .22], '#313d38');
    box(g, [.35, .8, .15], [0, .73, -.48], '#91b8ac'); box(g, [.65, .065, .1], [0, 1.16, -.47], '#454c42');
    this.physics.fixedBox(new THREE.Vector3(x, .55, z), new THREE.Vector3(.35, .55, .8));
  }
  rickshaw(x: number, z: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z); this.root.add(g);
    box(g, [1.4, .48, 2.15], [0, .63, 0], '#4f8760'); box(g, [1.5, .23, 1.85], [0, 1.78, .17], '#d1a342');
    box(g, [1.45, .75, .15], [0, 1.32, -.89], '#d1a342'); box(g, [1.15, .43, .025], [0, 1.4, -.98], '#416c6b');
    for (const x of [-.65, .65]) for (const z of [-.64, .76]) cylinder(g, .035, .035, 1.1, [x, 1.23, z], '#444d41');
    for (const x of [-.68, .68]) { const wheel = cylinder(g, .28, .28, .17, [x, .31, .65], '#2b3730'); wheel.rotation.z = Math.PI / 2; }
    const front = cylinder(g, .28, .28, .17, [0, .31, -.93], '#2b3730'); front.rotation.z = Math.PI / 2;
    this.physics.fixedBox(new THREE.Vector3(x, .9, z), new THREE.Vector3(.75, .9, 1.1));
  }
  gateway(x: number, z: number) {
    for (const s of [-1, 1]) {
      box(this.root, [1.4, 7, 1.5], [x + s * 9.1, 3.5, z], '#b77d54');
      box(this.root, [2.2, .6, 2.2], [x + s * 9.1, 7.1, z], '#cfaa79');
      this.physics.fixedBox(new THREE.Vector3(x + s * 9.1, 3.5, z), new THREE.Vector3(.7, 3.5, .75));
    }
    box(this.root, [19, 1.4, 1.2], [x, 6.3, z], '#b98058');
    sign(this.root, 'SUNDARPUR • OLD CITY', 13.5, 1, [x, 6.3, z + .63], '#b98058', '#f3dbab');
  }
  railway() {
    box(this.root, [205, .6, 4.2], [0, 6, 82], '#897965');
    for (let x = -90; x < 100; x += 24) {
      box(this.root, [1.9, 6, 2.5], [x, 3, 82], '#a59376');
      this.physics.fixedBox(new THREE.Vector3(x, 3, 82), new THREE.Vector3(.95, 3, 1.25));
    }
    for (const z of [80.7, 83.3]) box(this.root, [205, .1, .14], [0, 6.4, z], '#404b45');
    for (let x = -100; x < 100; x += 1.5) box(this.root, [.2, .12, 3.4], [x, 6.31, 82], '#73604c');
    for (let i = 0; i < 5; i++) {
      box(this.root, [8.2, 2.1, 2.7], [-66 + i * 9.2, 7.65, 82], i === 0 ? '#4f7979' : '#a66b43');
      box(this.root, [8.4, .22, 2.9], [-66 + i * 9.2, 8.8, 82], '#cfba8c');
      for (let j = 0; j < 4; j++) box(this.root, [.9, .65, .035], [-69 + i * 9.2 + j * 1.6, 8, 83.37], '#3b5552');
    }
  }
}
