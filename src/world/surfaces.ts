import * as THREE from 'three';
import roadColor from '../assets/surfaces/road-color.webp?url';
import roadNormal from '../assets/surfaces/road-normal.webp?url';
import roadRoughness from '../assets/surfaces/road-roughness.webp?url';
import pavementColor from '../assets/surfaces/pavement-color.webp?url';
import pavementNormal from '../assets/surfaces/pavement-normal.webp?url';
import pavementRoughness from '../assets/surfaces/pavement-roughness.webp?url';
import roofColor from '../assets/surfaces/roof-color.webp?url';
import roofNormal from '../assets/surfaces/roof-normal.webp?url';
import roofRoughness from '../assets/surfaces/roof-roughness.webp?url';

import rustColor from '../assets/surfaces/rust-color.webp?url';
import rustNormal from '../assets/surfaces/rust-normal.webp?url';
import rustRoughness from '../assets/surfaces/rust-roughness.webp?url';
import rustMetalness from '../assets/surfaces/rust-metalness.webp?url';
import gravelColor from '../assets/surfaces/gravel-color.webp?url';
import gravelNormal from '../assets/surfaces/gravel-normal.webp?url';
import gravelRoughness from '../assets/surfaces/gravel-roughness.webp?url';
import plasterColor from '../assets/surfaces/plaster-color.webp?url';
import plasterNormal from '../assets/surfaces/plaster-normal.webp?url';
import plasterRoughness from '../assets/surfaces/plaster-roughness.webp?url';

type Maps = Pick<THREE.MeshStandardMaterialParameters, 'map' | 'normalMap' | 'roughnessMap' | 'metalnessMap'>;
export let surfaces: Record<'road' | 'pavement' | 'roof' | 'rust' | 'gravel' | 'plaster', Maps>;
export async function loadSurfaceMaps(loader: THREE.TextureLoader) {
  const sets = [[roadColor, roadNormal, roadRoughness], [pavementColor, pavementNormal, pavementRoughness], [roofColor, roofNormal, roofRoughness], [rustColor, rustNormal, rustRoughness, rustMetalness], [gravelColor, gravelNormal, gravelRoughness], [plasterColor, plasterNormal, plasterRoughness]];
  const loaded = await Promise.all(sets.map(async urls => {
    const [map, normalMap, roughnessMap, metalnessMap] = await Promise.all(urls.map(url => loader.loadAsync(url)));
    map.colorSpace = THREE.SRGBColorSpace;
    // Normal and roughness values are data, kept outside the colour transform.
    for (const texture of [map, normalMap, roughnessMap, metalnessMap].filter((t):t is THREE.Texture=>!!t)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 8;
    }
    return {map, normalMap, roughnessMap,...(metalnessMap?{metalnessMap}:{})};
  }));
  surfaces = {road: loaded[0], pavement: loaded[1], roof: loaded[2],rust:loaded[3],gravel:loaded[4],plaster:loaded[5]};
}
