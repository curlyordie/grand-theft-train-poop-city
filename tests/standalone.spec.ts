import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test.use({viewport:{width:480,height:360},trace:'off'});

test.beforeAll(() => {
  execFileSync('npm', ['run', 'build:html'], { timeout: 60000, stdio: 'pipe' });
});

test('standalone HTML supports offline Chrome gameplay with no external requests', async ({ page, context }, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = [], networkRequests: string[] = [];
  const memoryDocument = 'http://standalone.test/game.html';
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && request.url() !== memoryDocument) networkRequests.push(request.url()); });
  await context.setOffline(true);
  const filename = resolve('dist/Grand-Theft-Train-Poop-City.html');
  try { await page.goto(pathToFileURL(filename).href); }
  catch (error) {
    if (!String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
    // Respect managed Chrome's file-URL policy. Exercise the exact document without modifying policy.
    testInfo.annotations.push({ type: 'file-navigation-blocked', description: 'Managed Chrome blocks file URLs; validated the same HTML offline, supplied from memory at a stable origin for saving.' });
    const html = await readFile(filename, 'utf8');
    await page.route(memoryDocument, route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(memoryDocument);
  }
  await expect(page).toHaveTitle('Grand Theft Train: Poop City');
  await expect(page.locator('#new-game')).toBeVisible();
  await page.click('#new-game'); await expect(page.locator('#hud')).toBeVisible();
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyA');
  await expect(page.locator('#interaction')).toContainText('Enter the Shanti', { timeout: 20000 });
  await page.keyboard.up('KeyW'); await page.keyboard.up('KeyA');
  await page.keyboard.press('KeyE'); await expect(page.locator('#drive-hud')).toBeVisible();
  await page.keyboard.down('KeyW');
  await expect.poll(async () => Number(await page.locator('#speed').textContent()), { timeout: 20000 }).toBeGreaterThan(30);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('Space');
  await expect.poll(async () => Number(await page.locator('#speed').textContent()), { timeout: 20000 }).toBeLessThan(3);
  await page.keyboard.up('Space'); await page.keyboard.press('KeyE');
  await expect(page.locator('#drive-hud')).toBeHidden();
  await page.keyboard.press('Escape'); await expect(page.locator('#resume')).toBeVisible();
  await page.click('#main-menu'); await expect(page.locator('#continue')).toBeEnabled();
  await page.reload(); await page.click('#continue'); await expect(page.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]); expect(networkRequests).toEqual([]);
  await page.screenshot({ path: 'test-results/standalone-file-game.png' });
});
