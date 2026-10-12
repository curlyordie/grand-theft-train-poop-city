import{test,expect}from'@playwright/test';
import{state,walkTo,brake}from'./helpers';
test.use({viewport:{width:480,height:360},trace:'off'});
test('retrowave world and recorded audio follow real pickups, firing, reloads, rewards and driving',async({page})=>{
 test.setTimeout(360000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/');await expect(page.locator('#new-game')).toBeVisible({timeout:60000});await page.click('#new-game',{timeout:90000});await expect.poll(async()=>(await state(page)).grounded).toBe(true);
 await expect.poll(async()=>(await state(page)).audio.ready).toBe(true);expect((await state(page)).music.sources).toBe(2);
 await page.keyboard.down('KeyW');await expect.poll(async()=>(await state(page)).audio.plays.step??0).toBeGreaterThan(0);await page.keyboard.up('KeyW');
 await walkTo(page,5.2,18,.7);await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('Handgun');expect((await state(page)).audio.plays.pickup).toBeGreaterThan(0);
 await page.mouse.down();await expect.poll(async()=>(await state(page)).audio.plays.pistol??0).toBeGreaterThan(0);await page.mouse.up();await page.keyboard.press('KeyR');await expect.poll(async()=>(await state(page)).audio.plays.reloadPistol??0).toBeGreaterThan(0);await expect.poll(async()=>(await state(page)).inventory.loaded.handgun).toBe(12);
 await page.keyboard.press('Digit1');await walkTo(page,5.2,28);await walkTo(page,8.8,31);await expect.poll(async()=>(await state(page)).audio.plays.coins??0).toBeGreaterThan(0);expect((await state(page)).audio.plays.bell).toBeGreaterThan(0);
 expect((await state(page)).audio.error).toBe('');expect(errors).toEqual([]);
 await page.keyboard.press('Escape');await page.click('#main-menu');await page.click('#new-game');await walkTo(page,3.2,12.5);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).driving).toBe(true);await page.keyboard.down('KeyW');await expect.poll(async()=>Math.abs((await state(page)).speed)).toBeGreaterThan(10);await brake(page);
 expect((await state(page)).audio.engine.driving).toBe(true);expect((await state(page)).audio.loops).toBe(4);expect((await state(page)).music.mode).toMatch(/NIGHT DRIVE|PURSUIT|DANGER/);
 await page.keyboard.press('Escape');await expect.poll(async()=>(await state(page)).music.audible).toBe(false);
 await page.locator('[data-page="settings"]').click();await page.locator('#music-volume').focus();await page.keyboard.press('Home');expect((await state(page)).music.volume).toBe(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('grand-theft-train-poop-city-save-v1-settings')!).music)).toBe(0);
 await page.click('#back');await page.click('#resume');await page.screenshot({path:'test-results/retrowave-world.png'});
 expect((await state(page)).audio.error).toBe('');expect(errors).toEqual([]);
});
