export type WeaponId = 'fists' | 'bat' | 'pipe' | 'handgun' | 'shotgun';
export type AmmoType = 'bullets' | 'shells';
export interface WeaponDefinition { id: WeaponId; name: string; type: 'unarmed' | 'melee' | 'firearm'; damage: number; range: number; interval: number; magazine: number; ammo?: AmmoType; reload: number; }
export const WEAPONS: WeaponDefinition[] = [
  { id: 'fists', name: 'Unarmed', type: 'unarmed', damage: 12, range: 1.85, interval: .45, magazine: 0, reload: 0 },
  { id: 'bat', name: 'Baseball Bat', type: 'melee', damage: 28, range: 2.5, interval: .65, magazine: 0, reload: 0 },
  { id: 'pipe', name: 'Metal Pipe', type: 'melee', damage: 23, range: 2.3, interval: .55, magazine: 0, reload: 0 },
  { id: 'handgun', name: 'Handgun', type: 'firearm', damage: 24, range: 65, interval: .3, magazine: 12, ammo: 'bullets', reload: 1.4 },
  { id: 'shotgun', name: 'Shotgun', type: 'firearm', damage: 11, range: 35, interval: .9, magazine: 6, ammo: 'shells', reload: 2.1 },
];
export interface InventoryData { owned: WeaponId[]; equipped: WeaponId; loaded: Partial<Record<WeaponId, number>>; reserve: Record<AmmoType, number>; }
export class Inventory {
  owned = new Set<WeaponId>(['fists']); equipped: WeaponId = 'fists';
  loaded: Partial<Record<WeaponId, number>> = {}; reserve = { bullets: 0, shells: 0 };
  reloading = 0;
  get weapon() { return WEAPONS.find(w => w.id === this.equipped)!; }
  get magazine() { return this.loaded[this.equipped] ?? 0; }
  select(id: WeaponId) { if (!this.owned.has(id)) return false; if (id !== this.equipped) this.reloading = 0; this.equipped = id; return true; }
  cycle(direction: number) { const options = WEAPONS.filter(w => this.owned.has(w.id)); const i = options.findIndex(w => w.id === this.equipped); this.select(options[(i + direction + options.length) % options.length].id); }
  acquire(id: WeaponId) {
    const weapon = WEAPONS.find(w => w.id === id)!;
    if (!this.owned.has(id)) { this.owned.add(id); this.loaded[id] = weapon.magazine; }
    if (weapon.ammo) this.reserve[weapon.ammo] += weapon.magazine * 2;
    this.select(id);
  }
  reload() { const w = this.weapon; if (w.ammo && this.magazine < w.magazine && this.reserve[w.ammo] > 0 && !this.reloading) { this.reloading = w.reload; return true; } return false; }
  update(dt: number) {
    if (this.reloading <= 0) return false;
    this.reloading = Math.max(0, this.reloading - dt);
    if (this.reloading === 0 && this.weapon.ammo) {
      const amount = Math.min(this.weapon.magazine - this.magazine, this.reserve[this.weapon.ammo]);
      this.loaded[this.equipped] = this.magazine + amount; this.reserve[this.weapon.ammo] -= amount; return true;
    }
    return false;
  }
  fire() { if (this.reloading > 0) return false; if (this.weapon.type !== 'firearm') return true; if (this.magazine <= 0) return false; this.loaded[this.equipped] = this.magazine - 1; return true; }
  restore(data?: InventoryData) {
    this.owned = new Set(['fists']); this.loaded = {}; this.reserve = { bullets: 0, shells: 0 }; this.equipped = 'fists'; this.reloading = 0;
    if (!data) return;
    WEAPONS.forEach(w => { if (Array.isArray(data.owned) && data.owned.includes(w.id)) this.owned.add(w.id); this.loaded[w.id] = Math.min(w.magazine, Math.max(0, Math.floor(Number(data.loaded?.[w.id]) || 0))); });
    this.reserve.bullets = Math.min(999, Math.max(0, Math.floor(Number(data.reserve?.bullets) || 0))); this.reserve.shells = Math.min(999, Math.max(0, Math.floor(Number(data.reserve?.shells) || 0)));
    if (this.owned.has(data.equipped)) this.equipped = data.equipped;
  }
  serialise(): InventoryData { return { owned: [...this.owned], equipped: this.equipped, loaded: { ...this.loaded }, reserve: { ...this.reserve } }; }
}
