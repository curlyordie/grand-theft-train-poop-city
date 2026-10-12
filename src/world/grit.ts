import * as THREE from 'three';
import { box, cylinder, material } from './models';
let texture:THREE.CanvasTexture;
export function grimeTexture(){
  if(texture)return texture;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d')!;c.fillStyle='#b7b4a8';c.fillRect(0,0,128,128);
  let seed=23491;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<7000;i++){const shade=100+rand()*100;c.fillStyle=`rgba(${shade},${shade},${shade*.91},.35)`;c.fillRect(rand()*128,rand()*128,1+rand()*2,1+rand()*2);}
  for(let i=0;i<25;i++){c.strokeStyle='rgba(38,34,26,.22)';c.lineWidth=.3+rand();c.beginPath();let x=rand()*128,y=rand()*128;c.moveTo(x,y);for(let j=0;j<5;j++){x+=rand()*12-6;y+=rand()*14;c.lineTo(x,y);}c.stroke();}
  texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}
/** Visible street dressing stays outside the carriageway. Small litter has no obstacle collider. */
export function dressStreet(root:THREE.Group){
  let seed=6172;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const puddleMaterial=new THREE.MeshStandardMaterial({color:'#423323',roughness:.24,metalness:.18});
  for(const road of [-144,-96,-48,0,48,96,144])for(let z=-180;z<190;z+=17){
    if([-192,-144,-96,-48,0,48,96,144,192].some(v=>Math.abs(z-v)<10))continue;
    const side=rand()>.5?1:-1,x=road+side*(7+rand()*.8);
    const shape=new THREE.Shape();for(let j=0;j<18;j++){const a=j/18*Math.PI*2,r=.6+rand()*.3;const px=Math.cos(a)*r,pz=Math.sin(a)*r*.55;if(j===0)shape.moveTo(px,pz);else shape.lineTo(px,pz);}shape.closePath();
    const puddle=new THREE.Mesh(new THREE.ShapeGeometry(shape),puddleMaterial);puddle.rotation.x=-Math.PI/2;puddle.position.set(x,.12,z);root.add(puddle);
    // Leaking drains, brown runoff, discarded bags and litter.
    if(rand()>.5){box(root,[.55,.02,.38],[x,.13,z-1.2],'#35372e');for(let j=0;j<4;j++)box(root,[.025,.024,.36],[x-.2+j*.13,.145,z-1.2],'#8a8874');box(root,[.12,.012,1],[x,.124,z-.55],'#554029');}
    for(let j=0;j<5;j++){
      const px=x+rand()*.9-.45,pz=z+rand()*3-1.5;
      if(j===0){const bag=new THREE.Mesh(new THREE.SphereGeometry(.22,10,7),material('#353a32'));bag.scale.set(1,.8,.8);bag.position.set(px,.23,pz);root.add(bag);cylinder(root,.045,.1,.1,[px,.43,pz],'#45493c',10);}
      else {const litter=box(root,[.1+rand()*.3,.025+rand()*.12,.12+rand()*.25],[px,.15,pz],['#8b7157','#b6ab8c','#695e4e','#656957'][j-1]);litter.rotation.y=rand()*Math.PI;}
    }
    if(rand()>.75)for(let j=0;j<3;j++){const mess=new THREE.Mesh(new THREE.SphereGeometry(.11+j*.025,10,7),material('#50391f'));mess.scale.y=.5;mess.position.set(x+.3,.16,z+1.5+j*.11);root.add(mess);}
    if(rand()>.8){const pile=new THREE.Mesh(new THREE.DodecahedronGeometry(.35,0),material('#817a68'));pile.position.set(road+side*8,.35,z+3);pile.scale.set(1.6,.7,1);root.add(pile);}
  }
}
