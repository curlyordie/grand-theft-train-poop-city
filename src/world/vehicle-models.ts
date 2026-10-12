import * as THREE from 'three';
import { importedCar } from './assets';
import { carModel, box, cylinder, sign } from './models';
import { compact } from './compact';
import type { VehicleDefinition } from './vehicle-data';

export function vehicleModel(definition:VehicleDefinition){
  const {kind,colour}=definition;
  if(kind==='hatchback'||kind==='sedan'||kind==='police'||kind==='suv'){
    const real=importedCar(colour,definition.halfWidth*2,definition.halfLength*2);
    if(kind==='police'){box(real.root,[1.1,.1,.25],[0,1.49,.1],'#343b3e');box(real.root,[.43,.12,.2],[-.25,1.6,.1],'#215fbd');box(real.root,[.43,.12,.2],[.25,1.6,.1],'#d34737');}
    return real;
  }
  const root=new THREE.Group(),wheels:THREE.Mesh[]=[];
  const wheel=(x:number,z:number,r=.34)=>{const w=cylinder(root,r,r,.18,[x,r+.03,z],'#283731',24);w.rotation.z=Math.PI/2;wheels.push(w);const h=cylinder(root,r*.45,r*.45,.2,[x,r+.03,z],'#b5b49c',8);h.rotation.z=Math.PI/2;};
  if(kind==='motorcycle'){
    wheel(0,-.77,.35);wheel(0,.77,.35);
    box(root,[.2,.2,1.35],[0,.57,0],'#657267');box(root,[.42,.28,.64],[0,.91,-.2],colour);box(root,[.38,.13,.63],[0,1.04,.3],'#344239');
    for(const x of [-.16,.16]){const fork=cylinder(root,.025,.025,.7,[x,.68,-.7],'#b1b1a0');fork.rotation.x=-.2;}
    box(root,[.7,.06,.08],[0,1.27,-.6],'#626f66');box(root,[.15,.1,.2],[.3,.5,.45],'#b5b4a1');box(root,[.22,.18,.1],[0,1.04,-.72],'#e5ce92');
  }else if(kind==='rickshaw'){
    wheel(0,-.9,.27);wheel(-.67,.7,.27);wheel(.67,.7,.27);
    box(root,[1.35,.4,2.15],[0,.63,0],colour);box(root,[1.45,.17,1.95],[0,1.8,.08],'#d9b348');
    box(root,[1.4,.75,.11],[0,1.29,-.95],'#d9b348');box(root,[1.16,.46,.02],[0,1.44,-1.015],'#3f6865');box(root,[1.24,.2,.65],[0,.89,.54],'#455c48');
    for(const x of [-.65,.65])for(const z of [-.77,.9])cylinder(root,.035,.035,1.1,[x,1.2,z],'#455446');
    box(root,[.23,.15,.03],[0,.94,-1.03],'#f0d697');
  }else{
    const length=kind==='pickup'?4.3:4.1;box(root,[1.95,.5,length],[0,.77,0],colour);
    for(const x of [-.98,.98])for(const z of [-1.3,1.3])wheel(x,z,.35);
    if(String(kind)==='suv'){
      box(root,[1.84,.9,2.95],[0,1.47,.2],colour);box(root,[1.6,.58,.03],[0,1.53,-1.29],'#365b5b');box(root,[1.6,.58,.03],[0,1.53,1.7],'#365b5b');
      for(const x of [-.932,.932])for(const z of [-.77,.16,1.06])box(root,[.025,.53,.73],[x,1.52,z],'#365b5b');
      box(root,[1.8,.12,2.6],[0,1.99,.2],'#576454');
    }else if(kind==='pickup'){
      box(root,[1.83,.8,1.63],[0,1.4,-.85],colour);box(root,[1.61,.5,.025],[0,1.44,-1.69],'#416961');
      for(const x of [-.925,.925])box(root,[.025,.5,1.05],[x,1.44,-.85],'#416961');
      box(root,[1.72,.1,1.75],[0,1.04,1.06],'#535f4c');for(const x of [-.9,.9])box(root,[.13,.47,1.75],[x,1.25,1.06],colour);box(root,[1.85,.47,.13],[0,1.25,1.97],colour);
    }else{
      box(root,[1.9,1.55,2.68],[0,1.54,.65],colour);box(root,[1.81,1.16,1.25],[0,1.3,-1.31],colour);
      box(root,[1.56,.58,.025],[0,1.56,-1.96],'#43665e');for(const x of [-.92,.92])box(root,[.025,.55,.8],[x,1.56,-1.3],'#43665e');
      sign(root,'PARCEL PENDING',1.85,.55,[.97,1.55,.6],'#a1744c','#f0dfb6').rotation.y=Math.PI/2;
      box(root,[.035,1.3,.05],[0,1.55,2.02],'#806d4e');
    }
    for(const x of [-.65,.65])box(root,[.35,.18,.04],[x,.87,-length/2-.02],'#e9d59b');
    box(root,[1.96,.13,.12],[0,.48,-length/2],'#a4b0a0');
  }
  compact(root,new Set(wheels));return{root,wheels};
}
