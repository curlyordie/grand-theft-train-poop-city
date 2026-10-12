import {test,expect} from '@playwright/test';
import {state,start,walkTo,walkPath,look,faceNPC,attack,brake,driveTo,approachNPC} from './helpers';

test.use({viewport:{width:640,height:480}});
test('NPCs move, talk, take directional melee damage and fight back with pooled effects',async({page})=>{
  test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
  const before=await state(page);await page.waitForTimeout(2200);const after=await state(page);
  expect(after.npcs.some((n:any)=>{const a=before.npcs.find((v:any)=>v.id===n.id);return a&&Math.hypot(a.position[0]-n.position[0],a.position[2]-n.position[2])>.1;})).toBe(true);
  await walkTo(page,6.8,8);let npc=(await state(page)).npcs.find((n:any)=>n.id===0);
  await approachNPC(page,0);await expect(page.locator('#notification')).toContainText('roadworks');
  await faceNPC(page,0);const health=(await state(page)).npcs.find((n:any)=>n.id===0).health;await attack(page);
  await expect.poll(async()=>(await state(page)).npcs.find((n:any)=>n.id===0)?.health).toBeLessThan(health);
  await expect.poll(async()=>(await state(page)).particles).toBeGreaterThan(0);
  await expect.poll(async()=>(await state(page)).health).toBeLessThan(100);
  expect((await state(page)).wanted).toBeGreaterThan(0);expect((await state(page)).police.length).toBeGreaterThan(0);
  const hits=(await state(page)).combat.hits;await look(page,(await state(page)).cameraYaw+Math.PI);await page.waitForTimeout(700);await attack(page);expect((await state(page)).combat.hits).toBe(hits);
  expect((await state(page)).particles).toBeLessThanOrEqual(96);await page.screenshot({path:'test-results/melee-police.png'});
  await page.keyboard.press('Escape');await page.click('#main-menu');await page.click('#new-game');
  await walkTo(page,7.7,25);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Baseball Bat');
  await page.keyboard.press('Digit4');expect((await state(page)).inventory.equipped).toBe('bat');
  await page.keyboard.press('Digit1');await expect(page.locator('#weapon-name')).toHaveText('Unarmed');await page.mouse.wheel(0,100);await expect(page.locator('#weapon-name')).toHaveText('Baseball Bat');
  await page.keyboard.press('Tab');await expect(page.locator('.weapon-list')).toBeVisible();await page.click('#resume');await expect.poll(async()=>(await state(page)).locked).toBe(true);
  npc=(await state(page)).npcs.find((n:any)=>n.id===0);
  await page.keyboard.press('Digit1');await page.waitForTimeout(5500);npc=(await state(page)).npcs.find((n:any)=>n.id===npc.id);
  await walkTo(page,7,8);await approachNPC(page,npc.id);await page.keyboard.press('Digit2');await faceNPC(page,npc.id);await attack(page);
  await expect.poll(async()=>(await state(page)).combat.hits).toBeGreaterThan(hits);expect(errors).toEqual([]);
});

test('handgun pickup, aiming, real hits, ammunition, empty magazine and reload',async({page})=>{
  test.setTimeout(150000);await start(page);await walkPath(page,[[4.8,40],[-5.8,40]]);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Handgun');
  expect((await state(page)).inventory.loaded.handgun).toBe(12);expect((await state(page)).inventory.reserve.bullets).toBe(24);await walkPath(page,[[-4.8,40],[-4.8,34],[-7.7,34]]);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).inventory.reserve.bullets).toBe(48);
  await page.mouse.down({button:'right'});await page.waitForTimeout(200);let hit=false;
  for(let attempt=0;attempt<5&&!hit;attempt++){const s=await state(page);const npc=s.npcs.filter((n:any)=>n.role!=='police'&&n.health>0&&Math.hypot(n.position[0]-s.position[0],n.position[2]-s.position[2])<20).sort((a:any,b:any)=>Math.hypot(a.position[0]-s.position[0],a.position[2]-s.position[2])-Math.hypot(b.position[0]-s.position[0],b.position[2]-s.position[2]))[0];await faceNPC(page,npc.id,true);await attack(page);await page.waitForTimeout(350);hit=(await state(page)).combat.hits>0;}
  expect(hit).toBe(true);await page.mouse.up({button:'right'});const shotState=await state(page);expect(shotState.inventory.loaded.handgun).toBeLessThan(12);expect(shotState.wanted).toBeGreaterThan(0);
  await page.keyboard.press('KeyR');await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBe(12);expect((await state(page)).inventory.reserve.bullets).toBeLessThan(48);
  await page.mouse.down({button:'left'});await expect.poll(async()=>(await state(page)).inventory.loaded.handgun,{timeout:20000}).toBe(0);await page.mouse.up({button:'left'});const shots=(await state(page)).combat.shots;await page.waitForTimeout(500);await attack(page);expect((await state(page)).combat.shots).toBe(shots);
  await page.keyboard.press('KeyR');await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBeGreaterThan(0);

});

