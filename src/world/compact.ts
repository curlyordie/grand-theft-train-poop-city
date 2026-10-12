import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const vertexMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, flatShading: true });
/** Merge rigid coloured parts into one draw call while keeping joint groups animated. */
export function compact(group: THREE.Group, excluded: Set<THREE.Object3D> = new Set()) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), geometries: THREE.BufferGeometry[] = [], meshes: THREE.Mesh[] = [];
  group.traverse(object => {
    let parent: THREE.Object3D | null = object;
    while (parent && parent !== group) { if (excluded.has(parent)) return; parent = parent.parent; }
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return;
    const geometry = object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    const count = geometry.attributes.position.count, colour = object.material.color, values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { values[i * 3] = colour.r; values[i * 3 + 1] = colour.g; values[i * 3 + 2] = colour.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3)); geometries.push(geometry); meshes.push(object);
  });
  if (!geometries.length) return;
  const geometry = mergeGeometries(geometries, false);
  meshes.forEach(mesh => mesh.removeFromParent()); geometries.forEach(g => g.dispose());
  if (geometry) { const mesh = new THREE.Mesh(geometry, vertexMaterial); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
}
