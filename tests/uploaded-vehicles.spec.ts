import { test, expect } from '@playwright/test';
test.use({viewport:{width:720,height:400},trace:'off'});
test('uploaded vehicles keep proportions, park in clear varied streets and drive safely over paving',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];
 const failure=new Promise<never>((_,reject)=>page.on('pageerror',error=>{errors.push(error.message);reject(error);}));
 await page.route('**/vehicle-lab',route=>route.fulfill({contentType:'text/html',body:`
 <style>body{margin:0}canvas{display:block}</style><script type="module">
 import * as THREE from '/node_modules/three/build/three.module.js';
 import {loadAssets,humanModel} from '/src/world/assets.ts';
 import {Physics,RAPIER} from '/src/systems/physics.ts';
 import {Vehicle} from '/src/systems/vehicles.ts';import {Fleet} from '/src/systems/fleet.ts';
 import {VEHICLE_TYPES} from '/src/world/vehicle-data.ts';import {City} from '/src/world/city.ts';import {StreetProps} from '/src/world/street-props.ts';
 await Promise.all([loadAssets(),RAPIER.init()]);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#21162c');scene.add(new THREE.HemisphereLight(0xffffff,0x667788,2));const sun=new THREE.DirectionalLight(0xffffff,4);sun.position.set(-5,8,-8);scene.add(sun);
 const keys=['mercedes','agera','car','motorbike'],gallery=[];
 function create(key,physics,scene){
  const kind=key==='motorbike'?'motorcycle':key==='mercedes'?'suv':'sedan';
  for(let i=0;i<30;i++){const v=new Vehicle(scene,physics,VEHICLE_TYPES[kind],new THREE.Vector3(50+i*8,0,100),'preview-'+i);if(v.model.root.userData.vehicleAsset===key)return v;scene.remove(v.model.root);physics.world.removeRigidBody(v.body);}
  throw new Error('Missing vehicle variant '+key);
 }
 const galleryPhysics=new Physics();keys.forEach((key,i)=>{const v=create(key,galleryPhysics,scene);v.spawn.set((i-1.5)*5.8,0,0);v.reset();gallery.push(v);});
 const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.01,100);camera.position.set(-6,7,-19);camera.lookAt(0,.8,0);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);renderer.render(scene,camera);
 window.lab={
 gallery:()=>gallery.map(v=>({asset:v.model.root.userData.vehicleAsset,dimensions:v.model.root.userData.dimensions.toArray(),hull:[v.definition.halfWidth*2,v.definition.halfHeight*2,v.definition.halfLength*2],wheels:v.model.wheels.length})),
 parking:()=>{const physics=new Physics(),world=new THREE.Scene(),city=new City(world,physics);new StreetProps(world,physics,city.anchors);const fleet=new Fleet(world,physics);physics.step();const result=fleet.vehicles.map(v=>({id:v.id,kind:v.definition.kind,asset:v.model.root.userData.vehicleAsset,position:v.position.toArray(),yaw:v.yaw,blocked:physics.blocked(v.position,v.body.rotation(),v.collider.shape,v.collider)}));fleet.reset();const reset=fleet.vehicles.map(v=>({position:v.position.toArray(),yaw:v.yaw}));physics.world.free();return{result,reset};},
 drive:()=>keys.map(key=>{const physics=new Physics(),v=create(key,physics,new THREE.Scene());v.spawn.set(0,0,0);v.reset();v.occupied=true;physics.fixedBox(new THREE.Vector3(0,.08,-3),new THREE.Vector3(8,.08,10));physics.step();let impacts=0;
   for(let i=0;i<100;i++){v.update(1/60,{down:k=>k==='KeyW'},()=>impacts++);physics.step();v.sync();}
   const clear={speed:v.speed,position:v.position.toArray(),crashes:v.crashes,impacts};
   physics.fixedBox(new THREE.Vector3(0,1.5,-28),new THREE.Vector3(15,1.5,.2));physics.step();
   for(let i=0;i<150;i++){v.update(1/60,{down:k=>k==='KeyW'},()=>impacts++);physics.step();v.sync();}
   const blocked={z:v.position.z,crashes:v.crashes};
   const actor=humanModel(0,true);v.model.root.add(actor.root);actor.motion.drive(.1);const min=new THREE.Vector3(-v.definition.halfWidth+.1,.07,-v.definition.halfLength+.2),max=new THREE.Vector3(v.definition.halfWidth-.1,v.cabinHeight,v.definition.halfLength-.2);const fit=actor.fitDriving(min,max,.65,new THREE.Vector3(.25,.18,.1));
   physics.world.free();return{key,clear,blocked,halfLength:v.definition.halfLength,fit,bounds:actor.root.userData.driverBounds};})
 };
 </script>`}));
 await page.goto('/vehicle-lab');await Promise.race([page.waitForFunction(()=>(window as any).lab,{timeout:90000}),failure]);
 const gallery=await page.evaluate(()=>(window as any).lab.gallery());expect(gallery.map((v:any)=>v.asset)).toEqual(['mercedes','agera','car','motorbike']);
 for(const v of gallery){expect(v.dimensions[1]).toBeGreaterThan(.5);expect(v.dimensions[1]).toBeLessThan(2);expect(v.dimensions[0]).toBeLessThan(2.5);expect(v.dimensions[2]).toBeLessThan(4.2);expect(v.hull[0]).toBeCloseTo(v.dimensions[0],5);expect(v.hull[2]).toBeCloseTo(v.dimensions[2],5);}
 expect(gallery[1].wheels).toBe(4);expect(gallery[3].wheels).toBe(2);await page.screenshot({path:'test-results/uploaded-vehicle-models.png'});
 const parked=await page.evaluate(()=>(window as any).lab.parking());expect(parked.result).toHaveLength(28);
 const extras=parked.result.slice(8);expect(extras.every((v:any)=>!v.blocked)).toBe(true);expect(extras.some((v:any)=>v.kind==='motorcycle')).toBe(true);expect(extras.some((v:any)=>v.kind==='rickshaw')).toBe(true);expect(new Set(extras.map((v:any)=>v.position[0])).size).toBeGreaterThan(8);expect(extras.some((v:any)=>Math.abs(v.yaw)===Math.PI/2)).toBe(true);
 for(let i=0;i<parked.result.length;i++){expect(parked.reset[i].yaw).toBe(parked.result[i].yaw);expect(parked.reset[i].position).toEqual(parked.result[i].position);}
 const driving=await page.evaluate(()=>(window as any).lab.drive());for(const v of driving){expect(v.clear.speed).toBeGreaterThan(10);expect(v.clear.position[2]).toBeLessThan(-5);expect(v.clear.crashes).toBe(0);expect(v.clear.impacts).toBe(0);expect(v.blocked.crashes).toBeGreaterThan(0);expect(v.blocked.z).toBeGreaterThan(-28+v.halfLength);for(let i=0;i<3;i++){expect(v.bounds.min[i]).toBeGreaterThanOrEqual(v.bounds.limits[0][i]-.001);expect(v.bounds.max[i]).toBeLessThanOrEqual(v.bounds.limits[1][i]+.001);}}
 expect(errors).toEqual([]);
});
