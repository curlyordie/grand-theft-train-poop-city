import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 320, height: 400 }, trace: 'off' });
test('Remy embedded face texture renders on the original skinned head', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/remy-face-lab', route => route.fulfill({ contentType: 'text/html', body: `
    <style>body{margin:0;background:#21162c}canvas{display:block}</style>
    <script type="module">
      import * as THREE from '/node_modules/three/build/three.module.js';
      import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
      const gltf = await new GLTFLoader().loadAsync('/src/assets/remy.glb');
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#21162c'); scene.add(gltf.scene);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x776655, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-2, 5, 5); scene.add(light);
      gltf.scene.updateMatrixWorld(true);
      const head = gltf.scene.getObjectByName('mixamorigHead') ?? gltf.scene.getObjectByName('mixamorig:Head');
      const point = head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .18, .04));
      const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 20);
      camera.position.copy(point).add(new THREE.Vector3(.05, .04, 1.05)); camera.lookAt(point);
      const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(innerWidth, innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      document.body.append(renderer.domElement); renderer.render(scene, camera);
      const meshes = []; let map;
      gltf.scene.traverse(object => { if (object.isSkinnedMesh) { meshes.push(object.name); if (object.material.name === 'Bodymat') map = object.material.map; } });
      window.faceResult = { meshes, texture: [map.image.width, map.image.height], triangles: renderer.info.render.triangles, bones: head.isBone };
    </script>` }));
  await page.goto('/remy-face-lab');
  await page.waitForFunction(() => (window as any).faceResult);
  const result = await page.evaluate(() => (window as any).faceResult);
  expect(result.texture).toEqual([2048, 2048]);
  expect(result.meshes.length).toBeGreaterThan(0);
  expect(result.bones).toBe(true);
  expect(result.triangles).toBeGreaterThan(1000);
  await page.screenshot({ path: 'test-results/remy-face-applied.png' });
  expect(errors).toEqual([]);
});
