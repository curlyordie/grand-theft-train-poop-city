import { expect, type Page } from '@playwright/test';

export const state = (page:Page):Promise<any> => page.evaluate(() => (window as any).__game.snapshot());
export async function start(page:Page){await page.goto('/');await page.click('#new-game');await expect.poll(async()=>(await state(page)).grounded).toBe(true);await expect.poll(async()=>(await state(page)).locked).toBe(true);}
const movement=['KeyW','KeyA','KeyS','KeyD','ShiftLeft'];
const held = new WeakMap<Page, Set<string>>();
async function setKeys(page:Page,keys:string[]){
  const before=held.get(page)??new Set<string>(),next=new Set(keys);
  await Promise.all(movement.filter(key=>before.has(key)!==next.has(key)).map(key=>next.has(key)?page.keyboard.down(key):page.keyboard.up(key)));
  held.set(page,next);
}
export async function walkTo(page:Page,x:number,z:number,radius=1.2,timeout=35000){
  const deadline=Date.now()+timeout;
  try{while(Date.now()<deadline){const s=await state(page),dx=x-s.position[0],dz=z-s.position[2],distance=Math.hypot(dx,dz);if(distance<radius)return;
    if(!s.running)throw new Error(`Game paused while walking to ${x},${z}`);
    const heading=Math.atan2(-dx,-dz),error=Math.atan2(Math.sin(heading-s.cameraYaw),Math.cos(heading-s.cameraYaw));
    if(Math.abs(error)>.08){await setKeys(page,[]);await look(page,heading);continue;}
    const keys:string[]=['KeyW'];if(distance>6)keys.push('ShiftLeft');
    await setKeys(page,keys);await page.waitForTimeout(180);
  }throw new Error(`Could not walk to ${x},${z}; state=${JSON.stringify((await state(page)).position)}`);}finally{await setKeys(page,[]);}
}
export async function walkPath(page:Page,path:number[][]){for(const [x,z]of path)await walkTo(page,x,z);}
export async function approachNPC(page:Page,id:number){
  for(let attempt=0;attempt<8;attempt++){
    const s=await state(page),npc=s.npcs.find((n:any)=>n.id===id);if(!npc)throw new Error('NPC not in range');
    const dx=s.position[0]-npc.position[0],dz=s.position[2]-npc.position[2],d=Math.hypot(dx,dz);
    if(d<2.3){await page.keyboard.press('KeyE');await walkTo(page,npc.position[0]+dx/d*1.1,npc.position[2]+dz/d*1.1,.6,12000);return;}
    await walkTo(page,npc.position[0]+dx/d*1.6,npc.position[2]+dz/d*1.6,1.1,15000);
  }
  throw new Error('Could not approach moving NPC');
}
export async function look(page:Page,yaw:number,pitch?:number){const s=await state(page),angle=Math.atan2(Math.sin(yaw-s.cameraYaw),Math.cos(yaw-s.cameraYaw));await page.locator('#scene').dispatchEvent('mousemove',{movementX:-angle/.0024,movementY:pitch===undefined?0:(pitch-s.cameraPitch)/.0024});await page.waitForTimeout(180);}
export async function faceNPC(page:Page,id:number,aim=false){const s=await state(page),npc=s.npcs.find((n:any)=>n.id===id);if(!npc)throw new Error('Target NPC not active');const dx=npc.position[0]-s.position[0],dz=npc.position[2]-s.position[2],d=Math.hypot(dx,dz);await look(page,Math.atan2(-dx,-dz)+(aim?Math.asin(Math.min(.5/d,.5)):0),aim?Math.atan2(s.position[1]+.95-npc.position[1]-.35,d):undefined);}
export async function attack(page:Page){await page.mouse.down({button:'left'});await page.waitForTimeout(70);await page.mouse.up({button:'left'});}
export async function brake(page:Page){await Promise.all(movement.map(key=>page.keyboard.up(key)));held.set(page,new Set());await page.keyboard.down('Space');try{await expect.poll(async()=>Math.abs((await state(page)).speed),{timeout:20000}).toBeLessThan(.2);}finally{await page.keyboard.up('Space');}}
export async function driveTo(page:Page,x:number,z:number,radius=3,timeout=45000){
  const deadline=Date.now()+timeout;let last:number[]|null=null,stalled=0;try{while(Date.now()<deadline){const s=await state(page);if(!s.driving)throw new Error('Unexpected vehicle exit or respawn');const dx=x-s.car[0],dz=z-s.car[2],d=Math.hypot(dx,dz);if(d<radius){await brake(page);return;}
    if(last&&Math.hypot(s.car[0]-last[0],s.car[2]-last[2])<.12)stalled++;else stalled=0;last=s.car;
    if(stalled>6){await setKeys(page,['KeyS']);await page.waitForTimeout(1200);await brake(page);stalled=0;last=null;continue;}
    const desired=Math.atan2(-dx,-dz),angle=Math.atan2(Math.sin(desired-s.yaw),Math.cos(desired-s.yaw));const limit=Math.abs(angle)>.3?4:d<12?4:16;
    const keys=[];if(s.speed<limit)keys.push('KeyW');else if(s.speed>limit+1)keys.push('KeyS');if(angle>.05)keys.push('KeyA');if(angle<-.05)keys.push('KeyD');
    await setKeys(page,keys);await page.waitForTimeout(180);
  }throw new Error(`Could not drive to ${x},${z}; state=${JSON.stringify((await state(page)).car)}`);}finally{await setKeys(page,[]);}
}
