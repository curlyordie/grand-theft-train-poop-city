import * as THREE from 'three';
import type {GLTF,GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import mercedesUrl from '../assets/vehicles/mercedes.glb?url';
import ageraUrl from '../assets/vehicles/agera.glb?url';
import carUrl from '../assets/vehicles/car.glb?url';
import motorbikeUrl from '../assets/vehicles/motorbike.glb?url';
import type {VehicleDefinition} from './vehicle-data';
type VehicleAsset='mercedes'|'agera'|'car'|'motorbike';
const models={} as Record<VehicleAsset,GLTF>;
export async function loadVehicleAssets(loader:GLTFLoader){
 await Promise.all(Object.entries({mercedes:mercedesUrl,agera:ageraUrl,car:carUrl,motorbike:motorbikeUrl}).map(async([key,url])=>{models[key as VehicleAsset]=await loader.loadAsync(url);}));
}
export function vehicleHash(id:string){let value=2166136261;for(const c of id)value=Math.imul(value^c.charCodeAt(0),16777619);return value>>>0;}
export function uploadedVehicle(definition:VehicleDefinition,id:string){
 const kind=definition.kind;if(['hatchback','mission-sedan','police'].includes(id)||!['hatchback','sedan','suv','motorcycle'].includes(kind))return;
 const choices:VehicleAsset[]=kind==='motorcycle'?['motorbike']:kind==='suv'?['mercedes','car']:['agera','car','mercedes'];
 const key=choices[vehicleHash(id)%choices.length],root=new THREE.Group(),model=models[key].scene.clone(true);root.add(model);
 const paint=new THREE.Color(['#ddd5bc','#4d6877','#815f51','#667064','#b6a894','#514e64'][vehicleHash(id+'paint')%6]);
 const wheels:THREE.Object3D[]=[];
 model.traverse(object=>{if(/^(FR|FL|RR|RL|Front_wheel|back_wheel)$/.test(object.name))wheels.push(object);if(!(object instanceof THREE.Mesh))return;object.castShadow=object.receiveShadow=true;
  const materials=Array.isArray(object.material)?object.material:[object.material];const copies=materials.map(source=>{const mat=(source as THREE.MeshPhysicalMaterial).clone();if(/paint|polar|car texture|metal_red/i.test(mat.name))mat.color.multiply(paint);mat.roughness=Math.max(.2,mat.roughness);
   // Small lamp lenses should not force another render of the whole city.
   if(mat.transmission){mat.transmission=0;if(/light|flash/i.test(mat.name))mat.emissive.copy(mat.color).multiplyScalar(.12);}
   return mat;});object.material=Array.isArray(object.material)?copies:copies[0];
 });
 model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
 model.scale.setScalar(definition.halfLength*2/size.z);model.updateMatrixWorld(true);
 const fitted=new THREE.Box3().setFromObject(model),centre=fitted.getCenter(new THREE.Vector3()),extent=fitted.getSize(new THREE.Vector3());model.position.set(-centre.x,-fitted.min.y,-centre.z);
 wheels.forEach(wheel=>{const wheelSize=new THREE.Box3().setFromObject(wheel).getSize(new THREE.Vector3());wheel.userData.radius=Math.max(wheelSize.y,wheelSize.z)/2;});
 root.userData.vehicleAsset=key;root.userData.dimensions=extent;root.userData.cabinHeight=Math.max(.7,extent.y-.12);
 root.userData.vehicleName={mercedes:'Mercedes-Benz GLS 580',agera:'Koenigsegg Agera',car:'Old Town SUV',motorbike:'Classic Motorbike'}[key];
 return{root,wheels};
}
