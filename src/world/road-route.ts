import * as THREE from 'three';
import { ROAD_CENTRES } from './city';

const nearest=(value:number)=>ROAD_CENTRES.reduce((best,n)=>Math.abs(n-value)<Math.abs(best-value)?n:best);
/** Manhattan routes use the same intersections as world generation, never building centres. */
export function roadRoute(from:THREE.Vector3,to:THREE.Vector3){
  let x=nearest(from.x),z=nearest(from.z);const tx=nearest(to.x),tz=nearest(to.z),points:THREE.Vector3[]=[];
  const point=()=>new THREE.Vector3(x+2.5,0,z+2.5);
  if(Math.abs(from.x-x)>Math.abs(from.z-z))points.push(new THREE.Vector3(x+2.5,0,from.z));
  else points.push(new THREE.Vector3(from.x,0,z+2.5));
  points.push(point());
  while(x!==tx){x+=Math.sign(tx-x)*48;points.push(point());}
  while(z!==tz){z+=Math.sign(tz-z)*48;points.push(point());}
  points.push(Math.abs(to.x-tx)<Math.abs(to.z-tz)?new THREE.Vector3(tx+2.5,0,to.z):new THREE.Vector3(to.x,0,tz+2.5));
  return points.filter(p=>p.distanceTo(from)>3);
}
