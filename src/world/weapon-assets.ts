import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WeaponId } from '../systems/inventory';
import pistolUrl from '../assets/weapons/pistol.glb?url';
import rifleUrl from '../assets/weapons/rifle.glb?url';
import knifeUrl from '../assets/weapons/knife.glb?url';
import hammerUrl from '../assets/weapons/hammer.glb?url';
const prefabs = new Map<WeaponId, THREE.Group>();
export async function loadWeaponAssets(loader: GLTFLoader) {
  await Promise.all(([
    ['handgun',pistolUrl],['shotgun',rifleUrl],['bat',knifeUrl],['pipe',hammerUrl],
  ] as const).map(async ([id,url]) => {
    const asset=await loader.loadAsync(url), root=new THREE.Group();
    asset.scene.updateMatrixWorld(true);
    const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
    asset.scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const geometry=(object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone()).applyMatrix4(object.matrixWorld);
      const material=object.material as THREE.Material;
      if(!batches.has(material))batches.set(material,[]);
      batches.get(material)!.push(geometry);
    });
    for(const [material,geometries] of batches){
      // Preserve photographic materials while reducing draw calls for repeated pickups.
      const merged=mergeGeometries(geometries,false);
      for(const geometry of merged?[merged]:geometries){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
      if(merged)geometries.forEach(g=>g.dispose());
    }
    if(id==='handgun'||id==='shotgun'){
      // Both source barrels face +X. Game weapons point along -Z.
      root.rotation.y=Math.PI/2;
      root.position.set(0,id==='handgun'?.02:.035,id==='handgun'?-.02:-.28);
    }else{root.rotation.z=Math.PI;root.position.y=id==='bat'?-.15:-.10;}
    prefabs.set(id,root);
  }));
}
export function importedWeapon(id:WeaponId){
  const prefab=prefabs.get(id);
  if(!prefab)return new THREE.Group();
  const root=new THREE.Group();root.add(prefab.clone(true));return root;
}
