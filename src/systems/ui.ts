import { Inventory, WEAPONS, type WeaponId } from './inventory';
import * as THREE from 'three';
import { ROAD_CENTRES, SAFEHOUSE, BLOCK_CENTRES, WORLD_SIZE, districtAt } from '../world/city';

export type Page = 'menu' | 'pause' | 'controls' | 'settings' | 'credits' | 'inventory';
export interface UIActions {
  newGame(): void; continueGame(): void; resume(): void; restart(): void; mainMenu(): void;
  selectWeapon(id: WeaponId): void;
  pause(): void; settings(volume: number, sensitivity: number): void;
}
const controls = `<div class="control-grid"><span>Move / steer</span><kbd>W A S D</kbd><span>Look around (click to lock)</span><kbd>MOUSE</kbd><span>Attack / fire</span><kbd>LEFT CLICK</kbd><span>Aim</span><kbd>RIGHT CLICK</kbd><span>Reload</span><kbd>R</kbd><span>Owned weapons</span><kbd>1–5 / WHEEL</kbd><span>Inventory</span><kbd>TAB</kbd><span>Sprint</span><kbd>SHIFT</kbd><span>Jump / handbrake</span><kbd>SPACE</kbd><span>Interact / enter / exit</span><kbd>E</kbd><span>Use stored Buckfast</span><kbd>B</kbd><span>Pause & release mouse</span><kbd>ESC</kbd><span>Open controls</span><kbd>H</kbd></div><p class="panel-note">Click the street to capture the mouse. Move the mouse without holding a button after capture. Escape releases it. Stop before getting out of a car.</p>`;
export class UI {
  overlay: HTMLDivElement;
  hud: HTMLDivElement;
  page: Page | null = 'menu';
  returnPage: 'menu' | 'pause' = 'menu';
  volume = .35;
  sensitivity = 1;
  hasSave = false;
  inventory?: Inventory;
  map: HTMLCanvasElement;
  notification: HTMLDivElement;
  toastTimer = 0;
  constructor(private actions: UIActions) {
    const app = document.querySelector('#app')!;
    this.overlay = document.createElement('div'); this.overlay.id = 'overlay'; app.append(this.overlay);
    this.hud = document.createElement('div'); this.hud.id = 'hud'; this.hud.hidden = true;
    this.hud.innerHTML = `<div class="district"><span class="eyebrow">SUNDARPUR</span><h2>Old City<span class="live-dot"></span></h2><span class="district-sub">17:42 · A perfectly shite afternoon</span></div><div class="stats"><div class="player-name">RAB MCTAVISH <span>01</span></div><div class="health-row"><span>HEALTH</span><strong id="health-value">100</strong></div><div class="health-track"><i id="health-bar"></i></div><div id="wanted">☆☆☆ NO HEAT</div><div class="weapon-hud"><strong id="weapon-name">Unarmed</strong><span id="ammo-value">MELEE</span></div><div class="pocket"><strong id="cash">₹ 250</strong><span id="bottles">◈ 0 BUCKFAST</span></div></div><div class="objective"><span class="eyebrow">YOUR FIRST POOR DECISION</span><p id="objective">Find the orange hatchback. E to get in.</p></div><div class="map-card"><canvas id="minimap" width="220" height="220" aria-label="Minimap showing player, car and safehouse"></canvas><div class="map-caption"><span><i class="legend player"></i>YOU</span><span><i class="legend car"></i>CAR</span><span><i class="legend home"></i>HOME</span></div></div><div id="interaction" hidden></div><div id="drive-hud" hidden><span>SHANTI 800</span><div><strong id="speed">00</strong><small>km/h</small></div><p>W / S THROTTLE &nbsp; A / D STEER<br>SPACE HANDBRAKE &nbsp; E EXIT</p></div><div id="crosshair" aria-label="Aiming reticle">+</div><div class="bottom-hint"><span id="mouse-lock-status">CLICK STREET TO LOCK MOUSE</span><span><kbd>H</kbd> CONTROLS</span><button id="pause-button" aria-label="Pause game"><kbd>ESC</kbd> PAUSE</button></div>`;
    app.append(this.hud); this.map = this.hud.querySelector('#minimap')!;
    this.hud.querySelector('#pause-button')!.addEventListener('click', () => this.actions.pause());
    this.notification = document.createElement('div'); this.notification.id = 'notification'; this.notification.hidden = true; app.append(this.notification);
    this.show('menu');
  }
  show(page: Page) {
    this.notification.hidden = true;
    this.page = page; this.overlay.hidden = false; this.hud.hidden = true;
    if (page === 'menu') {
      this.overlay.innerHTML = `<div class="menu-shell"><header class="menu-header"><a class="wordmark" aria-label="Grand Theft Train: Poop City">GTT<span>/</span>PC<span class="tiny-dot"></span></a><span class="edition">SUNDARPUR, INDIA &nbsp; / &nbsp; 01</span></header><main class="title-block"><div class="eyebrow title-kicker"><span class="line"></span> A SUNDARPUR STORY</div><h1><span>GRAND</span><span>THEFT TRAIN<span class="colon">:</span></span><em>POOP CITY</em></h1><p class="tagline">New city. Same terrible judgement.</p><p class="mouse-instruction">Click the street to lock the mouse. Move to look · Escape to pause.</p><div class="menu-actions"><button class="primary" id="new-game">NEW GAME <span aria-hidden="true"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 14L14 4M4 4h10v10" fill="none" stroke="currentColor" stroke-width="2"/></svg></span></button><button class="secondary" id="continue" ${this.hasSave ? '' : 'disabled'}>CONTINUE <span>→</span></button></div><nav class="menu-nav"><button data-page="settings">SETTINGS</button><button data-page="controls">CONTROLS</button><button data-page="credits">CREDITS</button></nav></main><footer class="menu-footer"><span><b>01</b> THE OLD CITY<span class="footer-divider">/</span>SANDBOX EXPANSION</span><span class="footer-quote">“Right. Nobody panic. Especially me.”</span></footer><aside class="postcard"><span>POSTCARDS FROM POOR DECISIONS</span><strong>Welcome to<br>Sundarpur.</strong><p>Room for one more bad idea.</p><i>27° N &nbsp; 73° E</i></aside></div>`;
      this.overlay.querySelector('#new-game')!.addEventListener('click', () => this.actions.newGame());
      this.overlay.querySelector('#continue')!.addEventListener('click', () => this.actions.continueGame());
      this.returnPage = 'menu';
    } else {
      const title = { pause: 'Taking a breather.', controls: 'Know your way around.', settings: 'Make yourself at home.', credits: 'A city of our own.', inventory: 'Tools of poor judgement.' }[page];
      let content = '';
      if (page === 'pause') content = `<p class="panel-intro">GRAND THEFT TRAIN: POOP CITY</p><div class="pause-actions"><button class="primary" id="resume">RESUME <span>→</span></button><button id="restart">RESTART FROM CHECKPOINT</button><button data-page="settings">SETTINGS</button><button data-page="controls">CONTROLS</button><button id="main-menu">RETURN TO MAIN MENU</button></div><p class="panel-note">Progress is saved locally. Continue returns Rab to the street checkpoint; parked vehicles reset.</p>`;
      if (page === 'inventory') content = `<div class="weapon-list">${WEAPONS.map((w,i)=>`<button data-weapon="${w.id}" ${this.inventory?.owned.has(w.id)?'':'disabled'}><kbd>${i+1}</kbd> ${w.name}<span>${this.inventory?.equipped===w.id?'EQUIPPED':this.inventory?.owned.has(w.id)?w.type.toUpperCase():'NOT OWNED'}</span></button>`).join('')}</div><button class="primary" id="resume">BACK TO STREETS</button>`;
      if (page === 'controls') content = controls;
      if (page === 'settings') content = `<p class="panel-intro">A little less racket. A little more control.</p><label class="setting-label" for="volume">AUDIO VOLUME <output id="volume-output">${Math.round(this.volume * 100)}%</output></label><input id="volume" type="range" min="0" max="1" step="0.05" value="${this.volume}"><label class="setting-label" for="sensitivity">MOUSE SENSITIVITY <output id="sensitivity-output">${this.sensitivity.toFixed(1)}×</output></label><input id="sensitivity" type="range" min="0.3" max="2" step="0.1" value="${this.sensitivity}"><p class="panel-note">Settings are remembered on this browser.</p>`;
      if (page === 'credits') content = `<p class="panel-intro">An original low-poly sandbox, built one terrible decision at a time.</p><div class="credits-copy"><h3>THE CITY & THE CHARACTERS</h3><p>Original procedural architecture, character and vehicle models. Rab's green-and-white hoops use no official crest or sponsor artwork.</p><h3>UNDER THE BONNET</h3><p>Three.js · Rapier · TypeScript · Vite</p><h3>THE NOISE</h3><p>Original synthesised placeholder sound effects. No sampled music or radio recordings.</p><h3>THIS EDITION</h3><p>Five connected districts, eight drivable vehicle classes, NPCs, traffic, melee and firearms, police pursuits, three jobs, Buckfast and saved progress. Models, animation and synthesised audio remain original low-poly placeholders.</p></div>`;
      this.overlay.innerHTML = `<div class="panel-backdrop"><section class="panel"><span class="eyebrow">SUNDARPUR / ${page.toUpperCase()}</span><h1>${title}</h1>${content}${page !== 'pause' ? '<button class="back-button" id="back">← BACK</button>' : ''}</section></div>`;
      this.overlay.querySelector('#back')?.addEventListener('click', () => this.show(this.returnPage));
      this.overlay.querySelector('#resume')?.addEventListener('click', () => this.actions.resume());
      this.overlay.querySelector('#restart')?.addEventListener('click', () => this.actions.restart());
      this.overlay.querySelector('#main-menu')?.addEventListener('click', () => this.actions.mainMenu());
      if (page === 'settings') {
        const changed = () => {
          this.volume = +(this.overlay.querySelector('#volume') as HTMLInputElement).value;
          this.sensitivity = +(this.overlay.querySelector('#sensitivity') as HTMLInputElement).value;
          this.overlay.querySelector('#volume-output')!.textContent = `${Math.round(this.volume * 100)}%`;
          this.overlay.querySelector('#sensitivity-output')!.textContent = `${this.sensitivity.toFixed(1)}×`;
          this.actions.settings(this.volume, this.sensitivity);
        };
        this.overlay.querySelectorAll('input').forEach(i => i.addEventListener('input', changed));
      }
    }
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-weapon]').forEach(b => b.addEventListener('click', () => this.actions.selectWeapon(b.dataset.weapon as WeaponId)));
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(b => b.addEventListener('click', () => this.show(b.dataset.page as Page)));
  }
  hide() { this.page = null; this.overlay.hidden = true; this.hud.hidden = false; }
  toast(title: string, quote = '') {
    this.notification.innerHTML = ''; const b = document.createElement('strong'); b.textContent = title; this.notification.append(b);
    if (quote) { const span = document.createElement('span'); span.textContent = quote; this.notification.append(span); }
    this.notification.hidden = false; this.toastTimer = 4.5;
  }
  update(dt: number, data: { player: THREE.Vector3; car: THREE.Vector3; yaw: number; driving: boolean; speed: number; health: number; cash: number; bottles: number; prompt: string; collected: number; distanceDriven: number; missionName: string; objective: string; vehicleName: string; weapon: string; ammo: string; reloading: boolean; damageFlash: number; wanted: number; searching: boolean; missionTarget: THREE.Vector3 | null; locked: boolean }) {
    this.hud.querySelector('#wanted')!.textContent = '★'.repeat(data.wanted) + '☆'.repeat(3 - data.wanted) + (data.wanted ? data.searching ? ' SEARCH' : data.wanted === 1 ? ' INVESTIGATION' : ' PURSUIT' : ' NO HEAT');
    this.hud.querySelector('#mouse-lock-status')!.textContent = data.locked ? 'MOUSE LOOK ACTIVE' : 'CLICK STREET TO LOCK MOUSE';
    (this.hud.querySelector('#crosshair') as HTMLElement).hidden = data.driving;
    this.hud.style.boxShadow = data.damageFlash > 0 ? 'inset 0 0 70px #c6383270' : 'none';
    this.hud.querySelector('.district h2')!.textContent = districtAt(data.player.x, data.player.z);
    this.hud.querySelector('#drive-hud>span')!.textContent = data.vehicleName;
    this.hud.querySelector('#weapon-name')!.textContent = data.weapon;
    this.hud.querySelector('#ammo-value')!.textContent = data.reloading ? 'RELOADING…' : data.ammo;
    this.toastTimer -= dt; if (this.toastTimer <= 0) this.notification.hidden = true;
    this.hud.querySelector('#health-value')!.textContent = `${Math.ceil(data.health)}`;
    (this.hud.querySelector('#health-bar') as HTMLElement).style.width = `${data.health}%`;
    this.hud.querySelector('#cash')!.textContent = `₹ ${data.cash.toLocaleString('en-IN')}`;
    this.hud.querySelector('#bottles')!.textContent = `◈ ${data.bottles} BUCKFAST`;
    const interaction = this.hud.querySelector('#interaction') as HTMLDivElement;
    interaction.hidden = !data.prompt; interaction.innerHTML = data.prompt ? `<kbd>E</kbd> ${data.prompt}` : '';
    (this.hud.querySelector('#drive-hud') as HTMLElement).hidden = !data.driving;
    this.hud.querySelector('#speed')!.textContent = Math.round(Math.abs(data.speed) * 3.6).toString().padStart(2, '0');
    this.hud.querySelector('#objective')!.textContent = data.objective;
    this.hud.querySelector('.objective .eyebrow')!.textContent = data.missionName;
    this.drawMap(data.player, data.car, data.yaw, data.driving, data.missionTarget);
  }
  drawMap(player: THREE.Vector3, car: THREE.Vector3, yaw: number, driving: boolean, target: THREE.Vector3 | null) {
    const ctx = this.map.getContext('2d')!, s = 220 / WORLD_SIZE;
    ctx.fillStyle = '#273c38'; ctx.fillRect(0, 0, 220, 220);
    ctx.save(); ctx.translate(110, 110); ctx.scale(s, s);
    ctx.fillStyle = '#52635b'; for (const c of ROAD_CENTRES) { ctx.fillRect(c - 6, -216, 12, 432); ctx.fillRect(-216, c - 6, 432, 12); }
    ctx.fillStyle = '#75806a'; for (const x of BLOCK_CENTRES) for (const z of BLOCK_CENTRES) ctx.fillRect(x - 16, z - 16, 32, 32);
    ctx.strokeStyle = '#9d9270'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-104, 82); ctx.lineTo(104, 82); ctx.stroke();
    ctx.fillStyle = '#c2e2a5'; ctx.fillRect(SAFEHOUSE.x - 3.5, SAFEHOUSE.z - 3.5, 7, 7);
    ctx.fillStyle = '#ee8b4d'; ctx.fillRect(car.x - 3, car.z - 3, 6, 6);
    if (target) { ctx.fillStyle = '#f4c364'; ctx.beginPath(); ctx.arc(target.x, target.z, 5, 0, Math.PI * 2); ctx.fill(); }
    const position = driving ? car : player;
    ctx.translate(position.x, position.z); ctx.rotate(-yaw); ctx.fillStyle = '#fff0c4'; ctx.strokeStyle = '#203832'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-4.5, 5); ctx.lineTo(0, 3); ctx.lineTo(4.5, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#efe1b7'; ctx.font = 'bold 10px Arial'; ctx.fillText('N ↑', 13, 20);
  }
}
