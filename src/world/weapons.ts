import type { WeaponId } from '../systems/inventory';
import { importedWeapon } from './weapon-assets';
export function weaponModel(id: WeaponId) { return importedWeapon(id); }
