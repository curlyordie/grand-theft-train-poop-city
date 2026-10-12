/** Free licensed recordings, crossfaded and filtered according to the game. */
export interface MusicState{running:boolean;driving:boolean;speed:number;movement:number;wanted:number;attacks:number;hurt:boolean;}
export class SynthwaveScore{
 volume=.65;mode='AFTER DARK';ready=false;error='';
 private context?:AudioContext;private bus?:GainNode;private filter?:BiquadFilterNode;
 private tracks:GainNode[]=[];private sources:AudioBufferSourceNode[]=[];private lastAttack=0;private combatUntil=0;private duckUntil=0;
 private state:MusicState={running:false,driving:false,speed:0,movement:0,wanted:0,attacks:0,hurt:false};private master=.35;private start=0;
 private levels={retro:0,action:0,cutoff:0};
 initialise(context:AudioContext,buffers:AudioBuffer[],output:AudioNode=context.destination){
  if(this.context)return;this.context=context;
  this.bus=context.createGain();this.bus.gain.value=0;this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=1400;
  this.bus.connect(this.filter).connect(output);this.start=context.currentTime+.04;
  for(const buffer of buffers){const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain).connect(this.bus);source.start(this.start);this.tracks.push(gain);this.sources.push(source);}
  this.ready=true;this.update(this.state,this.master);
 }
 update(state:MusicState,master:number){
  this.state=state;this.master=master;if(!this.context||!this.bus||!this.filter)return;
  const t=this.context.currentTime;if(state.attacks!==this.lastAttack){if(state.attacks>this.lastAttack)this.combatUntil=t+4;this.lastAttack=state.attacks;}if(state.hurt)this.combatUntil=t+3;
  const danger=Math.min(1,state.wanted/3),combat=t<this.combatUntil?1:0,motion=Math.min(1,state.driving?Math.abs(state.speed)/25:state.movement/5);
  const action=Math.min(.88,danger*.8+combat*.3);
  this.mode=!state.running?'PAUSED':state.wanted?'PURSUIT':combat?'DANGER':state.driving?'NIGHT DRIVE':motion>.6?'ON THE RUN':'AFTER DARK';
  this.levels={retro:Math.cos(action*Math.PI/2)*.8,action:Math.sin(action*Math.PI/2)*.8,cutoff:1700+motion*4400+danger*5000+combat*2000};
  this.tracks[0]?.gain.setTargetAtTime(this.levels.retro,t,.8);this.tracks[1]?.gain.setTargetAtTime(this.levels.action,t,.8);
  this.filter.frequency.setTargetAtTime(this.levels.cutoff,t,.4);
  this.bus.gain.setTargetAtTime(state.running?master*this.volume*(t<this.duckUntil?.45:1)*(.6+motion*.14+danger*.12):0,t,.12);
 }
 duck(){if(this.context){this.duckUntil=this.context.currentTime+.32;this.update(this.state,this.master);}}
 pause(){this.state={...this.state,running:false};this.mode='PAUSED';if(this.context&&this.bus)this.bus.gain.setTargetAtTime(0,this.context.currentTime,.06);}
 snapshot(){return{ready:this.ready,error:this.error,mode:this.mode,active:this.state.running,volume:this.volume,layers:{...this.levels},sources:this.sources.length,beat:this.context?Math.max(0,this.context.currentTime-this.start)*2:0,audible:!!this.bus&&this.bus.gain.value>.0001&&this.context?.state==='running'};}
}
