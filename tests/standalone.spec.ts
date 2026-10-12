import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createServer, type Server } from 'node:http';
let localServer:Server;let localDocument:string;

test.use({viewport:{width:320,height:240},trace:'off'});

test.beforeAll(async () => {
  execFileSync('npm', ['run', 'build:html'], { timeout: 60000, stdio: 'pipe' });
  localServer=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');createReadStream(resolve('dist/Grand-Theft-Train-Poop-City.html')).pipe(res);});
  await new Promise<void>(done=>localServer.listen(0,'127.0.0.1',done));
  localDocument=`http://127.0.0.1:${(localServer.address() as {port:number}).port}/game.html`;
});
test.afterAll(()=>new Promise<void>(done=>localServer.close(()=>done())));

test('standalone HTML supports offline Chrome gameplay with no external requests', async ({ page, context }, testInfo) => {
  // This exercises two cold starts of the complete embedded art bundle.
  test.setTimeout(360000);
  const errors: string[] = [], networkRequests: string[] = [];
  const memoryDocument = localDocument;
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && request.url() !== memoryDocument) networkRequests.push(request.url()); });
  await context.setOffline(true);
  const filename = resolve('dist/Grand-Theft-Train-Poop-City.html');
  try { await page.goto(pathToFileURL(filename).href); }
  catch (error) {
    if (!String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
    // Respect managed Chrome's file-URL policy. Exercise the exact document without modifying policy.
    testInfo.annotations.push({ type: 'file-navigation-blocked', description: 'Managed Chrome blocks file URLs; validated the same HTML offline after streaming it over loopback at a stable origin for saving.' });
    // Stream the large document over loopback instead of copying it through the browser protocol.
    await context.setOffline(false);await page.goto(memoryDocument);await context.setOffline(true);
  }
  await expect(page).toHaveTitle('Grand Theft Train: Poop City');
  // Embedded image decoding and first shader compilation are slower in software Chrome.
  await expect(page.locator('#new-game')).toBeVisible({timeout:60000});
  await page.click('#new-game',{timeout:90000}); await expect(page.locator('#hud')).toBeVisible();
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
  expect(errors).toEqual([]); expect(networkRequests).toEqual([]);
  await context.setOffline(false);await page.reload();await context.setOffline(true); await page.click('#continue'); await expect(page.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]); expect(networkRequests).toEqual([]);
  await page.screenshot({ path: 'test-results/standalone-file-game.png' });
});
