import { test, expect } from '@playwright/test';

test('camera stays at a stable distance across frame timings and still avoids walls', async ({ page }) => {
  await page.route('**/camera-lab', route => route.fulfill({ contentType: 'text/html', body: `
    <script type="module">
      import * as THREE from '/node_modules/three/build/three.module.js';
      import { Physics, RAPIER } from '/src/systems/physics.ts';
      import { FollowCamera } from '/src/systems/camera.ts';
      await RAPIER.init();
      window.checkCamera = () => {
        const physics = new Physics(), position = new THREE.Vector3(0, .82, 0);
        const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...position.toArray()));
        physics.world.createCollider(RAPIER.ColliderDesc.capsule(.5, .3), body);
        physics.step();
        const camera = new THREE.PerspectiveCamera(57, 1, .08, 310), follow = new FollowCamera(camera, physics);
        const input = { mouseX: 0, mouseY: 0, down: () => false };
        follow.reset(position);
        const update = (dt, aim = false) => follow.update(dt, input, position, false, body, 0, aim);
        for (let i = 0; i < 600; i++) update(1 / 60);
        const idleDistance = camera.position.distanceTo(follow.target), distances = [];
        const timing = [1 / 120, 1 / 24, 1 / 60, 1 / 30];
        for (let i = 0; i < 200; i++) { update(timing[i % timing.length]); distances.push(camera.position.distanceTo(follow.target)); }
        for (let i = 0; i < 60; i++) { position.x += 4.5 / 60; update(1 / 60); }
        for (let i = 0; i < 600; i++) update(timing[i % timing.length]);
        const stoppedDistance = camera.position.distanceTo(follow.target);
        for (let i = 0; i < 100; i++) update(1 / 60, true);
        const aim = { distance: camera.position.distanceTo(follow.target), fov: camera.fov };
        for (let i = 0; i < 600; i++) update(timing[i % timing.length]);
        const releasedDistance = camera.position.distanceTo(follow.target);
        physics.fixedBox(new THREE.Vector3(position.x, 2, 3), new THREE.Vector3(10, 5, .1));
        physics.step();
        const wallDistances = [];
        for (let i = 0; i < 300; i++) { update(timing[i % timing.length]); if (i > 100) wallDistances.push(camera.position.distanceTo(follow.target)); }
        const wallDistance = camera.position.distanceTo(follow.target), wallZ = camera.position.z;
        physics.world.free();
        return { idleDistance, distances, stoppedDistance, aim, releasedDistance, wallDistances, wallDistance, wallZ };
      };
    </script>` }));
  await page.goto('/camera-lab');
  await page.waitForFunction(() => typeof (window as any).checkCamera === 'function');
  const result = await page.evaluate(() => (window as any).checkCamera());
  expect(result.idleDistance).toBeCloseTo(7, 6);
  expect(Math.max(...result.distances) - Math.min(...result.distances)).toBeLessThan(.000001);
  expect(result.stoppedDistance).toBeCloseTo(7, 6);
  expect(result.aim.distance).toBeLessThan(.8);
  expect(result.aim.fov).toBeCloseTo(38, 6);
  expect(result.releasedDistance).toBeCloseTo(7, 6);
  expect(result.wallDistance).toBeGreaterThan(.55);
  expect(result.wallDistance).toBeLessThan(3);
  expect(result.wallZ).toBeLessThan(2.9);
  expect(Math.max(...result.wallDistances) - Math.min(...result.wallDistances)).toBeLessThan(.000001);
});
