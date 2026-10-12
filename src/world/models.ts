import * as THREE from 'three';
import { humanModel } from './assets';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const materials = new Map<string, THREE.MeshStandardMaterial>();
const geometries = new Map<string, THREE.BufferGeometry>();
export function material(colour: string | number, roughness = .85) {
  const key = `${colour}:${roughness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color: colour, roughness, flatShading: false }));
  return materials.get(key)!;
}
export function box(parent: THREE.Object3D, size: number[], position: number[], colour: string | number) {
  const key = size.join(',');
  if (!geometries.has(key)) geometries.set(key, (Math.min(...size)>.18 && Math.max(...size)<5 ? new RoundedBoxGeometry(...size as [number,number,number],1,Math.min(...size)*.2) : new THREE.BoxGeometry(...size as [number, number, number])));
  const mesh = new THREE.Mesh(geometries.get(key), material(colour));
  mesh.position.set(...position as [number, number, number]);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function cylinder(parent: THREE.Object3D, top: number, bottom: number, height: number, pos: number[], colour: string | number, sides = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material(colour));
  mesh.position.set(...pos as [number, number, number]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function ellipsoid(parent:THREE.Object3D,size:number[],position:number[],colour:string|number){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),material(colour));
  mesh.scale.set(size[0]/2,size[1]/2,size[2]/2);mesh.position.set(...position as [number,number,number]);mesh.castShadow=true;parent.add(mesh);return mesh;
}
export function limb(parent:THREE.Object3D,size:number[],position:number[],colour:string|number){
  const radius=Math.min(size[0],size[2])/2;
  const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.01,size[1]-radius*2),4,12),material(colour));
  mesh.position.set(...position as [number,number,number]);mesh.castShadow=true;parent.add(mesh);return mesh;
}
export function sign(parent: THREE.Object3D, text: string, width: number, height: number, pos: number[], bg: string, fg = '#fff2d4', size = 40) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const c = canvas.getContext('2d')!; c.fillStyle = bg; c.fillRect(0, 0, 512, 128);
  c.strokeStyle = fg; c.lineWidth = 3; c.strokeRect(9, 9, 494, 110);
  c.fillStyle = fg; c.font = `bold ${size}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 66, 474);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  mesh.position.set(...pos as [number, number, number]); parent.add(mesh); return mesh;
}

export function rabModel() {return humanModel(0,true);}
function legacyRabModel() {
  const root = new THREE.Group();
  const hips = box(root, [.44, .22, .27], [0, .81, 0], '#2b3031');
  const torso = new THREE.Group(); torso.position.y = .92; root.add(torso);
  for (let i = 0; i < 6; i++) box(torso, [.54 - i * .008, .09, .3], [0, i * .09, 0], i % 2 ? '#f2f0da' : '#16754d');
  box(torso, [.17, .035, .01], [-.13, .385, -.157], '#dca85b'); // original shirt detail; no official crest
  cylinder(root, .1, .1, .11, [0, 1.49, 0], '#dbaa7f');
  ellipsoid(root, [.35, .4, .33], [0, 1.71, 0], '#daa881');
  ellipsoid(root, [.36, .19, .34], [0, 1.89, .015], '#9e4f23');
  box(root, [.07, .23, .31], [-.16, 1.82, .035], '#ad5a26');
  box(root, [.32, .25, .07], [0, 1.77, .16], '#a85425');
  box(root, [.29, .065, .045], [0, 1.57, -.154], '#ad693e');
  for (const x of [-.085, .085]) {
    box(root, [.056, .024, .018], [x, 1.75, -.165], '#3f3833');
    box(root, [.08, .02, .028], [x, 1.79, -.165], '#a45a28');
  }
  box(root, [.07, .075, .06], [0, 1.67, -.18], '#c58f68');
  const arms: THREE.Group[] = [], legs: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * .34, 1.4, 0); root.add(arm);
    box(arm, [.17, .18, .24], [0, -.08, 0], '#16754d');
    box(arm, [.17, .08, .24], [0, -.17, 0], '#f2f0da');
    limb(arm, [.14, .35, .17], [0, -.36, 0], '#d5a27c'); arms.push(arm);
    const leg = new THREE.Group(); leg.position.set(s * .13, .8, 0); root.add(leg);
    limb(leg, [.2, .63, .23], [0, -.32, 0], '#2a3031');
    box(leg, [.045, .2, .24], [s * .09, -.2, 0], '#3b4140');
    box(leg, [.21, .13, .36], [0, -.69, -.06], '#bab6a5');
    box(leg, [.22, .035, .37], [0, -.75, -.06], '#5d6260'); legs.push(leg);
  }
  return { root, hips, arms, legs, torso };
}

export function carModel(colour = '#e87637') {
  const root = new THREE.Group();
  box(root, [1.72, .48, 3.3], [0, .7, 0], colour);
  const cabin=box(root, [1.5, .58, 1.65], [0, 1.18, .16], colour);
  cabin.geometry=cabin.geometry.clone();const vertices=cabin.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){const y=vertices.getY(i);if(y>0){vertices.setX(i,vertices.getX(i)*.87);vertices.setZ(i,vertices.getZ(i)*.78);}}
  cabin.geometry.computeVertexNormals();
  box(root, [1.39, .4, .04], [0, 1.21, -.685], '#294952').rotation.x=.24;
  box(root, [1.39, .4, .04], [0, 1.21, 1], '#294952').rotation.x=-.24;
  for (const x of [-.77, .77]) {
    box(root, [.02, .38, .64], [x, 1.21, -.26], '#304f56');
    box(root, [.02, .38, .59], [x, 1.21, .49], '#304f56');
    box(root, [.04, .6, .07], [x, 1.17, .13], colour);
    box(root, [.08, .05, .22], [x * 1.14, .9, .38], '#d8d3b9');
    box(root, [.16, .1, .23], [x * 1.17, 1.08, -.65], colour);
  }
  const wheels: THREE.Mesh[] = [];
  for (const x of [-.87, .87]) for (const z of [-1.04, 1.08]) {
    const wheel = cylinder(root, .33, .33, .2, [x, .37, z], '#252c2c', 24); wheel.rotation.z = Math.PI / 2; wheels.push(wheel);
    const hub = cylinder(root, .17, .17, .215, [x, .37, z], '#aab0a5', 8); hub.rotation.z = Math.PI / 2;
  }
  for (const x of [-.59, .59]) {
    box(root, [.35, .17, .05], [x, .76, -1.675], '#fff0b3');
    box(root, [.32, .15, .05], [x, .77, 1.675], '#bb3834');
  }
  box(root, [1.72, .16, .12], [0, .48, -1.65], '#c4c5b1');
  box(root, [1.72, .16, .12], [0, .48, 1.65], '#c4c5b1');
  box(root, [.74, .18, .025], [0, .64, -1.686], '#283334');
  sign(root, 'SP 04 • RAB', .54, .13, [0, .58, 1.72], '#eee4c9', '#303535', 36);
  return { root, wheels };
}
