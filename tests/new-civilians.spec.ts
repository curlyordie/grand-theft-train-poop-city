import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 720, height: 360 }, trace: 'off' });
test('additional civilians preserve Remy, use their own motion profiles and finish random actions and death', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[]=[];
  const failure=new Promise<never>((_,reject)=>page.on('pageerror',error=>{errors.push(error.message);reject(error);}));
  await page.route('**/civilian-lab', route=>route.fulfill({contentType:'text/html',body:`
    <style>body{margin:0}canvas{display:block}</style><script type="module">
    import * as THREE from '/node_modules/three/build/three.module.js';
    import {loadAssets,humanModel} from '/src/world/assets.ts';
    import {Physics,RAPIER} from '/src/systems/physics.ts';
    import {NPC,NPCSystem} from '/src/systems/npcs.ts';
    import {Vehicle} from '/src/systems/vehicles.ts';
    await Promise.all([loadAssets(),RAPIER.init()]);
    const physics=new Physics(), residents=new NPCSystem(new THREE.Scene(),physics);
    const original=residents.npcs.slice(0,43), added=residents.npcs.slice(43);
    const models=['remy','kurta','cityside','cityside-unrigged','police','boss'];
    const scene=new THREE.Scene();scene.background=new THREE.Color('#251831');
    scene.add(new THREE.HemisphereLight(0xffffff,0x554433,2));
    const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-5,5,-5);scene.add(sun);
    const actors=models.map((kind,i)=>{const m=humanModel(i,kind==='boss',kind==='police',kind==='boss'||kind==='police'?'remy':kind);m.root.position.x=(i-2.5)*1.45;scene.add(m.root);return m;});
    const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.01,30);camera.position.set(0,1.1,-8);camera.lookAt(0,1,0);
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
    const head=m=>{m.root.updateMatrixWorld(true);return (m.root.getObjectByName('mixamorigHead')??m.root.getObjectByName('mixamorig:Head')).getWorldPosition(new THREE.Vector3()).toArray();};
    window.lab={
      residents:()=>({original:original.map(n=>({id:n.id,kind:n.kind,asset:n.model.root.userData.asset})),added:added.map(n=>n.kind),supported:actors.map(m=>[m.root.userData.asset,...m.motion.actions.keys()])}),
      walk:()=>{actors.forEach(m=>{for(let i=0;i<100;i++)m.animate(1/30,1.4);});renderer.render(scene,camera);return actors.map(m=>({name:m.root.userData.asset,head:head(m),arm:(m.root.getObjectByName('mixamorigRightArm')??m.root.getObjectByName('mixamorig:RightArm')).quaternion.toArray()}));},
      clown:()=>{const m=actors[3];m.motion.reset();for(let i=0;i<100;i++)m.animate(1/30,1.4);m.animate(1/30,0,{stopping:true});return{counts:m.motion.counts,current:m.motion.current,start:m.motion.actions.get('start_walk').getClip().duration,stop:m.motion.actions.get('stop').getClip().duration};},
      ambient:()=>{
        const rng=Math.random;let seed=9173;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        try{
          const npcs=models.filter(k=>k!=='boss').map((kind,i)=>new NPC(100+i,kind==='police'?'police':'civilian',[new THREE.Vector3(170+i*2,.82,0),new THREE.Vector3(170+i*2,.82,8)],new THREE.Scene(),physics,kind==='police'?'remy':kind));
          npcs.forEach(n=>{n.setActive(true);n.sync();});
          for(let frame=0;frame<54000;frame++){npcs.forEach(n=>n.update(1/30,new THREE.Vector3(160,.82,-30),false,0,()=>{}));physics.step();npcs.forEach(n=>n.sync());}
          return npcs.map(n=>({kind:n.role==='police'?'police':n.kind,counts:n.model.motion.counts,activity:n.activity}));
        }finally{Math.random=rng;}
      },
      die:()=>{
        const before=actors.map(head);actors.forEach(m=>m.motion.die());
        for(let i=0;i<150;i++)actors.forEach(m=>m.animate(1/30,0));
        const fallen=actors.map(head);renderer.render(scene,camera);
        for(let i=0;i<90;i++)actors.forEach(m=>m.animate(1/30,4));
        return actors.map((m,i)=>({before:before[i],fallen:fallen[i],held:head(m),current:m.motion.current,count:m.motion.counts.death,dead:m.motion.dead}));
      },
      lifecycle:()=>{
        const n=new NPC(300,'civilian',[new THREE.Vector3(185,.82,0),new THREE.Vector3(185,.82,4)],new THREE.Scene(),physics,'kurta');n.setActive(true);n.damage(100,new THREE.Vector3());
        for(let i=0;i<150;i++)n.update(1/30,new THREE.Vector3(),false,0,()=>{});
        const result={dead:n.model.motion.dead,state:n.state,enabled:n.collider.isEnabled(),animation:n.model.motion.current,rotation:n.model.root.rotation.z};
        n.reset();n.setActive(true);return{...result,reset:{dead:n.model.motion.dead,health:n.health,enabled:n.collider.isEnabled()}};
      },
      driver:()=>{
        const vehicle=new Vehicle(new THREE.Scene(),physics),m=humanModel();vehicle.model.root.add(m.root);vehicle.enableDriver(m.root);vehicle.damageDriver(100);
        for(let i=0;i<150;i++)vehicle.updateDriverDeath(1/30);
        const result={dead:m.motion.dead,current:m.motion.current,bounds:m.root.userData.driverBounds};vehicle.enableDriver(m.root);return{...result,reset:m.motion.dead};
      }
    };
    </script>`}));
  await page.goto('/civilian-lab');await Promise.race([page.waitForFunction(()=>(window as any).lab,{timeout:90000}),failure]);
  const residents=await page.evaluate(()=>(window as any).lab.residents());
  expect(residents.original).toHaveLength(43);expect(residents.original.every((n:any)=>n.kind==='remy'&&n.asset==='Remy')).toBe(true);
  for(const kind of ['kurta','cityside','cityside-unrigged'])expect(residents.added.filter((k:string)=>k===kind)).toHaveLength(4);
  for(const supported of residents.supported){expect(supported).toContain('death');expect(supported).toContain('phone');expect(supported).toContain('texting');if(supported[0]==='Cityside Smile')expect(supported).toContain('milk');else expect(supported).not.toContain('milk');}
  const walking=await page.evaluate(()=>(window as any).lab.walk());expect(walking.every((m:any)=>m.head.every(Number.isFinite))).toBe(true);
  await page.screenshot({path:'test-results/new-civilians-walking.png'});
  const clown=await page.evaluate(()=>(window as any).lab.clown());expect(clown.counts.walk).toBeGreaterThan(0);expect(clown.current).toBe('stop');expect(clown.start).toBeGreaterThan(1);expect(clown.stop).toBeGreaterThan(1);
  const ambient=await page.evaluate(()=>(window as any).lab.ambient());
  for(const n of ambient){expect(n.counts.phone??0,JSON.stringify(n)).toBeGreaterThan(0);expect(n.counts.texting??0,JSON.stringify(n)).toBeGreaterThan(0);if(n.kind==='cityside')expect(n.counts.milk??0,JSON.stringify(n)).toBeGreaterThan(0);else expect(n.counts.milk??0).toBe(0);}
  const dying=await page.evaluate(()=>(window as any).lab.die());
  for(const actor of dying){expect(actor.dead).toBe(true);expect(actor.current).toBe('death');expect(actor.count).toBe(1);expect(actor.held).toEqual(actor.fallen);expect(actor.fallen[1]).toBeLessThan(actor.before[1]-.5);}
  await page.screenshot({path:'test-results/new-civilians-death.png'});
  const lifecycle=await page.evaluate(()=>(window as any).lab.lifecycle());expect(lifecycle).toMatchObject({dead:true,state:'incapacitated',enabled:false,animation:'death',rotation:0,reset:{dead:false,health:55,enabled:true}});
  const driver=await page.evaluate(()=>(window as any).lab.driver());expect(driver.dead).toBe(true);expect(driver.current).toBe('death');expect(driver.reset).toBe(false);for(let i=0;i<3;i++){expect(driver.bounds.min[i]).toBeGreaterThanOrEqual(driver.bounds.limits[0][i]-.001);expect(driver.bounds.max[i]).toBeLessThanOrEqual(driver.bounds.limits[1][i]+.001);}
  expect(errors).toEqual([]);
});
