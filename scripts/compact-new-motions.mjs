// Remove redundant keys from new clips. Existing Boss/Remy action clips stay exact.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { Quaternion, Vector3 } from 'three';
const path='src/assets/motions.bin', raw=readFileSync(path), banks=JSON.parse(gunzipSync(raw));
for(const [model,clips] of Object.entries(banks))for(const clip of clips){
 if(['boss','remy'].includes(model)&&!['phone','texting','death'].includes(clip.name))continue;
 for(const track of clip.tracks){
  const rotation=track.path==='rotation',width=rotation?4:3,limit=rotation?.0015:.0006,n=track.times.length;
  if(n<=2)continue;
  const samples=Array.from({length:n},(_,i)=>{const value=(rotation?new Quaternion():new Vector3()).fromArray(track.values,i*width);return rotation?value.normalize():value;});
  const selected=new Set([0,n-1]);
  function segment(start,end){
   if(end-start<=1)return;
   let error=limit,index=-1;
   const span=track.times[end]-track.times[start],interpolated=rotation?new Quaternion():new Vector3();
   for(let i=start+1;i<end;i++){
    const amount=(track.times[i]-track.times[start])/span;
    interpolated.copy(samples[start]);if(rotation)interpolated.slerp(samples[end],amount);else interpolated.lerp(samples[end],amount);
    const deviation=rotation?interpolated.angleTo(samples[i]):interpolated.distanceTo(samples[i]);
    if(deviation>error){error=deviation;index=i;}
   }
   if(index>=0){selected.add(index);segment(start,index);segment(index,end);}
  }
  segment(0,n-1);const indices=[...selected].sort((a,b)=>a-b);
  track.times=indices.map(i=>track.times[i]);track.values=indices.flatMap(i=>track.values.slice(i*width,(i+1)*width));
 }
}
const output=gzipSync(JSON.stringify(banks),{level:9});writeFileSync(path,output);
console.log('Motion bank',raw.byteLength,'->',output.byteLength,'bytes');
