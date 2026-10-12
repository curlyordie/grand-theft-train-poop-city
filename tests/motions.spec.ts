import {test,expect} from '@playwright/test';
import {start,state,walkTo,brake} from './helpers';
test.use({viewport:{width:320,height:240},trace:'off'});
test('uploaded clips drive movement, jumping, punches, pickups and reloads',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 const arm=(await state(page)).characterArm;
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await state(page)).animations.walk??0).toBeGreaterThan(0);expect((await state(page)).characterArm).not.toEqual(arm);await page.keyboard.up('KeyW');
 await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyS');await expect.poll(async()=>(await state(page)).animations.backwards??0).toBeGreaterThan(0);await page.keyboard.up('KeyS');await page.keyboard.up('ShiftLeft');
 await page.keyboard.down('KeyA');await expect.poll(async()=>(await state(page)).animations.strafe??0).toBeGreaterThan(0);await page.keyboard.up('KeyA');
 await page.keyboard.press('Space');await expect.poll(async()=>(await state(page)).animations.jump??0).toBeGreaterThan(0);await expect.poll(async()=>(await state(page)).animations.land??0).toBeGreaterThan(0);
 await page.mouse.click(160,120);await expect.poll(async()=>(await state(page)).animations.punch??0).toBeGreaterThan(0);
 await walkTo(page,5.2,18,.7);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Handgun');await expect.poll(async()=>(await state(page)).animations.pickup??0).toBeGreaterThan(0);
 await page.mouse.down();await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBeLessThan(12);await page.mouse.up();await page.keyboard.press('KeyR');await expect.poll(async()=>(await state(page)).animations.reload??0).toBeGreaterThan(0);await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBe(12);expect(errors).toEqual([]);
});
test('driving animation fits the cabin while straight driving stays safe',async({page})=>{
 test.setTimeout(120000);await start(page);await walkTo(page,3.2,12.5);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).driving).toBe(true);await expect.poll(async()=>(await state(page)).animations.drive??0).toBeGreaterThan(0);
 await page.keyboard.down('KeyW');await expect.poll(async()=>Math.abs((await state(page)).speed)).toBeGreaterThan(10);await brake(page);const s=await state(page);expect(s.crashes).toBe(0);expect(s.health).toBe(100);
 const bounds=s.driverBounds;expect(bounds).toBeTruthy();for(let i=0;i<3;i++){expect(bounds.min[i]).toBeGreaterThanOrEqual(bounds.limits[0][i]-.001);expect(bounds.max[i]).toBeLessThanOrEqual(bounds.limits[1][i]+.001);}
 await page.screenshot({path:'test-results/animated-driver.png'});
});
