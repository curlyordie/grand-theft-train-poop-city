export class Input {
  keys = new Set<string>();
  pressed = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  active = false;
  firePressed = false;
  fireDown = false;
  aiming = false;
  wheel = 0;
  onCaptureError: (message: string) => void = () => {};
  get locked() { return document.pointerLockElement?.id === 'scene'; }
  capture(canvas: HTMLCanvasElement) {
    if (this.locked) return;
    try {
      const result = canvas.requestPointerLock();
      result?.catch(error => this.onCaptureError(String(error.message || error)));
    } catch (error) { this.onCaptureError(String(error)); }
  }
  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', e => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code) && this.active) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    canvas.addEventListener('mousedown', e => {
      if (!this.active) return;
      if (!this.locked) { if (e.button === 0) this.capture(canvas); return; }
      if (e.button === 0) this.firePressed = this.fireDown = true;
      if (e.button === 2) this.aiming = true;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { if (this.active) { e.preventDefault(); this.wheel += Math.sign(e.deltaY); } }, { passive: false });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.fireDown = false; if (e.button === 2) this.aiming = false; });
    window.addEventListener('mousemove', e => {
      if (this.active && this.locked) { this.mouseX += e.movementX; this.mouseY += e.movementY; }
    });
  }
  down(code: string) { return this.active && this.keys.has(code); }
  take(code: string) { const value = this.pressed.has(code); this.pressed.delete(code); return value; }
  clear() { this.keys.clear(); this.pressed.clear(); this.mouseX = this.mouseY = this.wheel = 0; this.firePressed = this.fireDown = this.aiming = false; }
}
