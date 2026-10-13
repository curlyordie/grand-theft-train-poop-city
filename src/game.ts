import * as THREE from 'three';
import { environment } from './world/assets';
import { grimeTexture } from './world/grit';
import { StreetProps } from './world/street-props';
import { RetrowaveCity } from './world/retrowave';
import { surfaces } from './world/surfaces';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { City, SAFEHOUSE, SPAWN } from './world/city';
import { cylinder, sign } from './world/models';
import { Physics } from './systems/physics';
import { Input } from './systems/input';
import { Player } from './systems/player';
import { FollowCamera } from './systems/camera';
import { UI } from './systems/ui';
import { AudioSystem } from './systems/audio';
import { SaveSystem } from './systems/save';
import { Pickups } from './systems/pickups';
import { Missions } from './systems/missions';
import { NPCSystem } from './systems/npcs';
import { Inventory, WEAPONS } from './systems/inventory';
import { Loot } from './systems/loot';
import { Effects } from './systems/effects';
import { Combat } from './systems/combat';
import { Fleet } from './systems/fleet';
import { Traffic } from './systems/traffic';
import { Police } from './systems/police';

export class Game {
  scene = new THREE.Scene();
  cityBatches: THREE.Mesh[] = [];
  cityDetails: THREE.Object3D[] = [];
  renderer: THREE.WebGLRenderer;
  camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .08, 310);
  physics = new Physics();
  input: Input;
  player: Player;
  fleet: Fleet;
  traffic: Traffic;
  police: Police;
  get vehicle() { return this.fleet.active; }
  follow: FollowCamera;
  pickups: Pickups;
  missions: Missions;
  npcs: NPCSystem;
  inventory = new Inventory();
  loot: Loot;
  effects: Effects;
  combat: Combat;
  streetProps:StreetProps;
  retrowave:RetrowaveCity;
  damageFlash = 0;
  ui: UI;
  audio = new AudioSystem();
  storage = new SaveSystem();
  health = 100;
  deathRemaining=0;
  cash = 250;
  bottles = 0;
  running = false;
  started = false;
  prompt = '';
  footstepTime = 0;
  lastTime = 0;
  accumulator = 0;
  frame = 0;
  private renderRequested = true;
  private lastRenderTime = 0;
  private menuFrameInterval = 1000 / 30;
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.setSize(innerWidth, innerHeight);
    const gl = this.renderer.getContext(); const info = gl.getExtension('WEBGL_debug_renderer_info');
    const software = info && /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)));
    if(software){this.renderer.setPixelRatio(.65);this.menuFrameInterval=1000/3;}
    this.renderer.shadowMap.enabled = !software; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .95;
    const canvas = this.renderer.domElement; canvas.id = 'scene'; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Grand Theft Train: Poop City — 3D game');
    document.querySelector('#app')!.replaceChildren(canvas);
    const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromEquirectangular(environment).texture;pmrem.dispose();this.scene.environmentIntensity=.38;this.scene.background=new THREE.Color('#171027');
     this.scene.fog = new THREE.Fog('#2c193b', 65, 220);
    this.scene.add(new THREE.HemisphereLight('#ad9be7', '#513849', 1.1));
    const fill=new THREE.DirectionalLight('#64c9ef',.65);fill.position.set(24,18,-22);this.scene.add(fill);
    const sun = new THREE.DirectionalLight('#ffc1ba', 1.7); sun.position.set(-34, 58, 30); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -75; sun.shadow.camera.right = 75; sun.shadow.camera.top = 75; sun.shadow.camera.bottom = -75;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 160; sun.shadow.normalBias = .09; sun.shadow.bias = -.0006; this.scene.add(sun);
    const city = new City(this.scene, this.physics); this.batchCity(city.root);this.streetProps=new StreetProps(this.scene,this.physics,city.anchors);
    this.retrowave=new RetrowaveCity(this.scene,city.anchors,!!software);
    this.player = new Player(this.scene, this.physics); this.fleet = new Fleet(this.scene, this.physics); this.traffic = new Traffic(this.scene, this.physics, this.fleet);
    this.npcs = new NPCSystem(this.scene, this.physics);
    this.police = new Police(this.scene, this.physics, this.fleet, this.npcs, message => this.ui.toast(message));
    this.input = new Input(canvas); this.follow = new FollowCamera(this.camera, this.physics);
    this.pickups = new Pickups(this.scene); this.loot = new Loot(this.scene); this.effects = new Effects(this.scene);
    this.combat = new Combat(this.physics, this.player, this.npcs, this.inventory, this.effects, this.audio, (position, severity, force) => this.police.crime(position, severity, force), message => this.ui.toast(message), this.fleet);
    this.missions = new Missions(this.scene, (cash, title) => { this.cash += cash;this.audio.cash(); this.ui.toast(`MISSION COMPLETE · ₹${cash}`, title); this.save(); });
    this.input.onCaptureError = () => this.ui.toast('MOUSE LOOK NOT CAPTURED', 'Click the street to enable mouse look. If denied, allow pointer lock in your browser.');
    const home = new THREE.Group(); home.position.copy(SAFEHOUSE); this.scene.add(home);
    cylinder(home, .8, .8, .045, [0, .08, 0], '#b6d791', 24);
    const marker = new THREE.Mesh(new THREE.ConeGeometry(.22, .5, 4), new THREE.MeshBasicMaterial({ color: '#d5eda6' })); marker.position.y = 2.4; marker.rotation.z = Math.PI; home.add(marker);
    sign(home, 'RAB’S ROOMS • UPSTAIRS', 2.2, .5, [1.15, 2.8, 0], '#345e48', '#f3dfb0', 30).rotation.y = -Math.PI / 2;
    this.ui = new UI({
      newGame: () => this.start(false), continueGame: () => this.start(true), resume: () => this.resume(),
      restart: () => this.restart(), mainMenu: () => this.menu(), pause: () => this.pause(),
      selectWeapon: id => { this.inventory.select(id); this.ui.show('inventory'); },
      settings: (volume, sensitivity, music) => { this.audio.volume = volume;this.audio.music.volume=music; this.follow.sensitivity = sensitivity; this.storage.setSettings({ volume, sensitivity, music }); },
    });
    this.ui.inventory = this.inventory;
    const settings = this.storage.settings(); this.audio.volume = this.ui.volume = settings.volume; this.follow.sensitivity = this.ui.sensitivity = settings.sensitivity;
    this.audio.music.volume=this.ui.music=settings.music;
    this.ui.hasSave = !!this.storage.load(); this.ui.show('menu');
    this.camera.position.set(2, 8.5, 35); this.camera.lookAt(2, 2, -15);
    window.addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight);this.renderRequested=true; });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.running && this.started) this.pause(); });
    window.addEventListener('blur', () => { if (this.running) this.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.running) this.pause(); });
    this.physics.step();
    if (import.meta.env.DEV) {
      // Read-only diagnostics for browser tests. Gameplay tests still use keyboard/mouse input.
      Object.assign(window, { __game: { snapshot: () => this.snapshot() } });
    }
    requestAnimationFrame(this.loop);
  }
  batchCity(root: THREE.Group) {
    root.updateMatrixWorld(true);
    const buckets = new Map<string, THREE.BufferGeometry[]>(), originals: THREE.Mesh[] = [];
    root.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) this.cityDetails.push(object);
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return;
      const geometry = (object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()).applyMatrix4(object.matrixWorld);
      // World-scale UVs avoid stretching a tiny grime texture across a 428m road.
      const positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=geometry.attributes.uv;
      const surface=object.userData.surface;
      const uvScale=surface==='road'?.25:surface==='pavement'?.4:surface==='tin'?.5:.35;
      const roofSpace=surface==='tin'&&object.parent?object.parent.matrixWorld.clone().invert():null;
      const roofPoint=new THREE.Vector3();
      if(uv)for(let i=0;i<positions.count;i++){
        if(roofSpace){roofPoint.fromBufferAttribute(positions,i).applyMatrix4(roofSpace);uv.setXY(i,roofPoint.x*uvScale,roofPoint.z*uvScale);}
        else if(Math.abs(normals.getY(i))>.7)uv.setXY(i,positions.getX(i)*uvScale,positions.getZ(i)*uvScale);
        else uv.setXY(i,(Math.abs(normals.getX(i))>.7?positions.getZ(i):positions.getX(i))*uvScale,positions.getY(i)*uvScale);
      }
      geometry.computeBoundingBox(); const size = geometry.boundingBox!.getSize(new THREE.Vector3()), centre = geometry.boundingBox!.getCenter(new THREE.Vector3());
      const cell = Math.max(size.x, size.z) > 100 ? 'infrastructure' : `${Math.floor(centre.x / 48)},${Math.floor(centre.z / 48)}`;
      const key = `${cell}|${object.userData.surface??(object.material.roughness<.4?'wet':'dry')}`;
      const count = geometry.attributes.position.count, colour = object.material.color, colours = new Float32Array(count * 3);
      for (let i=0;i<count;i++) { colours[i*3]=colour.r; colours[i*3+1]=colour.g; colours[i*3+2]=colour.b; }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours,3));
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key)!.push(geometry); originals.push(object);
    });

    const material = new THREE.MeshStandardMaterial({vertexColors:true,flatShading:false,roughness:.95,map:grimeTexture()});
    const brickMaterial=new THREE.MeshStandardMaterial({...surfaces.plaster,roughness:1,normalScale:new THREE.Vector2(.6,.6)});
    const dirtMaterial=new THREE.MeshStandardMaterial({...surfaces.gravel,roughness:1,normalScale:new THREE.Vector2(.65,.65)});
    const roadMaterial=new THREE.MeshStandardMaterial({...surfaces.road,roughness:1,normalScale:new THREE.Vector2(.5,.5)});
    const pavementMaterial=new THREE.MeshStandardMaterial({...surfaces.pavement,roughness:1,normalScale:new THREE.Vector2(.65,.65)});
    const tinMaterial=new THREE.MeshStandardMaterial({...surfaces.roof,metalness:.45,roughness:1,normalScale:new THREE.Vector2(.7,.7)});
    const rustMaterial=new THREE.MeshStandardMaterial({...surfaces.rust,metalness:1,roughness:1,normalScale:new THREE.Vector2(.65,.65)});
    const wetMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.24,metalness:.18});
    buckets.forEach((geometries,key) => {
      const geometry = mergeGeometries(geometries,false);
      if (!geometry) throw new Error(`City geometry merge failed: ${key}`);
      if (geometry) { geometry.computeBoundingSphere(); const mesh=new THREE.Mesh(geometry,key.endsWith('wet')?wetMaterial:key.endsWith('brick')?brickMaterial:key.endsWith('dirt')?dirtMaterial:key.endsWith('tin')?tinMaterial:key.endsWith('road')?roadMaterial:key.endsWith('pavement')?pavementMaterial:key.endsWith('rust')?rustMaterial:material); mesh.castShadow=mesh.receiveShadow=true; mesh.userData.alwaysVisible=key.startsWith('infrastructure|'); root.add(mesh); this.cityBatches.push(mesh); }
      geometries.forEach(g=>g.dispose());
    });
    originals.forEach(m => m.removeFromParent());
  }
  capture() { this.renderer.domElement.focus(); this.input.capture(this.renderer.domElement); }
  save() {
    const saved = this.storage.save({ version: 1, cash: this.cash, bottles: this.bottles, collected: this.pickups.collected, missions: this.missions.completed, inventory: this.inventory.serialise(), loot: this.loot.collected });
    this.ui.hasSave = saved;
    if (!saved) this.ui.toast('SAVING UNAVAILABLE', 'Browser storage is blocked. This session still works.');
    return saved;
  }
  start(continuing: boolean) {
    this.deathRemaining=0;
    const data = continuing ? this.storage.load() : null;
    this.health = 100; this.cash = data?.cash ?? 250; this.bottles = data?.bottles ?? 0; this.pickups.restore(data?.collected ?? []); this.npcs.reset(); this.missions.restore(data?.missions ?? []); this.inventory.restore(data?.inventory); this.loot.restore(data?.loot ?? []); this.combat.visual();
    this.fleet.reset(); this.traffic.reset(); this.police.reset(); this.player.reset(); this.physics.step(); this.follow.reset(this.player.position);
    this.started = true; this.save(); this.resume();
    this.ui.toast(continuing ? 'BACK TO YOUR POOR DECISIONS' : 'WELCOME TO SUNDARPUR', '“I was having a perfectly shite day before this.”');
  }
  resume() { this.input.clear(); this.ui.hide(); this.running = true;this.input.active=this.health>0; this.accumulator = 0; this.audio.unlock();this.audio.updateMusic({running:true,driving:this.player.driving,speed:0,movement:0,wanted:this.police.level,attacks:this.combat.attacks,hurt:false}); this.audio.play('pickup',{volume:.2}); this.capture(); }
  pause(controls = false) {
    this.running = this.input.active = false; this.input.clear(); this.ui.returnPage = 'pause'; this.ui.show(controls ? 'controls' : 'pause'); document.exitPointerLock(); this.audio.updateEngine(0, false);this.audio.pause();
  }
  menu() { this.save(); this.running = this.input.active = false;this.renderRequested=true; this.input.clear(); this.ui.show('menu'); document.exitPointerLock(); this.audio.updateEngine(0, false);this.audio.pause(); }
  restart() {
    this.deathRemaining=0;
    if (this.missions.state === 'failed') this.missions.interact(SAFEHOUSE.clone().setY(.84));
    else if (this.missions.state === 'active') { this.missions.stage = 0; this.missions.parcel = false; }
    this.fleet.reset(); this.traffic.reset(); this.police.reset(); this.player.reset(); this.health = 100; this.physics.step(); this.follow.reset(this.player.position); this.resume();
    this.ui.toast('BACK AT THE CHECKPOINT', '“Aye, that’s gone well.”');
  }
  damagePlayer(amount: number, source: THREE.Vector3) {
    if (amount <= 0 || this.health<=0) return;
    this.health = Math.max(0, this.health - amount); this.damageFlash = .35;
    this.effects.blood(this.player.position.clone().add(new THREE.Vector3(0,.5,0)), this.player.position.clone().sub(source).setY(0).normalize(), amount > 20);
  }
  private beginDeath(){
    if(this.player.model.motion.dead)return;
    this.health=0;this.deathRemaining=Math.max(.1,this.player.model.motion.die());
    this.input.clear();this.input.active=false;this.player.collider.setEnabled(false);this.prompt='';
    if(this.combat.sightWeapon)this.combat.sightWeapon.visible=false;
    if(this.combat.held)this.combat.held.visible=false;
    this.audio.updateEngine(0,false);
    if(this.player.driving)this.vehicle.speed=0;
  }
  private respawn(){
    this.missions.fail();this.npcs.reset();this.cash=Math.max(0,this.cash-50);
    this.fleet.reset();this.traffic.reset();this.police.reset();this.player.reset();this.health=100;this.deathRemaining=0;this.input.clear();this.input.active=true;this.save();
    this.follow.reset(SPAWN);this.ui.toast('BACK ON YOUR FEET · ₹50 LOST','“I’ve made a series of outstandingly poor decisions.”');
  }
  interact() {
    if (this.player.driving) {
      const message = this.vehicle.exit(this.player);
      this.input.pressed.delete('Space'); // A handbrake press must never become a queued jump on exit.
      if (message) this.ui.toast(message); else this.audio.play('door',{duration:.6,volume:.6});
      return;
    }
    const missionMessage = this.missions.interact(this.player.position);
    if (missionMessage) { if (missionMessage === 'PARCEL COLLECTED') this.police.crime(this.player.position, 1, true); this.ui.toast(missionMessage); return; }
    const loot = this.loot.nearest(this.player.position), item = this.pickups.nearest(this.player.position);
    if (loot && (!item||loot.position.distanceToSquared(this.player.position)<item.position.distanceToSquared(this.player.position))) { const name = this.loot.collect(loot.id, this.inventory);this.player.model.playMotion('pickup',.6,2); this.audio.play(loot.kind==='bullets'||loot.kind==='shells'?'ammo':'pickup'); this.save(); this.ui.toast(`PICKED UP · ${name}`); return; }
    if (item && this.pickups.collect(item.id)) {
      const stored = this.health >= 100;
      if (!stored) this.health = Math.min(100, this.health + 35); else this.bottles++;
      this.audio.play('bottle'); this.save();
      this.ui.toast('BUCKFAST ACQUIRED', stored ? 'Stored when healthy. Press B to use when injured.' : '“That’s medicinal. Probably.”'); return;
    }
    if (this.player.position.clone().setY(0).distanceTo(SAFEHOUSE) < 2.2) {
      this.health = 100; if (this.save()) this.ui.toast('CHECKPOINT SAVED · HEALTH RESTORED', '“Temporary accommodation. Permanent regrets.”'); return;
    }
    const witnessedTheft = this.npcs.witnesses(this.player.position) || !!this.fleet.nearest(this.player)?.driver;
    if (this.fleet.enter(this.player)) {
      if (witnessedTheft) this.police.crime(this.player.position, this.vehicle.definition.kind === 'police' ? 2 : 1, true);
      this.follow.yaw = this.vehicle.yaw; this.audio.play('door',{duration:.6,volume:.6}); this.ui.toast(this.vehicle.definition.name.toUpperCase(), 'Borrowed. Indefinitely.'); return;
    }
    const npc = this.npcs.nearest(this.player.position);
    if (npc) this.ui.toast(this.npcs.interact(npc, this.inventory.equipped !== 'fists'));
  }
  fixedUpdate(dt: number) {
    this.fleet.updateDriverDeaths(dt);
    if(this.health<=0){
      this.beginDeath();this.deathRemaining-=dt;
      if(!this.player.driving)this.player.model.animate(dt,0);
      this.npcs.update(dt,this.player.position,false,this.police.level,()=>{});
      this.effects.update(dt);this.physics.step();this.player.sync();this.npcs.sync();if(this.player.driving)this.player.position.copy(this.vehicle.position);
      if(this.deathRemaining<=0)this.respawn();
      return;
    }
    if (this.input.take('KeyE')) this.interact();
    if (this.input.take('KeyB')) {
      if (!this.bottles) this.ui.toast('NO BUCKFAST IN YOUR POCKETS');
      else if (this.health >= 100) this.ui.toast('ALREADY IN PERFECTLY SHITE HEALTH');
      else { this.bottles--; this.health = Math.min(100, this.health + 35); this.save(); this.audio.play('bottle'); this.ui.toast('HEALTH RESTORED · +35'); }
    }
    WEAPONS.forEach((w, i) => { if (this.input.take(`Digit${i + 1}`)) this.inventory.select(w.id); });
    if (this.input.wheel) { this.inventory.cycle(Math.sign(this.input.wheel)); this.input.wheel = 0; }
    this.player.armed=this.inventory.weapon.type==='firearm';
    const groundedBefore=this.player.grounded,fallSpeed=this.player.velocity.y;
    this.player.update(dt, this.input, this.follow.yaw);
    this.combat.update(dt, this.input, this.camera, this.follow.yaw);
    this.effects.update(dt); this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.fleet.update(dt, this.input, (impact, collider) => {
      const npc=this.npcs.npcs.find(n=>n.active&&n.health>0&&n.collider.handle===collider?.handle);
      if(npc){this.combat.hit(npc,Math.min(60,impact*5),npc.position.clone().add(new THREE.Vector3(0,.5,0)),new THREE.Vector3(-Math.sin(this.vehicle.yaw),0,-Math.cos(this.vehicle.yaw)));if(npc.health>0)npc.state='flee';}
      this.audio.play('crash',{volume:Math.min(1,.35+impact/35),pitch:.9+Math.random()*.15,position:this.vehicle.position});
      if(!collider||!this.physics.safeObstacles.has(collider.handle))this.damagePlayer(Math.min(18, Math.ceil(Math.max(0, impact - 12) * .65)), this.vehicle.position.clone().add(new THREE.Vector3(-Math.sin(this.vehicle.yaw),0,-Math.cos(this.vehicle.yaw))));
      this.ui.toast('THAT’LL BUFF OUT', '“That’s somebody else’s problem now.”');
    });
    this.npcs.targetCollider = this.player.driving ? this.vehicle.collider : this.player.collider;
    this.police.update(dt, this.player.position);
    this.traffic.update(dt, this.player.position, this.police.level > 0);
    this.npcs.update(dt, this.player.position, !this.player.driving && this.inventory.equipped !== 'fists', this.police.level, (amount, npc) => this.damagePlayer(amount, npc.position));
    this.physics.step(); this.player.sync(); this.fleet.sync(); this.npcs.sync(); this.pickups.update(dt);
    if(!groundedBefore&&this.player.grounded&&fallSpeed<-2&&!this.player.driving)this.audio.play('land',{volume:.4});
    if (this.player.driving) this.player.position.copy(this.vehicle.position);
    if (this.health <= 0 || this.player.position.y < -5) {this.beginDeath();return;}
    const motor = this.fleet.vehicles.find(v=>v.id==='mission-sedan'); if(motor)this.missions.motorPosition.copy(motor.position).y=0;
    this.missions.update(dt, { position: this.player.position, vehicleId: this.player.driving ? this.vehicle.id : null, speed: this.vehicle.speed, wanted: this.police.level });
    const nearLoot=this.loot.nearest(this.player.position),nearBottle=this.pickups.nearest(this.player.position);
    const preferLoot=nearLoot&&(!nearBottle||nearLoot.position.distanceToSquared(this.player.position)<nearBottle.position.distanceToSquared(this.player.position));
    this.prompt = this.player.driving ? Math.abs(this.vehicle.speed) > 3 ? '' : `Exit the ${this.vehicle.definition.name}` :
      this.missions.interaction(this.player.position) || (preferLoot ? `Pick up ${this.loot.getName(nearLoot!.kind)}` : this.pickups.nearest(this.player.position) ? 'Collect Buckfast · +35 health / store' :
        this.player.position.clone().setY(0).distanceTo(SAFEHOUSE) < 2.2 ? 'Save at Rab’s rooms · restore health' :
          this.fleet.nearest(this.player) ? `Enter the ${this.fleet.nearest(this.player)!.definition.name}` : this.npcs.nearest(this.player.position) ? 'Talk to local (E)' : '');
    this.footstepTime += dt;
    if (!this.player.driving && this.player.grounded && this.player.velocity.clone().setY(0).length() > 1 && this.footstepTime > .32) { this.audio.play('step',{volume:.32,pitch:.94+Math.random()*.12}); this.footstepTime = 0; }
  }
  loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000 || 0, .25); this.lastTime = time;
    if (this.input.take('Escape')) {
      if (this.running) this.pause();
      else if (this.started && this.ui.page === 'pause') this.resume();
      else if (this.ui.page !== 'menu') this.ui.show(this.ui.returnPage);
    }
    if (this.input.take('Tab')) { if (this.running) { this.pause(); this.ui.show('inventory'); } else if (this.ui.page === 'inventory') this.resume(); }
    if (this.running && this.input.take('KeyH')) this.pause(true);
    if (this.running) {
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) { this.fixedUpdate(1 / 60); this.accumulator -= 1 / 60; }
      this.fleet.vehicles.forEach(v=>v.render(this.accumulator/(1/60)));
      const driving = this.player.driving, position = driving ? this.vehicle.model.root.position.clone().add(new THREE.Vector3(0,this.vehicle.definition.halfHeight+.03,0)) : this.player.position;
      const drivingHeight = this.vehicle.definition.kind === 'van' ? 2 : ['suv','rickshaw','motorcycle'].includes(this.vehicle.definition.kind) ? 1.6 : 1.15;
      this.follow.update(dt, this.input, position, driving, driving ? this.vehicle.body : this.player.body, this.vehicle.model.root.rotation.y, !driving && this.input.aiming && this.inventory.weapon.type === 'firearm', drivingHeight);
      // Hide the character when wall avoidance brings the camera inside his silhouette.
      this.player.model.root.visible = !this.follow.wasAiming && this.camera.position.distanceTo(this.follow.target) > 1.2;
      if (this.combat.held) this.combat.held.visible=!driving&&this.health>0;
      if (driving) {
        const open=this.vehicle.definition.kind==='motorcycle'||this.vehicle.definition.kind==='rickshaw';
        this.player.model.animateDriving(dt,open);
        const kind=this.vehicle.definition.kind,seatDesired=new THREE.Vector3(open?0:.32,kind==='motorcycle'?.3:.18,.1);
        const cabinHeight=kind==='van'?2.2:kind==='rickshaw'?1.7:kind==='pickup'?1.9:1.38;
        const fit=kind==='motorcycle'?{scale:.9,position:seatDesired}:this.player.model.fitDriving(new THREE.Vector3(-this.vehicle.definition.halfWidth+.1,.07,-this.vehicle.definition.halfLength+.2),new THREE.Vector3(this.vehicle.definition.halfWidth-.1,cabinHeight,this.vehicle.definition.halfLength-.2),open?.85:.65,seatDesired);
        this.player.model.root.scale.setScalar(fit.scale);
        const seat=fit.position;
        this.vehicle.model.root.updateMatrixWorld(true);this.vehicle.model.root.localToWorld(seat);
        this.player.model.root.position.copy(seat);this.player.model.root.rotation.y=this.vehicle.model.root.rotation.y;
        this.player.model.root.rotation.z=this.vehicle.model.root.rotation.z;
        this.player.model.legs.forEach(leg=>leg.rotation.x=.7);this.player.model.arms.forEach(arm=>arm.rotation.x=.9);
      } else {this.player.model.poseDriving(false);this.player.model.root.scale.setScalar(1);this.player.model.root.rotation.z=0;}
      this.audio.updateEngine(this.vehicle.speed,driving&&this.health>0,this.input.down('KeyW')||this.input.down('KeyS'),this.input.down('Space'),this.input.down('KeyA')||this.input.down('KeyD')?1:0,this.vehicle.definition.kind);
      this.ui.update(dt, { player: this.player.position, car: this.vehicle.position, yaw: this.follow.yaw, driving, speed: this.vehicle.speed, health: this.health, cash: this.cash, bottles: this.bottles, prompt: this.prompt, collected: this.pickups.collected.length, distanceDriven: this.vehicle.distanceDriven, missionName: this.missions.name, objective: this.missions.objective, vehicleName: this.vehicle.definition.name, weapon: this.inventory.weapon.name, ammo: this.inventory.weapon.ammo ? `${this.inventory.magazine} / ${this.inventory.reserve[this.inventory.weapon.ammo]}` : 'MELEE', reloading: this.inventory.reloading > 0, damageFlash: this.damageFlash, wanted: this.police.level, searching: !this.police.seen, missionTarget: this.missions.target, locked: this.input.locked });
    } else if (!this.started || this.ui.page === 'menu') {
      this.camera.position.set(2 + Math.sin(time * .00007) * .5, 8.5, 35); this.camera.lookAt(2, 2, -15);
    }
    const location=this.running?this.player.position:new THREE.Vector3(2,0,15);
    this.audio.setListener(this.camera.position,this.camera.getWorldDirection(new THREE.Vector3()));
    this.audio.updateMusic({running:this.running,driving:this.player.driving,speed:this.vehicle.speed,movement:Math.hypot(this.player.velocity.x,this.player.velocity.z),wanted:this.police.level,attacks:this.combat.attacks,hurt:this.damageFlash>0});
    const music=this.audio.music.snapshot();
    this.ui.hud.querySelector('#music-mode')!.textContent=this.audio.music.volume===0||this.audio.volume===0?'MUSIC OFF':music.mode;
    const menuVisible=!this.started||this.ui.page==='menu';
    // Keep a frozen view behind pause/settings, while polling input and audio normally.
    // Resize invalidates that view; gameplay always renders the next animation frame.
    if(this.running||this.renderRequested||(menuVisible&&time-this.lastRenderTime>=this.menuFrameInterval)){
      this.retrowave.update(this.camera,location,music.beat,this.police.level/3+(this.player.driving?Math.min(1,Math.abs(this.vehicle.speed)/30):0)*.3);
      this.loot.update(location);
      this.streetProps.update(location);
      this.cityBatches.forEach(mesh=>{const bound=mesh.geometry.boundingSphere!;mesh.visible=mesh.userData.alwaysVisible||bound.center.distanceTo(location)<160+bound.radius;});
      this.cityDetails.forEach(object=>{object.visible=object.getWorldPosition(new THREE.Vector3()).distanceTo(location)<135;});
      this.renderer.render(this.scene, this.camera);this.frame++;this.lastRenderTime=time;this.renderRequested=false;
    }
    requestAnimationFrame(this.loop);
  };
  snapshot() {
    return { audio:this.audio.snapshot(),music:this.audio.music.snapshot(),props:this.streetProps.counts,propObstacles:this.streetProps.obstacles,crashes:this.vehicle.crashes, lastImpact:this.vehicle.lastImpactCollider?.translation(), cityBatches:this.cityBatches.length, cityTriangles:this.cityBatches.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0), animation:this.player.model.motion.current, animations:{...this.player.model.motion.counts}, driverBounds:this.player.model.root.userData.driverBounds, characterYaw:this.player.model.root.rotation.y, characterArm:(this.player.model.root.getObjectByName('mixamorigRightArm')??this.player.model.root.getObjectByName('mixamorig:RightArm'))?.quaternion.toArray(), lootCount:this.loot.items.length, exitAttemptSpeed: this.vehicle.lastExitAttemptSpeed, wanted: this.police.level, searching: !this.police.seen, unseen: this.police.unseen, policeLastKnown: this.police.lastKnown.toArray(), police: this.police.patrols.map(v=>({position:v.position.toArray(),ai:v.ai})), vehicles: this.fleet.vehicles.map(v => ({ id:v.id, kind:v.definition.kind, position:v.position.toArray(), spawnBlocked:this.physics.blocked(v.position,v.body.rotation(),v.collider.shape,v.collider), occupied:v.occupied, ai:v.ai, driver:v.driver, driverHealth:v.driverHealth, driverPosition:v.driverCollider?Object.values(v.driverCollider.translation()):null, speed:v.speed })), traffic: this.traffic.routes.map(r => ({id:r.vehicle.id, distance:r.progress})), vehicleId: this.vehicle.id, running: this.running, page: this.ui.page, position: this.player.position.toArray(), car: this.vehicle.position.toArray(), grounded: this.player.grounded, locked: this.input.locked, inventory: this.inventory.serialise(), reloading: this.inventory.reloading, combat: {hits:this.combat.hits, attacks:this.combat.attacks, shots:this.combat.shots}, particles: this.effects.activeCount, loot: this.loot.collected, npcs: this.npcs.npcs.filter(n => n.active).map(n => ({id:n.id, role:n.role, model:n.model.root.userData.asset, animation:n.model.motion.current, position:n.position.toArray(), screen:n.position.clone().add(new THREE.Vector3(0,.35,0)).project(this.camera).toArray(), health:n.health, state:n.state})), mission: { current: this.missions.current, state: this.missions.state, stage: this.missions.stage, completed: this.missions.completed },
      driving: this.player.driving, speed: this.vehicle.speed, yaw: this.vehicle.yaw, cameraYaw: this.follow.yaw, cameraPosition: this.camera.position.toArray(),
      health: this.health, cash: this.cash, bottles: this.bottles, collected: this.pickups.collected, prompt: this.prompt, distanceDriven: this.vehicle.distanceDriven,
      cameraFov: this.camera.fov, sightWeaponVisible: this.combat.sightWeapon?.visible ?? false, characterVisible: this.player.model.root.visible, cameraDistance: this.camera.position.distanceTo(this.follow.target), cameraPitch: this.follow.pitch, damageFlash: this.damageFlash,
      playerColliderEnabled: this.player.collider.isEnabled(), carCollisionCount: this.vehicle.controller.numComputedCollisions(),
      carCollisions: Array.from({length: this.vehicle.controller.numComputedCollisions()}, (_, i) => { const c = this.vehicle.controller.computedCollision(i); return { position: c?.collider?.translation(), handle: c?.collider?.handle, normal: c?.normal1 }; }),
      frame: this.frame, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles };
  }
}