test('all eight vehicle classes can be entered, driven, stopped and safely exited',async({page})=>{
  test.setTimeout(300000);await start(page);
  const cases:{id:string;path:number[][]}[]=[{id:'hatchback',path:[[4.3,13]]},{id:'mission-sedan',path:[[4.8,2],[52.7,2],[52.7,18]]},{id:'suv',path:[[4.8,2],[.2,-18]]},{id:'rickshaw',path:[[4,30]]},{id:'motorcycle',path:[[-1,36]]},{id:'pickup',path:[[4.8,2],[100.5,2],[100.5,-35]]},{id:'van',path:[[4.8,2],[148.5,2],[148.5,-112]]},{id:'police',path:[[4.8,2],[-47.5,2],[-47.5,20]]}];
  const tested:string[]=[];
  for(const entry of cases){if(tested.length){await page.keyboard.press('Escape');await page.click('#main-menu');await page.click('#new-game');await expect.poll(async()=>(await state(page)).grounded).toBe(true);}
    await walkPath(page,entry.path);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).vehicleId).toBe(entry.id);await expect.poll(async()=>(await state(page)).driving).toBe(true);
    await page.keyboard.down('KeyW');await expect.poll(async()=>(await state(page)).speed).toBeGreaterThan(3);await brake(page);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).driving).toBe(false);await expect.poll(async()=>(await state(page)).grounded).toBe(true);expect((await state(page)).position[1]).toBeGreaterThan(.7);
    await page.screenshot({path:`test-results/vehicle-${entry.id}.png`});tested.push(entry.id);
  }expect(tested).toHaveLength(8);
});

test('expanded districts, all three missions, one-time rewards, police search and persistent progression',async({page})=>{
  test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
  await walkPath(page,[[7.8,31]]);await expect.poll(async()=>(await state(page)).mission.completed).toEqual([0]);expect((await state(page)).cash).toBe(400);await page.waitForTimeout(2200);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).mission.current).toBe(1);
  await walkPath(page,[[4.8,31],[4.8,2],[52.7,2],[52.7,18]]);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).mission.stage).toBe(1);
  await driveTo(page,50.5,2.5);await driveTo(page,98.5,2.5);await driveTo(page,98.5,45.5);await driveTo(page,4.5,45.5);await driveTo(page,4.5,37,2.5);await expect.poll(async()=>(await state(page)).mission.completed).toEqual([0,1]);expect((await state(page)).cash).toBe(750);await page.waitForTimeout(2200);expect((await state(page)).cash).toBe(750);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).driving).toBe(false);
  await walkPath(page,[[6.8,40],[103,40],[103,-7]]);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).mission.state).toBe('active');
  await walkPath(page,[[103,2],[151,2],[151,-144]]);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).mission.stage).toBe(1);expect((await state(page)).wanted).toBeGreaterThan(0);
  await walkPath(page,[[169,-144],[169,-120]]);await expect.poll(async()=>(await state(page)).searching).toBe(true);const last=(await state(page)).policeLastKnown;await page.waitForTimeout(1500);expect((await state(page)).policeLastKnown).toEqual(last);
  await expect.poll(async()=>(await state(page)).wanted,{timeout:70000}).toBe(0);
  await walkPath(page,[[169,-144],[151,-144],[151,2],[103,2],[103,-7]]);await expect.poll(async()=>(await state(page)).mission.completed).toEqual([0,1,2]);expect((await state(page)).cash).toBe(1350);
  await page.keyboard.press('Escape');await page.click('#main-menu');await page.click('#continue');expect((await state(page)).mission.completed).toEqual([0,1,2]);
  const frames=(await state(page)).frame;await page.waitForTimeout(2000);expect((await state(page)).frame-frames).toBeGreaterThan(15);await page.screenshot({path:'test-results/expanded-missions-complete.png'});expect(errors).toEqual([]);
});

