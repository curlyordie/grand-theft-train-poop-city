import * as THREE from 'three';
import bankUrl from '../assets/motions.bin?url';
type RawClip={name:string;duration:number;tracks:{node:string;path:string;times:number[];values:number[]}[]};
let banks:Record<string,THREE.AnimationClip[]>={};
export async function loadMotions(){
 const response=await fetch(bankUrl);
 const decoded=await new Response(response.body!.pipeThrough(new DecompressionStream('gzip'))).json() as Record<string,RawClip[]>;
 for(const [model,clips]of Object.entries(decoded))banks[model]=clips.map(clip=>new THREE.AnimationClip(clip.name,clip.duration,clip.tracks.map(track=>{
  const name=THREE.PropertyBinding.sanitizeNodeName(track.node)+(track.path==='rotation'?'.quaternion':'.position');
  return track.path==='rotation'?new THREE.QuaternionKeyframeTrack(name,track.times,track.values):new THREE.VectorKeyframeTrack(name,track.times,track.values);
 })));
}
export interface MotionOptions{backwards?:boolean;strafe?:number;sprint?:boolean;armed?:boolean;stopping?:boolean;turning?:boolean;airborne?:boolean;}
export class CharacterMotion{
 mixer:THREE.AnimationMixer;actions=new Map<string,THREE.AnimationAction>();counts:Record<string,number>={};current='';locked=0;priority=0;speed=0;driving=false;dead=false;
 constructor(body:THREE.Object3D,private model:string,native:THREE.AnimationClip[]){
  this.mixer=new THREE.AnimationMixer(body);
  for(const clip of [...native,...(banks[model]??[])])this.actions.set(clip.name.toLowerCase(),this.mixer.clipAction(clip));
  this.change('idle');this.mixer.update(0);
 }
 change(name:string,loop=true,rate=1,fade=.13){
  const next=this.actions.get(name)??this.actions.get(name==='jog'?'walk':'idle');if(!next)return false;
  const previous=this.actions.get(this.current);
  if(previous===next&&loop){next.timeScale=rate;return true;}
  next.reset().setEffectiveWeight(1).setEffectiveTimeScale(rate).setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);
  next.clampWhenFinished=!loop;
  if(previous&&previous!==next){if(fade)previous.fadeOut(fade);else previous.stop();}
  if(rate<0)next.time=next.getClip().duration;
  next.fadeIn(fade).play();this.current=next.getClip().name.toLowerCase();this.counts[this.current]=(this.counts[this.current]??0)+1;return true;
 }
 play(name:string,duration?:number,priority=2){
  const action=this.actions.get(name);if(!action||this.dead||this.driving||this.priority>priority&&this.locked>0)return false;
  const seconds=duration??action.getClip().duration;
  this.change(name,false,action.getClip().duration/Math.max(.1,seconds),.08);
  this.locked=seconds;this.priority=priority;return true;
 }
 die(){
  if(this.dead)return 0;
  this.dead=true;this.driving=false;this.locked=0;this.priority=10;
  const action=this.actions.get('death');if(!action)return 0;
  this.change('death',false,1,.06);return action.getClip().duration;
 }
 finishAction(){if(!this.dead){this.locked=0;this.priority=0;}}
 update(dt:number,speed:number,options:MotionOptions={}){
  if(this.dead){this.mixer.update(dt);return;}
  if(this.driving)return;
  this.locked=Math.max(0,this.locked-dt);
  if(!this.locked){
   this.priority=0;
   if(options.turning&&speed>1.5)this.play(options.armed?'armed_turn':'turn',.5,1);
   else if(options.stopping&&this.speed>(this.model==='cityside-unrigged'?.2:3))this.play('stop',this.model==='cityside-unrigged'?undefined:.4,1);
   else if(speed>.3&&this.speed<.2&&!options.airborne)this.play('start_walk',this.model==='cityside-unrigged'?undefined:.35,1);
   else if(options.airborne)this.change('jump',false,1);
   else if(speed<.2)this.change('idle');
   else if(options.backwards)this.change('backwards',true,Math.min(2,speed/3));
   else if(options.strafe)this.change('strafe',true,(options.strafe<0?-1:1)*Math.min(2,speed/2.5));
   else if(options.armed)this.change('armed_walk',true,Math.min(2,speed/2));
   else if(options.sprint||speed>5)this.change('jog',true,Math.min(1.8,speed/4));
   else this.change('walk',true,Math.max(.6,Math.min(1.8,speed/1.8)));
  }
  this.speed=speed;this.mixer.update(dt);
 }
 drive(dt:number){
  if(this.dead){this.mixer.update(dt);return;}
  if(!this.driving){this.driving=true;this.locked=0;this.priority=0;this.mixer.stopAllAction();this.current='';this.change('drive',true,1,0);}
  this.mixer.update(dt);
 }
 leaveDrive(){if(this.driving){this.driving=false;this.current='';this.mixer.stopAllAction();this.change('idle',true,1,0);this.mixer.update(0);}}
 reset(){this.counts={};this.dead=false;this.driving=false;this.locked=0;this.priority=0;this.speed=0;this.current='';this.mixer.stopAllAction();this.change('idle',true,1,0);this.mixer.update(0);}
 get capturedAction(){return this.locked>0||['walk','jog','backwards','strafe','armed_walk','drive'].includes(this.current);}
}
