import { SynthwaveScore,type MusicState } from './music';
import { audioData,loadAudioAssets,type SoundId } from './audio-assets';
type Position={x:number;y:number;z:number};
interface PlayOptions{volume?:number;pitch?:number;delay?:number;duration?:number;position?:Position;}
/** Locally bundled recordings, bounded loop voices, spatial effects and adaptive music. */
export class AudioSystem{
 context?:AudioContext;volume=.35;music=new SynthwaveScore();ready?:Promise<void>;error='';
 private buffers=new Map<SoundId,AudioBuffer>();private effects?:GainNode;private meter?:AnalyserNode;
 private voices=new Set<AudioBufferSourceNode>();private loops=new Map<string,{source:AudioBufferSourceNode;gain:GainNode}>();
 private listener:Position={x:0,y:0,z:0};private right:Position={x:1,y:0,z:0};private suspended=false;
 private engineState={speed:0,driving:false,throttle:false,braking:false,steering:0,kind:''};
 plays:Partial<Record<SoundId,number>>={};
 unlock(){
  this.context??=new AudioContext();void this.context.resume();this.suspended=false;
  if(this.effects)this.effects.gain.setTargetAtTime(this.volume,this.context.currentTime,.03);
  this.ready??=this.prepare(this.context);
 }
 private async prepare(context:AudioContext){
  try{
   await loadAudioAssets();await Promise.all([...audioData].map(async([id,data])=>this.buffers.set(id,await context.decodeAudioData(data.slice(0)))));
   this.effects=context.createGain();this.effects.gain.value=this.suspended?0:this.volume;
   const mix=context.createGain(),limiter=context.createDynamicsCompressor();limiter.threshold.value=-10;limiter.ratio.value=6;this.meter=context.createAnalyser();this.meter.fftSize=256;
   this.effects.connect(mix);mix.connect(limiter).connect(this.meter).connect(context.destination);
   this.music.initialise(context,[this.buffers.get('retro')!,this.buffers.get('action')!],mix);
   for(const [name,id]of [['engine','engine'],['bike','bike'],['skid','skid'],['street','ambience']]as const){const source=context.createBufferSource(),gain=context.createGain();source.buffer=this.buffers.get(id)!;source.loop=true;gain.gain.value=0;source.connect(gain).connect(this.effects);source.start();this.loops.set(name,{source,gain});}
   const s=this.engineState;this.updateEngine(s.speed,s.driving,s.throttle,s.braking,s.steering,s.kind);
  }catch(error){this.error=String(error);console.error('Audio bank could not decode',error);}
 }
 setListener(position:Position,forward:Position){this.listener={...position};this.right={x:-forward.z,y:0,z:forward.x};}
 play(id:SoundId,options:PlayOptions={}){
  const context=this.context,buffer=this.buffers.get(id);if(!context||!buffer||context.state!=='running'||this.suspended)return;
  // Keep sustained firing from accumulating unbounded audio nodes.
  if(this.voices.size>=32)return;
  const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner();source.buffer=buffer;
  let volume=options.volume??.65;
  if(options.position){const dx=options.position.x-this.listener.x,dz=options.position.z-this.listener.z,distance=Math.hypot(dx,dz);if(distance>90)return;volume/=1+(distance/18)**2;pan.pan.value=Math.max(-1,Math.min(1,(dx*this.right.x+dz*this.right.z)/Math.max(1,distance)));}
  source.playbackRate.value=options.duration?Math.max(.3,Math.min(3,buffer.duration/options.duration)):options.pitch??1;
  gain.gain.value=volume;source.connect(gain).connect(pan).connect(this.effects!);source.start(context.currentTime+(options.delay??0));
  this.voices.add(source);this.plays[id]=(this.plays[id]??0)+1;source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();pan.disconnect();};
  if(id==='pistol'||id==='shotgun'||id==='crash')this.music.duck();return source;
 }
 cash(){this.play('coins',{volume:.9});this.play('bell',{volume:.45,delay:.13,pitch:1.2});}
 pause(){this.suspended=true;this.music.pause();if(this.context&&this.effects)this.effects.gain.setTargetAtTime(0,this.context.currentTime,.04);for(const voice of this.voices)voice.stop();}
 updateMusic(state:MusicState){this.music.update(state,this.volume);if(this.context&&this.effects)this.effects.gain.setTargetAtTime(this.suspended?0:this.volume,this.context.currentTime,.03);}
 updateEngine(speed:number,driving:boolean,throttle=false,braking=false,steering=0,kind=''){
  this.engineState={speed,driving,throttle,braking,steering,kind};if(!this.context)return;
  const t=this.context.currentTime,absolute=Math.abs(speed),gear=Math.min(5,1+Math.floor(absolute/8)),rpm=.65+(absolute%8)/8*.7+(throttle?.24:0);
  for(const name of ['engine','bike']){const loop=this.loops.get(name);if(!loop)continue;const selected=kind==='motorcycle'?name==='bike':name==='engine';loop.source.playbackRate.setTargetAtTime(rpm,t,.1);loop.gain.gain.setTargetAtTime(driving&&selected?.32+(throttle?.16:0)+absolute*.003:0,t,.09);}
  const skid=this.loops.get('skid');if(skid)skid.gain.gain.setTargetAtTime(driving&&absolute>3&&(braking||(absolute>12&&steering>.8))?.25:0,t,.07);
  const street=this.loops.get('street');if(street)street.gain.gain.setTargetAtTime(this.suspended?0:driving?.025:.065,t,.3);
  this.gear=gear;this.rpm=rpm;
 }
 private gear=1;private rpm=.65;
 snapshot(){let signal=0;if(this.meter){const samples=new Float32Array(this.meter.fftSize);this.meter.getFloatTimeDomainData(samples);signal=Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);}
  return{ready:this.buffers.size===25,error:this.error,decoded:this.buffers.size,plays:{...this.plays},voices:this.voices.size,loops:this.loops.size,gear:this.gear,rpm:this.rpm,signal,engine:this.engineState,loopGains:Object.fromEntries([...this.loops].map(([name,loop])=>[name,loop.gain.gain.value]))};}
}