test('industrial shotgun and ammunition pickups, shell reload and hostile damage',async({page})=>{
  test.setTimeout(150000);await start(page);await walkPath(page,[[4.8,2],[151,2],[151,-130]]);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).inventory.reserve.shells).toBe(12);
  await walkTo(page,151,-134);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Shotgun');expect((await state(page)).inventory.loaded.shotgun).toBe(6);
  await page.keyboard.press('Digit1');await walkTo(page,151,-156);await page.keyboard.press('Digit5');await page.mouse.down({button:'right'});await page.waitForTimeout(200);await faceNPC(page,24,true);await attack(page);await expect.poll(async()=>(await state(page)).npcs.find((n:any)=>n.id===24)?.health).toBeLessThan(70);await page.mouse.up({button:'right'});
  expect((await state(page)).inventory.loaded.shotgun).toBe(5);await page.keyboard.press('KeyR');await expect.poll(async()=>(await state(page)).inventory.loaded.shotgun).toBe(6);expect((await state(page)).inventory.reserve.shells).toBe(23);
  await page.mouse.down({button:'right'});await faceNPC(page,24,true);await attack(page);await expect.poll(async()=>(await state(page)).npcs.find((n:any)=>n.id===24)?.state).toBe('incapacitated');await page.mouse.up({button:'right'});
});

test('all five districts are navigable, pipe pickup works and traffic advances on real roads',async({page})=>{
  test.setTimeout(220000);await start(page);
  await walkPath(page,[[4.8,2],[-137,2],[-137,-45]]);await expect(page.locator('.district h2')).toHaveText('Downtown');
  const before=(await state(page)).vehicles.find((v:any)=>v.id==='traffic-0').position;await page.waitForTimeout(2500);const after=(await state(page)).vehicles.find((v:any)=>v.id==='traffic-0').position;expect(Math.hypot(before[0]-after[0],before[2]-after[2])).toBeGreaterThan(2);
  await walkPath(page,[[-137,2],[103,2],[103,-20]]);await expect(page.locator('.district h2')).toHaveText('Industrial District');await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Metal Pipe');await page.keyboard.press('Digit1');
  await walkPath(page,[[103,2],[7.1,2],[7.1,-150]]);await expect(page.locator('.district h2')).toHaveText('Residential');expect((await state(page)).position[1]).toBeGreaterThan(.7);
  await walkPath(page,[[7.1,2],[7.1,152]]);await expect(page.locator('.district h2')).toHaveText('Outskirts');expect((await state(page)).position[1]).toBeGreaterThan(.7);
  await page.screenshot({path:'test-results/outskirts.png'});
});

test('seated police drivers have separate damageable hitboxes',async({page})=>{
  test.setTimeout(120000);await start(page);await walkPath(page,[[4.8,40],[-5.8,40]]);await page.keyboard.press('KeyE');await attack(page);await expect.poll(async()=>(await state(page)).police.length).toBeGreaterThan(0);
  await page.mouse.down({button:'right'});let damaged=false;
  for(let attempt=0;attempt<14&&!damaged;attempt++){
    const s=await state(page),target=s.vehicles.filter((v:any)=>v.id.startsWith('patrol')&&v.driver&&v.driverPosition).sort((a:any,b:any)=>Math.hypot(a.position[0]-s.position[0],a.position[2]-s.position[2])-Math.hypot(b.position[0]-s.position[0],b.position[2]-s.position[2]))[0];
    if(!target){await page.waitForTimeout(250);continue;}
    const dx=target.driverPosition[0]-s.position[0],dz=target.driverPosition[2]-s.position[2],d=Math.hypot(dx,dz);
    await look(page,Math.atan2(-dx,-dz)+Math.asin(Math.min(.5/d,.5)),Math.atan2(s.position[1]+.95-target.driverPosition[1]-.23,d));await attack(page);await page.waitForTimeout(350);
    damaged=(await state(page)).vehicles.some((v:any)=>v.id.startsWith('patrol')&&v.driverHealth<90);
    if((await state(page)).inventory.loaded.handgun===0){await page.keyboard.press('KeyR');await page.waitForTimeout(1700);}
  }
  await page.mouse.up({button:'right'});expect(damaged).toBe(true);
});


test('buildings block firearm hits on NPCs behind walls',async({page})=>{
  test.setTimeout(100000);await start(page);await walkPath(page,[[4.8,40],[-5.8,40]]);await page.keyboard.press('KeyE');await page.keyboard.press('Digit1');
  await walkPath(page,[[-4.8,40],[-4.8,48],[9.3,48],[9.3,15]]);const target=(await state(page)).npcs.find((n:any)=>n.id===12);expect(target).toBeTruthy();const health=target.health;
  await page.keyboard.press('Digit4');await page.mouse.down({button:'right'});await faceNPC(page,12,true);await attack(page);await page.waitForTimeout(350);expect((await state(page)).npcs.find((n:any)=>n.id===12).health).toBe(health);expect((await state(page)).inventory.loaded.handgun).toBe(11);await page.mouse.up({button:'right'});
});
