import * as THREE from 'three';

interface Particle { active:boolean; life:number; position:THREE.Vector3; velocity:THREE.Vector3; scale:number; }
export class Effects {
  particles:Particle[] = Array.from({length:96},()=>({active:false,life:0,position:new THREE.Vector3(),velocity:new THREE.Vector3(),scale:.05}));
  mesh:THREE.InstancedMesh; dummy = new THREE.Object3D(); cursor=0; activeCount=0;
  tracers:{mesh:THREE.Mesh;life:number}[]=[];
  constructor(scene:THREE.Scene){this.mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#a93a2c'}),96);this.mesh.frustumCulled=false;scene.add(this.mesh);this.update(0);for(let i=0;i<10;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.012,.012,1),new THREE.MeshBasicMaterial({color:'#ffda83'}));mesh.visible=false;scene.add(mesh);this.tracers.push({mesh,life:0});}}
  blood(position:THREE.Vector3,direction:THREE.Vector3,heavy=false){for(let i=0;i<(heavy?14:7);i++){const p=this.particles[this.cursor++%96];p.active=true;p.life=.4+Math.random()*.3;p.position.copy(position);p.velocity.copy(direction).multiplyScalar(1.2).add(new THREE.Vector3((Math.random()-.5)*2,Math.random()*2+.5,(Math.random()-.5)*2));p.scale=.035+Math.random()*.055;}}
  tracer(from:THREE.Vector3,to:THREE.Vector3){const item=this.tracers.find(t=>t.life<=0)??this.tracers[0];item.life=.08;item.mesh.visible=true;item.mesh.position.copy(from).add(to).multiplyScalar(.5);item.mesh.scale.z=from.distanceTo(to);item.mesh.lookAt(to);}
  update(dt:number){this.activeCount=0;this.particles.forEach((p,i)=>{if(p.active){p.life-=dt;p.velocity.y-=8*dt;p.position.addScaledVector(p.velocity,dt);if(p.life<=0||p.position.y<.05)p.active=false;}this.dummy.position.copy(p.position);this.dummy.scale.setScalar(p.active?p.scale:0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);if(p.active)this.activeCount++;});this.mesh.instanceMatrix.needsUpdate=true;this.tracers.forEach(t=>{t.life-=dt;t.mesh.visible=t.life>0;});}
}
