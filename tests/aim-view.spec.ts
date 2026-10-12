import {test,expect} from '@playwright/test';
import {start,state,walkTo,look} from './helpers';
test.use({viewport:{width:320,height:240},trace:'off'});
test('right-click sights zoom, clear the body, follow aim, and restore third person',async({page})=>{
 test.setTimeout(120000);await start(page);await walkTo(page,5.2,18,.7);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Handgun');
 await page.mouse.down({button:'right'});
 await expect.poll(async()=>(await state(page)).characterVisible).toBe(false);
 await expect.poll(async()=>(await state(page)).cameraFov).toBeLessThan(40);
 expect((await state(page)).sightWeaponVisible).toBe(true);
 expect((await state(page)).cameraDistance).toBeLessThan(.8);
 await look(page,Math.PI,.1);expect((await state(page)).characterVisible).toBe(false);
 await page.mouse.down();await expect.poll(async()=>(await state(page)).combat.shots).toBeGreaterThan(0);await page.mouse.up();
 await page.screenshot({path:'test-results/aim-view.png'});
 await page.mouse.up({button:'right'});
 await expect.poll(async()=>(await state(page)).characterVisible).toBe(true);
 await expect.poll(async()=>(await state(page)).cameraFov).toBeGreaterThan(56);
 expect((await state(page)).sightWeaponVisible).toBe(false);
});
