import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import manholeUrl from '../assets/props/manhole.glb?url';
import cameraUrl from '../assets/props/camera.glb?url';
import utilityUrl from '../assets/props/utility.glb?url';
import airconUrl from '../assets/props/aircon.glb?url';
import barrierUrl from '../assets/props/barrier.glb?url';
import hydrantUrl from '../assets/props/hydrant.glb?url';
import trashbagUrl from '../assets/props/trashbag.glb?url';
import trashcanUrl from '../assets/props/trashcan.glb?url';
import boxUrl from '../assets/props/box.glb?url';
import shutterUrl from '../assets/props/shutter.glb?url';
import fenceUrl from '../assets/props/fence.glb?url';
import coveredcarUrl from '../assets/props/coveredcar.glb?url';
import tyreUrl from '../assets/props/tyre.glb?url';
import rimUrl from '../assets/props/rim.glb?url';
export type PropKind='manhole' | 'camera' | 'utility' | 'aircon' | 'barrier' | 'hydrant' | 'trashbag' | 'trashcan' | 'box' | 'shutter' | 'fence' | 'coveredcar' | 'tyre' | 'rim';
const urls={manhole:manholeUrl,camera:cameraUrl,utility:utilityUrl,aircon:airconUrl,barrier:barrierUrl,hydrant:hydrantUrl,trashbag:trashbagUrl,trashcan:trashcanUrl,box:boxUrl,shutter:shutterUrl,fence:fenceUrl,coveredcar:coveredcarUrl,tyre:tyreUrl,rim:rimUrl};
export const propAssets=new Map<PropKind,{meshes:THREE.Mesh[];size:THREE.Vector3}>();
export async function loadPropAssets(loader:GLTFLoader){
 await Promise.all(Object.entries(urls).map(async([label,url])=>{
  const asset=await loader.loadAsync(url);asset.scene.updateMatrixWorld(true);
  const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  asset.scene.traverse(object=>{
   if(!(object instanceof THREE.Mesh))return;
   // Props are static: bake the source's shape-key pose before instancing it.
   // Instanced meshes do not inherit the original mesh's morph weights.
   const baked=object.geometry.clone();
   if(baked.morphAttributes.position){
    const position=baked.getAttribute('position'),vertex=new THREE.Vector3();
    for(let i=0;i<position.count;i++){object.getVertexPosition(i,vertex);position.setXYZ(i,vertex.x,vertex.y,vertex.z);}
    baked.morphAttributes={};baked.computeVertexNormals();
   }
   const material=object.material as THREE.Material,geometry=(baked.index?baked.toNonIndexed():baked).applyMatrix4(object.matrixWorld);
   if(geometry!==baked)baked.dispose();
   if(!batches.has(material))batches.set(material,[]);batches.get(material)!.push(geometry);
  });
  const meshes:THREE.Mesh[]=[];
  for(const [material,geometries]of batches){const merged=mergeGeometries(geometries,false);for(const geometry of merged?[merged]:geometries)meshes.push(new THREE.Mesh(geometry,material));if(merged)geometries.forEach(g=>g.dispose());}
  const bounds=new THREE.Box3();for(const mesh of meshes){mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox!);}
  const centre=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  for(const mesh of meshes)mesh.geometry.translate(-centre.x,-bounds.min.y,-centre.z);
  if(label==='manhole'){for(const mesh of meshes)mesh.geometry.scale(1,.018/Math.max(.001,size.y),1);size.y=.018;}
  propAssets.set(label as PropKind,{meshes,size});
 }));
}
