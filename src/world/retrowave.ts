import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuildingAnchor } from './city';

/** Dusk sky and shopfront neon; decorative geometry never changes collision. */
export class RetrowaveCity {
  private sky=new THREE.Group();
  private bulbs:{position:THREE.Vector3;colour:THREE.Color}[]=[];
  private lights:THREE.PointLight[]=[];
  private materials=[0x42ecff,0xff43aa].map(colour=>new THREE.MeshStandardMaterial({color:colour,emissive:colour,emissiveIntensity:2,roughness:.3,metalness:.25}));
  constructor(scene:THREE.Scene,anchors:BuildingAnchor[],software:boolean){
    const sky=new THREE.Mesh(new THREE.SphereGeometry(245,24,12),new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,
      vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`varying vec3 direction;void main(){float h=normalize(direction).y;
       vec3 horizon=vec3(.44,.13,.32),top=vec3(.035,.025,.13),ground=vec3(.08,.035,.13);
       vec3 sky=mix(horizon,top,smoothstep(0.,.7,max(h,0.)));
       sky=mix(sky,ground,smoothstep(0.,.18,max(-h,0.)));
       gl_FragColor=vec4(sky,1.);
       #include <tonemapping_fragment>
       #include <colorspace_fragment>
       }`
    }));sky.renderOrder=-10;sky.frustumCulled=false;this.sky.add(sky);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const ctx=canvas.getContext('2d')!,gradient=ctx.createLinearGradient(0,0,0,512);
    gradient.addColorStop(0,'#ffe1a3');gradient.addColorStop(.42,'#ff934f');gradient.addColorStop(1,'#ff237f');
    ctx.beginPath();ctx.arc(256,256,247,0,Math.PI*2);ctx.clip();ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
    for(let y=268;y<512;y+=32)ctx.clearRect(0,y,512,6+(y-268)*.055);
    const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,fog:false,toneMapped:false}));
    sun.position.set(-58,37,-186);sun.scale.set(54,54,1);sun.renderOrder=-9;this.sky.add(sun);scene.add(this.sky);
    const batches:THREE.BufferGeometry[][]=[[],[]];
    anchors.forEach((a,i)=>{
      if(i%3!==0)return;
      const kind=i%2,front=a.front*(a.depth/2+.18),width=Math.min(4,a.width*.62),height=Math.min(2.75,a.height-.18);
      const strip=(w:number,h:number,x:number,y:number)=>{
        const geometry=new THREE.BoxGeometry(w,h,.065),matrix=new THREE.Matrix4().makeRotationY(a.yaw);
        const position=new THREE.Vector3(x,y,front).applyAxisAngle(THREE.Object3D.DEFAULT_UP,a.yaw).add(new THREE.Vector3(a.x,0,a.z));
        matrix.setPosition(position);geometry.applyMatrix4(matrix);batches[kind].push(geometry);
      };
      strip(width,.045,0,height);strip(width,.045,0,height-.65);strip(.045,.65,-width/2,height-.325);strip(.045,.65,width/2,height-.325);
      this.bulbs.push({position:new THREE.Vector3(0,height-.5,a.front*(a.depth/2+.6)).applyAxisAngle(THREE.Object3D.DEFAULT_UP,a.yaw).add(new THREE.Vector3(a.x,0,a.z)),colour:this.materials[kind].color});
    });
    batches.forEach((geometries,i)=>{const geometry=mergeGeometries(geometries,false);if(geometry)scene.add(new THREE.Mesh(geometry,this.materials[i]));geometries.forEach(g=>g.dispose());});
    // A fixed pool of four nearby lights keeps shader and draw costs bounded.
    if(!software)for(let i=0;i<4;i++){const light=new THREE.PointLight(0xffffff,7,15,1.3);scene.add(light);this.lights.push(light);}
  }
  update(camera:THREE.Camera,position:THREE.Vector3,beat:number,intensity:number){
    this.sky.position.copy(camera.position);
    const pulse=(1+Math.cos(beat*Math.PI*2))*.5;
    this.materials.forEach(material=>material.emissiveIntensity=2+intensity*.3+pulse*.06);
    if(this.lights.length){
      const nearby=this.bulbs.map(b=>({b,d:b.position.distanceToSquared(position)})).sort((a,b)=>a.d-b.d);
      this.lights.forEach((light,i)=>{const entry=nearby[i];light.intensity=entry&&entry.d<45*45?7+intensity*2:0;if(entry){light.position.copy(entry.b.position);light.color.copy(entry.b.colour);}});
    }
  }
}
