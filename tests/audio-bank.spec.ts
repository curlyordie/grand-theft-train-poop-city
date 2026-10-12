import{test,expect}from'@playwright/test';
test('recorded audio decodes, responds to actions, and stays bounded across pause and mute',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/audio-lab',route=>route.fulfill({contentType:'text/html',body:`<button id="start" disabled>Start audio</button><button id="drive">Drive</button><button id="combat">Combat</button><button id="cash">Money</button><button id="reload">Reload</button><button id="cancel">Cancel reload</button><button id="pause">Pause</button><button id="mute">Mute</button><script type="module">
 import{AudioSystem}from'/src/systems/audio.ts';import{loadAudioAssets,audioData}from'/src/systems/audio-assets.ts';
 const audio=new AudioSystem();let reload;let state={running:false,driving:false,speed:0,movement:0,wanted:0,attacks:0,hurt:false};
 await loadAudioAssets();document.querySelector('#start').disabled=false;
 start.onclick=()=>{audio.unlock();state.running=true};drive.onclick=()=>{state.driving=true;state.speed=23;audio.updateEngine(23,true,true,true,0,'hatchback')};combat.onclick=()=>{state.wanted=3;state.attacks++;audio.play('pistol')};cash.onclick=()=>audio.cash();document.querySelector('#reload').onclick=()=>{reload=audio.play('reloadPistol',{duration:1.4})};cancel.onclick=()=>reload?.stop();pause.onclick=()=>{state.running=false;audio.pause()};mute.onclick=()=>{audio.volume=0;audio.music.volume=0};
 setInterval(()=>audio.updateMusic(state),30);window.lab=()=>({audio:audio.snapshot(),music:audio.music.snapshot(),state:audio.context?.state});
 </script>`}));
 await page.goto('/audio-lab');await expect(page.locator('#start')).toBeEnabled();await page.click('#start');
 const snapshot=()=>page.evaluate(()=>(window as any).lab());
 await expect.poll(async()=>(await snapshot()).audio.ready,{timeout:20000}).toBe(true);
 expect((await snapshot()).state).toBe('running');expect((await snapshot()).music.sources).toBe(2);
 await page.click('#drive');await expect.poll(async()=>(await snapshot()).audio.signal).toBeGreaterThan(.001);
 expect((await snapshot()).audio.gear).toBe(3);await expect.poll(async()=>(await snapshot()).audio.loopGains.skid).toBeGreaterThan(.1);
 await page.click('#combat');await expect.poll(async()=>(await snapshot()).music.mode).toBe('PURSUIT');expect((await snapshot()).music.layers.action).toBeGreaterThan(.5);
 await page.click('#cash');expect((await snapshot()).audio.plays.coins).toBe(1);expect((await snapshot()).audio.plays.bell).toBe(1);
 await page.click('#reload');await page.click('#cancel');expect((await snapshot()).audio.plays.reloadPistol).toBe(1);
 await page.click('#pause');await expect.poll(async()=>(await snapshot()).audio.voices).toBe(0);await expect.poll(async()=>(await snapshot()).music.audible).toBe(false);
 await page.click('#start');await page.click('#mute');await expect.poll(async()=>(await snapshot()).audio.signal).toBeLessThan(.0001);await expect.poll(async()=>(await snapshot()).music.audible).toBe(false);
 expect((await snapshot()).audio.loops).toBe(4);expect((await snapshot()).music.sources).toBe(2);expect((await snapshot()).audio.error).toBe('');expect(errors).toEqual([]);
});
