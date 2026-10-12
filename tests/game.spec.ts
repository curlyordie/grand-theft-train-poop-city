import { test, expect, type Page } from '@playwright/test';
import { walkTo,walkPath } from './helpers';

const snapshot = (page: Page) => page.evaluate(() => (window as any).__game.snapshot());
async function holdUntil(page: Page, keys: string[], predicate: (state: any) => boolean, timeout = 20000) {
  for (const key of keys) await page.keyboard.down(key);
  try { await expect.poll(async () => predicate(await snapshot(page)), { timeout, intervals: [100] }).toBe(true); }
  finally { for (const key of keys) await page.keyboard.up(key); }
}
async function start(page: Page) {
  await page.goto('/'); await page.waitForFunction(() => (window as any).__game);
  await page.click('#new-game'); await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
}
async function enterCar(page: Page) {
  await holdUntil(page, ['KeyW', 'KeyA'], s => s.prompt.includes('Enter'));
  await page.keyboard.press('KeyE'); await expect.poll(async () => (await snapshot(page)).driving).toBe(true);
}

test('title, working controls/settings/credits, pause and checkpoint restart', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page).toHaveTitle('Grand Theft Train: Poop City');
  await page.click('[data-page="controls"]'); await expect(page.locator('.control-grid')).toContainText('Move / steer');
  await page.click('#back'); await page.click('[data-page="settings"]');
  await page.locator('#volume').fill('0.2'); await expect(page.locator('#volume-output')).toHaveText('20%');
  await page.click('#back'); await page.click('[data-page="credits"]'); await expect(page.locator('.credits-copy')).toContainText('Original procedural');
  await page.click('#back'); await page.click('#new-game'); await expect(page.locator('#hud')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#resume')).toBeVisible();
  const before = (await snapshot(page)).position;
  await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW');
  expect((await snapshot(page)).position).toEqual(before);
  await page.click('#restart'); await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await page.keyboard.press('Escape'); await page.click('#main-menu'); await expect(page.locator('#continue')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('walk, sprint, jump, camera orbit and building collision', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page);
  const before = await snapshot(page);
  await holdUntil(page, ['KeyS'], s => s.position[2] > before.position[2] + 3);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).position[1]).toBeGreaterThan(1.3);
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
  expect((await snapshot(page)).position[1]).toBeLessThan(1);
  const cameraYaw = (await snapshot(page)).cameraYaw;
  await page.mouse.move(450, 280); await page.mouse.move(650, 300, { steps: 5 });
  await expect.poll(async () => Math.abs((await snapshot(page)).cameraYaw - cameraYaw)).toBeGreaterThan(.1);
  // Restart restores the documented camera orientation. The first shop begins at x=10.
  await page.keyboard.press('Escape'); await page.click('#restart');
  await expect.poll(async () => (await snapshot(page)).cameraDistance).toBeGreaterThan(4);
  await page.screenshot({ path: 'test-results/rab-hoops.png' });
  await holdUntil(page, ['KeyD', 'ShiftLeft'], s => s.position[0] > 9.3);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1000); await page.keyboard.up('KeyD');
  const wall = await snapshot(page); expect(wall.position[0]).toBeLessThan(9.75); expect(wall.position[1]).toBeLessThan(1);
  expect(wall.cameraDistance > 1.2 || !wall.characterVisible).toBe(true);
  await page.screenshot({ path: 'test-results/camera-wall-clearance.png' });
  expect(errors).toEqual([]);
});

test('enter, accelerate, steer, brake, reverse, safely exit without a queued jump', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page); await enterCar(page);
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await snapshot(page)).speed, {intervals:[50]}).toBeGreaterThan(4);
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await snapshot(page)).exitAttemptSpeed).toBeGreaterThan(3);
  expect((await snapshot(page)).driving).toBe(true);
  await page.keyboard.up('KeyW');
  const yaw = (await snapshot(page)).yaw;
  await holdUntil(page, ['KeyW', 'KeyD'], s => Math.abs(s.yaw - yaw) > .2);
  await holdUntil(page, ['Space'], s => Math.abs(s.speed) < .2);
  await holdUntil(page, ['KeyS'], s => s.speed < -2);
  await holdUntil(page, ['Space'], s => Math.abs(s.speed) < .2);
  await page.keyboard.press('KeyE'); await expect.poll(async () => (await snapshot(page)).driving).toBe(false);
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
  const state = await snapshot(page); expect(state.position[1]).toBeLessThan(1); expect(state.car[1]).toBeGreaterThan(.5); expect(state.car[1]).toBeLessThan(.7);
  expect(Math.hypot(state.position[0] - state.car[0], state.position[2] - state.car[2])).toBeGreaterThan(1.7);
  await page.screenshot({ path: 'test-results/driving-exit.png' }); expect(errors).toEqual([]);
});

test('Buckfast stores at full health, disappears, saves and continues', async ({ page }) => {
  await start(page);
  // The nearest bottle is at (7.8, 21), away from the car and the checkpoint.
  await holdUntil(page, ['KeyS'], s => s.position[2] > 19.8);
  await holdUntil(page, ['KeyD'], s => s.prompt.includes('Buckfast'));
  await page.keyboard.press('KeyE'); await expect.poll(async () => (await snapshot(page)).bottles).toBe(1);
  const state = await snapshot(page); expect(state.health).toBe(100); expect(state.collected).toEqual([0]);
  await page.keyboard.press('KeyB'); expect((await snapshot(page)).bottles).toBe(1);
  await holdUntil(page, ['KeyS'], s => s.prompt.includes('Rab’s rooms'));
  await expect.poll(async () => (await snapshot(page)).mission.completed).toContain(0);
  await page.waitForTimeout(2200); await page.keyboard.press('KeyE'); await expect.poll(async () => (await snapshot(page)).mission.state).toBe('active');
  await page.keyboard.press('Escape'); await page.click('#main-menu'); await page.click('#continue');
  await expect.poll(async () => (await snapshot(page)).collected).toEqual([0]);
  expect((await snapshot(page)).bottles).toBe(1);
  await page.keyboard.press('Escape'); await page.click('#main-menu'); await page.click('#new-game');
  await expect.poll(async () => (await snapshot(page)).collected).toEqual([]); expect((await snapshot(page)).bottles).toBe(0);
});

test('high-speed building impact damages health; stored Buckfast heals with a cap', async ({ page }) => {
  test.setTimeout(180000);await page.setViewportSize({width:320,height:240});
  await start(page);await walkPath(page,[[4.9,21],[7.8,21]]);
  await expect.poll(async()=>(await snapshot(page)).prompt).toContain('Buckfast');
  await page.keyboard.press('KeyE'); await expect.poll(async () => (await snapshot(page)).bottles).toBe(1);
  await page.keyboard.press('Escape'); await page.click('#restart'); await enterCar(page);
  await holdUntil(page, ['KeyW'], s => s.speed > 13);
  await holdUntil(page, ['KeyW', 'KeyD'], s => s.health < 100, 35000);
  const damaged = await snapshot(page); expect(damaged.health).toBeGreaterThan(0); expect(damaged.car[1]).toBeLessThan(.7);
  await holdUntil(page, ['Space'], s => Math.abs(s.speed) < .2);
  await page.keyboard.press('KeyB'); await expect.poll(async () => (await snapshot(page)).bottles).toBe(0);
  expect((await snapshot(page)).health).toBe(Math.min(100, damaged.health + 35));
});
