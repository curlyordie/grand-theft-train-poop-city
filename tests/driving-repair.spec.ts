import {test,expect} from '@playwright/test';
import {start,state,walkTo,brake} from './helpers';
test.use({viewport:{width:320,height:240},trace:'off'});
test('straight driving and pavement crossing do not report ground crashes',async({page})=>{
 test.setTimeout(240000);await start(page);await walkTo(page,3.2,12.5);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).driving).toBe(true);
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await state(page)).car[2],{timeout:45000}).toBeLessThan(-35);await brake(page);
 let s=await state(page);expect(s.crashes).toBe(0);expect(s.health).toBe(100);expect(s.driving).toBe(true);
 // Drive onto the western pavement through an open gap, without a terrain impact.
 await page.keyboard.press('Escape');await page.click('#main-menu');await page.click('#new-game');await expect.poll(async()=>(await state(page)).grounded).toBe(true);
 await walkTo(page,3.2,12.5);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).driving).toBe(true);
 await page.keyboard.down('KeyW');await page.keyboard.down('KeyA');await expect.poll(async()=>(await state(page)).car[0],{timeout:45000}).toBeLessThan(-6);await page.keyboard.up('KeyA');await brake(page);s=await state(page);expect(s.car[0]).toBeLessThan(-6);expect(s.crashes).toBe(0);expect(s.health).toBe(100);
 await page.screenshot({path:'test-results/pavement-driving.png'});
});
test('dense street pickups include a nearby firearm with working reload',async({page})=>{
 test.setTimeout(90000);await start(page);expect((await state(page)).lootCount).toBeGreaterThan(200);await walkTo(page,5.2,18,.7);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Handgun');
 await page.mouse.down();await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBeLessThan(12);await page.mouse.up();await page.keyboard.press('KeyR');await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBe(12);
});
