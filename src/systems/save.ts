import type { InventoryData } from './inventory';
export interface SaveData { version: 1; cash: number; bottles: number; collected: number[]; missions?: number[]; inventory?: InventoryData; loot?: number[]; }
const KEY = 'grand-theft-train-poop-city-save-v1';
export class SaveSystem {
  available = true;
  load(): SaveData | null {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (data?.version === 1 && Number.isFinite(data.cash) && Number.isInteger(data.bottles) && Array.isArray(data.collected)) {
        return { version: 1, cash: Math.max(0, data.cash), bottles: Math.max(0, data.bottles), collected: data.collected.filter((n: unknown) => Number.isInteger(n)), inventory: data.inventory, loot: Array.isArray(data.loot) ? data.loot.filter((n: unknown) => Number.isInteger(n)) : [], missions: Array.isArray(data.missions) ? data.missions.filter((n: unknown) => Number.isInteger(n)) : [] };
      }
    } catch { this.available = false; }
    return null;
  }
  save(data: SaveData) { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { this.available = false; return false; } }
  settings() {
    try { const s = JSON.parse(localStorage.getItem(KEY + '-settings') || '{}'); return { volume: typeof s.volume === 'number' ? Math.min(1, Math.max(0, s.volume)) : .35, sensitivity: typeof s.sensitivity === 'number' ? Math.min(2, Math.max(.3, s.sensitivity)) : 1 }; }
    catch { return { volume: .35, sensitivity: 1 }; }
  }
  setSettings(settings: { volume: number; sensitivity: number }) { try { localStorage.setItem(KEY + '-settings', JSON.stringify(settings)); } catch { this.available = false; } }
}
