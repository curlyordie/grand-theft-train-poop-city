import {test,expect} from '@playwright/test';
import {start,state,walkPath,look,attack} from './helpers';
test.use({viewport:{width:640,height:480}});
test('city batches render buildings, street remains clear, walls block movement and loot is plentiful',async({page})=>{
  const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
  await start(page);let s=await state(page);expect(s.cityBatches).toBeGreaterThan(40);expect(s.cityTriangles).toBeGreaterThan(30000);expect(s.lootCount).toBeGreaterThan(50);expect(s.vehicles.filter((v:any)=>!v.ai).length).toBeGreaterThan(25);
  expect(s.vehicles.filter((v:any)=>!v.ai&&v.spawnBlocked).map((v:any)=>v.id)).toEqual([]);
  await look(page,-Math.PI/2);await page.keyboard.down('KeyW');await page.waitForTimeout(2200);await page.keyboard.up('KeyW');s=await state(page);expect(s.position[0]).toBeGreaterThan(8);expect(s.position[0]).toBeLessThan(10);expect(s.health).toBe(100);expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/restored-city.png'});
});
test('aim turns the character behind and reselecting a gun preserves partial reload',async({page})=>{
  test.setTimeout(120000);await start(page);await walkPath(page,[[4.8,40],[-5.8,40]]);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Handgun');
  await look(page,Math.PI);await page.mouse.down({button:'right'});await expect.poll(async()=>{const s=await state(page);return Math.abs(Math.atan2(Math.sin(s.characterYaw-s.cameraYaw),Math.cos(s.characterYaw-s.cameraYaw)));}).toBeLessThan(.05);
  await attack(page);await page.mouse.up({button:'right'});const before=await state(page);expect(before.inventory.loaded.handgun).toBeLessThan(12);
  await page.keyboard.press('KeyR');await expect.poll(async()=>(await state(page)).reloading).toBeGreaterThan(0);await page.keyboard.press('Digit4');await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBe(12);expect((await state(page)).inventory.reserve.bullets).toBe(before.inventory.reserve.bullets-(12-before.inventory.loaded.handgun));
});
