import * as THREE from 'three';
import { SAFEHOUSE } from '../world/city';
import { box } from '../world/models';

export type MissionState = 'not-started' | 'active' | 'objective-completed' | 'completed' | 'failed';
export interface MissionContext { position: THREE.Vector3; vehicleId: string | null; speed: number; wanted: number; }
export const MOTOR_DELIVERY = new THREE.Vector3(4, 0, 37);
export const INDUSTRIAL_CONTACT = new THREE.Vector3(103, 0, -7);
export const PARCEL_POSITION = new THREE.Vector3(151, 0, -144);
const NAMES = ['A Fresh Start', 'The Missing Motor', 'Absolutely Nothing to Worry About'];
const REWARDS = [150, 350, 600];
export class Missions {
  current = 0;
  stage = 0;
  state: MissionState = 'not-started';
  completed: number[] = [];
  parcel = false;
  motorPosition = new THREE.Vector3(50,0,18);
  transition = 0;
  marker = new THREE.Group();
  arrow: THREE.Mesh;
  parcelModel = new THREE.Group();
  constructor(scene: THREE.Scene, private reward: (cash: number, title: string) => void) {
    const mat = new THREE.MeshBasicMaterial({ color: '#edbc68', transparent: true, opacity: .7 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, .07, 6, 24), mat); ring.rotation.x = Math.PI / 2; this.marker.add(ring);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(.35, .8, 4), mat); this.arrow.position.y = 3.5; this.arrow.rotation.z = Math.PI; this.marker.add(this.arrow); scene.add(this.marker);
    box(this.parcelModel, [.7,.55,.6], [0,.3,0], '#ae8c5e'); box(this.parcelModel, [.12,.56,.61], [0,.3,0], '#d4c397');
    this.parcelModel.position.copy(PARCEL_POSITION); scene.add(this.parcelModel);
  }
  restore(completed: number[] = []) {
    this.completed = [...new Set(completed.filter(i => i >= 0 && i < 3))];
    this.current = [0, 1, 2].find(i => !this.completed.includes(i)) ?? 3;
    this.stage = 0; this.parcel = false; this.transition = 0;
    this.state = this.current === 0 ? 'active' : this.current === 3 ? 'completed' : 'not-started'; this.syncMarker();
  }
  get name() { return NAMES[this.current] ?? 'Sundarpur is yours'; }
  get target(): THREE.Vector3 | null {
    if (this.current >= 3 || this.state === 'failed') return null;
    if (this.current === 0) return SAFEHOUSE;
    if (this.current === 1) return this.state === 'not-started' ? SAFEHOUSE : this.stage === 0 ? this.motorPosition : MOTOR_DELIVERY;
    return this.state === 'not-started' ? INDUSTRIAL_CONTACT : this.stage === 0 ? PARCEL_POSITION : INDUSTRIAL_CONTACT;
  }
  get objective() {
    if (this.state === 'failed') return 'Failed. Press E at Rab’s rooms to restart this mission.';
    if (this.current >= 3) return 'All three jobs complete. Explore, collect and make poor decisions.';
    if (this.current === 0) return 'Reach Rab’s rooms. The gold marker advances this objective automatically.';
    if (this.current === 1) return this.state === 'not-started' ? 'Talk at Rab’s rooms (E) for the next job.' : this.stage === 0 ? 'Retrieve the blue family sedan in Downtown.' : 'Deliver the blue sedan to the gold marker. Stop inside the circle.';
    return this.state === 'not-started' ? 'Meet Dev at the industrial entrance (E).' : this.stage === 0 ? 'Collect the suspiciously ordinary parcel in the freight yard (E).' : this.stage === 1 ? 'Lose the police before delivering the parcel.' : 'Return the parcel to Dev. Enter the gold circle.';
  }
  proximity(position: THREE.Vector3, target: THREE.Vector3, radius: number) { return Math.hypot(position.x - target.x, position.z - target.z) <= radius && position.y < 3; }
  interaction(position: THREE.Vector3) {
    if (this.state === 'failed' && this.proximity(position, SAFEHOUSE, 3)) return 'Restart failed mission';
    if (this.state === 'not-started' && this.target && this.proximity(position, this.target, 3)) return `Talk · start ${this.name}`;
    if (this.current === 2 && this.state === 'active' && this.stage === 0 && this.proximity(position, PARCEL_POSITION, 3)) return 'Collect the suspicious parcel';
    return '';
  }
  interact(position: THREE.Vector3) {
    if (!this.interaction(position)) return '';
    if (this.state === 'failed') { this.state = 'active'; this.stage = 0; this.parcel = false; return 'JOB RESTARTED'; }
    if (this.state === 'not-started') { this.state = 'active'; this.stage = 0; this.syncMarker(); return this.current === 1 ? '“It’s missing. Not necessarily legally.”' : '“It’s paperwork. Aggressively confidential paperwork.”'; }
    this.parcel = true; this.stage = 1; this.syncMarker(); return 'PARCEL COLLECTED';
  }
  fail() { if (this.state === 'active' && this.current > 0) { this.state = 'failed'; this.parcel = false; this.syncMarker(); } }
  update(dt: number, context: MissionContext) {
    this.arrow.rotation.y += dt;
    if (this.state === 'objective-completed') { this.transition -= dt; if (this.transition <= 0) { this.current++; this.stage = 0; this.state = this.current < 3 ? 'not-started' : 'completed'; } }
    else if (this.state === 'active') {
      if (this.current === 0 && this.proximity(context.position, SAFEHOUSE, 2.5)) this.complete();
      if (this.current === 1 && this.stage === 0 && context.vehicleId === 'mission-sedan') this.stage = 1;
      else if (this.current === 1 && this.stage === 1 && context.vehicleId === 'mission-sedan' && Math.abs(context.speed) < 3 && this.proximity(context.position, MOTOR_DELIVERY, 4)) this.complete();
      if (this.current === 2 && this.stage === 1 && context.wanted === 0) this.stage = 2;
      if (this.current === 2 && this.stage === 2 && this.parcel && context.wanted === 0 && this.proximity(context.position, INDUSTRIAL_CONTACT, 3)) this.complete();
    }
    this.syncMarker();
  }
  complete() {
    if (this.state !== 'active' || this.completed.includes(this.current)) return;
    this.completed.push(this.current); this.state = 'objective-completed'; this.transition = 2;
    this.reward(REWARDS[this.current], NAMES[this.current]);
  }
  syncMarker() { const target = this.target; this.marker.visible = !!target && this.state !== 'objective-completed'; if (target) this.marker.position.copy(target).y = .15; this.parcelModel.visible = !this.parcel && !this.completed.includes(2); }
}
